"use client";

import { useCallback } from "react";
import { useAccount, useReadContract, useReadContracts } from "wagmi";
import { susuCircleAbi } from "@/lib/abi";
import {
  CIRCLE_STATUS,
  CONTRACT_ADDRESS,
  DEFAULT_CIRCLE_ID,
  MONAD_CHAIN_ID,
} from "@/lib/config";

const hasContract = Boolean(CONTRACT_ADDRESS);

/**
 * Live circle state from Monad Testnet via `getCircle` / related view calls.
 */
export function useCircleDashboard(
  circleId = DEFAULT_CIRCLE_ID,
  options?: { enabled?: boolean }
) {
  const { address, isConnected } = useAccount();
  const enabled = options?.enabled ?? true;

  const circleQuery = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: susuCircleAbi,
    functionName: "getCircle",
    args: [circleId],
    chainId: MONAD_CHAIN_ID,
    query: {
      enabled: hasContract && enabled,
      refetchInterval: 12_000,
    },
  });

  const circle = circleQuery.data;
  const currentRound = circle?.[4];
  const status = circle?.[7];
  const isActive = status === 1;

  const recipientQuery = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: susuCircleAbi,
    functionName: "getCurrentRecipient",
    args: [circleId],
    chainId: MONAD_CHAIN_ID,
    query: {
      enabled: hasContract && enabled && isActive,
      refetchInterval: 12_000,
    },
  });

  const memberQuery = useReadContracts({
    contracts:
      CONTRACT_ADDRESS && address && currentRound !== undefined
        ? [
            {
              address: CONTRACT_ADDRESS,
              abi: susuCircleAbi,
              functionName: "isParticipant",
              args: [circleId, address],
              chainId: MONAD_CHAIN_ID,
            },
            {
              address: CONTRACT_ADDRESS,
              abi: susuCircleAbi,
              functionName: "hasPaidRound",
              args: [circleId, currentRound, address],
              chainId: MONAD_CHAIN_ID,
            },
          ]
        : [],
    query: {
      enabled:
        hasContract &&
        enabled &&
        Boolean(address) &&
        currentRound !== undefined,
      refetchInterval: 12_000,
    },
  });

  const contributionAmount = circle?.[1];
  const totalRounds = circle?.[2];
  const paidCount = circle?.[6];
  const participantCount = circle?.[8];

  // Round pool that will be paid out once everyone deposits
  const poolAmount =
    contributionAmount !== undefined && participantCount !== undefined
      ? contributionAmount * participantCount
      : undefined;

  // Funds already collected in the active round
  const collectedAmount =
    contributionAmount !== undefined && paidCount !== undefined
      ? contributionAmount * paidCount
      : undefined;

  const refetchCircle = circleQuery.refetch;
  const refetchRecipient = recipientQuery.refetch;
  const refetchMember = memberQuery.refetch;

  const refetchAll = useCallback(async () => {
    await Promise.all([refetchCircle(), refetchRecipient(), refetchMember()]);
  }, [refetchCircle, refetchRecipient, refetchMember]);

  return {
    hasContract,
    circleId,
    isConnected,
    address,
    isLoading: circleQuery.isLoading,
    isFetching: circleQuery.isFetching,
    isError: circleQuery.isError,
    error: circleQuery.error,
    refetch: refetchAll,
    details: circle
      ? {
          creator: circle[0],
          contributionAmount,
          totalRounds,
          roundInterval: circle[3],
          currentRound,
          roundStartTime: circle[5],
          paidCount,
          status,
          statusLabel:
            status !== undefined ? CIRCLE_STATUS[status] ?? "Unknown" : "—",
          participantCount,
          /** Full round pool (contribution × participants) from chain */
          poolAmount,
          /** Amount deposited so far this round */
          collectedAmount,
          nextRecipient: recipientQuery.data,
          isActive,
        }
      : null,
    user: {
      isParticipant: Boolean(memberQuery.data?.[0]?.result),
      hasPaidRound: Boolean(memberQuery.data?.[1]?.result),
      isLoading: memberQuery.isLoading || memberQuery.isFetching,
    },
  };
}
