"use client";

import { useAccount, useReadContract, useReadContracts } from "wagmi";
import { susuCircleAbi } from "@/lib/abi";
import {
  CIRCLE_STATUS,
  CONTRACT_ADDRESS,
  DEFAULT_CIRCLE_ID,
  MONAD_CHAIN_ID,
} from "@/lib/config";

const hasContract = Boolean(CONTRACT_ADDRESS);

export function useCircleDashboard(circleId = DEFAULT_CIRCLE_ID) {
  const { address, isConnected } = useAccount();

  const circleQuery = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: susuCircleAbi,
    functionName: "getCircle",
    args: [circleId],
    chainId: MONAD_CHAIN_ID,
    query: { enabled: hasContract },
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
    query: { enabled: hasContract && isActive },
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
      enabled: hasContract && Boolean(address) && currentRound !== undefined,
    },
  });

  const contributionAmount = circle?.[1];
  const totalRounds = circle?.[2];
  const paidCount = circle?.[6];
  const participantCount = circle?.[8];

  const poolSize =
    contributionAmount !== undefined && participantCount !== undefined
      ? contributionAmount * participantCount
      : undefined;

  return {
    hasContract,
    circleId,
    isConnected,
    address,
    isLoading: circleQuery.isLoading,
    isError: circleQuery.isError,
    error: circleQuery.error,
    refetch: circleQuery.refetch,
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
          poolSize,
          nextRecipient: recipientQuery.data,
        }
      : null,
    user: {
      isParticipant: Boolean(memberQuery.data?.[0]?.result),
      hasPaidRound: Boolean(memberQuery.data?.[1]?.result),
      isLoading: memberQuery.isLoading,
    },
  };
}
