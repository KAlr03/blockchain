import { env } from "@halal/config";
import { createApp } from "./app.js";
import { ensureBootstrapAdmin } from "./lib/bootstrap.js";
import { connectToDatabase } from "./lib/db.js";

async function main() {
  await connectToDatabase();
  await ensureBootstrapAdmin();
  const app = createApp();

  app.listen(env.PORT, "0.0.0.0", () => {
    console.log(`API listening on http://localhost:${env.PORT}`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
