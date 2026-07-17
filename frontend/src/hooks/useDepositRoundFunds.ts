"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  useAccount,
  useEstimateGas,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { encodeFunctionData } from "viem";
import { susuCircleAbi } from "@/lib/abi";
import { CONTRACT_ADDRESS, MONAD_CHAIN_ID } from "@/lib/config";
import { formatTxError, isUserRejection } from "@/lib/errors";
import type { ToastState } from "@/components/Toast";

type DepositArgs = {
  circleId: bigint;
  contributionAmount?: bigint;
  enabled: boolean;
  onConfirmed?: () => void;
};

/**
 * Pays the current round contribution via `depositRoundFunds`.
 * Estimates gas with Viem, prompts the wallet, waits for Monad confirmation.
 */
export function useDepositRoundFunds({
  circleId,
  contributionAmount,
  enabled,
  onConfirmed,
}: DepositArgs) {
  const { address, chainId, isConnected } = useAccount();
  const [toast, setToast] = useState<ToastState>(null);
  const toastedHash = useRef<string | null>(null);
  const handledWriteError = useRef<unknown>(null);

  const canPrepare =
    enabled &&
    Boolean(CONTRACT_ADDRESS) &&
    Boolean(address) &&
    contributionAmount !== undefined &&
    contributionAmount > 0n &&
    chainId === MONAD_CHAIN_ID;

  const calldata = useMemo(() => {
    if (!canPrepare) return undefined;
    return encodeFunctionData({
      abi: susuCircleAbi,
      functionName: "depositRoundFunds",
      args: [circleId],
    });
  }, [canPrepare, circleId]);

  const {
    data: gasEstimate,
    isFetching: isEstimatingGas,
    refetch: refetchGas,
  } = useEstimateGas({
    to: CONTRACT_ADDRESS,
    data: calldata,
    value: contributionAmount,
    account: address,
    chainId: MONAD_CHAIN_ID,
    query: {
      enabled: canPrepare && Boolean(calldata),
      retry: false,
    },
  });

  const {
    writeContractAsync,
    data: txHash,
    error: writeError,
    isPending: isWalletPrompting,
    reset: resetWrite,
  } = useWriteContract();

  const {
    isLoading: isMining,
    isSuccess: isConfirmed,
    error: receiptError,
    data: receipt,
  } = useWaitForTransactionReceipt({
    hash: txHash,
    chainId: MONAD_CHAIN_ID,
    query: { enabled: Boolean(txHash) },
  });

  useEffect(() => {
    if (!isConfirmed || !txHash) return;
    if (toastedHash.current === txHash) return;
    toastedHash.current = txHash;
    setToast({
      kind: "success",
      title: "Payment confirmed",
      hash: txHash,
    });
    onConfirmed?.();
  }, [isConfirmed, txHash, onConfirmed]);

  useEffect(() => {
    const err = writeError || receiptError;
    if (!err || handledWriteError.current === err) return;
    handledWriteError.current = err;

    // User closed the wallet prompt — no toast, no console noise
    if (isUserRejection(err)) {
      resetWrite();
      return;
    }

    setToast({
      kind: "error",
      title: "Payment failed",
      message: formatTxError(err),
    });
  }, [writeError, receiptError, resetWrite]);

  const payContribution = useCallback(async () => {
    if (!CONTRACT_ADDRESS || contributionAmount === undefined) {
      setToast({
        kind: "error",
        title: "Contract missing",
        message: "Add NEXT_PUBLIC_CONTRACT_ADDRESS to .env.local",
      });
      return;
    }
    if (!isConnected || !address) {
      setToast({
        kind: "error",
        title: "Wallet required",
        message: "Connect a wallet on Monad Testnet.",
      });
      return;
    }
    if (chainId !== MONAD_CHAIN_ID) {
      setToast({
        kind: "error",
        title: "Wrong network",
        message: "Switch to Monad Testnet (10143).",
      });
      return;
    }

    handledWriteError.current = null;
    resetWrite();

    try {
      const estimateResult = await refetchGas();
      if (estimateResult.error) {
        if (isUserRejection(estimateResult.error)) return;
        setToast({
          kind: "error",
          title: "Gas estimate failed",
          message: formatTxError(estimateResult.error),
        });
        return;
      }

      const gas = estimateResult.data ?? gasEstimate;
      const gasWithBuffer = gas ? (gas * 120n) / 100n : undefined;

      await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: susuCircleAbi,
        functionName: "depositRoundFunds",
        args: [circleId],
        value: contributionAmount,
        chainId: MONAD_CHAIN_ID,
        gas: gasWithBuffer,
      });
    } catch (err) {
      // Rejection is normal UX — swallow quietly (do not rethrow)
      if (isUserRejection(err)) {
        resetWrite();
        return;
      }
      setToast({
        kind: "error",
        title: "Payment failed",
        message: formatTxError(err),
      });
    }
  }, [
    address,
    chainId,
    circleId,
    contributionAmount,
    gasEstimate,
    isConnected,
    refetchGas,
    resetWrite,
    writeContractAsync,
  ]);

  return {
    payContribution,
    isEstimatingGas,
    isWalletPrompting,
    isMining,
    isPending: isWalletPrompting || isMining,
    isConfirmed,
    txHash,
    receipt,
    gasEstimate,
    toast,
    clearToast: () => setToast(null),
    canPay: canPrepare && !isWalletPrompting && !isMining,
  };
}
