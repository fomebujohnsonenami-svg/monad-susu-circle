import { formatEther } from "viem";

export function shortenAddress(address?: string, chars = 4) {
  if (!address) return "—";
  return `${address.slice(0, chars + 2)}…${address.slice(-chars)}`;
}

export function formatMon(value?: bigint, digits = 4) {
  if (value === undefined) return "—";
  const n = Number(formatEther(value));
  if (!Number.isFinite(n)) return formatEther(value);
  return `${n.toLocaleString(undefined, {
    maximumFractionDigits: digits,
  })} MON`;
}
