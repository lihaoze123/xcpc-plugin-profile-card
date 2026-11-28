import type {
  PluginCommandAction,
  ToolExecutionResult,
} from "@xcpc-workstation/plugin-sdk/host";
import type {
  DifficultyTier,
  PaletteKey,
  Platform,
  ProfileData,
} from "./shared";
import { PALETTE_ORDER } from "./shared";
import {
  SVG_CARD_H,
  SVG_CARD_W,
  renderProfileBadgeSvg,
  renderProfileCardSvg,
} from "./svgRenderer";

const CACHE_TTL_MS = 15 * 60 * 1000;
const MODELS_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

interface CachedEntry<T> {
  ts: number;
  data: T;
}

function nowTimestamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function resolveCfRank(
  rating: number | null,
  rawRank?: string,
): { short: string; title: string; palette: Exclude<PaletteKey, "auto"> } {
  const r = rating ?? -1;
  if (r >= 3000) return { short: "LGM", title: "Legendary Grandmaster", palette: "red" };
  if (r >= 2600) return { short: "IGM", title: "International Grandmaster", palette: "red" };
  if (r >= 2400) return { short: "GM", title: "Grandmaster", palette: "red" };
  if (r >= 2300) return { short: "IM", title: "International Master", palette: "orange" };
  if (r >= 2100) return { short: "Master", title: "Master", palette: "orange" };
  if (r >= 1900) return { short: "CM", title: "Candidate Master", palette: "violet" };
  if (r >= 1600) return { short: "Expert", title: "Expert", palette: "blue" };
  if (r >= 1400) return { short: "Spec.", title: "Specialist", palette: "cyan" };
  if (r >= 1200) return { short: "Pupil", title: "Pupil", palette: "green" };
  if (r >= 0) return { short: "Newbie", title: "Newbie", palette: "gray" };
  return {
    short: "Unrated",
    title: rawRank ? rawRank : "Unrated",
    palette: "gray",
  };
}

function resolveAtCoderRank(
  rating: number | null,
): { short: string; title: string; palette: Exclude<PaletteKey, "auto"> } {
  if (rating == null || rating <= 0) {
    return { short: "Unrated", title: "Unrated", palette: "gray" };
  }
  if (rating >= 2800) return { short: "Red", title: "Red", palette: "red" };
  if (rating >= 2400) return { short: "Orange", title: "Orange", palette: "orange" };
  if (rating >= 2000) return { short: "Yellow", title: "Yellow", palette: "yellow" };
  if (rating >= 1600) return { short: "Blue", title: "Blue", palette: "blue" };
  if (rating >= 1200) return { short: "Cyan", title: "Cyan", palette: "cyan" };
  if (rating >= 800) return { short: "Green", title: "Green", palette: "green" };
  if (rating >= 400) return { short: "Brown", title: "Brown", palette: "brown" };
  return { short: "Gray", title: "Gray", palette: "gray" };
}

function normalizeImageUrl(raw?: string): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  // Skip default placeholder avatars so our clean monogram badge renders instead.
  if (trimmed.includes("no-title.jpg") || trimmed.includes("no-avatar.jpg")) {
    return null;
  }
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  if (trimmed.startsWith("http://")) return `https://${trimmed.slice(7)}`;
  if (trimmed.startsWith("https://")) return trimmed;
  return null;
}

function fetchImageAsDataUrl(rawUrl?: string): string | undefined {
  const url = normalizeImageUrl(rawUrl);
  if (!url) return undefined;
  try {
    const res = host.http.fetch({
      url,
      headers: {
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        Referer: "https://codeforces.com/",
      },
      responseType: "base64",
      timeoutMs: 10000,
    });
    if (res.status < 200 || res.status >= 300 || !res.body_base64) {
      return undefined;
    }
    const rawCt = res.headers["content-type"] || "image/jpeg";
    const mime = rawCt.split(";")[0].trim().toLowerCase();
    if (!mime.startsWith("image/")) return undefined;
    return `data:${mime};base64,${res.body_base64}`;
  } catch (err) {
    host.log("warn", `avatar fetch failed for ${url}: ${String(err)}`);
    return undefined;
  }
}

function fetchFirstAvailableImage(urls: Array<string | undefined>): string | undefined {
  const seen = new Set<string>();
  for (const raw of urls) {
    const norm = normalizeImageUrl(raw);
    if (!norm || seen.has(norm)) continue;
    seen.add(norm);
    const dataUrl = fetchImageAsDataUrl(norm);
    if (dataUrl) return dataUrl;
  }
  return undefined;
}

function buildBuckets(
  ratings: Array<number | null>,
  totalSolved: number,
  thresholds: number[],
): DifficultyTier[] {
  const counts = thresholds.map(() => 0);
  for (const diff of ratings) {
    if (diff == null || !Number.isFinite(diff)) continue;
    for (let i = thresholds.length - 1; i >= 0; i--) {
      if (diff >= thresholds[i]) {
        counts[i] += 1;
        break;
      }
    }
  }
  const denom = Math.max(totalSolved, 1);
  return thresholds.map((t, idx) => ({
    label: `${t}+`,
    count: counts[idx],
    pct: totalSolved > 0 ? Math.round((counts[idx] / denom) * 1000) / 10 : 0,
  }));
}

function fetchCodeforcesProfile(handle: string): ProfileData {
  const encoded = encodeURIComponent(handle);
  const infoRes = host.http.fetch({
    url: `https://codeforces.com/api/user.info?handles=${encoded}`,
    timeoutMs: 15000,
  });
  if (infoRes.status !== 200) {
    throw new Error(`Codeforces user.info 请求失败 (HTTP ${infoRes.status})`);
  }
  const infoJson = JSON.parse(infoRes.body) as {
    status: string;
    comment?: string;
    result?: Array<{
      handle: string;
      rating?: number;
      maxRating?: number;
      rank?: string;
      friendOfCount?: number;
      titlePhoto?: string;
      avatar?: string;
    }>;
  };
  if (infoJson.status !== "OK" || !infoJson.result?.length) {
    throw new Error(infoJson.comment || `未找到 Codeforces 用户 "${handle}"`);
  }
  const user = infoJson.result[0];

  const statusRes = host.http.fetch({
    url: `https://codeforces.com/api/user.status?handle=${encodeURIComponent(user.handle)}`,
    timeoutMs: 25000,
  });
  if (statusRes.status !== 200) {
    throw new Error(`Codeforces user.status 请求失败 (HTTP ${statusRes.status})`);
  }
  const statusJson = JSON.parse(statusRes.body) as {
    status: string;
    comment?: string;
    result?: Array<{
      verdict?: string;
      problem?: {
        contestId?: number;
        problemsetName?: string;
        index?: string;
        name?: string;
        rating?: number;
      };
    }>;
  };
  if (statusJson.status !== "OK" || !Array.isArray(statusJson.result)) {
    throw new Error(statusJson.comment || "拉取 Codeforces 提交记录失败");
  }

  const solvedMap = new Map<string, number | null>();
  for (const sub of statusJson.result) {
    if (sub.verdict !== "OK" || !sub.problem) continue;
    const p = sub.problem;
    const key =
      p.contestId != null
        ? `${p.contestId}:${p.index ?? p.name ?? ""}`
        : `${p.problemsetName ?? "ps"}:${p.index ?? ""}:${p.name ?? ""}`;
    if (!solvedMap.has(key)) {
      solvedMap.set(key, typeof p.rating === "number" ? p.rating : null);
    } else if (solvedMap.get(key) == null && typeof p.rating === "number") {
      solvedMap.set(key, p.rating);
    }
  }

  const solvedCount = solvedMap.size;
  const tiers = buildBuckets(
    Array.from(solvedMap.values()),
    solvedCount,
    [800, 1400, 2000, 2600],
  );

  const rating = typeof user.rating === "number" ? user.rating : null;
  const maxRating = typeof user.maxRating === "number" ? user.maxRating : rating;
  const rank = resolveCfRank(rating, user.rank);
  const avatarDataUrl = fetchFirstAvailableImage([user.titlePhoto, user.avatar]);

  return {
    platform: "codeforces",
    handle: user.handle,
    rating,
    maxRating,
    rankTitle: rank.title,
    rankShort: rank.short,
    paletteKey: rank.palette,
    secondaryMetric: {
      kind: "stars",
      label: "stars",
      value: typeof user.friendOfCount === "number" ? user.friendOfCount : 0,
    },
    solvedCount,
    tiers,
    avatarDataUrl,
    fetchedAt: nowTimestamp(),
  };
}

function getAtCoderProblemDifficulties(): Record<string, number> {
  const cacheKey = "atcoder:problem-models:v1";
  const cached = host.kv.get<CachedEntry<Record<string, number>>>(cacheKey);
  if (cached && Date.now() - cached.ts < MODELS_CACHE_TTL_MS && cached.data) {
    return cached.data;
  }
  const res = host.http.fetch({
    url: "https://kenkoooo.com/atcoder/resources/problem-models.json",
    timeoutMs: 20000,
  });
  if (res.status !== 200) {
    return cached?.data ?? {};
  }
  const raw = JSON.parse(res.body) as Record<string, { difficulty?: number }>;
  const compact: Record<string, number> = {};
  for (const [id, model] of Object.entries(raw)) {
    if (typeof model?.difficulty === "number") {
      compact[id] = model.difficulty;
    }
  }
  try {
    host.kv.set(cacheKey, { ts: Date.now(), data: compact });
  } catch {
    // Ignore KV size errors if any.
  }
  return compact;
}

function fetchAtCoderProfile(handle: string): ProfileData {
  const encoded = encodeURIComponent(handle);
  const histRes = host.http.fetch({
    url: `https://atcoder.jp/users/${encoded}/history/json`,
    timeoutMs: 15000,
  });
  if (histRes.status === 404) {
    throw new Error(`未找到 AtCoder 用户 "${handle}"`);
  }
  if (histRes.status !== 200) {
    throw new Error(`AtCoder 历史记录请求失败 (HTTP ${histRes.status})`);
  }
  const history = JSON.parse(histRes.body) as Array<{
    IsRated?: boolean;
    NewRating?: number;
  }>;
  if (!Array.isArray(history)) {
    throw new Error(`未找到 AtCoder 用户 "${handle}"`);
  }

  const rated = history.filter((h) => h.IsRated);
  const rating =
    rated.length > 0 && typeof rated[rated.length - 1].NewRating === "number"
      ? rated[rated.length - 1].NewRating!
      : null;
  let maxRating: number | null = null;
  for (const item of rated) {
    if (typeof item.NewRating === "number") {
      maxRating = maxRating == null ? item.NewRating : Math.max(maxRating, item.NewRating);
    }
  }

  // Paginate Kenkoooo submissions API (500 items per page, cap at 25 pages = 12,500 subs).
  const solvedIds = new Set<string>();
  let fromSecond = 0;
  for (let page = 0; page < 25; page++) {
    const subRes = host.http.fetch({
      url: `https://kenkoooo.com/atcoder/atcoder-api/v3/user/submissions?user=${encoded}&from_second=${fromSecond}`,
      timeoutMs: 15000,
    });
    if (subRes.status !== 200) break;
    const batch = JSON.parse(subRes.body) as Array<{
      epoch_second: number;
      problem_id: string;
      result: string;
    }>;
    if (!Array.isArray(batch) || batch.length === 0) break;
    let maxSec = fromSecond;
    for (const sub of batch) {
      if (sub.result === "AC" && sub.problem_id) {
        solvedIds.add(sub.problem_id);
      }
      if (sub.epoch_second > maxSec) {
        maxSec = sub.epoch_second;
      }
    }
    if (batch.length < 500) break;
    fromSecond = maxSec + 1;
  }

  const diffs = getAtCoderProblemDifficulties();
  const solvedDiffs: Array<number | null> = [];
  for (const id of solvedIds) {
    const d = diffs[id];
    solvedDiffs.push(typeof d === "number" ? Math.max(0, d) : null);
  }

  const solvedCount = solvedIds.size;
  const tiers = buildBuckets(solvedDiffs, solvedCount, [0, 800, 1600, 2400]);
  const rank = resolveAtCoderRank(rating);

  return {
    platform: "atcoder",
    handle,
    rating,
    maxRating,
    rankTitle: rank.title,
    rankShort: rank.short,
    paletteKey: rank.palette,
    secondaryMetric: {
      kind: "contests",
      label: "contests",
      value: rated.length,
    },
    solvedCount,
    tiers,
    fetchedAt: nowTimestamp(),
  };
}

function parseBoolInput(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const lower = value.trim().toLowerCase();
    if (lower === "true" || lower === "1" || lower === "yes") return true;
    if (lower === "false" || lower === "0" || lower === "no") return false;
  }
  return fallback;
}

function parsePaletteInput(value: unknown): PaletteKey {
  const raw = String(value ?? "auto").toLowerCase().trim() as PaletteKey;
  return PALETTE_ORDER.includes(raw) ? raw : "auto";
}

function loadProfile(
  platform: Platform,
  handle: string,
  refresh: boolean,
): ProfileData {
  const cacheKey = `profile:v1:${platform}:${handle.toLowerCase()}`;
  if (!refresh) {
    const cached = host.kv.get<CachedEntry<ProfileData>>(cacheKey);
    if (cached && Date.now() - cached.ts < CACHE_TTL_MS && cached.data) {
      return { ...cached.data, fromCache: true };
    }
  }

  const profile =
    platform === "atcoder"
      ? fetchAtCoderProfile(handle)
      : fetchCodeforcesProfile(handle);
  host.kv.set(cacheKey, { ts: Date.now(), data: profile });
  return profile;
}

export function runTool(
  toolId: string,
  inputs: Record<string, unknown>,
): ToolExecutionResult {
  if (
    toolId !== "fetch_profile" &&
    toolId !== "render_card" &&
    toolId !== "render_badge"
  ) {
    throw new Error(`Unknown tool: ${toolId}`);
  }

  const rawPlatform = String(inputs.platform ?? "codeforces").toLowerCase().trim();
  const platform: Platform = rawPlatform === "atcoder" ? "atcoder" : "codeforces";
  const handle = String(inputs.handle ?? "").trim();
  const refresh = parseBoolInput(inputs.refresh, false);

  if (!handle) {
    throw new Error("请输入选手 Handle");
  }

  const profile = loadProfile(platform, handle, refresh);
  const platformLabel = platform === "codeforces" ? "Codeforces" : "AtCoder";
  const ratingText = profile.rating != null ? String(profile.rating) : "Unrated";
  const maxText = profile.maxRating != null ? String(profile.maxRating) : "—";
  const summary = `${profile.handle} (${platformLabel}) · Rating ${ratingText} (${profile.rankShort}) · ${profile.solvedCount} solved`;

  if (toolId === "render_badge") {
    const rawStyle = String(inputs.style ?? "flat").toLowerCase().trim();
    const style = rawStyle === "for-the-badge" ? "for-the-badge" : "flat";
    const label =
      typeof inputs.label === "string" && inputs.label.trim()
        ? inputs.label.trim()
        : undefined;
    const badge = renderProfileBadgeSvg(profile, {
      style,
      paletteOverride: parsePaletteInput(inputs.palette),
      label,
    });
    return {
      summary,
      blocks: [
        {
          type: "svg",
          title: `${profile.handle} · ${platformLabel} Badge`,
          svg: badge.svg,
          width: badge.width,
          height: badge.height,
        },
      ],
    };
  }

  if (toolId === "render_card") {
    const svg = renderProfileCardSvg(profile, {
      paletteOverride: parsePaletteInput(inputs.palette),
      showSecondary: parseBoolInput(inputs.show_secondary, true),
      showTimestamp: parseBoolInput(inputs.show_timestamp, true),
    });
    return {
      summary,
      blocks: [
        {
          type: "svg",
          title: `${profile.handle} · ${platformLabel}`,
          svg,
          width: SVG_CARD_W,
          height: SVG_CARD_H,
        },
      ],
    };
  }

  return {
    summary,
    blocks: [
      {
        type: "table",
        title: `${profile.handle} · ${platformLabel}`,
        headers: ["指标", "数值"],
        rows: [
          ["Rating", ratingText],
          ["Max Rating", maxText],
          ["Level", `${profile.rankShort} (${profile.rankTitle})`],
          [
            profile.secondaryMetric.kind === "stars" ? "Stars" : "Rated Contests",
            String(profile.secondaryMetric.value),
          ],
          ["Solved", String(profile.solvedCount)],
          ...profile.tiers.map((t) => [`难度 ${t.label}`, `${t.pct.toFixed(1)}% (${t.count})`]),
        ],
      },
      {
        type: "text",
        title: "__profile_json__",
        content: JSON.stringify(profile),
        monospace: true,
      },
    ],
  };
}

export function runCommand(commandId: string): PluginCommandAction {
  if (commandId === "open_profile_card") {
    return {
      type: "open_tool",
      plugin_id: "profile-card",
    };
  }
  return { type: "none" };
}
