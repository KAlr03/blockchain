# Run The Whole Stack Locally

This document is the full local runbook for the Halal Supply Chain monorepo.

All commands below are run from the repository root:

`<project-root>`

Recommended local setup:
- MongoDB in Docker
- Hardhat blockchain in a local terminal
- API in a local terminal
- Worker in a local terminal
- Web app in a local terminal

This gives you the full stack together while keeping setup simple and easy to debug.

## What You Need

- Node.js 20+
- npm 10+
- Docker Desktop or Docker Engine
- 5 terminal tabs/windows

## Step 1: Open The Project Root

```bash
cd <project-root>
```

## Step 2: Create The `.env` File

Copy the example file:

```bash
cp .env.example .env
```

Open `.env` and start with these values:

```env
NODE_ENV=development
PORT=4000
JWT_SECRET=local-dev-super-secret-key
MONGODB_URI=mongodb://127.0.0.1:27017/halal_supply_chain
VERIFY_BASE_URL=http://localhost:5173/verify
STORAGE_DRIVER=local
STORAGE_BASE_PATH=./uploads
AWS_REGION=eu-central-1
AWS_S3_BUCKET=halal-supply-chain
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
BLOCKCHAIN_RPC_URL=http://127.0.0.1:8545
BLOCKCHAIN_PRIVATE_KEY=
CONTRACT_ADDRESS=
OCR_LANG=eng
WORKER_POLL_MS=10000
BOOTSTRAP_ADMIN_EMAIL=admin@example.com
BOOTSTRAP_ADMIN_PASSWORD=Admin12345!
BOOTSTRAP_ADMIN_NAME=Platform Admin
BOOTSTRAP_ADMIN_COUNTRY=Kuwait
BOOTSTRAP_ADMIN_ORGANIZATION=Halal Supply Chain
```

Important notes:
- Leave `BLOCKCHAIN_PRIVATE_KEY` empty for now.
- Leave `CONTRACT_ADDRESS` empty for now.
- You will fill those two values after the local contract is deployed.
- If you want to use a remote MongoDB server instead of local Docker Mongo, replace only `MONGODB_URI`.

## Step 3: Install Dependencies

```bash
npm install
```

## Step 4: Start MongoDB

Open Terminal 1 and run:

```bash
cd <project-root>
docker compose -f infra/docker/docker-compose.yml up mongo
```

MongoDB will be available at:

- `mongodb://127.0.0.1:27017/halal_supply_chain`

If you prefer background mode:

```bash
docker compose -f infra/docker/docker-compose.yml up -d mongo
```

## Step 5: Initialize The Local MongoDB Database

Open Terminal 2 and run:

```bash
cd <project-root>
npm run db:init
```

What this does:
- creates the `certificates`, `products`, `traceability_records`, and `users` collections if they do not already exist
- syncs the Mongoose indexes declared by the production-compatible API models
- seeds the bootstrap admin user if `BOOTSTRAP_ADMIN_EMAIL` and `BOOTSTRAP_ADMIN_PASSWORD` are set in `.env`

This is the cleanest way to get your local MongoDB “tables” ready before you start the rest of the stack.

## Step 6: Seed Demo Data (Optional But Recommended)

Open Terminal 3 and run:

```bash
cd <project-root>
npm run db:seed-demo
```

What this adds:
- one admin login
- one manufacturer login
- one authority login
- one product linked to one halal certificate
- three traceability records for that product

The command is idempotent, so you can run it again without creating duplicate demo rows.

Default demo credentials if you did not set bootstrap admin values in `.env`:
- admin: `admin@example.com` / `Admin12345!`
- manufacturer: `manufacturer@example.com` / `Manufacturer123!`
- authority: `authority@example.com` / `Authority123!`

If `BOOTSTRAP_ADMIN_EMAIL` and `BOOTSTRAP_ADMIN_PASSWORD` are set in `.env`, the admin login will use those values instead of the default demo admin.

Useful seeded identifiers:
- product ID: `PROD-DEMO-BATCH-001`
- certificate ID: `CERT-DEMO-001`
- verification URL: `http://localhost:5173/verify/PROD-DEMO-BATCH-001`
- demo certificate file: `apps/api/uploads/certificates/demo-halal-certificate.txt`

## Step 7: Start The Local Hardhat Blockchain

Open Terminal 4 and run:

```bash
cd <project-root>
npm run contracts:node
```

Keep this terminal open.

Use this root script instead of `npx hardhat node --config packages/contracts/hardhat.config.ts`.
Hardhat resolves its TypeScript config relative to the current working directory, so the raw `npx` command can fail from the repo root with a `TS5109` config error.

This command prints:
- local accounts
- their private keys

Important:
- `packages/contracts/scripts/deploy.ts` deploys the contract with signer `#0` as admin
- it assigns signer `#1` as the contract authority
- the API must use the private key for signer `#1`, not signer `#0`

## Step 8: Deploy The Contract

Open Terminal 5 and run:

```bash
cd <project-root>
npm run contracts:deploy:local
```

You will see output similar to:

```text
HalalCertificateRegistry deployed to: 0x...
Admin: 0x...
Authority: 0x...
```

Copy:
- the deployed contract address
- the private key of Hardhat Account `#1` from Terminal 4

## Step 9: Update `.env` With Blockchain Values

Open `.env` again and fill in:

```env
BLOCKCHAIN_PRIVATE_KEY=<private key for Hardhat Account #1>
CONTRACT_ADDRESS=<deployed contract address>
```

Example:

```env
BLOCKCHAIN_RPC_URL=http://127.0.0.1:8545
BLOCKCHAIN_PRIVATE_KEY=0xabc123...
CONTRACT_ADDRESS=0x1234567890abcdef...
```

Why Account `#1` matters:
- the deploy script makes Account `#1` the on-chain `authority`
- certificate decisions are written on-chain by the authority
- if you use the wrong private key, certificate approval will fail on-chain

## Step 10: Start The API

Open Terminal 6 and run:

```bash
cd <project-root>
npm run dev:api
```

On startup:
- the API reads `.env`
- it connects to MongoDB

Health check:

Open this in the browser or use curl:

- [http://localhost:4000/health](http://localhost:4000/health)

Expected response:

```json
{"ok":true}
```

## Step 11: Start The Worker

Open Terminal 7 and run:

```bash
cd <project-root>
npm run dev:worker
```

The worker:
- polls MongoDB for certificates with `PENDING_AI`
- runs the deterministic OCR/rules stage
- moves them to `UNDER_AUTHORITY_REVIEW`

By default it polls every 10 seconds because:

```env
WORKER_POLL_MS=10000
```

## Step 12: Start The Web App

Open Terminal 8 and run:

```bash
cd <project-root>
npm run dev:web
```

Open the app here:

- [http://localhost:5173](http://localhost:5173)

Login page:

- [http://localhost:5173/login](http://localhost:5173/login)

## Step 13: Log In

Use either:
- the bootstrap admin credentials you placed in `.env`, or
- the demo seed credentials from `npm run db:seed-demo`

- email: `BOOTSTRAP_ADMIN_EMAIL`
- password: `BOOTSTRAP_ADMIN_PASSWORD`

Example:

- email: `admin@example.com`
- password: `Admin12345!`

After login, you will land in the internal dashboard.

## Step 14: Understand The Main Navigation

After logging in, these routes are available in the web UI:

- `/` -> Dashboard
- `/products` -> create and list products
- `/certificates` -> upload and review certificates
- `/traceability` -> add and view traceability records
- `/verify` -> public verification page

The public verification page also supports direct product URLs:

- `/verify/<productId>`

Example:

- `http://localhost:5173/verify/PROD-BATCH-001-1712345678901`

## Step 15: Run An End-To-End Test Flow

### 15.1 Create A Product

In the web app:

1. Go to `Products`
2. Fill:
   - Product name
   - Batch number
   - Brand
   - Category
   - Manufacturer
   - Origin country
   - Health ref
   - Weight
3. Click `Create Product`

The app will generate a `productId`.

Keep that `productId`.

### 15.2 Upload A Certificate

In the web app:

1. Go to `Certificates`
2. In `Upload Certificate`, fill:
   - Product ID
   - Certificate number
   - Certificate type
   - Authority name
   - Issue date
   - Expiry date
   - Certificate file (`.pdf`, `.png`, `.jpg`, `.jpeg`)
3. Click `Upload Certificate`

What happens:
- file is stored locally under the API uploads directory, typically `apps/api/uploads`
- certificate is stored in MongoDB with `PENDING_AI`
- product gets linked to the certificate

### 15.3 Wait For Worker Processing

Wait around 10 seconds.

The worker should process the uploaded certificate and move it from:

- `PENDING_AI`

to:

- `UNDER_AUTHORITY_REVIEW`

### 15.4 Approve Or Reject The Certificate

Still in `Certificates`:

1. Copy the certificate ID from the certificate list
2. In `Authority Review`, fill:
   - Certificate ID
   - Authority notes
3. Click:
   - `Approve`, or
   - `Reject`

If approved:
- MongoDB record is updated
- blockchain final certificate decision is recorded
- the product remains linked to the certificate through `products.HalalRef`
- public verification can reconcile the approved certificate against the blockchain

### 15.5 Add Traceability Records

Go to `Traceability`:

1. Fill:
   - Product ID
   - Batch number
   - Actor name
   - Stage
   - Location
   - Country
   - Temperature
   - Notes
   - Timestamp
2. Click `Create Trace Step`

### 15.6 Verify Publicly

Go to:

- `Public Verify` in the navigation

Enter the `productId`, then click `Verify`.

You should see:
- product details
- certificate status
- authority name
- blockchain anchored status
- traceability records

You can also open the direct verify URL:

```text
http://localhost:5173/verify/<productId>
```

## Step 16: Optional API Commands

These are useful if you want to test the backend directly.

### 16.1 Login And Get JWT

```bash
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email":"admin@example.com",
    "password":"Admin12345!"
  }'
```

Copy the `token` from the response.

### 16.2 Check Current User

```bash
curl http://localhost:4000/auth/me \
  -H "Authorization: Bearer <TOKEN>"
```

### 16.3 List Products

```bash
curl http://localhost:4000/products \
  -H "Authorization: Bearer <TOKEN>"
```

### 16.4 Public Verify

```bash
curl http://localhost:4000/verify/<PRODUCT_ID>
```

## Step 17: If You Want To Create Additional Users

There is backend support for user management, but there is no dedicated user-management page in the current web UI yet.

For local testing, the easiest approach is:
- log in as the bootstrap admin
- use that admin account for product, certificate, and traceability testing

If you still want to create more users, use the API with the admin JWT:

```bash
curl -X POST http://localhost:4000/users \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "name":"Authority User",
    "email":"authority@example.com",
    "country":"Kuwait",
    "organizationName":"Kuwait Municipality",
    "manufacturerId":"AUTH-001",
    "password":"Authority123!",
    "role":"AUTHORITY",
    "status":"ACTIVE"
  }'
```

Example manufacturer:

```bash
curl -X POST http://localhost:4000/users \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "name":"Manufacturer User",
    "email":"manufacturer@example.com",
    "country":"Kuwait",
    "organizationName":"Importer Co",
    "manufacturerId":"MFR-001",
    "password":"Manufacturer123!",
    "role":"MANUFACTURER",
    "status":"ACTIVE"
  }'
```

## Step 18: How To Restart After Changing `.env`

If you change:
- `CONTRACT_ADDRESS`
- `BLOCKCHAIN_PRIVATE_KEY`
- `MONGODB_URI`
- bootstrap admin fields

restart these services:
- API
- worker

The web app usually does not need a restart unless you changed frontend-specific env vars.

## Step 19: Recommended Local Variants

### Variant A: Recommended

Use:
- Mongo in Docker
- Hardhat in terminal
- API in terminal
- Worker in terminal
- Web in terminal

This is the best option for local development and debugging.

### Variant B: Remote MongoDB

If you already have a remote MongoDB server:
- keep all steps the same
- replace only `MONGODB_URI` in `.env`

Example:

```env
MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@cluster.example.mongodb.net/halal_supply_chain
```

Do not use the production database for routine local testing unless you intentionally want shared live data.

## Step 20: Stop Everything

If Mongo is running in Docker foreground:
- press `Ctrl+C` in the Mongo terminal

If Mongo is running detached:

```bash
docker compose -f infra/docker/docker-compose.yml stop mongo
```

Stop the rest with `Ctrl+C` in each terminal:
- Hardhat node
- API
- worker
- web

## Troubleshooting

### API login works but no admin exists

Cause:
- API started before bootstrap admin vars were set

Fix:
1. Update `.env`
2. restart API
3. if the user still does not exist, inspect MongoDB `users` collection

### Certificate approval fails on-chain

Cause:
- wrong `BLOCKCHAIN_PRIVATE_KEY`

Fix:
- use the private key for Hardhat Account `#1`
- not Account `#0`

### Public verify page shows product but no blockchain anchor

Cause:
- `CONTRACT_ADDRESS` or `BLOCKCHAIN_PRIVATE_KEY` was empty
- API/worker were not restarted after `.env` change

Fix:
1. update `.env`
2. restart API
3. restart worker
4. approve the certificate again if needed in a clean test flow

### Worker does not process certificates

Check:
- worker terminal is running
- `MONGODB_URI` is correct
- uploaded certificates are actually being inserted with `PENDING_AI`

### Web app loads but API calls fail

Check:
- API is running on `http://localhost:4000`
- `.env` has `PORT=4000`
- frontend is using `http://localhost:5173`

## Related Files

- [`.env.example`](../.env.example)
- [`docs/setup.md`](./setup.md)
- [`infra/docker/docker-compose.yml`](../infra/docker/docker-compose.yml)
- [`packages/contracts/scripts/deploy.ts`](../packages/contracts/scripts/deploy.ts)
- [`apps/web/src/app/router.tsx`](../apps/web/src/app/router.tsx)
