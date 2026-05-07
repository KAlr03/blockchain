# Local Setup Guide

This project is a full stack application. That means it has multiple parts working together:

- a web frontend
- a backend API
- a background worker
- a MongoDB database
- a local blockchain
- a smart contract

## 1. The Big Picture

When this project runs locally, these pieces work together:

- `apps/web`
  This is the website you open in the browser. It is built with React and Vite.

- `apps/api`
  This is the backend server. It receives requests from the frontend, talks to MongoDB, stores files, and talks to the blockchain.

- `apps/worker`
  This is a background process. It checks newly uploaded certificates and moves them from `PENDING_AI` to `UNDER_AUTHORITY_REVIEW`.

- `MongoDB`
  This stores the application's main data: users, products, certificates, and traceability records.

- `Hardhat`
  This gives us a local blockchain network on your computer so we can test smart contract behavior safely.

- `Ethers`
  This is the JavaScript library the backend uses to talk to the smart contract through Hardhat.

## 2. What Each Technology Is

### Node.js

Node.js lets us run JavaScript and TypeScript outside the browser.

Why we need it here:

- the backend API runs on Node.js
- the worker runs on Node.js
- the frontend build/dev server uses Node.js tools
- Hardhat also runs on Node.js

### npm

`npm` is the package manager that installs the project's dependencies and runs scripts.

Examples in this repo:

- `npm install`
- `npm run dev:api`
- `npm run dev:web`
- `npm run contracts:node`

Think of `npm run ...` as a safe shortcut for common project commands.

### Docker

Docker lets you run software inside containers.

A container is a packaged environment that already contains what that software needs. This helps avoid the classic problem of:

"It works on one machine but not on another."

Why we use Docker here:

- to run MongoDB locally without installing MongoDB directly on your computer

Why this is useful for students:

- easier setup
- easier cleanup
- less chance of breaking your machine's own environment
- everyone on the team can run the same database setup

In this project, we mainly use Docker for MongoDB during local development.

### MongoDB

MongoDB is the main database of this project.

It stores data like:

- users
- products
- certificates
- traceability records

Why MongoDB is used:

- it is flexible for document-style application data
- it works well with JavaScript backends
- Mongoose gives us a model layer on top of it

### Mongoose

Mongoose is the library that lets the backend work with MongoDB using models and schemas.

Why it helps:

- we define the expected structure of documents
- we can validate and query data more easily
- the code becomes easier to read than raw database calls

Important note for this project:

- the root schema JSON files are treated as the production field source of truth
- the app keeps Mongo field names compatible with those schema files

### React

React is the frontend library used to build the user interface.

Why we use it:

- it helps us build pages from reusable components
- it updates the screen when data changes
- it is one of the most common web frontend tools

### Vite

Vite is the development server and build tool for the React app.

Why we use it:

- very fast startup
- fast refresh in development
- simpler setup than older frontend tooling

When you run:

```bash
npm run dev:web
```

Vite starts the local frontend server.

### Express

Express is the web framework used by the backend API.

Why we use it:

- it makes route handling simple
- it is easy to connect with MongoDB and authentication
- it is one of the standard backend frameworks in Node.js

### JWT

JWT stands for JSON Web Token.

This is how the app keeps a user logged in after login.

Simple idea:

1. you log in with email and password
2. the API creates a signed token
3. the browser sends that token back on future requests
4. the API checks whether the token is valid

Why the app needs `JWT_SECRET`:

- the token is signed using that secret
- if the secret changes, old tokens stop working

That is why you sometimes must log in again after changing auth-related config.

### Hardhat

Hardhat is a local development tool for Ethereum-style smart contracts.

Why we use it here:

- it creates a local blockchain network on your machine
- it gives us test accounts with fake funds
- it lets us deploy and test the contract safely
- nothing touches a real blockchain during local development

When you run:

```bash
npm run contracts:node
```

Hardhat starts a local blockchain RPC server at:

```text
http://127.0.0.1:8545
```

### Smart Contract

A smart contract is code that runs on the blockchain.

In this project, the contract is used as an integrity layer.

That means:

- the full application data stays in MongoDB
- important proof-style records are anchored on-chain

Examples of on-chain data here:

- final certificate approval/rejection anchor
- certificate hash
- traceability record hash anchors

### Ethers

Ethers is the JavaScript library that talks to the blockchain.

Important idea:

- you do not run Ethers as its own server
- Ethers is used inside the backend code

In this project:

- the API uses Ethers to connect to the Hardhat RPC URL
- it signs transactions using the private key from `.env`
- it calls the deployed smart contract at `CONTRACT_ADDRESS`

So:

- Hardhat gives us the blockchain
- Ethers is how our backend speaks to that blockchain

## 3. Why We Use Hardhat Accounts `#0` And `#1`

When Hardhat starts, it prints many test accounts and their private keys.

These are local development accounts only. They are not real production wallets.

In this project:

- account `#0` is used by the deploy script as the deployer/admin
- account `#1` is assigned as the contract authority

Why the API uses account `#1`:

- the API performs authority actions such as certificate decision writes
- those actions are supposed to come from the authority role
- so the API must sign blockchain transactions with the authority account's private key

That is why the correct local setup is:

- deploy with Hardhat
- copy the deployed contract address
- copy the private key of account `#1`
- place those in the root `.env`

If you use the wrong private key, blockchain writes can fail or use the wrong role.

## 4. Why We Use `.env`

The `.env` file stores environment variables.

These are configuration values that change between machines and environments.

Examples:

- database URL
- JWT secret
- blockchain private key
- contract address

Why this matters:

- the code stays the same
- only configuration changes between local, staging, and production

In this repo, use the root `.env`, not a separate `.env` inside `apps/api`.

## 5. Before You Start

Make sure you have:

- Node.js 20 or newer
- npm 10 or newer
- Docker Desktop installed and running

Check your versions:

```bash
node -v
npm -v
docker --version
```

## 6. Open The Project

From a terminal:

```bash
cd <project-root>
```

`<project-root>` means the folder containing:

- `apps/`
- `packages/`
- `docs/`
- `package.json`

## 7. Install Project Dependencies

Run:

```bash
npm install
```

What this does:

- downloads all the Node.js packages the project needs
- installs frontend, backend, worker, contract, and shared dependencies

You only need to do this again if:

- dependencies changed
- `node_modules` was deleted

## 8. Create The Root `.env` File

Copy the template:

```bash
cp .env.example .env
```

Then open `.env` and use values like this:

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

For now, leave these empty:

- `BLOCKCHAIN_PRIVATE_KEY`
- `CONTRACT_ADDRESS`

You will fill them after deploying the contract.

## 9. Start MongoDB With Docker

Run:

```bash
docker compose -f infra/docker/docker-compose.yml up -d mongo
```

What this does:

- starts a MongoDB container
- exposes it locally on port `27017`
- keeps Mongo running without you installing MongoDB directly

Why `-d`:

- `-d` means detached mode
- Docker keeps running the container in the background

How to check it:

```bash
docker compose -f infra/docker/docker-compose.yml ps
```

How to stop it later:

```bash
docker compose -f infra/docker/docker-compose.yml stop mongo
```

## 10. Initialize The Database

Run:

```bash
npm run db:init
```

What this does:

- creates the needed MongoDB collections
- syncs indexes from the Mongoose models
- seeds the bootstrap admin if your `.env` contains admin credentials

Think of this as:

"prepare the local database structure so the app can start cleanly."

## 11. Seed Demo Data

Optional but recommended:

```bash
npm run db:seed-demo
```

What this does:

- inserts sample users
- inserts a demo product
- inserts a demo certificate
- inserts demo traceability records

Why this is useful:

- you can test the system quickly without manually creating everything first

## 12. Start The Local Blockchain With Hardhat

Run in a new terminal:

```bash
cd <project-root>
npm run contracts:node
```

Keep this terminal open.

What happens now:

- Hardhat starts a blockchain node on `127.0.0.1:8545`
- it prints test accounts
- it prints private keys

These printed accounts are local-only development accounts.

Do not use them on a real network.

## 13. Deploy The Smart Contract

Open another terminal and run:

```bash
cd <project-root>
npm run contracts:deploy:local
```

You will see something like:

```text
HalalCertificateRegistry deployed to: 0x...
Admin: 0x...
Authority: 0x...
```

Now copy:

- the contract address from the deploy output
- the private key of Hardhat account `#1` from the Hardhat terminal

## 14. Update `.env` With Real Blockchain Values

Open the root `.env` and set:

```env
BLOCKCHAIN_RPC_URL=http://127.0.0.1:8545
BLOCKCHAIN_PRIVATE_KEY=<private key of Hardhat account #1>
CONTRACT_ADDRESS=<deployed contract address>
```

Why these matter:

- `BLOCKCHAIN_RPC_URL`
  tells Ethers where the blockchain is running

- `BLOCKCHAIN_PRIVATE_KEY`
  gives the backend a signer identity for sending blockchain transactions

- `CONTRACT_ADDRESS`
  tells the backend which deployed contract to call

If these are missing, the app falls back to mock blockchain values instead of real local-chain writes.

## 15. Start The Backend API

Open another terminal and run:

```bash
cd <project-root>
npm run dev:api
```

What the API does:

- receives requests from the frontend
- checks login tokens
- reads and writes MongoDB data
- stores uploaded certificate files
- uses Ethers to call the smart contract

Health check:

Open:

- [http://localhost:4000/health](http://localhost:4000/health)

Expected response:

```json
{ "ok": true }
```

## 16. Start The Worker

Open another terminal and run:

```bash
cd <project-root>
npm run dev:worker
```

What the worker does:

- looks for certificates with `PENDING_AI`
- performs deterministic AI/OCR-style processing
- updates those certificates to `UNDER_AUTHORITY_REVIEW`

Why this is a separate process:

- background work should not block a user's normal request
- this is a common real-world full stack pattern

## 17. Start The Web Frontend

Open another terminal and run:

```bash
cd <project-root>
npm run dev:web
```

Open the site:

- [http://localhost:5173](http://localhost:5173)

Login page:

- [http://localhost:5173/login](http://localhost:5173/login)

## 18. Log In

Use either:

- the admin account you configured in `.env`
- or the demo seed users

Example:

- email: `admin@example.com`
- password: `Admin12345!`

After login, you can use:

- `/products`
- `/certificates`
- `/traceability`
- `/verify`

## 19. Understand The Real Flow

Here is the normal project flow:

1. Create a product
2. Upload a certificate
3. API stores file + certificate in MongoDB
4. Worker processes the pending certificate
5. Authority approves or rejects it
6. API writes the final decision to the smart contract using Ethers
7. Traceability records are created and anchored
8. Public verification shows the combined result

This is a useful mental model:

- MongoDB = the main working database
- Hardhat blockchain = the local integrity/proof layer
- Ethers = the communication bridge from backend to blockchain

## 20. What You Can Test First

After everything is running:

1. Log in
2. Create a product
3. Upload a certificate
4. Wait for worker processing
5. Approve the certificate
6. Add traceability records
7. Open `/verify/<productId>`

## 21. Common Beginner Questions

### Why are there so many terminals?

Because these are separate running processes:

- Docker MongoDB
- Hardhat local blockchain
- API server
- worker
- web server

In real full stack development, it is normal to run several services together.

### Why not put everything into one server?

Because the responsibilities are different:

- the web app serves UI
- the API handles business logic
- the worker handles background jobs
- the blockchain is a separate system
- the database is a separate system

This separation is more realistic and easier to scale later.

### Why not store everything only on the blockchain?

Because blockchains are not good as the main application database for this kind of system.

They are better for:

- tamper-resistant proofs
- decision anchors
- audit-style records

They are worse for:

- full application queries
- flexible document storage
- cheap, fast operational data access

That is why this project uses both MongoDB and blockchain.

### Why does logging in sometimes stop working after config changes?

Usually because:

- the API restarted with a different `JWT_SECRET`
- the browser still had an old token

Fix:

- log in again

## 22. Stop Everything

Stop the local services with `Ctrl+C` in the terminals running:

- Hardhat
- API
- worker
- web

Stop Docker MongoDB:

```bash
docker compose -f infra/docker/docker-compose.yml stop mongo
```

## 23. Recommended Next Reading

- [`docs/run-whole-stack-step-by-step.md`](./run-whole-stack-step-by-step.md)
- [`docs/architecture.md`](./architecture.md)
- [`.env.example`](../.env.example)

This guide is the beginner version.
The runbook is the operator version.
