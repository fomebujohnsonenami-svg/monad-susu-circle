"use client";

import { useCallback, useMemo } from "react";
import { RefreshCw } from "lucide-react";
import { WalletConnect } from "@/components/WalletConnect";
import { PayContributionButton } from "@/components/PayContributionButton";
import { useCircleDashboard } from "@/hooks/useCircleDashboard";
import { CONTRACT_ADDRESS, MONAD_EXPLORER } from "@/lib/config";
import { formatMon, shortenAddress } from "@/lib/format";

export function Dashboard() {
  const {
    hasContract,
    circleId,
    details,
    user,
    isConnected,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useCircleDashboard();

  const onDepositConfirmed = useCallback(() => {
    void refetch();
  }, [refetch]);

  const payGate = useMemo(() => {
    if (!isConnected) {
      return { canPay: false, reason: "Connect a wallet to pay this round." };
    }
    if (!details?.isActive) {
      return { canPay: false, reason: "Circle is not accepting deposits yet." };
    }
    if (!user.isParticipant) {
      return { canPay: false, reason: "Your address is not in this circle." };
    }
    if (user.hasPaidRound) {
      return { canPay: false, reason: "Already paid for this round." };
    }
    return { canPay: true, reason: undefined };
  }, [details?.isActive, isConnected, user.hasPaidRound, user.isParticipant]);

  const memberStatus = !isConnected
    ? { tone: "muted" as const, title: "No wallet", detail: "Connect to check dues." }
    : user.isLoading
      ? { tone: "muted" as const, title: "Checking…", detail: "Reading your round status." }
      : !user.isParticipant
        ? { tone: "warn" as const, title: "Not a member", detail: "This address is not enrolled." }
        : user.hasPaidRound
          ? { tone: "ok" as const, title: "Paid", detail: "Contribution settled for this round." }
          : {
              tone: "pending" as const,
              title: "Due",
              detail:
                details?.contributionAmount !== undefined
                  ? `${formatMon(details.contributionAmount, 4)} due for round ${
                      details.currentRound !== undefined
                        ? Number(details.currentRound) + 1
                        : "—"
                    }`
                  : "Contribution due for this round.",
            };

  return (
    <div className="shell">
      <header className="top">
        <div className="brand-block">
          <div className="brand-mark" aria-hidden />
          <div>
            <p className="brand">SusuCircle</p>
            <p className="tagline">Round dues · pooled payouts</p>
          </div>
        </div>
        <span className="network-chip">Monad Testnet · 10143</span>
      </header>

      <WalletConnect />

      <section className="panel" aria-labelledby="circle-heading">
        <div className="panel-head">
          <div>
            <h2 id="circle-heading">Circle #{circleId.toString()}</h2>
            <p className="sub">
              {hasContract && CONTRACT_ADDRESS ? (
                <a
                  href={`${MONAD_EXPLORER}/address/${CONTRACT_ADDRESS}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {shortenAddress(CONTRACT_ADDRESS, 4)}
                </a>
              ) : (
                "Contract address not set"
              )}
              {details ? ` · ${details.statusLabel}` : null}
            </p>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-icon"
            onClick={() => void refetch()}
            aria-label="Refresh"
          >
            <RefreshCw
              className={`icon ${isLoading || isFetching ? "spin" : ""}`}
            />
          </button>
        </div>

        {!hasContract ? (
          <p className="empty">Set the deployed contract address in .env.local.</p>
        ) : isLoading ? (
          <p className="empty">Loading circle…</p>
        ) : isError || !details ? (
          <p className="empty">No circle found for this ID on-chain.</p>
        ) : (
          <>
            <div className="metrics">
              <Metric
                tone="pool"
                label="Pool"
                value={formatMon(details.poolAmount)}
                hint={`${details.paidCount?.toString() ?? "0"}/${details.participantCount?.toString() ?? "0"} deposited`}
              />
              <Metric
                tone="round"
                label="Round"
                value={
                  details.currentRound !== undefined && details.totalRounds
                    ? `${Number(details.currentRound) + 1}/${details.totalRounds.toString()}`
                    : "—"
                }
                hint={
                  details.nextRecipient
                    ? `Payout → ${shortenAddress(details.nextRecipient)}`
                    : "Payout recipient TBD"
                }
              />
              <Metric
                tone="members"
                label="Members"
                value={details.participantCount?.toString() ?? "—"}
                hint={formatMon(details.contributionAmount, 4) + " / round"}
              />
            </div>

            <div className={`status-strip status-${memberStatus.tone}`}>
              <div>
                <p className="status-kicker">{memberStatus.title}</p>
                <p className="sub">{memberStatus.detail}</p>
              </div>
            </div>

            <PayContributionButton
              circleId={circleId}
              contributionAmount={details.contributionAmount}
              canUserPay={payGate.canPay}
              disabledReason={payGate.reason}
              onConfirmed={onDepositConfirmed}
            />
          </>
        )}
      </section>
    </div>
  );
}

function Metric({
  tone,
  label,
  value,
  hint,
}: {
  tone: "pool" | "round" | "members";
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className={`metric metric-${tone}`}>
      <p className="metric-label">{label}</p>
      <p className="metric-value">{value}</p>
      <p className="sub metric-hint">{hint}</p>
    </div>
  );
}
