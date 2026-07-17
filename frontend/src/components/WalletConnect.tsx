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
import { Unplug, Wallet, Loader2 } from "lucide-react";
import { MONAD_CHAIN_ID } from "@/lib/config";
import { formatMon, shortenAddress } from "@/lib/format";
import { isUserRejection } from "@/lib/errors";

export function WalletConnect() {
  const [mounted, setMounted] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const { address, isConnected, chainId, status } = useAccount();
  const { connectAsync, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChainAsync, isPending: isSwitching } = useSwitchChain();
  const { data: balance } = useBalance({
    address,
    chainId: MONAD_CHAIN_ID,
    query: { enabled: Boolean(address) },
  });

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className="wallet-bar" aria-hidden>
        <span className="muted">…</span>
      </div>
    );
  }

  const wrongNetwork = isConnected && chainId !== MONAD_CHAIN_ID;
  const connector = connectors[0];

  async function handleConnect() {
    if (!connector) return;
    setLocalError(null);
    try {
      await connectAsync({ connector, chainId: monadTestnet.id });
    } catch (err) {
      if (isUserRejection(err)) return;
      setLocalError("Could not connect wallet.");
    }
  }

  async function handleSwitch() {
    setLocalError(null);
    try {
      await switchChainAsync({ chainId: monadTestnet.id });
    } catch (err) {
      if (isUserRejection(err)) return;
      setLocalError("Could not switch network.");
    }
  }

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
          {isConnected && address ? (
            <>
              <p className="mono">{shortenAddress(address)}</p>
              <p className="sub">
                {wrongNetwork
                  ? "Wrong network — switch to Monad Testnet"
                  : `${formatMon(balance?.value, 3)} available`}
              </p>
            </>
          ) : (
            <>
              <p className="label">Account</p>
              <p className="sub">Not connected</p>
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
            onClick={() => void handleSwitch()}
          >
            {isSwitching ? <Loader2 className="icon spin" /> : null}
            Switch to Monad
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
            onClick={() => void handleConnect()}
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

      {localError && <p className="wallet-error">{localError}</p>}
    </div>
  );
}
