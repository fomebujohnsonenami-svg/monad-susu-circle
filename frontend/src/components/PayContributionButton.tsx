"use client";

import { Loader2, Coins } from "lucide-react";
import { useDepositRoundFunds } from "@/hooks/useDepositRoundFunds";
import { Toast } from "@/components/Toast";
import { formatMon } from "@/lib/format";

type Props = {
  circleId: bigint;
  contributionAmount?: bigint;
  canUserPay: boolean;
  disabledReason?: string;
  onConfirmed: () => void;
};

export function PayContributionButton({
  circleId,
  contributionAmount,
  canUserPay,
  disabledReason,
  onConfirmed,
}: Props) {
  const {
    payContribution,
    isEstimatingGas,
    isWalletPrompting,
    isMining,
    isPending,
    canPay,
    toast,
    clearToast,
    gasEstimate,
  } = useDepositRoundFunds({
    circleId,
    contributionAmount,
    enabled: canUserPay,
    onConfirmed,
  });

  const label = isWalletPrompting
    ? "Confirm in wallet…"
    : isMining
      ? "Mining on Monad…"
      : isEstimatingGas
        ? "Estimating gas…"
        : `Pay Contribution${
            contributionAmount !== undefined
              ? ` · ${formatMon(contributionAmount, 4)}`
              : ""
          }`;

  return (
    <>
      <div className="pay-row">
        <button
          type="button"
          className="btn btn-primary pay-btn"
          disabled={!canUserPay || !canPay || isPending || contributionAmount === undefined}
          onClick={() => {
            void payContribution().catch(() => {
              /* errors surfaced via toast */
            });
          }}
        >
          {isPending ? (
            <Loader2 className="icon spin" />
          ) : (
            <Coins className="icon" />
          )}
          {label}
        </button>

        {disabledReason && !canUserPay && (
          <p className="sub pay-hint">{disabledReason}</p>
        )}

        {canUserPay && gasEstimate !== undefined && !isPending && (
          <p className="sub pay-hint">Est. gas: {gasEstimate.toString()} units</p>
        )}

        {isMining && (
          <p className="sub pay-hint mining">
            <Loader2 className="icon spin" />
            Waiting for Monad Testnet confirmation…
          </p>
        )}
      </div>

      <Toast toast={toast} onClose={clearToast} />
    </>
  );
}
