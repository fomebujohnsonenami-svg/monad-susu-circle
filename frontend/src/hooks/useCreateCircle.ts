"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  useAccount,
  usePublicClient,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { parseEther } from "viem";
import { susuCircleAbi } from "@/lib/abi";
import { CONTRACT_ADDRESS, MONAD_CHAIN_ID } from "@/lib/config";
import {
  frequencyToSeconds,
  generateInviteCode,
  saveCirclePrivacy,
  type Frequency,
  upsertLocalCircle,
  type LocalCircle,
} from "@/lib/circleMeta";
import { formatTxError, isUserRejection } from "@/lib/errors";
import type { ToastState } from "@/components/Toast";

type CreateInput = {
  name: string;
  contributionMon: string;
  frequency: Frequency;
  maxParticipants: number;
  isPrivate: boolean;
};

type CreateResult = {
  circleId: string;
  onchain: boolean;
};

/**
 * Creates a circle onchain when the contract is configured; otherwise
 * simulates a successful create into local storage so the UI stays usable.
 */
export function useCreateCircle(onCreated?: (result: CreateResult) => void) {
  const { address, chainId, isConnected } = useAccount();
  const publicClient = usePublicClient({ chainId: MONAD_CHAIN_ID });
  const [toast, setToast] = useState<ToastState>(null);
  const [pendingMeta, setPendingMeta] = useState<CreateInput | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
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
    if (!isConfirmed || !txHash || !pendingMeta || !address) return;
    if (toastedHash.current === txHash) return;
    toastedHash.current = txHash;

    void (async () => {
      let circleId = "0";
      try {
        if (publicClient && CONTRACT_ADDRESS) {
          const nextId = await publicClient.readContract({
            address: CONTRACT_ADDRESS,
            abi: susuCircleAbi,
            functionName: "nextCircleId",
          });
          circleId = (nextId - 1n).toString();
        }
      } catch {
        /* keep fallback id */
      }

      const inviteCode = pendingMeta.isPrivate ? generateInviteCode() : undefined;
      upsertLocalCircle({
        id: circleId,
        name: pendingMeta.name,
        contributionMon: pendingMeta.contributionMon,
        contributionWei: parseEther(pendingMeta.contributionMon).toString(),
        frequency: pendingMeta.frequency,
        maxParticipants: pendingMeta.maxParticipants,
        memberCount: 1,
        status: "Open",
        currentRound: 0,
        paidCount: 0,
        participants: [address],
        creator: address,
        createdAt: Date.now(),
        source: "local",
        isPrivate: pendingMeta.isPrivate,
        inviteCode,
      });
      saveCirclePrivacy(circleId, {
        isPrivate: pendingMeta.isPrivate,
        inviteCode,
      });

      setToast({
        kind: "success",
        title: pendingMeta.isPrivate
          ? "Private circle created"
          : "Circle created",
        hash: txHash,
        message: inviteCode
          ? `Invite code ${inviteCode} — share it with trusted members.`
          : undefined,
      });
      setPendingMeta(null);
      onCreated?.({ circleId, onchain: true });
    })();
  }, [address, isConfirmed, onCreated, pendingMeta, publicClient, txHash]);

  useEffect(() => {
    const err = writeError || receiptError;
    if (!err || handledWriteError.current === err) return;
    handledWriteError.current = err;
    if (isUserRejection(err)) {
      resetWrite();
      setPendingMeta(null);
      return;
    }
    setToast({
      kind: "error",
      title: "Create failed",
      message: formatTxError(err),
    });
    setPendingMeta(null);
  }, [writeError, receiptError, resetWrite]);

  const createCircle = useCallback(
    async (input: CreateInput): Promise<CreateResult | null> => {
      const name = input.name.trim();
      const amount = Number(input.contributionMon);

      if (!name) {
        setToast({
          kind: "error",
          title: "Name required",
          message: "Give your Susu circle a name.",
        });
        return null;
      }
      if (!Number.isFinite(amount) || amount <= 0) {
        setToast({
          kind: "error",
          title: "Invalid amount",
          message: "Contribution must be greater than 0 MON.",
        });
        return null;
      }
      if (input.maxParticipants < 2 || input.maxParticipants > 50) {
        setToast({
          kind: "error",
          title: "Invalid size",
          message: "Participants must be between 2 and 50.",
        });
        return null;
      }

      const contributionWei = parseEther(input.contributionMon);
      const roundInterval = frequencyToSeconds(input.frequency);
      const totalRounds = BigInt(input.maxParticipants);

      // Onchain path when contract + wallet on Monad
      if (CONTRACT_ADDRESS && isConnected && address && chainId === MONAD_CHAIN_ID) {
        handledWriteError.current = null;
        resetWrite();
        setPendingMeta(input);

        try {
          await writeContractAsync({
            address: CONTRACT_ADDRESS,
            abi: susuCircleAbi,
            functionName: "createCircle",
            args: [contributionWei, totalRounds, roundInterval],
            chainId: MONAD_CHAIN_ID,
          });
          return null; // result delivered via confirmation effect
        } catch (err) {
          if (isUserRejection(err)) {
            resetWrite();
            setPendingMeta(null);
            return null;
          }
          setPendingMeta(null);
          setToast({
            kind: "error",
            title: "Create failed",
            message: formatTxError(err),
          });
          return null;
        }
      }

      // Simulated create (no contract / wallet) so the dashboard stays demoable
      setIsSimulating(true);
      await new Promise((r) => setTimeout(r, 900));

      const localId = `local-${Date.now()}`;
      const creator =
        address ?? ("0x0000000000000000000000000000000000000001" as `0x${string}`);
      // Local demo circles start Active so Pay Contribution is usable immediately.
      // Onchain creates remain Open until seats fill (contract rules).
      const inviteCode = input.isPrivate ? generateInviteCode() : undefined;
      const circle: LocalCircle = {
        id: localId,
        name,
        contributionMon: input.contributionMon,
        contributionWei: contributionWei.toString(),
        frequency: input.frequency,
        maxParticipants: input.maxParticipants,
        memberCount: 1,
        status: "Active",
        currentRound: 0,
        paidCount: 0,
        participants: [creator],
        creator,
        createdAt: Date.now(),
        source: "local",
        isPrivate: input.isPrivate,
        inviteCode,
      };
      upsertLocalCircle(circle);
      setIsSimulating(false);
      setToast({
        kind: "success",
        title: input.isPrivate ? "Private circle created" : "Circle created",
        message: inviteCode
          ? `Invite code ${inviteCode} — copy it from your dashboard to share.`
          : CONTRACT_ADDRESS
            ? "Saved locally — connect on Monad Testnet to create onchain."
            : `${name} is ready. Open it below to manage rounds.`,
      });

      const result = { circleId: localId, onchain: false };
      onCreated?.(result);
      return result;
    },
    [
      address,
      chainId,
      isConnected,
      onCreated,
      resetWrite,
      writeContractAsync,
    ]
  );

  return {
    createCircle,
    isPending: isWalletPrompting || isMining || isSimulating,
    isWalletPrompting,
    isMining,
    isSimulating,
    toast,
    clearToast: () => setToast(null),
  };
}
