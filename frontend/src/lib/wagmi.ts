import { http, createConfig, createStorage, cookieStorage } from "wagmi";
import { injected } from "wagmi/connectors";
import { monadTestnet } from "viem/chains";
import { MONAD_RPC_URL } from "./config";

export const wagmiConfig = createConfig({
  chains: [monadTestnet],
  connectors: [
    injected({
      shimDisconnect: true,
    }),
  ],
  transports: {
    [monadTestnet.id]: http(MONAD_RPC_URL),
  },
  storage: createStorage({
    storage: cookieStorage,
  }),
  ssr: true,
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
