export const MONAD_RPC_URL = "https://testnet-rpc.monad.xyz";
export const MONAD_CHAIN_ID = 10143;
export const MONAD_EXPLORER = "https://testnet.monadvision.com";

/** Deployed SusuCircle address — set after `npm run deploy` */
const rawAddress = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "").trim();

export const CONTRACT_ADDRESS: `0x${string}` | undefined =
  rawAddress.startsWith("0x") && rawAddress.length === 42
    ? (rawAddress as `0x${string}`)
    : undefined;

/** Circle to show on the dashboard (default: first circle) */
export const DEFAULT_CIRCLE_ID = BigInt(
  process.env.NEXT_PUBLIC_CIRCLE_ID || "0"
);

export const CIRCLE_STATUS = ["Open", "Active", "Completed", "Cancelled"] as const;
