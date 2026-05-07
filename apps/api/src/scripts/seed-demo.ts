import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import QRCode from "qrcode";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { env } from "@halal/config";
import { connectToDatabase } from "../lib/db.js";
import { ensureBootstrapAdmin } from "../lib/bootstrap.js";
import { ensureCollectionsAndIndexes } from "../lib/mongo-init.js";
import { sha256FromBuffer } from "../lib/hash.js";
import { CertificateModel } from "../repositories/models/certificate.model.js";
import { ProductModel } from "../repositories/models/product.model.js";
import { TraceabilityModel } from "../repositories/models/traceability.model.js";
import { UserModel } from "../repositories/models/user.model.js";

const DEMO_PRODUCT_ID = "PROD-DEMO-BATCH-001";
const DEMO_CERTIFICATE_ID = "CERT-DEMO-001";
const DEMO_CERTIFICATE_NUMBER = "HALAL-CERT-DEMO-001";
const DEMO_CERTIFICATE_FILE_NAME = "demo-halal-certificate.txt";

interface DemoUserInput {
  name: string;
  email: string;
  country: string;
  organizationName: string;
  manufacturerId: string;
  password: string;
  role: string;
  status: string;
}

const demoUsers: DemoUserInput[] = [
  {
    name: "Demo Manufacturer",
    email: "manufacturer@example.com",
    country: "Kuwait",
    organizationName: "Demo Halal Imports",
    manufacturerId: "MFR-DEMO-001",
    password: "Manufacturer123!",
    role: "MANUFACTURER",
    status: "ACTIVE"
  },
  {
    name: "Demo Authority",
    email: "authority@example.com",
    country: "Kuwait",
    organizationName: "Kuwait Municipality Halal Authority",
    manufacturerId: "AUTH-DEMO-001",
    password: "Authority123!",
    role: "AUTHORITY",
    status: "ACTIVE"
  }
];

const fallbackAdmin: DemoUserInput = {
  name: "Demo Admin",
  email: "admin@example.com",
  country: "Kuwait",
  organizationName: "Halal Supply Chain",
  manufacturerId: "ADMIN-ROOT",
  password: "Admin12345!",
  role: "ADMIN",
  status: "ACTIVE"
};

const demoProduct = {
  BatchNumber: "DEMO-BATCH-001",
  Brand: "Kuwait Fresh",
  Category: "Meat",
  CreatedAt: new Date("2026-01-20T09:00:00.000Z"),
  HalalRef: DEMO_CERTIFICATE_ID,
  HealthRef: "KUWAIT-HEALTH-001",
  Manufacturer: "Demo Halal Imports",
  OriginCountry: "Australia",
  ProductID: DEMO_PRODUCT_ID,
  ProductImage: null,
  ProductName: "Australian Halal Lamb",
  Weight: "1kg"
} as const;

const demoCertificateText = `Demo halal certificate for local development
Product: Australian Halal Lamb
Certificate Number: ${DEMO_CERTIFICATE_NUMBER}
Authority: Kuwait Municipality Halal Authority
Issue Date: 2026-01-15
Expiry Date: 2027-01-15
`;

const demoTraceabilityRecords = [
  {
    ActorName: "Demo Halal Imports",
    BatchNumber: demoProduct.BatchNumber,
    Country: "Australia",
    Location: "Melbourne Processing Facility",
    Notes: "Initial halal processing and packing completed.",
    ProductID: DEMO_PRODUCT_ID,
    Stage: "Processing",
    Status: "RECORDED",
    Temperature: "-2C",
    Timestamp: new Date("2026-01-20T10:00:00.000Z")
  },
  {
    ActorName: "Demo Halal Imports",
    BatchNumber: demoProduct.BatchNumber,
    Country: "Kuwait",
    Location: "Shuwaikh Port Cold Storage",
    Notes: "Cold-chain shipment received and inspected on arrival.",
    ProductID: DEMO_PRODUCT_ID,
    Stage: "Import Reception",
    Status: "RECEIVED",
    Temperature: "-1C",
    Timestamp: new Date("2026-01-24T08:30:00.000Z")
  },
  {
    ActorName: "Kuwait Municipality Halal Authority",
    BatchNumber: demoProduct.BatchNumber,
    Country: "Kuwait",
    Location: "Central Market Distribution Hub",
    Notes: "Authority review completed and release approved for retail distribution.",
    ProductID: DEMO_PRODUCT_ID,
    Stage: "Authority Clearance",
    Status: "APPROVED",
    Temperature: "0C",
    Timestamp: new Date("2026-01-24T14:00:00.000Z")
  }
] as const;

async function upsertUser(user: DemoUserInput) {
  const hashedPassword = await bcrypt.hash(user.password, 10);

  return UserModel.findOneAndUpdate(
    { Email: user.email },
    {
      $set: {
        Country: user.country,
        Email: user.email,
        ManufacturerID: user.manufacturerId,
        Name: user.name,
        OrganizationName: user.organizationName,
        Password: hashedPassword,
        Role: user.role,
        Status: user.status
      },
      $setOnInsert: {
        CreatedAt: new Date()
      }
    },
    {
      upsert: true,
      new: true
    }
  ).lean();
}

async function seedAdminUser() {
  await ensureBootstrapAdmin();

  if (env.BOOTSTRAP_ADMIN_EMAIL && env.BOOTSTRAP_ADMIN_PASSWORD) {
    const adminUser = await UserModel.findOne({ Email: env.BOOTSTRAP_ADMIN_EMAIL }).lean();
    return {
      email: env.BOOTSTRAP_ADMIN_EMAIL,
      password: env.BOOTSTRAP_ADMIN_PASSWORD,
      source: adminUser ? "bootstrap" : "bootstrap-missing"
    };
  }

  await upsertUser(fallbackAdmin);
  return {
    email: fallbackAdmin.email,
    password: fallbackAdmin.password,
    source: "demo"
  };
}

async function seedUsers() {
  for (const user of demoUsers) {
    await upsertUser(user);
  }
}

async function seedDemoCertificateAsset() {
  const buffer = Buffer.from(demoCertificateText, "utf8");
  const directory = path.resolve(env.STORAGE_BASE_PATH, "certificates");
  const fullPath = path.join(directory, DEMO_CERTIFICATE_FILE_NAME);

  await mkdir(directory, { recursive: true });
  await writeFile(fullPath, buffer);

  return {
    imageHash: sha256FromBuffer(buffer),
    imagePath: fullPath
  };
}

async function seedProduct() {
  const verificationUrl = `${env.VERIFY_BASE_URL}/${encodeURIComponent(DEMO_PRODUCT_ID)}`;
  const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl);

  await ProductModel.findOneAndUpdate(
    { ProductID: DEMO_PRODUCT_ID },
    {
      $set: {
        BatchNumber: demoProduct.BatchNumber,
        Brand: demoProduct.Brand,
        Category: demoProduct.Category,
        HalalRef: demoProduct.HalalRef,
        HealthRef: demoProduct.HealthRef,
        Manufacturer: demoProduct.Manufacturer,
        OriginCountry: demoProduct.OriginCountry,
        ProductImage: demoProduct.ProductImage,
        ProductName: demoProduct.ProductName,
        QRCodePath: qrCodeDataUrl,
        Weight: demoProduct.Weight
      },
      $setOnInsert: {
        CreatedAt: demoProduct.CreatedAt
      }
    },
    {
      upsert: true,
      new: true
    }
  ).lean();

  return verificationUrl;
}

async function seedCertificate() {
  const asset = await seedDemoCertificateAsset();

  await CertificateModel.findOneAndUpdate(
    { _id: DEMO_CERTIFICATE_ID },
    {
      $set: {
        AICheckedAt: new Date("2026-01-24T13:00:00.000Z"),
        AIReason: "Demo seed certificate marked as valid for local UI and API testing.",
        AIScore: 0.98,
        AIVerdict: "PASS",
        ApprovedAt: null,
        ApprovedBy: null,
        Authority: "Kuwait Municipality Halal Authority",
        BlockchainHash: null,
        BlockchainTimestamp: null,
        BlockchainTxID: null,
        CertNumber: DEMO_CERTIFICATE_NUMBER,
        CertType: "Halal Import Certificate",
        ExpiryDate: new Date("2027-01-15T00:00:00.000Z"),
        ImageHash: asset.imageHash,
        ImagePath: asset.imagePath,
        IssueDate: new Date("2026-01-15T00:00:00.000Z"),
        Status: "APPROVED"
      },
      $setOnInsert: {
        CreatedAt: new Date("2026-01-20T09:30:00.000Z")
      }
    },
    {
      upsert: true,
      new: true
    }
  ).lean();
}

async function seedTraceability() {
  for (const record of demoTraceabilityRecords) {
    await TraceabilityModel.findOneAndUpdate(
      {
        ProductID: record.ProductID,
        Stage: record.Stage,
        Timestamp: record.Timestamp
      },
      {
        $set: {
          ActorName: record.ActorName,
          BatchNumber: record.BatchNumber,
          BlockchainHash: null,
          BlockchainTxID: null,
          Country: record.Country,
          Location: record.Location,
          Notes: record.Notes,
          Status: record.Status,
          Temperature: record.Temperature
        },
        $setOnInsert: {
          Timestamp: record.Timestamp
        }
      },
      {
        upsert: true,
        new: true
      }
    ).lean();
  }
}

async function main() {
  await connectToDatabase();
  await ensureCollectionsAndIndexes();

  const adminCredentials = await seedAdminUser();
  await seedUsers();
  const verificationUrl = await seedProduct();
  await seedCertificate();
  await seedTraceability();

  console.log("Demo seed complete.");
  console.log(`Admin login: ${adminCredentials.email} / ${adminCredentials.password}`);
  console.log("Manufacturer login: manufacturer@example.com / Manufacturer123!");
  console.log("Authority login: authority@example.com / Authority123!");
  console.log(`Demo product ID: ${DEMO_PRODUCT_ID}`);
  console.log(`Demo certificate ID: ${DEMO_CERTIFICATE_ID}`);
  console.log(`Public verify URL: ${verificationUrl}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
