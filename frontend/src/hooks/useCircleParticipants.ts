"use client";

import { useReadContract } from "wagmi";
import { susuCircleAbi } from "@/lib/abi";
import { CONTRACT_ADDRESS, MONAD_CHAIN_ID } from "@/lib/config";

const hasContract = Boolean(CONTRACT_ADDRESS);

export function useCircleParticipants(
  circleId: bigint | undefined,
  enabled = true
) {
  const query = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: susuCircleAbi,
    functionName: "getParticipants",
    args: circleId !== undefined ? [circleId] : undefined,
    chainId: MONAD_CHAIN_ID,
    query: {
      enabled: hasContract && enabled && circleId !== undefined,
      refetchInterval: 12_000,
    },
  });

  return {
    participants: (query.data as `0x${string}`[] | undefined) ?? [],
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}
