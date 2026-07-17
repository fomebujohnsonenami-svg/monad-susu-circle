/** True when the user dismissed a wallet prompt (MetaMask, Rabby, etc.). */
export function isUserRejection(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;

  const e = err as {
    name?: string;
    code?: number | string;
    shortMessage?: string;
    message?: string;
    details?: string;
    cause?: unknown;
  };

  if (e.name === "UserRejectedRequestError") return true;
  if (e.code === 4001 || e.code === "ACTION_REJECTED") return true;

  const text = `${e.shortMessage ?? ""} ${e.message ?? ""} ${e.details ?? ""}`.toLowerCase();
  if (
    text.includes("user rejected") ||
    text.includes("user denied") ||
    text.includes("rejected the request") ||
    text.includes("request rejected") ||
    text.includes("user cancelled") ||
    text.includes("user canceled")
  ) {
    return true;
  }

  if (e.cause) return isUserRejection(e.cause);
  return false;
}

export function formatTxError(err: unknown): string {
  if (!err) return "Something went wrong.";
  if (typeof err === "string") return err;
  if (err instanceof Error) {
    const msg = err.message || "Something went wrong.";
    const short = msg.split("\n")[0] ?? msg;
    return short.length > 160 ? `${short.slice(0, 160)}…` : short;
  }
  return "Something went wrong.";
}
