"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { WalletConnect } from "@/components/WalletConnect";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CreateCircleForm } from "@/components/CreateCircleForm";
import { ActiveCirclesList } from "@/components/ActiveCirclesList";
import { CircleDashboardPanel } from "@/components/CircleDashboardPanel";
import { Toast } from "@/components/Toast";
import { useActiveCircles } from "@/hooks/useActiveCircles";
import { useJoinCircle } from "@/hooks/useJoinCircle";
import { DEFAULT_CIRCLE_ID } from "@/lib/config";

export function Dashboard() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hasUserPicked, setHasUserPicked] = useState(false);

  const { circles, isLoading, refreshLocal, getLocalDetails, refetch } =
    useActiveCircles();

  useEffect(() => {
    if (hasUserPicked || selectedId || circles.length === 0) return;
    const preferred = circles.find((c) => c.id === DEFAULT_CIRCLE_ID.toString());
    setSelectedId(preferred?.id ?? circles[0]?.id ?? null);
  }, [circles, hasUserPicked, selectedId]);

  const selectCircle = useCallback((id: string) => {
    setHasUserPicked(true);
    setSelectedId(id);
  }, []);

  const onJoined = useCallback(
    (circleId: string) => {
      selectCircle(circleId);
      refreshLocal();
      void refetch();
    },
    [refetch, refreshLocal, selectCircle]
  );

  const { joinCircle, busyId, toast, clearToast } = useJoinCircle(onJoined);

  const selectedExplorer = useMemo(
    () => circles.find((c) => c.id === selectedId),
    [circles, selectedId]
  );

  const localFromExplorer = useMemo(() => {
    if (!selectedId || /^\d+$/.test(selectedId)) return undefined;
    return getLocalDetails(selectedId);
  }, [getLocalDetails, selectedId, circles]);

  return (
    <div className="spatial-stage">
      <div className="shell shell-wide">
        <header className="top">
          <div className="brand-block">
            <div className="brand-mark" aria-hidden />
            <div>
              <p className="brand">SusuCircle</p>
              <p className="tagline">Round dues · pooled payouts</p>
            </div>
          </div>
          <div className="top-actions">
            <span className="network-chip">Monad · 10143</span>
            <ThemeToggle />
          </div>
        </header>

        <WalletConnect />

        <CreateCircleForm
          onCreated={(id) => {
            selectCircle(id);
            refreshLocal();
            void refetch();
          }}
        />

        <ActiveCirclesList
          circles={circles}
          isLoading={isLoading}
          selectedId={selectedId}
          busyId={busyId}
          onSelect={selectCircle}
          onJoin={(id) => void joinCircle(id)}
        />

        <CircleDashboardPanel
          selectedId={selectedId}
          selectedExplorer={selectedExplorer}
          localDetails={localFromExplorer}
          onLocalChange={refreshLocal}
        />

        <Toast toast={toast} onClose={clearToast} />
      </div>
    </div>
  );
}
