"use client";

import { useCallback, useMemo, type ReactNode } from "react";
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
      return { canPay: false, reason: "Connect your wallet to pay." };
    }
    if (!details?.isActive) {
      return {
        canPay: false,
        reason: "Circle must be Active before contributions.",
      };
    }
    if (!user.isParticipant) {
      return { canPay: false, reason: "You are not a member of this circle." };
    }
    if (user.hasPaidRound) {
      return { canPay: false, reason: "You already paid for this round." };
    }
    return { canPay: true, reason: undefined };
  }, [details?.isActive, isConnected, user.hasPaidRound, user.isParticipant]);

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
            onClick={() => void refetch()}
            aria-label="Refresh circle data"
          >
            <RefreshCw
              className={`icon ${isLoading || isFetching ? "spin" : ""}`}
            />
          </button>
        </div>

        {!hasContract ? (
          <p className="empty">
            Deploy the contract, then add the address to{" "}
            <code>frontend/.env.local</code>.
          </p>
        ) : isLoading ? (
          <p className="empty">Fetching circle state from Monad…</p>
        ) : isError || !details ? (
          <p className="empty">
            No circle data on-chain yet. Create a circle or check{" "}
            <code>NEXT_PUBLIC_CIRCLE_ID</code>.
          </p>
        ) : (
          <>
            <div className="metrics">
              <Metric
                icon={<CircleDollarSign className="icon" />}
                label="Pool amount"
                value={formatMon(details.poolAmount)}
                hint={`Collected ${formatMon(details.collectedAmount, 3)} · ${details.paidCount?.toString() ?? "0"}/${details.participantCount?.toString() ?? "0"} paid`}
              />
              <Metric
                icon={<ArrowRightLeft className="icon" />}
                label="Current round"
                value={
                  details.currentRound !== undefined && details.totalRounds
                    ? `${Number(details.currentRound) + 1} / ${details.totalRounds.toString()}`
                    : "—"
                }
                hint={details.statusLabel}
              />
              <Metric
                icon={<Users className="icon" />}
                label="Participants"
                value={details.participantCount?.toString() ?? "—"}
                hint={
                  details.nextRecipient
                    ? `Next: ${shortenAddress(details.nextRecipient)}`
                    : "Next recipient when Active"
                }
              />
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

      <section className="panel status-panel" aria-labelledby="user-heading">
        <div className="panel-head">
          <div>
            <h2 id="user-heading">Your status</h2>
            <p className="sub">On-chain `hasPaidRound` for the current round</p>
          </div>
        </div>

        {!isConnected ? (
          <div className="status-row muted-row">
            <Ban className="icon" />
            <div>
              <p>Connect a wallet to see your status</p>
              <p className="sub">Reads live from the SusuCircle contract</p>
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
                Deposit{" "}
                {details?.contributionAmount !== undefined
                  ? formatMon(details.contributionAmount, 4)
                  : "the contribution"}{" "}
                for round{" "}
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
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="metric">
      <div className="metric-label">
        {icon}
        <span>{label}</span>
      </div>
      <p className="metric-value">{value}</p>
      <p className="sub">{hint}</p>
    </div>
  );
}
