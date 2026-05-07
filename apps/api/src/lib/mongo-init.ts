import { CertificateModel } from "../repositories/models/certificate.model.js";
import { ProductModel } from "../repositories/models/product.model.js";
import { TraceabilityModel } from "../repositories/models/traceability.model.js";
import { UserModel } from "../repositories/models/user.model.js";

const models = [CertificateModel, ProductModel, TraceabilityModel, UserModel];

export async function ensureCollectionsAndIndexes() {
  for (const model of models) {
    try {
      await model.createCollection();
      console.log(`Ensured collection: ${model.collection.name}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes("already exists")) {
        throw error;
      }
      console.log(`Collection already exists: ${model.collection.name}`);
    }

    const syncResult = await model.syncIndexes();
    console.log(
      `Indexes synced for ${model.collection.name}: ${syncResult.length > 0 ? syncResult.join(", ") : "no index changes"}`
    );
  }
}
