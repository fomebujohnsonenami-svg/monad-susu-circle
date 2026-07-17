# Monad Susu Circle 🌀

### 📝 Description

A decentralized, high-performance peer-to-peer rotating savings and credit association (Susu) built natively on the Monad Testnet. It allows trusted groups to pool funds and take turns receiving payouts without traditional banking friction.

---

### 🚨 The Problem

Traditional Susu groups rely entirely on physical cash and manual bookkeeping, leading to security risks, lack of transparency, and tedious manual tracking of who has paid during each round.

### 💡 The Solution

Monad Susu Circle automates the entire process onchain. Smart contracts securely handle deposits, enforce round schedules, distribute the total pool automatically to the designated winner, and provide absolute transparency for every participant.

---

### 🚀 Technical Details

* **Blockchain Network:** Monad Testnet
* **Smart Contract Address:** `0xYOUR_DEPLOYED_CONTRACT_ADDRESS`
* **Core Tools:** Next.js (Frontend), Tailwind CSS (UI), Hardhat (Smart Contract Framework), Ethers.js / Viem (Onchain Interaction)

#### Network config

| Parameter       | Value                           |
|-----------------|---------------------------------|
| Network Name    | Monad Testnet                   |
| RPC URL         | `https://testnet-rpc.monad.xyz` |
| Chain ID        | `10143`                         |
| Currency Symbol | `MON`                           |
| Block Explorer  | https://testnet.monadvision.com |
| Faucet          | https://faucet.monad.xyz        |

---

### 🛠️ Local Setup Instructions

1. **Clone and enter the repo:**

   ```bash
   git clone https://github.com/fomebujohnsonenami-svg/monad-susu-circle.git
   cd monad-susu-circle
   ```

2. **Install contract dependencies and configure the deployer:**

   ```bash
   npm install
   cp .env.example .env
   ```

   Edit `.env` and set your wallet private key (funded with testnet MON):

   ```env
   PRIVATE_KEY=0xyour_private_key
   ```

3. **Compile and deploy the SusuCircle contract to Monad Testnet:**

   ```bash
   npm run compile
   npm run deploy:testnet
   ```

   Copy the printed contract address (also saved in `deployments.json`).

4. **Run the frontend:**

   ```bash
   cd frontend
   npm install
   cp .env.local.example .env.local
   ```

   Edit `frontend/.env.local`:

   ```env
   NEXT_PUBLIC_CONTRACT_ADDRESS=0xYourDeployedContractAddress
   NEXT_PUBLIC_CIRCLE_ID=0
   ```

   Start the app:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000), connect a wallet on Monad Testnet, and manage circle dues onchain.

---

### 📦 Project structure

```text
monad-susu-circle/
├── contracts/SusuCircle.sol   # Onchain ROSCA logic
├── scripts/deploy.js          # Hardhat + Ethers deploy script
├── hardhat.config.js          # Monad Testnet / Mainnet networks
└── frontend/                  # Next.js + Wagmi / Viem dashboard
```

---

### ⚠️ Notes

* Replace `0xYOUR_DEPLOYED_CONTRACT_ADDRESS` above after you deploy.
* Never commit `.env` or `frontend/.env.local` — they contain secrets / local config.
* For mainnet deployment (real MON): `npm run deploy:mainnet`
