export type Frequency = "Daily" | "Weekly" | "Monthly";

export const FREQUENCIES: Frequency[] = ["Daily", "Weekly", "Monthly"];

const INTERVAL_SECONDS: Record<Frequency, bigint> = {
  Daily: 86_400n,
  Weekly: 604_800n,
  Monthly: 2_592_000n,
};

const NAMES_KEY = "susu-circle-names";
const LOCAL_CIRCLES_KEY = "susu-local-circles";
const PRIVACY_KEY = "susu-circle-privacy";

const INVITE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Format: SUSU-XXXX (matches product example, e.g. SUSU-X7F2). */
export function generateInviteCode(): string {
  let suffix = "";
  const bytes =
    typeof crypto !== "undefined" && crypto.getRandomValues
      ? crypto.getRandomValues(new Uint8Array(4))
      : Uint8Array.from({ length: 4 }, () => Math.floor(Math.random() * 256));
  for (let i = 0; i < 4; i++) {
    suffix += INVITE_ALPHABET[bytes[i]! % INVITE_ALPHABET.length];
  }
  return `SUSU-${suffix}`;
}

export function normalizeInviteCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, "");
}

export function validateInviteCode(
  entered: string,
  expected?: string | null
): boolean {
  if (!expected) return false;
  return normalizeInviteCode(entered) === normalizeInviteCode(expected);
}

export type CirclePrivacy = {
  isPrivate: boolean;
  inviteCode?: string;
};

export function loadPrivacyMap(): Record<string, CirclePrivacy> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(PRIVACY_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, CirclePrivacy>;
  } catch {
    return {};
  }
}

export function saveCirclePrivacy(
  circleId: string | number | bigint,
  privacy: CirclePrivacy
) {
  if (typeof window === "undefined") return;
  const map = loadPrivacyMap();
  map[String(circleId)] = privacy;
  localStorage.setItem(PRIVACY_KEY, JSON.stringify(map));
}

export function getCirclePrivacy(
  circleId: string | number | bigint
): CirclePrivacy {
  const map = loadPrivacyMap();
  return map[String(circleId)] ?? { isPrivate: false };
}

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
  isPrivate?: boolean;
  inviteCode?: string;
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
  if (circle.isPrivate || circle.inviteCode) {
    saveCirclePrivacy(circle.id, {
      isPrivate: Boolean(circle.isPrivate),
      inviteCode: circle.inviteCode,
    });
  }
}
