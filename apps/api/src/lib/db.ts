import mongoose from "mongoose";
import { env } from "@halal/config";

let connected = false;

export async function connectToDatabase() {
  if (connected) {
    return mongoose.connection;
  }

  await mongoose.connect(env.MONGODB_URI);
  connected = true;
  return mongoose.connection;
}
