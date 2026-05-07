#!/bin/bash
# ─────────────────────────────────────────────
#  HalalChain — Start Everything (One Command)
#  Usage: cd ~/Desktop/blockchain && ./start-all.sh
# ─────────────────────────────────────────────

echo ""
echo "========================================"
echo "  HalalChain — Starting all services"
echo "========================================"
echo ""

# Start MongoDB
echo "Starting MongoDB..."
docker compose -f infra/docker/docker-compose.yml up -d mongo
sleep 3

# Start Hardhat blockchain
echo "Starting local blockchain..."
npx hardhat node --config packages/contracts/hardhat.config.ts > /tmp/hardhat.log 2>&1 &
HARDHAT_PID=$!
sleep 5

# Deploy contract
echo "Deploying smart contract..."
npm run contracts:deploy:local > /tmp/deploy.log 2>&1
CONTRACT=$(grep "HalalCertificateRegistry deployed to:" /tmp/deploy.log | awk '{print $NF}')
echo "  Contract: $CONTRACT"

# Update .env with contract address
if [ -n "$CONTRACT" ]; then
  sed -i.bak "s|CONTRACT_ADDRESS=.*|CONTRACT_ADDRESS=$CONTRACT|" .env
fi

# Start API
echo "Starting Backend API..."
npm run dev:api > /tmp/api.log 2>&1 &
API_PID=$!
sleep 3

# Start Worker
echo "Starting AI Worker..."
npm run dev:worker > /tmp/worker.log 2>&1 &
WORKER_PID=$!
sleep 2

# Done
echo ""
echo "========================================"
echo "  Everything is running!"
echo ""
echo "  Website:  http://localhost:5173"
echo "  API:      http://localhost:4000"
echo ""
echo "  Admin:        admin@example.com / changeme123"
echo "  Authority:    authority@example.com / Authority123!"
echo "  Manufacturer: manufacturer@example.com / Manufacturer123!"
echo ""
echo "  Press Ctrl+C to stop everything"
echo "========================================"
echo ""

# Stop everything on Ctrl+C
cleanup() {
  echo "Stopping all services..."
  kill $HARDHAT_PID $API_PID $WORKER_PID 2>/dev/null
  docker compose -f infra/docker/docker-compose.yml stop mongo
  echo "Stopped."
  exit 0
}
trap cleanup INT

# Start web in foreground
npm run dev:web
