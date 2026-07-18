"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useReadContract, useReadContracts } from "wagmi";
import { susuCircleAbi } from "@/lib/abi";
import {
  CIRCLE_STATUS,
  CONTRACT_ADDRESS,
  MONAD_CHAIN_ID,
} from "@/lib/config";
import {
  getCircleName,
  loadLocalCircles,
  secondsToFrequency,
  type Frequency,
  type LocalCircle,
} from "@/lib/circleMeta";
import { MOCK_CIRCLES } from "@/lib/mockCircles";
import { formatMon } from "@/lib/format";

export type ExplorerCircle = {
  id: string;
  name: string;
  contributionLabel: string;
  contributionWei?: bigint;
  frequency: Frequency;
  rateLabel: string;
  memberCount: number;
  maxParticipants: number;
  slotsLabel: string;
  status: string;
  statusIndex?: number;
  source: "onchain" | "local" | "mock";
  canJoin: boolean;
  currentRound: number;
  paidCount: number;
  participants: `0x${string}`[];
  creator?: `0x${string}`;
};

const hasContract = Boolean(CONTRACT_ADDRESS);

function toExplorer(circle: LocalCircle): ExplorerCircle {
  const amountLabel = `${Number(circle.contributionMon).toLocaleString(undefined, {
    maximumFractionDigits: 4,
  })} MON`;
  return {
    id: circle.id,
    name: circle.name,
    contributionLabel: amountLabel,
    contributionWei: BigInt(circle.contributionWei),
    frequency: circle.frequency,
    rateLabel: `${amountLabel} / ${circle.frequency.toLowerCase()}`,
    memberCount: circle.memberCount,
    maxParticipants: circle.maxParticipants,
    slotsLabel: `${circle.memberCount}/${circle.maxParticipants} members`,
    status: circle.status,
    source: circle.source,
    canJoin:
      (circle.status === "Open" || circle.status === "Active") &&
      circle.memberCount < circle.maxParticipants,
    currentRound: circle.currentRound,
    paidCount: circle.paidCount,
    participants: circle.participants,
    creator: circle.creator,
  };
}

export function useActiveCircles() {
  const [tick, setTick] = useState(0);

  const refreshLocal = useCallback(() => {
    setTick((t) => t + 1);
  }, []);

  useEffect(() => {
    const onStorage = () => refreshLocal();
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [refreshLocal]);

  const nextIdQuery = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: susuCircleAbi,
    functionName: "nextCircleId",
    chainId: MONAD_CHAIN_ID,
    query: {
      enabled: hasContract,
      refetchInterval: 15_000,
    },
  });

  const nextCircleId = nextIdQuery.data ?? 0n;
  const ids = useMemo(() => {
    const n = Number(nextCircleId);
    if (!Number.isFinite(n) || n <= 0) return [] as bigint[];
    return Array.from({ length: Math.min(n, 24) }, (_, i) => BigInt(i));
  }, [nextCircleId]);

  const circlesQuery = useReadContracts({
    contracts: ids.map((id) => ({
      address: CONTRACT_ADDRESS!,
      abi: susuCircleAbi,
      functionName: "getCircle" as const,
      args: [id] as const,
      chainId: MONAD_CHAIN_ID,
    })),
    query: {
      enabled: hasContract && ids.length > 0,
      refetchInterval: 15_000,
    },
  });

  const onchain = useMemo(() => {
    const list: ExplorerCircle[] = [];
    circlesQuery.data?.forEach((result, index) => {
      if (result.status !== "success" || !result.result) return;
      const [
        creator,
        contributionAmount,
        totalRounds,
        roundInterval,
        currentRound,
        ,
        paidCount,
        status,
        participantCount,
      ] = result.result;

      const statusLabel = CIRCLE_STATUS[status] ?? "Unknown";
      if (statusLabel !== "Open" && statusLabel !== "Active") return;

      const id = String(ids[index]);
      const frequency = secondsToFrequency(roundInterval);
      const amountLabel = formatMon(contributionAmount, 4);
      const members = Number(participantCount);
      const max = Number(totalRounds);

      list.push({
        id,
        name: getCircleName(id, `Circle #${id}`),
        contributionLabel: amountLabel,
        contributionWei: contributionAmount,
        frequency,
        rateLabel: `${amountLabel} / ${frequency.toLowerCase()}`,
        memberCount: members,
        maxParticipants: max,
        slotsLabel: `${members}/${max} members`,
        status: statusLabel,
        statusIndex: status,
        source: "onchain",
        canJoin: statusLabel === "Open" && members < max,
        currentRound: Number(currentRound),
        paidCount: Number(paidCount),
        participants: [],
        creator,
      });
    });
    return list;
  }, [circlesQuery.data, ids]);

  const localAndMock = useMemo(() => {
    void tick;
    const local = loadLocalCircles().map(toExplorer);
    const localIds = new Set(local.map((c) => c.id));
    const mocks = MOCK_CIRCLES.filter((m) => !localIds.has(m.id)).map(toExplorer);
    return [...local, ...mocks].filter(
      (c) => c.status === "Open" || c.status === "Active"
    );
  }, [tick]);

  const circles = useMemo(() => {
    // Prefer onchain entries; keep local/mock that aren't numeric duplicates
    const onchainIds = new Set(onchain.map((c) => c.id));
    const extras = localAndMock.filter((c) => !onchainIds.has(c.id));
    return [...onchain, ...extras];
  }, [localAndMock, onchain]);

  const getLocalDetails = useCallback((id: string): LocalCircle | undefined => {
    return (
      loadLocalCircles().find((c) => c.id === id) ??
      MOCK_CIRCLES.find((c) => c.id === id)
    );
  }, []);

  return {
    circles,
    isLoading: hasContract && (nextIdQuery.isLoading || circlesQuery.isLoading),
    refetch: async () => {
      refreshLocal();
      await Promise.all([nextIdQuery.refetch(), circlesQuery.refetch()]);
    },
    refreshLocal,
    getLocalDetails,
    hasContract,
  };
}
