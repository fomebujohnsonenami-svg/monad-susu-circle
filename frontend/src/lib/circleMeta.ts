export type Frequency = "Daily" | "Weekly" | "Monthly";

export const FREQUENCIES: Frequency[] = ["Daily", "Weekly", "Monthly"];

const INTERVAL_SECONDS: Record<Frequency, bigint> = {
  Daily: 86_400n,
  Weekly: 604_800n,
  Monthly: 2_592_000n,
};

const NAMES_KEY = "susu-circle-names";
const LOCAL_CIRCLES_KEY = "susu-local-circles";

export function frequencyToSeconds(frequency: Frequency): bigint {
  return INTERVAL_SECONDS[frequency];
}

export function secondsToFrequency(seconds?: bigint): Frequency {
  if (seconds === undefined) return "Weekly";
  if (seconds <= 86_400n) return "Daily";
  if (seconds <= 604_800n) return "Weekly";
  return "Monthly";
}

export function frequencyLabel(frequency: Frequency): string {
  return frequency.toLowerCase();
}

export function formatContributionRate(
  amountLabel: string,
  frequency: Frequency
): string {
  return `${amountLabel} / ${frequencyLabel(frequency)}`;
}

export function loadCircleNames(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(NAMES_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

export function saveCircleName(circleId: string | number | bigint, name: string) {
  if (typeof window === "undefined") return;
  const map = loadCircleNames();
  map[String(circleId)] = name.trim() || `Circle #${circleId}`;
  localStorage.setItem(NAMES_KEY, JSON.stringify(map));
}

export function getCircleName(
  circleId: string | number | bigint,
  fallback?: string
): string {
  const map = loadCircleNames();
  return map[String(circleId)] ?? fallback ?? `Circle #${circleId}`;
}

export type LocalCircle = {
  id: string;
  name: string;
  contributionMon: string;
  contributionWei: string;
  frequency: Frequency;
  maxParticipants: number;
  memberCount: number;
  status: "Open" | "Active" | "Completed" | "Cancelled";
  currentRound: number;
  paidCount: number;
  participants: `0x${string}`[];
  creator: `0x${string}`;
  createdAt: number;
  source: "local" | "mock";
};

export function loadLocalCircles(): LocalCircle[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_CIRCLES_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as LocalCircle[];
  } catch {
    return [];
  }
}

export function saveLocalCircles(circles: LocalCircle[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LOCAL_CIRCLES_KEY, JSON.stringify(circles));
}

export function upsertLocalCircle(circle: LocalCircle) {
  const circles = loadLocalCircles();
  const idx = circles.findIndex((c) => c.id === circle.id);
  if (idx >= 0) circles[idx] = circle;
  else circles.unshift(circle);
  saveLocalCircles(circles);
  saveCircleName(circle.id, circle.name);
}
