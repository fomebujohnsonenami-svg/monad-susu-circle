/**
 * Deploy SusuCircle to Monad Testnet (or any configured Hardhat network).
 *
 * Usage:
 *   npx hardhat run scripts/deploy.js --network monadTestnet
 *   npm run deploy
 *
 * Prerequisites:
 *   1. Copy .env.example → .env and set PRIVATE_KEY
 *   2. Fund the deployer with testnet MON: https://faucet.monad.xyz
 */

const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const network = await hre.ethers.provider.getNetwork();
  const balance = await hre.ethers.provider.getBalance(deployer.address);

  console.log("──────────────────────────────────────────");
  console.log(" SusuCircle Deployment");
  console.log("──────────────────────────────────────────");
  console.log(` Network:   ${hre.network.name} (chainId ${network.chainId})`);
  console.log(` Deployer:  ${deployer.address}`);
  console.log(` Balance:   ${hre.ethers.formatEther(balance)} MON`);
  console.log("──────────────────────────────────────────");

  if (balance === 0n) {
    throw new Error(
      "Deployer has 0 MON. Get testnet tokens from https://faucet.monad.xyz"
    );
  }

  const SusuCircle = await hre.ethers.getContractFactory("SusuCircle");
  console.log("Deploying SusuCircle...");

  const susuCircle = await SusuCircle.deploy();
  await susuCircle.waitForDeployment();

  const address = await susuCircle.getAddress();
  const tx = susuCircle.deploymentTransaction();
  const receipt = tx ? await tx.wait() : null;

  console.log("");
  console.log("✅ SusuCircle deployed successfully!");
  console.log(` Contract address: ${address}`);
  if (receipt) {
    console.log(` Tx hash:          ${receipt.hash}`);
    console.log(` Block:            ${receipt.blockNumber}`);
  }
  console.log(` Explorer:         https://testnet.monadvision.com/address/${address}`);
  console.log("");
  console.log("⚠  SAVE THIS ADDRESS — you need it for the frontend and hackathon submission.");
  console.log("──────────────────────────────────────────");

  // Persist address for frontend / submission reference
  const outPath = path.join(__dirname, "..", "deployments.json");
  const record = {
    network: hre.network.name,
    chainId: Number(network.chainId),
    contractAddress: address,
    deployer: deployer.address,
    txHash: receipt?.hash ?? null,
    deployedAt: new Date().toISOString(),
  };

  let history = [];
  if (fs.existsSync(outPath)) {
    try {
      history = JSON.parse(fs.readFileSync(outPath, "utf8"));
      if (!Array.isArray(history)) history = [history];
    } catch {
      history = [];
    }
  }
  history.push(record);
  fs.writeFileSync(outPath, JSON.stringify(history, null, 2));
  console.log(` Saved deployment record → deployments.json`);
}

main().catch((error) => {
  console.error("Deployment failed:", error);
  process.exitCode = 1;
});
