"use client";

import { useCallback, useMemo, useState } from "react";
import { Check, Copy, Lock, RefreshCw } from "lucide-react";
import { useAccount } from "wagmi";
import { PayContributionButton } from "@/components/PayContributionButton";
import { Toast } from "@/components/Toast";
import type { ToastState } from "@/components/Toast";
import { useCircleDashboard } from "@/hooks/useCircleDashboard";
import { useCircleParticipants } from "@/hooks/useCircleParticipants";
import type { ExplorerCircle } from "@/hooks/useActiveCircles";
import type { LocalCircle } from "@/lib/circleMeta";
import {
  getCirclePrivacy,
  loadLocalCircles,
  upsertLocalCircle,
} from "@/lib/circleMeta";
import { CONTRACT_ADDRESS, MONAD_EXPLORER } from "@/lib/config";
import { formatMon, shortenAddress } from "@/lib/format";

type Props = {
  selectedId: string | null;
  selectedExplorer?: ExplorerCircle;
  localDetails?: LocalCircle;
  onLocalChange: () => void;
};

export function CircleDashboardPanel({
  selectedId,
  selectedExplorer,
  localDetails,
  onLocalChange,
}: Props) {
  const { address, isConnected } = useAccount();
  const isOnchainId = Boolean(selectedId && /^\d+$/.test(selectedId));
  const circleId = isOnchainId && selectedId ? BigInt(selectedId) : 0n;

  const {
    hasContract,
    details,
    user,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useCircleDashboard(circleId, { enabled: isOnchainId });

  const { participants: onchainParticipants, refetch: refetchParticipants } =
    useCircleParticipants(circleId, isOnchainId && hasContract);

  const [localToast, setLocalToast] = useState<ToastState>(null);
  const [payingLocal, setPayingLocal] = useState(false);
  const [copied, setCopied] = useState(false);

  const usingLocal = Boolean(localDetails) && !isOnchainId;

  const privacy = useMemo(() => {
    if (localDetails?.isPrivate || localDetails?.inviteCode) {
      return {
        isPrivate: Boolean(localDetails.isPrivate),
        inviteCode: localDetails.inviteCode,
      };
    }
    if (selectedExplorer?.isPrivate || selectedExplorer?.inviteCode) {
      return {
        isPrivate: Boolean(selectedExplorer.isPrivate),
        inviteCode: selectedExplorer.inviteCode,
      };
    }
    if (selectedId) return getCirclePrivacy(selectedId);
    return { isPrivate: false as const };
  }, [localDetails, selectedExplorer, selectedId]);

  const view = useMemo(() => {
    if (usingLocal && localDetails) {
      const contribution = BigInt(localDetails.contributionWei);
      const members = localDetails.memberCount;
      const paid = localDetails.paidCount;
      const pool = contribution * BigInt(members || localDetails.maxParticipants);
      const collected = contribution * BigInt(paid);
      const recipient =
        localDetails.participants[localDetails.currentRound] ??
        localDetails.participants[0];
      const isMember = address
        ? localDetails.participants.some(
            (p) => p.toLowerCase() === address.toLowerCase()
          )
        : false;
      const isCreator = Boolean(
        address &&
          localDetails.creator.toLowerCase() === address.toLowerCase()
      );

      return {
        name: localDetails.name,
        statusLabel: localDetails.status,
        isActive: localDetails.status === "Active",
        contributionAmount: contribution,
        currentRound: BigInt(localDetails.currentRound),
        totalRounds: BigInt(localDetails.maxParticipants),
        participantCount: BigInt(members),
        paidCount: BigInt(paid),
        poolAmount: pool,
        collectedAmount: collected,
        nextRecipient: recipient,
        participants: localDetails.participants,
        isParticipant: isMember,
        hasPaidRound: false,
        frequency: localDetails.frequency,
        rateLabel: selectedExplorer?.rateLabel,
        isCreator,
        isPrivate: Boolean(localDetails.isPrivate ?? privacy.isPrivate),
        inviteCode: localDetails.inviteCode ?? privacy.inviteCode,
      };
    }

    if (details) {
      const isCreator = Boolean(
        address && details.creator.toLowerCase() === address.toLowerCase()
      );
      return {
        name: selectedExplorer?.name ?? `Circle #${selectedId}`,
        statusLabel: details.statusLabel,
        isActive: details.isActive,
        contributionAmount: details.contributionAmount,
        currentRound: details.currentRound,
        totalRounds: details.totalRounds,
        participantCount: details.participantCount,
        paidCount: details.paidCount,
        poolAmount: details.poolAmount,
        collectedAmount: details.collectedAmount,
        nextRecipient: details.nextRecipient,
        participants: onchainParticipants,
        isParticipant: user.isParticipant,
        hasPaidRound: user.hasPaidRound,
        frequency: selectedExplorer?.frequency,
        rateLabel: selectedExplorer?.rateLabel,
        isCreator,
        isPrivate: privacy.isPrivate,
        inviteCode: privacy.inviteCode,
      };
    }

    return null;
  }, [
    address,
    details,
    localDetails,
    onchainParticipants,
    privacy.inviteCode,
    privacy.isPrivate,
    selectedExplorer,
    selectedId,
    user.hasPaidRound,
    user.isParticipant,
    usingLocal,
  ]);

  const copyInviteCode = useCallback(async () => {
    const code = view?.inviteCode;
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setLocalToast({
        kind: "error",
        title: "Copy failed",
        message: "Could not copy invite code. Select and copy it manually.",
      });
    }
  }, [view?.inviteCode]);

  const onDepositConfirmed = useCallback(() => {
    void refetch();
    void refetchParticipants();
  }, [refetch, refetchParticipants]);

  const payGate = useMemo(() => {
    if (!isConnected) {
      return { canPay: false, reason: "Connect a wallet to pay this round." };
    }
    if (!view?.isActive) {
      return {
        canPay: false,
        reason: "Circle must be Active (full seats) before deposits.",
      };
    }
    if (!view.isParticipant) {
      return { canPay: false, reason: "Join this circle to contribute." };
    }
    if (!usingLocal && view.hasPaidRound) {
      return { canPay: false, reason: "Already paid for this round." };
    }
    return { canPay: true, reason: undefined };
  }, [isConnected, usingLocal, view]);

  const progressPct = useMemo(() => {
    if (!view?.participantCount || view.participantCount === 0n) return 0;
    const paid = Number(view.paidCount ?? 0n);
    const total = Number(view.participantCount);
    if (!total) return 0;
    return Math.min(100, Math.round((paid / total) * 100));
  }, [view]);

  const rotation = useMemo(() => {
    const list = view?.participants ?? [];
    const rounds = Number(view?.totalRounds ?? list.length);
    const current = Number(view?.currentRound ?? 0);
    if (list.length === 0 && rounds > 0) {
      return Array.from({ length: rounds }, (_, i) => ({
        round: i,
        address: undefined as `0x${string}` | undefined,
        isCurrent: i === current,
        isPast: i < current,
        isYou: false,
      }));
    }
    return list.map((addr, i) => ({
      round: i,
      address: addr,
      isCurrent: i === current && Boolean(view?.isActive),
      isPast: i < current,
      isYou: Boolean(
        address && addr.toLowerCase() === address.toLowerCase()
      ),
    }));
  }, [address, view]);

  const payLocalContribution = async () => {
    if (!localDetails || !address) return;
    setPayingLocal(true);
    await new Promise((r) => setTimeout(r, 800));
    const latest =
      loadLocalCircles().find((c) => c.id === localDetails.id) ?? localDetails;
    const nextPaid = Math.min(
      latest.paidCount + 1,
      latest.memberCount || latest.maxParticipants
    );
    upsertLocalCircle({ ...latest, paidCount: nextPaid, source: "local" });
    setPayingLocal(false);
    setLocalToast({
      kind: "success",
      title: "Contribution recorded",
      message: `Paid ${formatMon(BigInt(latest.contributionWei), 4)} for round ${
        latest.currentRound + 1
      }.`,
    });
    onLocalChange();
  };

  if (!selectedId) {
    return (
      <section className="panel" aria-labelledby="mine-heading">
        <div className="panel-head">
          <div>
            <h2 id="mine-heading">My Circle Dashboard</h2>
            <p className="sub">Select or create a circle to manage rounds.</p>
          </div>
        </div>
        <p className="empty">
          Pick a circle from Active Susu Circles, or create one above.
        </p>
      </section>
    );
  }

  const showLoading = isOnchainId && hasContract && isLoading && !view;

  return (
    <section className="panel" aria-labelledby="mine-heading">
      <div className="panel-head">
        <div>
          <h2 id="mine-heading">My Circle Dashboard</h2>
          <p className="sub">
            {view?.name ?? `Circle #${selectedId}`}
            {view ? ` · ${view.statusLabel}` : null}
            {isOnchainId && hasContract && CONTRACT_ADDRESS ? (
              <>
                {" · "}
                <a
                  href={`${MONAD_EXPLORER}/address/${CONTRACT_ADDRESS}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {shortenAddress(CONTRACT_ADDRESS, 4)}
                </a>
              </>
            ) : null}
          </p>
        </div>
        <button
          type="button"
          className="btn btn-ghost btn-icon"
          onClick={() => {
            if (usingLocal) onLocalChange();
            else void refetch();
          }}
          aria-label="Refresh"
        >
          <RefreshCw
            className={`icon ${isLoading || isFetching || payingLocal ? "spin" : ""}`}
          />
        </button>
      </div>

      {showLoading ? (
        <p className="empty">Loading circle…</p>
      ) : !view && (isError || !details) && !usingLocal ? (
        <p className="empty">
          Circle data unavailable. Create a circle or join one from the list.
        </p>
      ) : view ? (
        <>
          {view.isPrivate &&
          view.inviteCode &&
          (view.isCreator ||
            (usingLocal && localDetails?.source === "local" && !address)) ? (
            <div className="invite-banner">
              <div className="invite-banner-copy">
                <p className="label">
                  <Lock className="icon" />
                  Private invite code
                </p>
                <p className="invite-code mono">{view.inviteCode}</p>
                <p className="sub">
                  Share this code with trusted members so they can join.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => void copyInviteCode()}
              >
                {copied ? <Check className="icon" /> : <Copy className="icon" />}
                {copied ? "Copied" : "Copy Code"}
              </button>
            </div>
          ) : view.isPrivate ? (
            <div className="invite-banner invite-banner-muted">
              <p className="label">
                <Lock className="icon" />
                Private circle
              </p>
              <p className="sub">
                Invite-only access. Ask the creator for the code if you need to
                invite others.
              </p>
            </div>
          ) : null}

          <div className="metrics">
            <Metric
              tone="pool"
              label="Pool"
              value={formatMon(view.poolAmount)}
              hint={`${view.paidCount?.toString() ?? "0"}/${view.participantCount?.toString() ?? "0"} deposited`}
            />
            <Metric
              tone="round"
              label="Round"
              value={
                view.currentRound !== undefined && view.totalRounds
                  ? `${Number(view.currentRound) + 1}/${view.totalRounds.toString()}`
                  : "—"
              }
              hint={
                view.nextRecipient
                  ? `Payout → ${shortenAddress(view.nextRecipient)}`
                  : "Payout recipient TBD"
              }
            />
            <Metric
              tone="members"
              label="Members"
              value={view.participantCount?.toString() ?? "—"}
              hint={
                view.rateLabel ??
                (view.contributionAmount !== undefined
                  ? formatMon(view.contributionAmount, 4) + " / round"
                  : "Contribution unset")
              }
            />
          </div>

          <div className="turn-banner">
            <div>
              <p className="label">Current payout turn</p>
              <p className="turn-title">
                Round{" "}
                {view.currentRound !== undefined
                  ? Number(view.currentRound) + 1
                  : "—"}
                {view.isActive ? " is live" : ` · ${view.statusLabel}`}
              </p>
              <p className="sub">
                {view.nextRecipient
                  ? `${shortenAddress(view.nextRecipient, 6)} receives the pool this round`
                  : "Recipient assigned when the circle is Active"}
              </p>
            </div>
          </div>

          <div className="progress-block">
            <div className="progress-meta">
              <p className="label">Round pool progress</p>
              <p className="mono">
                {formatMon(view.collectedAmount ?? 0n, 4)} /{" "}
                {formatMon(view.poolAmount ?? 0n, 4)}
              </p>
            </div>
            <div
              className="progress-track"
              role="progressbar"
              aria-valuenow={progressPct}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="progress-fill"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className="sub">{progressPct}% collected this round</p>
          </div>

          <div className="timeline-block">
            <p className="label">Rotation order</p>
            <ol className="timeline">
              {rotation.map((slot) => (
                <li
                  key={slot.round}
                  className={[
                    "timeline-item",
                    slot.isCurrent ? "is-current" : "",
                    slot.isPast ? "is-past" : "",
                    slot.isYou ? "is-you" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <span className="timeline-round">R{slot.round + 1}</span>
                  <span className="timeline-addr">
                    {slot.address
                      ? shortenAddress(slot.address, 5)
                      : "Open seat"}
                    {slot.isYou ? " · you" : ""}
                  </span>
                  {slot.isCurrent ? (
                    <span className="timeline-badge">Receiving</span>
                  ) : null}
                </li>
              ))}
            </ol>
          </div>

          {usingLocal ? (
            <div className="pay-row">
              <button
                type="button"
                className="btn btn-primary pay-btn"
                disabled={!payGate.canPay || payingLocal}
                onClick={() => void payLocalContribution()}
              >
                {payingLocal
                  ? "Confirming…"
                  : view.contributionAmount !== undefined
                    ? `Pay Contribution · ${formatMon(view.contributionAmount, 4)}`
                    : "Pay Contribution"}
              </button>
              {!payGate.canPay && payGate.reason ? (
                <p className="sub pay-hint">{payGate.reason}</p>
              ) : (
                <p className="sub pay-hint">
                  Demo deposit — recorded locally for this circle.
                </p>
              )}
            </div>
          ) : (
            <PayContributionButton
              circleId={circleId}
              contributionAmount={view.contributionAmount}
              canUserPay={Boolean(view) && payGate.canPay}
              disabledReason={
                !hasContract
                  ? "Deploy the contract to pay onchain."
                  : payGate.reason
              }
              onConfirmed={onDepositConfirmed}
            />
          )}
        </>
      ) : null}

      <Toast toast={localToast} onClose={() => setLocalToast(null)} />
    </section>
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
