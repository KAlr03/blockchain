import mongoose from "mongoose";
import { connectToDatabase } from "../lib/db.js";
import { ensureBootstrapAdmin } from "../lib/bootstrap.js";
import { ensureCollectionsAndIndexes } from "../lib/mongo-init.js";

async function main() {
  await connectToDatabase();
  await ensureCollectionsAndIndexes();
  await ensureBootstrapAdmin();

  const database = mongoose.connection.db;
  if (!database) {
    throw new Error("MongoDB connection is not available.");
  }

  const collections = await database
    .listCollections({}, { nameOnly: true })
    .toArray();

  console.log("MongoDB initialization complete.");
  console.log(`Collections present: ${collections.map((collection) => collection.name).sort().join(", ")}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
