# Local Setup

Use the full runbook here:

- [Run The Whole Stack Locally](./run-whole-stack-step-by-step.md)
- [Beginner-Friendly Local Setup Guide](./local-setup-beginner-guide.md)

Short version:

1. Copy [`.env.example`](../.env.example) to `.env`
2. Run `npm install`
3. Start MongoDB
4. Run `npm run db:init` to create the local collections and indexes
5. Optionally run `npm run db:seed-demo` to insert demo users and records
6. Start Hardhat with `npm run contracts:node`
7. Deploy the contract with `npm run contracts:deploy:local`
8. Fill `BLOCKCHAIN_PRIVATE_KEY` and `CONTRACT_ADDRESS` in `.env`
9. Start API, worker, and web
10. Log in with the bootstrap admin credentials or the demo seed users

Bootstrap admin seeding also runs during `npm run db:init` and API startup if:

- `BOOTSTRAP_ADMIN_EMAIL` is set
- `BOOTSTRAP_ADMIN_PASSWORD` is set
