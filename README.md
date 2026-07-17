# Monad Susu Circle

Rotating savings circle (ROSCA) smart contract for **Monad Testnet**.

## Monad Testnet network config

| Parameter       | Value                          |
|-----------------|--------------------------------|
| Network Name    | Monad Testnet                  |
| RPC URL         | `https://testnet-rpc.monad.xyz`|
| Chain ID        | `10143`                        |
| Currency Symbol | `MON`                          |
| Block Explorer  | https://testnet.monadvision.com|
| Faucet          | https://faucet.monad.xyz       |

## Setup

```bash
npm install
cp .env.example .env
# Edit .env and set PRIVATE_KEY (wallet with testnet MON)
```

## Compile & deploy

```bash
npm run compile
npm run deploy
```

After deploy, **save the contract address** printed in the terminal (also written to `deployments.json`). You need it for the frontend and your hackathon submission.

## Frontend

```bash
cd frontend
cp .env.local.example .env.local
# Set NEXT_PUBLIC_CONTRACT_ADDRESS to your deployed address
npm install
npm run dev
```

Open http://localhost:3000 — Wagmi wallet connect targets Monad Testnet (chain ID `10143`).
