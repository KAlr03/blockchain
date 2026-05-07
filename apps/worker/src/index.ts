import { env } from "@halal/config";
import { runCertificateProcessingJob } from "./jobs/process-certificates.js";
import http from "http";

async function tick() {
  const processed = await runCertificateProcessingJob();
  if (processed > 0) {
    console.log(`[worker] processed ${processed} pending certificates`);
  }
}

// ── HTTP server to receive trigger from API ───────────────────────────────────
const server = http.createServer(async (req, res) => {
  if (req.method === "POST" && req.url === "/trigger") {
    console.log("[worker] triggered by API — processing certificates now");
    await tick();
    res.writeHead(200);
    res.end("ok");
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(4001, () => {
  console.log("[worker] trigger server listening on port 4001");
});

// ── Backup polling every 60 seconds (reduced from 10s) ───────────────────────
async function main() {
  await tick();
  console.log(`[worker] processed 0 pending certificates`);
  setInterval(() => {
    tick().catch((error) => {
      console.error("[worker] job failed", error);
    });
  }, 60000); // 60 seconds backup poll
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
