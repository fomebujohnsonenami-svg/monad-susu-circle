require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    // Monad Testnet — https://docs.monad.xyz/guides/add-monad-to-wallet/testnet
    monadTestnet: {
      url: process.env.MONAD_TESTNET_RPC_URL || "https://testnet-rpc.monad.xyz",
      chainId: 10143,
      accounts: (() => {
        const key = (process.env.PRIVATE_KEY || "").trim();
        return key ? [key] : [];
      })(),
    },
    // Monad Mainnet — https://docs.monad.xyz/guides/add-monad-to-wallet/mainnet
    monadMainnet: {
      url: process.env.MONAD_MAINNET_RPC_URL || "https://rpc.monad.xyz",
      chainId: 143,
      accounts: (() => {
        const key = (process.env.PRIVATE_KEY || "").trim();
        return key ? [key] : [];
      })(),
    },
  },
  paths: {
    sources: "./contracts",
    artifacts: "./artifacts",
    cache: "./cache",
  },
};
