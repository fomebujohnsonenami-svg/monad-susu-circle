"use client";

import { Loader2, Users } from "lucide-react";
import type { ExplorerCircle } from "@/hooks/useActiveCircles";

type Props = {
  circles: ExplorerCircle[];
  isLoading: boolean;
  selectedId: string | null;
  busyId: string | null;
  onSelect: (id: string) => void;
  onJoin: (id: string) => void;
};

export function ActiveCirclesList({
  circles,
  isLoading,
  selectedId,
  busyId,
  onSelect,
  onJoin,
}: Props) {
  return (
    <section className="panel" aria-labelledby="explorer-heading">
      <div className="panel-head">
        <div>
          <h2 id="explorer-heading">Active Susu Circles</h2>
          <p className="sub">
            Browse open circles, join a seat, or open one to manage your rounds.
          </p>
        </div>
      </div>

      {isLoading && circles.length === 0 ? (
        <p className="empty">Loading circles…</p>
      ) : circles.length === 0 ? (
        <p className="empty">No active circles yet — create the first one above.</p>
      ) : (
        <div className="circle-grid">
          {circles.map((circle) => {
            const selected = selectedId === circle.id;
            const joining = busyId === circle.id;
            return (
              <article
                key={circle.id}
                className={`circle-card ${selected ? "is-selected" : ""}`}
              >
                <button
                  type="button"
                  className="circle-card-main"
                  onClick={() => onSelect(circle.id)}
                >
                  <div className="circle-card-top">
                    <h3>{circle.name}</h3>
                    <span className={`pill pill-${circle.status.toLowerCase()}`}>
                      {circle.status}
                    </span>
                  </div>
                  <p className="circle-rate">{circle.rateLabel}</p>
                  <p className="sub circle-slots">
                    <Users className="icon" />
                    {circle.slotsLabel}
                  </p>
                </button>

                <div className="circle-card-actions">
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => onSelect(circle.id)}
                  >
                    View
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={!circle.canJoin || joining}
                    onClick={() => onJoin(circle.id)}
                  >
                    {joining ? <Loader2 className="icon spin" /> : null}
                    {joining ? "Joining…" : "Join Circle"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
