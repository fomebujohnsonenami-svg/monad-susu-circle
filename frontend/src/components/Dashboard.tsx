"use client";

import { useCallback, useMemo } from "react";
import { RefreshCw } from "lucide-react";
import { WalletConnect } from "@/components/WalletConnect";
import { PayContributionButton } from "@/components/PayContributionButton";
import { ThemeToggle } from "@/components/ThemeToggle";
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
        ? {
            tone: "warn" as const,
            title: "Not a member",
            detail: "This address is not enrolled.",
          }
        : user.hasPaidRound
          ? {
              tone: "ok" as const,
              title: "Paid",
              detail: "Contribution settled for this round.",
            }
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
    <div className="spatial-stage">
      <div className="shell">
        <header className="top">
          <div className="brand-block">
            <div className="brand-mark" aria-hidden />
            <div>
              <p className="brand">SusuCircle</p>
              <p className="tagline">Round dues · pooled payouts</p>
            </div>
          </div>
          <div className="top-actions">
            <span className="network-chip">Monad · 10143</span>
            <ThemeToggle />
          </div>
        </header>

        <WalletConnect />

        <section className="panel" aria-labelledby="circle-heading">
          <div className="panel-head">
            <div>
              <h2 id="circle-heading">Circle #{circleId.toString()}</h2>
              <p className="sub">
                {hasContract && CONTRACT_ADDRESS ? (
                  <>
                    <a
                      href={`${MONAD_EXPLORER}/address/${CONTRACT_ADDRESS}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {shortenAddress(CONTRACT_ADDRESS, 4)}
                    </a>
                    {details ? ` · ${details.statusLabel}` : null}
                  </>
                ) : (
                  "Monad Testnet"
                )}
              </p>
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-icon"
              onClick={() => void refetch()}
              aria-label="Refresh"
              disabled={!hasContract}
            >
              <RefreshCw
                className={`icon ${isLoading || isFetching ? "spin" : ""}`}
              />
            </button>
          </div>

          {hasContract && isLoading ? (
            <p className="empty">Loading circle…</p>
          ) : (
            <>
              <div className="metrics">
                <Metric
                  tone="pool"
                  label="Pool"
                  value={
                    details ? formatMon(details.poolAmount) : "—"
                  }
                  hint={
                    details
                      ? `${details.paidCount?.toString() ?? "0"}/${details.participantCount?.toString() ?? "0"} deposited`
                      : "Waiting for circle data"
                  }
                />
                <Metric
                  tone="round"
                  label="Round"
                  value={
                    details?.currentRound !== undefined && details.totalRounds
                      ? `${Number(details.currentRound) + 1}/${details.totalRounds.toString()}`
                      : "—"
                  }
                  hint={
                    details?.nextRecipient
                      ? `Payout → ${shortenAddress(details.nextRecipient)}`
                      : details
                        ? "Payout recipient TBD"
                        : "No active round"
                  }
                />
                <Metric
                  tone="members"
                  label="Members"
                  value={details?.participantCount?.toString() ?? "—"}
                  hint={
                    details?.contributionAmount !== undefined
                      ? formatMon(details.contributionAmount, 4) + " / round"
                      : "Contribution unset"
                  }
                />
              </div>

              <div
                className={`status-strip status-${
                  !hasContract || isError || !details
                    ? "muted"
                    : memberStatus.tone
                }`}
              >
                <div>
                  <p className="status-kicker">
                    {!hasContract
                      ? "Circle offline"
                      : isError || !details
                        ? "No circle yet"
                        : memberStatus.title}
                  </p>
                  <p className="sub">
                    {!hasContract
                      ? "Connect your wallet — circle data appears once onchain."
                      : isError || !details
                        ? "Create a circle onchain to start the first round."
                        : memberStatus.detail}
                  </p>
                </div>
              </div>

              <PayContributionButton
                circleId={circleId}
                contributionAmount={details?.contributionAmount}
                canUserPay={Boolean(details) && payGate.canPay}
                disabledReason={
                  !hasContract || !details
                    ? "Payment unlocks when a circle is active."
                    : payGate.reason
                }
                onConfirmed={onDepositConfirmed}
              />
            </>
          )}
        </section>
      </div>
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
