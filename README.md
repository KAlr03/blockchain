# HalalChain

**Blockchain-based Halal Food Supply Chain Verification for Kuwait's Imports**

A production-deployed platform that verifies halal food certificates, traces supply chain steps, and anchors certification decisions on the Ethereum blockchain — built as a Computer Engineering capstone project at the American University of the Middle East.

---

## Live System

| Service | URL |
|---------|-----|
| Web Application | https://halalweb-production.up.railway.app |
| Backend API | https://halalapi-production.up.railway.app |
| Blockchain Explorer | https://sepolia.etherscan.io |

---

## What It Does

- Manufacturers register products and upload halal certificates
- An AI worker (GPT-4o Vision) pre-screens each certificate and assigns a compliance score out of 100
- A P.A.F.N. authority officer reviews the AI result and makes the final approval or rejection decision
- Every certification decision is permanently anchored on the **Ethereum Sepolia testnet** via a Solidity smart contract
- Consumers verify any product's halal status instantly by scanning a QR code or entering a Product ID — no login required
- The full supply chain is recorded across 10 stages: from slaughter to retail

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite |
| Backend API | Node.js, Express.js, TypeScript |
| AI Worker | Node.js, OpenAI GPT-4o Vision, Tesseract.js OCR |
| Database | MongoDB Atlas (cloud) |
| Blockchain | Ethereum Sepolia testnet |
| Smart Contracts | Solidity 0.8.24, Hardhat, ethers.js v6 |
| Blockchain RPC | Alchemy |
| Hosting | Railway (3 independent services) |
| Auth | JWT (HS256, 8-hour expiry), bcrypt |
| QR Codes | qrcode npm package v1.5 |

---

## System Roles

| Role | What They Can Do |
|------|-----------------|
| **Admin** | Manage users, monitor blockchain transactions, suspend accounts |
| **Authority** | Review AI-pre-screened certificates, approve or reject with written justification |
| **Manufacturer** | Register products, upload certificates, record supply chain steps, download QR codes |
| **Customer** | Scan QR codes or enter Product IDs to verify halal status publicly without an account |

---

## How Certificates Are Verified

1. Manufacturer uploads a halal certificate (PDF or image)
2. Backend computes a SHA-256 fingerprint of the file
3. AI worker submits the certificate to GPT-4o Vision for expert visual analysis
4. GPT-4o returns a score (0–100), a verdict (`APPROVED` / `FLAGGED` / `REJECTED`), and detailed reasoning
5. P.A.F.N. authority reviews the AI result and submits a final decision
6. Decision is anchored on-chain via the `HalalCertificateRegistry` smart contract
7. Ethereum transaction hash is stored in MongoDB and displayed in the UI

---

## Smart Contract

- **Name:** `HalalCertificateRegistry`
- **Network:** Ethereum Sepolia testnet
- **Verified at:** [sepolia.etherscan.io](https://sepolia.etherscan.io)
- **Key functions:**
  - `recordCertificateDecision()` — write-once certificate anchor, enforces idempotency
  - `recordTraceability()` — anchors individual supply chain steps
  - `getCertificateByProductId()` — public read, no authentication required
  - `getTraceabilityIdsByProductId()` — public read, no authentication required

---

## Architecture

```
React Frontend (Railway)
        │
        ▼
Node.js API (Railway)  ◄──► MongoDB Atlas (off-chain data)
        │
        ├──► AI Worker (Railway) ◄──► OpenAI GPT-4o Vision
        │
        └──► Alchemy RPC ──► Ethereum Sepolia ──► HalalCertificateRegistry
```

**On-chain (Ethereum):**
- Final certificate approval / rejection anchor
- SHA-256 certificate hash
- Traceability record hashes
- Decision timestamps

**Off-chain (MongoDB Atlas):**
- Full product documents
- Certificate files (base64) and metadata
- AI verdicts and scores
- Full traceability details
- User accounts and sessions

---

## Repository Structure

```
blockchain/
├── apps/
│   ├── web/          # React + Vite frontend
│   ├── api/          # Node.js Express backend
│   └── worker/       # AI certificate verification worker
├── packages/
│   ├── shared/       # Shared DTOs, enums, Zod schemas
│   ├── config/       # Environment parsing
│   └── contracts/    # Hardhat + Solidity smart contract
├── Smart Contracts/  # Deployed contract source
├── docs/             # Architecture documentation
└── infra/docker/     # Local Docker support (MongoDB only)
```

---

## Environment Variables

The system requires these environment variables set in Railway (or a local `.env`):

```
NODE_ENV
PORT
JWT_SECRET
MONGODB_URI
OPENAI_API_KEY
BLOCKCHAIN_RPC_URL        # Alchemy Sepolia endpoint
BLOCKCHAIN_PRIVATE_KEY    # Authority wallet private key
CONTRACT_ADDRESS          # Deployed HalalCertificateRegistry address
VERIFY_BASE_URL
WORKER_POLL_MS
BOOTSTRAP_ADMIN_EMAIL
BOOTSTRAP_ADMIN_PASSWORD
```

---

## Performance (Production Measurements)

| Component | Metric | Result |
|-----------|--------|--------|
| MongoDB | Product query | < 50 ms |
| MongoDB | Certificate query | < 80 ms |
| GPT-4o Vision | AI verdict | ~15 s |
| Ethereum Sepolia | Transaction confirmation | 15–30 s |
| SHA-256 hashing | Certificate fingerprint | < 100 ms |
| Alchemy RPC | 30-day success rate | 100% (317 requests) |

---

## Research Paper

This system was designed, implemented, and validated as part of a published capstone paper:

> **Blockchain-based Halal Food Supply Chain for Kuwait's Imports**
> Bedour Mahdi, Khairah AlRasheedi, Lama AlMusairiei, Noor Boshehri, Sarah Alhajri, Ajla Kulaglic
> American University of the Middle East, Computer Engineering Department, Kuwait

---