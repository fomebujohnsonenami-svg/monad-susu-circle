"use client";

import { useEffect } from "react";
import { CheckCircle2, X, ExternalLink, AlertCircle } from "lucide-react";
import { MONAD_EXPLORER } from "@/lib/config";
import { shortenAddress } from "@/lib/format";

export type ToastState =
  | {
      kind: "success";
      title: string;
      hash?: `0x${string}`;
      message?: string;
    }
  | {
      kind: "error";
      title: string;
      message: string;
    }
  | null;

export function Toast({
  toast,
  onClose,
}: {
  toast: ToastState;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(onClose, 8_000);
    return () => window.clearTimeout(id);
  }, [toast, onClose]);

  if (!toast) return null;

  return (
    <div
      className={`toast toast-${toast.kind}`}
      role="status"
      aria-live="polite"
    >
      {toast.kind === "success" ? (
        <CheckCircle2 className="icon" />
      ) : (
        <AlertCircle className="icon" />
      )}

      <div className="toast-body">
        <p className="toast-title">{toast.title}</p>
        {toast.kind === "success" && toast.hash ? (
          <a
            className="toast-link"
            href={`${MONAD_EXPLORER}/tx/${toast.hash}`}
            target="_blank"
            rel="noreferrer"
          >
            Tx {shortenAddress(toast.hash, 6)}
            <ExternalLink className="icon" />
          </a>
        ) : toast.message ? (
          <p className="toast-msg">{toast.message}</p>
        ) : null}
      </div>

      <button
        type="button"
        className="btn btn-ghost btn-icon"
        onClick={onClose}
        aria-label="Dismiss"
      >
        <X className="icon" />
      </button>
    </div>
  );
}
