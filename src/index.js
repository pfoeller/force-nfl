import { Container, getContainer } from "@cloudflare/containers";

export class ForceContainer extends Container {
  defaultPort = 8080;
  requiredPorts = [8080];
  sleepAfter = "2h";
  enableInternet = true;
  pingEndpoint = "localhost/api/health";
  envVars = {
    FORCE_HOST: "0.0.0.0",
    FORCE_PORT: "8080",
    FORCE_AUTO_OPEN: "0",
    FORCE_PUBLIC: "1",
  };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      return getContainer(env.FORCE_CONTAINER, "force-main").fetch(request);
    }
    return env.ASSETS.fetch(request);
  },
};
