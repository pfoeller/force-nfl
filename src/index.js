import { Container, getContainer } from "@cloudflare/containers";

const SNAPSHOT_MANIFEST_KEY = "force:bootstrap:manifest:v1";
const SNAPSHOT_PREFIX = "force:bootstrap:";
const SNAPSHOT_CHUNK_CHARS = 700000;

const SNAPSHOT_FEEDS = [
  { key: "health", path: "/api/health", required: true },
  { key: "schedule", path: "/api/schedule", required: true },
  { key: "teamStats", path: "/api/team-stats", required: true },
  { key: "playerStats", path: "/api/player-stats", required: true },
  { key: "ftnCharting", path: "/api/ftn-charting", required: false },
  { key: "pfrPass", path: "/api/pfr-pass", required: false },
  { key: "pfrPassPrior", path: "/api/pfr-pass-prior", required: false },
  { key: "currentPressure", path: "/api/current-pressure", required: false },
  { key: "gameFlow2026", path: "/api/game-flow-2026", required: false },
];

function snapshotUrl(path, stamp) {
  const joiner = path.includes("?") ? "&" : "?";
  return `http://localhost${path}${joiner}force_refresh=${stamp}`;
}

function splitSnapshotBody(body) {
  const text = String(body ?? "");
  const chunks = [];
  for (let i = 0; i < text.length; i += SNAPSHOT_CHUNK_CHARS) {
    chunks.push(text.slice(i, i + SNAPSHOT_CHUNK_CHARS));
  }
  return chunks.length ? chunks : [""];
}

function jsonResponse(value, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...extraHeaders,
    },
  });
}

export class ForceContainer extends Container {
  defaultPort = 8080;
  requiredPorts = [8080];
  sleepAfter = "1m";
  enableInternet = true;
  pingEndpoint = "localhost/api/health";
  envVars = {
    FORCE_HOST: "0.0.0.0",
    FORCE_PORT: "8080",
    FORCE_AUTO_OPEN: "0",
    FORCE_PUBLIC: "1",
  };

  async readStoredFeed(manifest, feedKey) {
    const meta = manifest?.feeds?.[feedKey];
    if (!meta || !manifest?.generation || !Number.isFinite(Number(meta.chunks))) return null;
    const pieces = [];
    for (let i = 0; i < Number(meta.chunks); i += 1) {
      const piece = await this.ctx.storage.get(
        `${SNAPSHOT_PREFIX}${manifest.generation}:${feedKey}:${i}`
      );
      if (typeof piece !== "string") return null;
      pieces.push(piece);
    }
    return pieces.join("");
  }

  async getBootstrapSnapshot() {
    const manifest = await this.ctx.storage.get(SNAPSHOT_MANIFEST_KEY);
    if (!manifest?.generation || !manifest?.builtAt) return null;

    const feeds = {};
    for (const feed of SNAPSHOT_FEEDS) {
      const body = await this.readStoredFeed(manifest, feed.key);
      if (body != null) feeds[feed.key] = body;
    }

    return {
      ok: true,
      schema: Number(manifest.schema || 1),
      generation: manifest.generation,
      builtAt: manifest.builtAt,
      reason: manifest.reason || null,
      durationMs: Number(manifest.durationMs || 0),
      warnings: Array.isArray(manifest.warnings) ? manifest.warnings : [],
      feeds,
    };
  }

  async refreshBootstrapSnapshot(reason = "scheduled") {
    const started = Date.now();
    const stamp = Date.now();
    const previous = await this.ctx.storage.get(SNAPSHOT_MANIFEST_KEY);
    const bodies = {};
    const warnings = [];
    const feedMeta = {};

    for (let offset = 0; offset < SNAPSHOT_FEEDS.length; offset += 4) {
      const batch = SNAPSHOT_FEEDS.slice(offset, offset + 4);
      const results = await Promise.all(batch.map(async (feed) => {
        try {
          const response = await this.containerFetch(
            snapshotUrl(feed.path, stamp),
            { headers: { "x-force-bootstrap": "1" } }
          );
          if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
          const body = await response.text();
          if (!body.trim()) throw new Error("empty response");
          return {
            feed,
            body,
            contentType: response.headers.get("content-type") || "text/plain",
            source: "fresh",
          };
        } catch (error) {
          if (feed.required) {
            throw new Error(`Required bootstrap feed ${feed.key} failed: ${error?.message || error}`);
          }
          const fallback = await this.readStoredFeed(previous, feed.key);
          if (fallback != null) {
            warnings.push(`${feed.key} refresh failed; retained previous snapshot`);
            return {
              feed,
              body: fallback,
              contentType: previous?.feeds?.[feed.key]?.contentType || "text/plain",
              source: "previous",
            };
          }
          warnings.push(`${feed.key} unavailable in bootstrap snapshot`);
          const jsonFeed = feed.key === "currentPressure" || feed.key === "gameFlow2026";
          return {
            feed,
            body: jsonFeed ? "{}" : "",
            contentType: jsonFeed ? "application/json" : "text/plain",
            source: "empty",
          };
        }
      }));

      for (const result of results) {
        bodies[result.feed.key] = result.body;
        feedMeta[result.feed.key] = {
          contentType: result.contentType,
          source: result.source,
        };
      }
    }

    const health = JSON.parse(bodies.health || "{}");
    if (health?.product !== "FORCE" || health?.app_version !== "V149") {
      throw new Error(`Bootstrap health mismatch: ${health?.product || "unknown"} ${health?.app_version || "unknown"}`);
    }
    if ((bodies.schedule || "").split(/\r?\n/).length < 200) {
      throw new Error("Bootstrap schedule is unexpectedly short");
    }
    if (!(bodies.teamStats || "").includes("season") || !(bodies.playerStats || "").includes("season")) {
      throw new Error("Bootstrap team/player feeds are malformed");
    }

    const generation = String(Date.now());
    const writtenKeys = [];

    try {
      for (const feed of SNAPSHOT_FEEDS) {
        const body = bodies[feed.key] ?? "";
        const chunks = splitSnapshotBody(body);
        feedMeta[feed.key].chunks = chunks.length;
        feedMeta[feed.key].characters = body.length;

        for (let i = 0; i < chunks.length; i += 1) {
          const key = `${SNAPSHOT_PREFIX}${generation}:${feed.key}:${i}`;
          await this.ctx.storage.put(key, chunks[i]);
          writtenKeys.push(key);
        }
      }

      const manifest = {
        schema: 1,
        generation,
        builtAt: new Date().toISOString(),
        reason,
        durationMs: Date.now() - started,
        warnings,
        feeds: feedMeta,
      };

      await this.ctx.storage.put(SNAPSHOT_MANIFEST_KEY, manifest);

      if (previous?.generation && previous.generation !== generation) {
        const old = await this.ctx.storage.list({
          prefix: `${SNAPSHOT_PREFIX}${previous.generation}:`,
        });
        if (old.size) await this.ctx.storage.delete([...old.keys()]);
      }

      console.log("FORCE bootstrap snapshot refreshed", {
        generation, reason, durationMs: manifest.durationMs, warnings,
      });
      return manifest;
    } catch (error) {
      if (writtenKeys.length) await this.ctx.storage.delete(writtenKeys);
      throw error;
    }
  }

  async bootstrapStatus() {
    return (await this.ctx.storage.get(SNAPSHOT_MANIFEST_KEY)) || null;
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const force = getContainer(env.FORCE_CONTAINER, "force-main");

    if (url.pathname === "/api/bootstrap") {
      const snapshot = await force.getBootstrapSnapshot();
      if (!snapshot) {
        ctx.waitUntil(
          force.refreshBootstrapSnapshot("cache-miss").catch((error) => {
            console.error("FORCE bootstrap cache-miss refresh failed", error);
          })
        );
        return jsonResponse({ ok: false, error: "bootstrap snapshot not ready" }, 503);
      }
      return jsonResponse(snapshot, 200, {
        "x-force-bootstrap-built-at": snapshot.builtAt,
      });
    }

    if (url.pathname === "/api/bootstrap-status") {
      const status = await force.bootstrapStatus();
      return jsonResponse({ ok: true, snapshot: status });
    }

    if (url.pathname.startsWith("/api/")) {
      return force.fetch(request);
    }
    return env.ASSETS.fetch(request);
  },

  async scheduled(controller, env, ctx) {
    const force = getContainer(env.FORCE_CONTAINER, "force-main");
    ctx.waitUntil(
      force.refreshBootstrapSnapshot(`cron:${controller.cron}`).catch((error) => {
        console.error("FORCE scheduled bootstrap refresh failed", error);
        throw error;
      })
    );
  },
};

