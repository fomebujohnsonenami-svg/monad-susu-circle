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
      title: "Contribution confirmed on Monad",
      hash: txHash,
    });
    onConfirmed?.();
  }, [isConfirmed, txHash, onConfirmed]);

  useEffect(() => {
    const err = writeError || receiptError;
    if (!err) return;
    setToast({
      kind: "error",
      title: "Transaction failed",
      message: shortenError(err),
    });
  }, [writeError, receiptError]);

  const payContribution = useCallback(async () => {
    if (!CONTRACT_ADDRESS || contributionAmount === undefined) {
      setToast({
        kind: "error",
        title: "Contract not configured",
        message: "Set NEXT_PUBLIC_CONTRACT_ADDRESS in frontend/.env.local",
      });
      return;
    }
    if (!isConnected || !address) {
      setToast({
        kind: "error",
        title: "Wallet not connected",
        message: "Connect your wallet on Monad Testnet first.",
      });
      return;
    }
    if (chainId !== MONAD_CHAIN_ID) {
      setToast({
        kind: "error",
        title: "Wrong network",
        message: "Switch to Monad Testnet (chain ID 10143).",
      });
      return;
    }

    resetWrite();

    try {
      // Refresh gas estimate right before sending (Viem eth_estimateGas)
      const estimateResult = await refetchGas();
      if (estimateResult.error) {
        throw estimateResult.error;
      }
      const gas = estimateResult.data ?? gasEstimate;
      // Small buffer for Monad fee market variance
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
      setToast({
        kind: "error",
        title: "Transaction failed",
        message: shortenError(err),
      });
      throw err;
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

function shortenError(err: unknown) {
  if (!err) return "Unknown error";
  if (typeof err === "string") return err;
  if (err instanceof Error) {
    const msg = err.message || "Unknown error";
    // Wagmi/viem errors can be very long — keep toast readable
    const short = msg.split("\n")[0] ?? msg;
    return short.length > 180 ? `${short.slice(0, 180)}…` : short;
  }
  return "Unknown error";
}
