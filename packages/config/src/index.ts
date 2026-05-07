import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { z } from "zod";

function findEnvFile(startDir: string) {
  let currentDir = path.resolve(startDir);

  while (true) {
    const candidate = path.join(currentDir, ".env");
    if (fs.existsSync(candidate)) {
      return candidate;
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      return null;
    }

    currentDir = parentDir;
  }
}

const envFile =
  findEnvFile(process.cwd()) ??
  (process.env.INIT_CWD ? findEnvFile(process.env.INIT_CWD) : null);

dotenv.config(envFile ? { path: envFile } : undefined);

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  JWT_SECRET: z.string().default("dev-secret"),
  MONGODB_URI: z.string().default("mongodb://127.0.0.1:27017/halal_supply_chain"),
  VERIFY_BASE_URL: z.string().default("http://localhost:5173/verify"),
  STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
  STORAGE_BASE_PATH: z.string().default("./uploads"),
  AWS_REGION: z.string().default("eu-central-1"),
  AWS_S3_BUCKET: z.string().default("halal-supply-chain"),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  BLOCKCHAIN_RPC_URL: z.string().default("http://127.0.0.1:8545"),
  BLOCKCHAIN_PRIVATE_KEY: z.string().default(""),
  CONTRACT_ADDRESS: z.string().default(""),
  OCR_LANG: z.string().default("eng"),
  WORKER_POLL_MS: z.coerce.number().default(10000),
  BOOTSTRAP_ADMIN_EMAIL: z.string().optional(),
  BOOTSTRAP_ADMIN_PASSWORD: z.string().optional(),
  BOOTSTRAP_ADMIN_NAME: z.string().optional(),
  BOOTSTRAP_ADMIN_COUNTRY: z.string().optional(),
  BOOTSTRAP_ADMIN_ORGANIZATION: z.string().optional()
});

export type AppEnv = z.infer<typeof envSchema>;
export const env = envSchema.parse(process.env);
