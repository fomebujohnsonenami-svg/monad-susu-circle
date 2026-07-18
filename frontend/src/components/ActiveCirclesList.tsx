"use client";

import { useEffect, useId, useState } from "react";
import { Loader2, Lock, Users, X } from "lucide-react";
import type { ExplorerCircle } from "@/hooks/useActiveCircles";

type Props = {
  circles: ExplorerCircle[];
  isLoading: boolean;
  selectedId: string | null;
  busyId: string | null;
  onSelect: (id: string) => void;
  onJoin: (
    id: string,
    options?: { inviteCode?: string }
  ) => Promise<{ ok: boolean; error?: string }>;
};

export function ActiveCirclesList({
  circles,
  isLoading,
  selectedId,
  busyId,
  onSelect,
  onJoin,
}: Props) {
  const [privateTarget, setPrivateTarget] = useState<ExplorerCircle | null>(
    null
  );
  const [inviteInput, setInviteInput] = useState("");
  const [modalError, setModalError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const titleId = useId();

  useEffect(() => {
    if (!privateTarget) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPrivateTarget(null);
        setInviteInput("");
        setModalError(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [privateTarget]);

  const closeModal = () => {
    if (confirming) return;
    setPrivateTarget(null);
    setInviteInput("");
    setModalError(null);
  };

  const handleJoinClick = (circle: ExplorerCircle) => {
    if (circle.isPrivate) {
      setPrivateTarget(circle);
      setInviteInput("");
      setModalError(null);
      return;
    }
    void onJoin(circle.id);
  };

  const confirmPrivateJoin = async () => {
    if (!privateTarget) return;
    const code = inviteInput.trim();
    if (!code) {
      setModalError("Invalid Invite Code. Access Denied.");
      return;
    }
    setConfirming(true);
    setModalError(null);
    const result = await onJoin(privateTarget.id, { inviteCode: code });
    setConfirming(false);
    if (result.ok) {
      setPrivateTarget(null);
      setInviteInput("");
      setModalError(null);
      return;
    }
    setModalError(result.error ?? "Invalid Invite Code. Access Denied.");
  };

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
                    <div className="pill-row">
                      {circle.isPrivate ? (
                        <span className="pill pill-private">
                          <Lock className="icon" />
                          Private
                        </span>
                      ) : null}
                      <span className={`pill pill-${circle.status.toLowerCase()}`}>
                        {circle.status}
                      </span>
                    </div>
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
                    onClick={() => handleJoinClick(circle)}
                  >
                    {joining ? <Loader2 className="icon spin" /> : null}
                    {joining
                      ? "Joining…"
                      : circle.isPrivate
                        ? "Join with Code"
                        : "Join Circle"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {privateTarget ? (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={closeModal}
        >
          <div
            className="modal-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-head">
              <div>
                <p className="label">Private access</p>
                <h3 id={titleId}>This is a Private Circle. Enter Invite Code to Join</h3>
                <p className="sub">{privateTarget.name}</p>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-icon"
                onClick={closeModal}
                aria-label="Close"
                disabled={confirming}
              >
                <X className="icon" />
              </button>
            </div>

            <label className="field">
              <span className="label">Invite code</span>
              <input
                className="field-input mono"
                type="text"
                placeholder="SUSU-XXXX"
                value={inviteInput}
                onChange={(e) => {
                  setInviteInput(e.target.value.toUpperCase());
                  setModalError(null);
                }}
                autoFocus
                autoComplete="off"
                spellCheck={false}
                disabled={confirming}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void confirmPrivateJoin();
                  }
                }}
              />
            </label>

            {modalError ? (
              <p className="modal-error" role="alert">
                {modalError}
              </p>
            ) : (
              <p className="sub">
                Ask the circle creator for the code, then confirm with your
                connected wallet.
              </p>
            )}

            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={closeModal}
                disabled={confirming}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => void confirmPrivateJoin()}
                disabled={confirming}
              >
                {confirming ? <Loader2 className="icon spin" /> : null}
                {confirming ? "Checking…" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
