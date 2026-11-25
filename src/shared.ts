export type Platform = "codeforces" | "atcoder";

export type PaletteKey =
  | "auto"
  | "red"
  | "orange"
  | "violet"
  | "yellow"
  | "blue"
  | "cyan"
  | "green"
  | "brown"
  | "gray";

export interface DifficultyTier {
  label: string;
  count: number;
  pct: number;
}

export interface SecondaryMetric {
  kind: "stars" | "contests";
  label: string;
  value: number;
}

export interface ProfileData {
  platform: Platform;
  handle: string;
  rating: number | null;
  maxRating: number | null;
  rankTitle: string;
  rankShort: string;
  paletteKey: Exclude<PaletteKey, "auto">;
  secondaryMetric: SecondaryMetric;
  solvedCount: number;
  tiers: DifficultyTier[];
  avatarDataUrl?: string;
  fetchedAt: string;
  fromCache?: boolean;
}

export interface CardPalette {
  key: Exclude<PaletteKey, "auto">;
  name: string;
  swatch: string;
  bgStart: string;
  bgMid: string;
  bgEnd: string;
  glow: string;
  cardFill: string;
  cardBorder: string;
  pillFill: string;
  pillBorder: string;
  barTrack: string;
  barFill: string;
  accentText: string;
}

export const PALETTES: Record<Exclude<PaletteKey, "auto">, CardPalette> = {
  red: {
    key: "red",
    name: "绯红",
    swatch: "#F04850",
    bgStart: "#FF686B",
    bgMid: "#F14750",
    bgEnd: "#D42A3E",
    glow: "rgba(255, 198, 178, 0.34)",
    cardFill: "rgba(128, 12, 24, 0.22)",
    cardBorder: "rgba(255, 255, 255, 0.22)",
    pillFill: "rgba(96, 8, 18, 0.30)",
    pillBorder: "rgba(255, 255, 255, 0.16)",
    barTrack: "rgba(255, 255, 255, 0.20)",
    barFill: "#FFFFFF",
    accentText: "rgba(255, 255, 255, 0.72)",
  },
  orange: {
    key: "orange",
    name: "琥珀橙",
    swatch: "#F27D32",
    bgStart: "#FFA352",
    bgMid: "#F0772D",
    bgEnd: "#D45318",
    glow: "rgba(255, 232, 184, 0.36)",
    cardFill: "rgba(116, 40, 6, 0.20)",
    cardBorder: "rgba(255, 255, 255, 0.24)",
    pillFill: "rgba(92, 28, 4, 0.28)",
    pillBorder: "rgba(255, 255, 255, 0.18)",
    barTrack: "rgba(255, 255, 255, 0.22)",
    barFill: "#FFFFFF",
    accentText: "rgba(255, 255, 255, 0.75)",
  },
  yellow: {
    key: "yellow",
    name: "鎏金",
    swatch: "#D99B16",
    bgStart: "#EBB734",
    bgMid: "#D69718",
    bgEnd: "#B4750C",
    glow: "rgba(255, 245, 196, 0.36)",
    cardFill: "rgba(92, 54, 4, 0.22)",
    cardBorder: "rgba(255, 255, 255, 0.25)",
    pillFill: "rgba(74, 42, 4, 0.30)",
    pillBorder: "rgba(255, 255, 255, 0.18)",
    barTrack: "rgba(255, 255, 255, 0.22)",
    barFill: "#FFFFFF",
    accentText: "rgba(255, 255, 255, 0.78)",
  },
  violet: {
    key: "violet",
    name: "绛紫",
    swatch: "#9B4CE8",
    bgStart: "#B46CF8",
    bgMid: "#9448E6",
    bgEnd: "#6E2BC4",
    glow: "rgba(232, 200, 255, 0.34)",
    cardFill: "rgba(52, 12, 102, 0.24)",
    cardBorder: "rgba(255, 255, 255, 0.22)",
    pillFill: "rgba(38, 8, 80, 0.32)",
    pillBorder: "rgba(255, 255, 255, 0.16)",
    barTrack: "rgba(255, 255, 255, 0.20)",
    barFill: "#FFFFFF",
    accentText: "rgba(255, 255, 255, 0.74)",
  },
  blue: {
    key: "blue",
    name: "钴蓝",
    swatch: "#3574F0",
    bgStart: "#5792FF",
    bgMid: "#3672EE",
    bgEnd: "#1E4CC4",
    glow: "rgba(196, 224, 255, 0.34)",
    cardFill: "rgba(12, 32, 96, 0.24)",
    cardBorder: "rgba(255, 255, 255, 0.22)",
    pillFill: "rgba(8, 22, 74, 0.32)",
    pillBorder: "rgba(255, 255, 255, 0.16)",
    barTrack: "rgba(255, 255, 255, 0.20)",
    barFill: "#FFFFFF",
    accentText: "rgba(255, 255, 255, 0.74)",
  },
  cyan: {
    key: "cyan",
    name: "湖青",
    swatch: "#14A8A4",
    bgStart: "#32C6C0",
    bgMid: "#14A5A1",
    bgEnd: "#0B7C7E",
    glow: "rgba(196, 255, 250, 0.32)",
    cardFill: "rgba(6, 62, 66, 0.24)",
    cardBorder: "rgba(255, 255, 255, 0.22)",
    pillFill: "rgba(4, 46, 50, 0.32)",
    pillBorder: "rgba(255, 255, 255, 0.16)",
    barTrack: "rgba(255, 255, 255, 0.22)",
    barFill: "#FFFFFF",
    accentText: "rgba(255, 255, 255, 0.76)",
  },
  green: {
    key: "green",
    name: "翠绿",
    swatch: "#20A85B",
    bgStart: "#3AC974",
    bgMid: "#1EA85B",
    bgEnd: "#127D44",
    glow: "rgba(198, 255, 218, 0.32)",
    cardFill: "rgba(8, 64, 34, 0.24)",
    cardBorder: "rgba(255, 255, 255, 0.22)",
    pillFill: "rgba(6, 48, 24, 0.32)",
    pillBorder: "rgba(255, 255, 255, 0.16)",
    barTrack: "rgba(255, 255, 255, 0.22)",
    barFill: "#FFFFFF",
    accentText: "rgba(255, 255, 255, 0.76)",
  },
  brown: {
    key: "brown",
    name: "暖棕",
    swatch: "#9E6240",
    bgStart: "#BC7C56",
    bgMid: "#9C5F3E",
    bgEnd: "#764329",
    glow: "rgba(255, 222, 198, 0.30)",
    cardFill: "rgba(58, 28, 14, 0.25)",
    cardBorder: "rgba(255, 255, 255, 0.22)",
    pillFill: "rgba(44, 20, 10, 0.34)",
    pillBorder: "rgba(255, 255, 255, 0.16)",
    barTrack: "rgba(255, 255, 255, 0.20)",
    barFill: "#FFFFFF",
    accentText: "rgba(255, 255, 255, 0.74)",
  },
  gray: {
    key: "gray",
    name: "石板灰",
    swatch: "#64748B",
    bgStart: "#7E8EA6",
    bgMid: "#607086",
    bgEnd: "#445266",
    glow: "rgba(226, 236, 250, 0.26)",
    cardFill: "rgba(24, 32, 46, 0.26)",
    cardBorder: "rgba(255, 255, 255, 0.20)",
    pillFill: "rgba(18, 24, 36, 0.34)",
    pillBorder: "rgba(255, 255, 255, 0.15)",
    barTrack: "rgba(255, 255, 255, 0.20)",
    barFill: "#FFFFFF",
    accentText: "rgba(255, 255, 255, 0.72)",
  },
};

export const PALETTE_ORDER: PaletteKey[] = [
  "auto",
  "red",
  "orange",
  "violet",
  "blue",
  "cyan",
  "green",
  "yellow",
  "brown",
  "gray",
];

export function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}
