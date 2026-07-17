"use client";

import { Loader2 } from "lucide-react";
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
    isWalletPrompting,
    isMining,
    isPending,
    canPay,
    toast,
    clearToast,
  } = useDepositRoundFunds({
    circleId,
    contributionAmount,
    enabled: canUserPay,
    onConfirmed,
  });

  const label = isWalletPrompting
    ? "Confirm in wallet"
    : isMining
      ? "Confirming…"
      : contributionAmount !== undefined
        ? `Pay ${formatMon(contributionAmount, 4)}`
        : "Pay contribution";

  return (
    <>
      <div className="pay-row">
        <button
          type="button"
          className="btn btn-primary pay-btn"
          disabled={
            !canUserPay ||
            !canPay ||
            isPending ||
            contributionAmount === undefined
          }
          onClick={() => {
            void payContribution();
          }}
        >
          {isPending && <Loader2 className="icon spin" />}
          {label}
        </button>

        {!canUserPay && disabledReason ? (
          <p className="sub pay-hint">{disabledReason}</p>
        ) : null}

        {isMining ? (
          <p className="sub pay-hint mining">Waiting for confirmation</p>
        ) : null}
      </div>

      <Toast toast={toast} onClose={clearToast} />
    </>
  );
}
