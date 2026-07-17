"use client";

import type { ReactNode } from "react";
import {
  CircleDollarSign,
  RefreshCw,
  Users,
  ArrowRightLeft,
  CheckCircle2,
  Clock3,
  Ban,
} from "lucide-react";
import { WalletConnect } from "@/components/WalletConnect";
import { useCircleDashboard } from "@/hooks/useCircleDashboard";
import { CONTRACT_ADDRESS, MONAD_EXPLORER } from "@/lib/config";
import { formatMon, shortenAddress } from "@/lib/format";

export function Dashboard() {
  const { hasContract, circleId, details, user, isConnected, isLoading, isError, refetch } =
    useCircleDashboard();

  return (
    <div className="shell">
      <header className="top">
        <div className="brand-block">
          <p className="brand">Susu Circle</p>
          <p className="tagline">Rotating savings on Monad Testnet</p>
        </div>
        <div className="network-chip">
          <span className="pulse" />
          Monad · 10143
        </div>
      </header>

      <WalletConnect />

      <section className="panel" aria-labelledby="circle-heading">
        <div className="panel-head">
          <div>
            <h2 id="circle-heading">Active circle</h2>
            <p className="sub">
              Circle #{circleId.toString()}
              {hasContract && CONTRACT_ADDRESS ? (
                <>
                  {" · "}
                  <a
                    href={`${MONAD_EXPLORER}/address/${CONTRACT_ADDRESS}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {shortenAddress(CONTRACT_ADDRESS, 3)}
                  </a>
                </>
              ) : (
                " · set NEXT_PUBLIC_CONTRACT_ADDRESS"
              )}
            </p>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-icon"
            onClick={() => refetch()}
            aria-label="Refresh circle data"
          >
            <RefreshCw className={`icon ${isLoading ? "spin" : ""}`} />
          </button>
        </div>

        {!hasContract ? (
          <p className="empty">
            Deploy the contract, then add the address to{" "}
            <code>frontend/.env.local</code>.
          </p>
        ) : isLoading ? (
          <p className="empty">Loading circle…</p>
        ) : isError || !details ? (
          <p className="empty">
            No circle data yet. Create a circle on-chain or check the circle ID.
          </p>
        ) : (
          <div className="metrics">
            <Metric
              icon={<CircleDollarSign className="icon" />}
              label="Total pool"
              value={formatMon(details.poolSize)}
              hint={`${formatMon(details.contributionAmount, 3)} × ${details.participantCount?.toString() ?? "0"}`}
            />
            <Metric
              icon={<ArrowRightLeft className="icon" />}
              label="Current round"
              value={
                details.currentRound !== undefined && details.totalRounds
                  ? `${Number(details.currentRound) + 1} / ${details.totalRounds.toString()}`
                  : "—"
              }
              hint={`${details.paidCount?.toString() ?? "0"} paid · ${details.statusLabel}`}
            />
            <Metric
              icon={<Users className="icon" />}
              label="Next recipient"
              value={
                details.nextRecipient
                  ? shortenAddress(details.nextRecipient)
                  : details.statusLabel === "Active"
                    ? "…"
                    : "—"
              }
              hint={
                details.nextRecipient
                  ? details.nextRecipient
                  : "Available when circle is Active"
              }
              monoHint
            />
          </div>
        )}
      </section>

      <section className="panel status-panel" aria-labelledby="user-heading">
        <div className="panel-head">
          <div>
            <h2 id="user-heading">Your status</h2>
            <p className="sub">Payment status for the current round</p>
          </div>
        </div>

        {!isConnected ? (
          <div className="status-row muted-row">
            <Ban className="icon" />
            <div>
              <p>Connect a wallet to see your status</p>
              <p className="sub">Reads `hasPaidRound` for your address</p>
            </div>
          </div>
        ) : user.isLoading ? (
          <div className="status-row muted-row">
            <Clock3 className="icon spin" />
            <div>
              <p>Checking on-chain status…</p>
            </div>
          </div>
        ) : !user.isParticipant ? (
          <div className="status-row warn-row">
            <Ban className="icon" />
            <div>
              <p>Not a member of this circle</p>
              <p className="sub">Join before the circle fills to participate</p>
            </div>
          </div>
        ) : user.hasPaidRound ? (
          <div className="status-row ok-row">
            <CheckCircle2 className="icon" />
            <div>
              <p>Paid for this round</p>
              <p className="sub">Contribution recorded on Monad Testnet</p>
            </div>
          </div>
        ) : (
          <div className="status-row pending-row">
            <Clock3 className="icon" />
            <div>
              <p>Payment pending</p>
              <p className="sub">
                You still need to deposit for round{" "}
                {details?.currentRound !== undefined
                  ? Number(details.currentRound) + 1
                  : "—"}
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
  hint,
  monoHint,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint: string;
  monoHint?: boolean;
}) {
  return (
    <div className="metric">
      <div className="metric-label">
        {icon}
        <span>{label}</span>
      </div>
      <p className="metric-value">{value}</p>
      <p className={`sub ${monoHint ? "mono" : ""}`}>{hint}</p>
    </div>
  );
}
