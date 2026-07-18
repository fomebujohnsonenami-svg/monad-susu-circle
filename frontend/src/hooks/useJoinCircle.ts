"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  useAccount,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { susuCircleAbi } from "@/lib/abi";
import { CONTRACT_ADDRESS, MONAD_CHAIN_ID } from "@/lib/config";
import {
  loadLocalCircles,
  upsertLocalCircle,
  type LocalCircle,
} from "@/lib/circleMeta";
import { MOCK_CIRCLES } from "@/lib/mockCircles";
import { formatTxError, isUserRejection } from "@/lib/errors";
import type { ToastState } from "@/components/Toast";

function findLocalOrMock(id: string): LocalCircle | undefined {
  return (
    loadLocalCircles().find((c) => c.id === id) ??
    MOCK_CIRCLES.find((c) => c.id === id)
  );
}

export function useJoinCircle(onJoined?: (circleId: string) => void) {
  const { address, chainId, isConnected } = useAccount();
  const [toast, setToast] = useState<ToastState>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const toastedHash = useRef<string | null>(null);
  const handledWriteError = useRef<unknown>(null);

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
  } = useWaitForTransactionReceipt({
    hash: txHash,
    chainId: MONAD_CHAIN_ID,
    query: { enabled: Boolean(txHash) },
  });

  useEffect(() => {
    if (!isConfirmed || !txHash || !pendingId) return;
    if (toastedHash.current === txHash) return;
    toastedHash.current = txHash;
    setToast({ kind: "success", title: "Joined circle", hash: txHash });
    onJoined?.(pendingId);
    setPendingId(null);
    setBusyId(null);
  }, [isConfirmed, onJoined, pendingId, txHash]);

  useEffect(() => {
    const err = writeError || receiptError;
    if (!err || handledWriteError.current === err) return;
    handledWriteError.current = err;
    if (isUserRejection(err)) {
      resetWrite();
      setPendingId(null);
      setBusyId(null);
      return;
    }
    setToast({
      kind: "error",
      title: "Join failed",
      message: formatTxError(err),
    });
    setPendingId(null);
    setBusyId(null);
  }, [writeError, receiptError, resetWrite]);

  const joinCircle = useCallback(
    async (circleId: string) => {
      if (!isConnected || !address) {
        setToast({
          kind: "error",
          title: "Wallet required",
          message: "Connect a wallet to join a circle.",
        });
        return;
      }

      const isNumeric = /^\d+$/.test(circleId);

      // Onchain join for numeric circle ids
      if (
        isNumeric &&
        CONTRACT_ADDRESS &&
        chainId === MONAD_CHAIN_ID
      ) {
        handledWriteError.current = null;
        resetWrite();
        setPendingId(circleId);
        setBusyId(circleId);
        try {
          await writeContractAsync({
            address: CONTRACT_ADDRESS,
            abi: susuCircleAbi,
            functionName: "joinCircle",
            args: [BigInt(circleId)],
            chainId: MONAD_CHAIN_ID,
          });
        } catch (err) {
          if (isUserRejection(err)) {
            resetWrite();
            setPendingId(null);
            setBusyId(null);
            return;
          }
          setToast({
            kind: "error",
            title: "Join failed",
            message: formatTxError(err),
          });
          setPendingId(null);
          setBusyId(null);
        }
        return;
      }

      // Local / mock join
      const base = findLocalOrMock(circleId);
      if (!base) {
        setToast({
          kind: "error",
          title: "Circle not found",
          message: "This circle is no longer available.",
        });
        return;
      }
      if (base.participants.some((p) => p.toLowerCase() === address.toLowerCase())) {
        setToast({
          kind: "error",
          title: "Already a member",
          message: "You already joined this circle.",
        });
        onJoined?.(circleId);
        return;
      }
      if (base.memberCount >= base.maxParticipants) {
        setToast({
          kind: "error",
          title: "Circle full",
          message: "No open slots left in this circle.",
        });
        return;
      }

      setBusyId(circleId);
      await new Promise((r) => setTimeout(r, 700));

      const nextMembers = [...base.participants, address];
      const full = nextMembers.length >= base.maxParticipants;
      const updated: LocalCircle = {
        ...base,
        participants: nextMembers,
        memberCount: nextMembers.length,
        status: full ? "Active" : base.status,
        source: "local",
      };
      upsertLocalCircle(updated);
      setBusyId(null);
      setToast({
        kind: "success",
        title: full ? "Joined — circle started" : "Joined circle",
        message: full
          ? "All seats filled. Contributions are now open."
          : "You are enrolled in the rotation order.",
      });
      onJoined?.(circleId);
    },
    [
      address,
      chainId,
      isConnected,
      onJoined,
      resetWrite,
      writeContractAsync,
    ]
  );

  return {
    joinCircle,
    busyId,
    isPending: isWalletPrompting || isMining || busyId !== null,
    toast,
    clearToast: () => setToast(null),
  };
}
