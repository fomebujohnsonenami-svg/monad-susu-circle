"use client";

import { useEffect, useState } from "react";
import {
  useAccount,
  useBalance,
  useConnect,
  useDisconnect,
  useSwitchChain,
} from "wagmi";
import { monadTestnet } from "viem/chains";
import { Unplug, Wallet, Loader2, AlertTriangle } from "lucide-react";
import { MONAD_CHAIN_ID } from "@/lib/config";
import { formatMon, shortenAddress } from "@/lib/format";

export function WalletConnect() {
  const [mounted, setMounted] = useState(false);
  const { address, isConnected, chainId, status } = useAccount();
  const { connect, connectors, isPending, error } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const { data: balance } = useBalance({
    address,
    chainId: MONAD_CHAIN_ID,
    query: { enabled: Boolean(address) },
  });

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className="wallet-bar" aria-hidden>
        <div className="status-dot muted" />
        <span className="muted">Loading wallet…</span>
      </div>
    );
  }

  const wrongNetwork = isConnected && chainId !== MONAD_CHAIN_ID;
  const connector = connectors[0];

  return (
    <div className="wallet-bar">
      <div className="wallet-meta">
        <span
          className={`status-dot ${
            isConnected && !wrongNetwork
              ? "online"
              : wrongNetwork
                ? "warn"
                : "muted"
          }`}
        />
        <div className="wallet-copy">
          <p className="label">Wallet</p>
          {isConnected && address ? (
            <>
              <p className="mono">{shortenAddress(address)}</p>
              <p className="sub">
                {wrongNetwork
                  ? "Wrong network"
                  : `${formatMon(balance?.value, 3)} · Monad Testnet`}
              </p>
            </>
          ) : (
            <>
              <p>Not connected</p>
              <p className="sub">Connect to Monad Testnet (10143)</p>
            </>
          )}
        </div>
      </div>

      <div className="wallet-actions">
        {wrongNetwork && (
          <button
            type="button"
            className="btn btn-warn"
            disabled={isSwitching}
            onClick={() => switchChain({ chainId: monadTestnet.id })}
          >
            {isSwitching ? (
              <Loader2 className="icon spin" />
            ) : (
              <AlertTriangle className="icon" />
            )}
            Switch network
          </button>
        )}

        {isConnected ? (
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => disconnect()}
          >
            <Unplug className="icon" />
            Disconnect
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-primary"
            disabled={isPending || status === "connecting" || !connector}
            onClick={() => connector && connect({ connector, chainId: monadTestnet.id })}
          >
            {isPending ? (
              <Loader2 className="icon spin" />
            ) : (
              <Wallet className="icon" />
            )}
            Connect
          </button>
        )}
      </div>

      {error && <p className="wallet-error">{error.message}</p>}
    </div>
  );
}
