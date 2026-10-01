import { Container, getContainer } from "@cloudflare/containers";

const SNAPSHOT_MANIFEST_KEY = "force:bootstrap:manifest:v1";
const SNAPSHOT_PREFIX = "force:bootstrap:";
const SNAPSHOT_CHUNK_CHARS = 700000;
const SNAPSHOT_RECOVERY_KEY = "force:bootstrap:recovery-attempt";
const SNAPSHOT_RECOVERY_MS = 5 * 60 * 1000;
const INTERNAL_BOOTSTRAP_PREFIX = "/__force_internal/bootstrap";
const QB_EPA_DEFINITION = "v149-all-play";

export function gameFlowQbValid(body) {
  try {
    const flow = typeof body === "string" ? JSON.parse(body) : body;
    const ref = flow?.v104_reference;
    const ids = ref?.qb_player_ids;
    const fields = ["home_qb_total_epa", "home_qb_plays", "away_qb_total_epa", "away_qb_plays"];
    return flow?.qb_epa_definition === QB_EPA_DEFINITION
      && ref?.version === "V149-QB-ALL-PLAY-REFERENCE-4" && ref?.season === 2025
      && ref?.qb_id_source === "2025-player-stats-positional"
      && Array.isArray(ids) && ids.length >= 32 && ref.qb_id_count === ids.length
      && ["1", "2", "3", "4", "17"].every((key) => Array.isArray(ref.sample_windows?.[key]?.qb_epa_per_play) && ref.sample_windows[key].qb_epa_per_play.length >= (key === "17" ? 30 : 400))
      && Array.isArray(flow.defensive_drive_games)
      && flow.defensive_drive_games.every((game) => fields.every((key) => typeof game[key] === "number" && Number.isFinite(game[key]) && (!key.endsWith("_plays") || game[key] >= 0)));
  } catch { return false; }
}

export function snapshotFreshness(builtAt, now = Date.now()) {
  const builtMs = Date.parse(builtAt || "");
  const ageSeconds = Number.isFinite(builtMs) ? Math.max(0, (now - builtMs) / 1000) : null;
  const requiresLiveRefresh = ageSeconds == null || ageSeconds > 120 * 60;
  return { ageSeconds, stale: ageSeconds == null || ageSeconds >= 60 * 60,
    requiresLiveRefresh, status: requiresLiveRefresh ? "last-known-good" : ageSeconds >= 60 * 60 ? "stale" : "current" };
}

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

const PUBLIC_FEED_PATHS = new Set(SNAPSHOT_FEEDS.map((feed) => feed.path));

function snapshotUrl(path) {
  // Only the builder's containerFetch RPC reaches this namespace. Neither the
  // Worker nor this Durable Object's public fetch forwards it to Python.
  return `http://localhost${INTERNAL_BOOTSTRAP_PREFIX}${path}`;
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

  async fetch(request) {
    const url = new URL(request.url);
    if (request.method !== "GET") return jsonResponse({ ok: false, error: "Public writes disabled" }, 403);
    if (!PUBLIC_FEED_PATHS.has(url.pathname)) return jsonResponse({ ok: false, error: "Not found" }, 404);
    url.searchParams.delete("force_refresh");
    const headers = new Headers(request.headers);
    headers.delete("x-force-bootstrap");
    return this.containerFetch(new Request(url, { method: "GET", headers }));
  }

  async readStoredFeed(manifest, feedKey, storage = this.ctx.storage) {
    const meta = manifest?.feeds?.[feedKey];
    if (!meta || !manifest?.generation || !Number.isFinite(Number(meta.chunks))) return null;
    const pieces = [];
    for (let i = 0; i < Number(meta.chunks); i += 1) {
      const piece = await storage.get(
        `${SNAPSHOT_PREFIX}${manifest.generation}:${feedKey}:${i}`
      );
      if (typeof piece !== "string") return null;
      pieces.push(piece);
    }
    return pieces.join("");
  }

  async getBootstrapSnapshot() {
    // Read the manifest and its chunks consistently with publication/cleanup.
    return this.ctx.storage.transaction(async (storage) => {
      const manifest = await storage.get(SNAPSHOT_MANIFEST_KEY);
      if (!manifest?.generation || !manifest?.builtAt) return null;

      const feeds = {};
      for (const feed of SNAPSHOT_FEEDS) {
        const body = await this.readStoredFeed(manifest, feed.key, storage);
        if (body == null && feed.required) return null;
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
        freshness: snapshotFreshness(manifest.builtAt),
        qbInputReady: gameFlowQbValid(feeds.gameFlow2026),
        feeds,
      };
    });
  }

  refreshBootstrapSnapshot(reason = "scheduled") {
    if (this.bootstrapRefresh) return this.bootstrapRefresh;
    if (["cache-miss", "stale-read", "schema-migration"].includes(reason)) return this.#recoverBootstrapSnapshot(reason);
    return this.#startBootstrapBuild(reason);
  }

  #startBootstrapBuild(reason) {
    if (!this.bootstrapRefresh) {
      this.bootstrapRefresh = this.#buildBootstrapSnapshot(reason).finally(() => {
        this.bootstrapRefresh = null;
      });
    }
    return this.bootstrapRefresh;
  }

  #recoverBootstrapSnapshot(reason) {
    // A cooldown check is not BUILD work. Cron only joins bootstrapRefresh,
    // never this possibly throttled/no-op promise.
    if (!this.bootstrapRecoveryCheck) {
      this.bootstrapRecoveryCheck = (async () => {
        // The first schema migration after rollout must not inherit a recent
        // old-code stale/cache-miss cooldown. Subsequent migration retries remain
        // bounded and persistent just like other read-triggered recovery.
        const recoveryKey = reason === "schema-migration" ? `${SNAPSHOT_RECOVERY_KEY}:v149-all-play` : SNAPSHOT_RECOVERY_KEY;
        const lastAttempt = await this.ctx.storage.get(recoveryKey);
        if (this.bootstrapRefresh) return this.bootstrapRefresh;
        const started = Date.now();
        if (Number.isFinite(lastAttempt) && started - lastAttempt < SNAPSHOT_RECOVERY_MS) return null;
        await this.ctx.storage.put(recoveryKey, started);
        return this.#startBootstrapBuild(reason);
      })().finally(() => { this.bootstrapRecoveryCheck = null; });
    }
    return this.bootstrapRecoveryCheck;
  }

  async #buildBootstrapSnapshot(reason) {
    const started = Date.now();
    const previous = await this.ctx.storage.get(SNAPSHOT_MANIFEST_KEY);
    const bodies = {};
    const warnings = [];
    const feedMeta = {};

    for (let offset = 0; offset < SNAPSHOT_FEEDS.length; offset += 4) {
      const batch = SNAPSHOT_FEEDS.slice(offset, offset + 4);
      const results = await Promise.all(batch.map(async (feed) => {
        try {
          const response = await this.containerFetch(
            snapshotUrl(feed.path)
          );
          if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
          const body = await response.text();
          if (!body.trim()) throw new Error("empty response");
          if (feed.key === "gameFlow2026" && !gameFlowQbValid(body)) throw new Error("all-play QB schema/reference unavailable");
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
          if (fallback != null && (feed.key !== "gameFlow2026" || gameFlowQbValid(fallback))) {
            warnings.push(`${feed.key} refresh failed; retained previous snapshot`);
            return {
              feed,
              body: fallback,
              contentType: previous?.feeds?.[feed.key]?.contentType || "text/plain",
              source: "previous",
            };
          }
          warnings.push(`${feed.key} unavailable in bootstrap snapshot${feed.key === "gameFlow2026" ? "; QB input unavailable, old-schema fallback rejected" : ""}`);
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

    if (previous?.generation && !gameFlowQbValid(bodies.gameFlow2026)) {
      throw new Error("All-play QB input unavailable; retained existing stored snapshot until a valid replacement can publish");
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

    const generation = `${Date.now()}-${crypto.randomUUID()}`;
    const writtenKeys = [];
    let published = false;

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
        qbInputReady: gameFlowQbValid(bodies.gameFlow2026),
        qbEpaDefinition: gameFlowQbValid(bodies.gameFlow2026) ? QB_EPA_DEFINITION : null,
      };

      // Commit the pointer and remove old chunks atomically. Failure rolls back
      // to the previous complete generation; unpublished new chunks are disposable.
      await this.ctx.storage.transaction(async (storage) => {
        await storage.put(SNAPSHOT_MANIFEST_KEY, manifest);
        if (previous?.generation && previous.generation !== generation) {
          const old = await storage.list({
            prefix: `${SNAPSHOT_PREFIX}${previous.generation}:`,
          });
          if (old.size) await storage.delete([...old.keys()]);
        }
      });
      published = true;

      console.log("FORCE bootstrap snapshot refreshed", {
        generation, reason, durationMs: manifest.durationMs, warnings,
      });
      return manifest;
    } catch (error) {
      if (!published && writtenKeys.length) await this.ctx.storage.delete(writtenKeys);
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
    if (url.pathname.startsWith("/api/") && request.method !== "GET") {
      return jsonResponse({ ok: false, error: "Public writes disabled" }, 403);
    }
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
      if (!snapshot.qbInputReady || snapshot.freshness.stale) {
        ctx.waitUntil(force.refreshBootstrapSnapshot(!snapshot.qbInputReady ? "schema-migration" : "stale-read").catch((error) => {
          console.error("FORCE stale snapshot refresh failed", error);
        }));
      }
      return jsonResponse(snapshot, 200, {
        "x-force-bootstrap-built-at": snapshot.builtAt,
      });
    }

    if (url.pathname === "/api/bootstrap-status") {
      const status = await force.bootstrapStatus();
      return jsonResponse({ ok: true, snapshot: status,
        freshness: status ? snapshotFreshness(status.builtAt) : null });
    }

    if (url.pathname.startsWith("/api/")) {
      if (!PUBLIC_FEED_PATHS.has(url.pathname)) return jsonResponse({ ok: false, error: "Not found" }, 404);
      return force.fetch(request);
    }
    if (url.pathname.startsWith(INTERNAL_BOOTSTRAP_PREFIX)) return jsonResponse({ ok: false, error: "Not found" }, 404);
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

