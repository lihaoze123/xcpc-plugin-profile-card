import {
  PALETTES,
  formatNumber,
  type CardPalette,
  type PaletteKey,
  type ProfileData,
} from "./shared";

export interface SvgCardOptions {
  paletteOverride: PaletteKey;
  showTimestamp: boolean;
  showSecondary: boolean;
}

export type BadgeStyle = "flat" | "for-the-badge";

export interface SvgBadgeOptions {
  style: BadgeStyle;
  paletteOverride: PaletteKey;
  label?: string;
}

export const SVG_CARD_W = 600;
export const SVG_CARD_H = 800;

const FONT_SANS =
  "Inter, -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', 'PingFang SC', 'Noto Sans CJK SC', sans-serif";
const FONT_MONO =
  "'JetBrains Mono', 'SF Mono', 'Cascadia Mono', ui-monospace, monospace";

function escapeXml(raw: string): string {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Splits `rgba(r, g, b, a)` into an SVG-safe `rgb(r, g, b)` + numeric opacity
 * so both browsers (GitHub README) and resvg render gradients/fills identically.
 */
function splitColor(color: string): { rgb: string; alpha: number } {
  const m = color.match(
    /^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([0-9.]+)\s*\)$/i,
  );
  if (m) {
    return {
      rgb: `rgb(${m[1]},${m[2]},${m[3]})`,
      alpha: Math.max(0, Math.min(1, Number(m[4]))),
    };
  }
  return { rgb: color, alpha: 1 };
}

function fillAttrs(color: string): string {
  const { rgb, alpha } = splitColor(color);
  return alpha < 1
    ? `fill="${rgb}" fill-opacity="${alpha}"`
    : `fill="${rgb}"`;
}

function strokeAttrs(color: string, width: number): string {
  const { rgb, alpha } = splitColor(color);
  const op = alpha < 1 ? ` stroke-opacity="${alpha}"` : "";
  return `stroke="${rgb}"${op} stroke-width="${width}"`;
}

function stopAttrs(offset: string, color: string): string {
  const { rgb, alpha } = splitColor(color);
  return `<stop offset="${offset}" stop-color="${rgb}" stop-opacity="${alpha}"/>`;
}

function estimateTextWidth(text: string, fontSize: number, bold = false): number {
  let units = 0;
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0;
    if (code > 0x2e80) {
      units += 1.0;
    } else if ("ilI1.,|:;'!".includes(ch)) {
      units += 0.34;
    } else if ("mwMW@#%&".includes(ch)) {
      units += 0.86;
    } else if (ch >= "A" && ch <= "Z") {
      units += 0.68;
    } else if (ch >= "0" && ch <= "9") {
      units += 0.6;
    } else if (ch === " ") {
      units += 0.28;
    } else {
      units += 0.56;
    }
  }
  return units * fontSize * (bold ? 1.05 : 1.0);
}

function fitFontSize(
  text: string,
  maxWidth: number,
  startSize: number,
  minSize: number,
  bold = true,
): number {
  let size = startSize;
  while (size > minSize) {
    if (estimateTextWidth(text, size, bold) <= maxWidth) return size;
    size -= 2;
  }
  return minSize;
}

function renderCodeforcesMark(x: number, y: number): string {
  return [
    `<g transform="translate(${x}, ${y})">`,
    `<rect x="0" y="0" width="28" height="24" rx="7" fill="#FFFFFF" fill-opacity="0.92"/>`,
    `<rect x="5.5" y="10" width="4.2" height="9.5" rx="1.8" fill="#F5B800"/>`,
    `<rect x="11.9" y="4.5" width="4.2" height="15" rx="1.8" fill="#2F80ED"/>`,
    `<rect x="18.3" y="8" width="4.2" height="11.5" rx="1.8" fill="#E53935"/>`,
    `</g>`,
  ].join("");
}

function renderAtCoderMark(x: number, y: number): string {
  return [
    `<g transform="translate(${x}, ${y})">`,
    `<rect x="0" y="0" width="28" height="24" rx="7" fill="#FFFFFF" fill-opacity="0.92"/>`,
    `<path d="M8 18.5 L14 5.5 L20 18.5 M10.2 14.5 L17.8 14.5" fill="none" stroke="#1E293B" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/>`,
    `</g>`,
  ].join("");
}

function renderTrendIcon(cx: number, cy: number): string {
  return `<path d="M${cx - 8} ${cy + 4.5} L${cx - 2.5} ${cy - 1} L${cx + 1.5} ${cy + 2} L${cx + 8} ${cy - 5} M${cx + 3.5} ${cy - 5} L${cx + 8} ${cy - 5} L${cx + 8} ${cy - 0.5}" fill="none" stroke="#FFFFFF" stroke-opacity="0.92" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/>`;
}

function renderStarIcon(cx: number, cy: number): string {
  const spikes = 5;
  const outerR = 8.2;
  const innerR = 3.8;
  const pts: string[] = [];
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = (i * Math.PI) / spikes - Math.PI / 2;
    const px = (cx + Math.cos(angle) * r).toFixed(2);
    const py = (cy + Math.sin(angle) * r).toFixed(2);
    pts.push(`${px},${py}`);
  }
  return `<polygon points="${pts.join(" ")}" fill="#FDE047"/>`;
}

function renderTrophyIcon(cx: number, cy: number): string {
  return `<path d="M${cx - 5} ${cy - 6.5} L${cx + 5} ${cy - 6.5} L${cx + 4} ${cy + 0.5} Q${cx} ${cy + 3.8} ${cx - 4} ${cy + 0.5} Z M${cx} ${cy + 2.5} L${cx} ${cy + 6.5} M${cx - 4} ${cy + 6.5} L${cx + 4} ${cy + 6.5}" fill="none" stroke="#FDE047" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>`;
}

function renderGlassCard(
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  palette: CardPalette,
): string {
  return [
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" ${fillAttrs(palette.cardFill)} filter="url(#cardShadow)"/>`,
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="url(#glassSheen)" ${strokeAttrs(palette.cardBorder, 1.25)}/>`,
  ].join("");
}

function renderPill(
  x: number,
  y: number,
  w: number,
  h: number,
  palette: CardPalette,
  icon: "trend" | "star" | "trophy",
  prefix: string,
  value: string,
  suffix: string,
): string {
  const iconSpace = 24;
  const prefixW = prefix ? estimateTextWidth(prefix, 15, false) + 6 : 0;
  const valueW = estimateTextWidth(value, 18, true);
  const suffixW = suffix ? estimateTextWidth(suffix, 14, false) + 5 : 0;
  const totalW = iconSpace + prefixW + valueW + suffixW;

  const startX = x + Math.max(14, (w - totalW) / 2);
  const midY = y + h / 2;

  const iconSvg =
    icon === "trend"
      ? renderTrendIcon(startX + 9, midY)
      : icon === "star"
        ? renderStarIcon(startX + 9, midY - 0.5)
        : renderTrophyIcon(startX + 9, midY);

  const textX = startX + iconSpace;
  const tspans: string[] = [];
  if (prefix) {
    tspans.push(
      `<tspan font-size="15" font-weight="500" ${fillAttrs(palette.accentText)}>${escapeXml(prefix)} </tspan>`,
    );
  }
  tspans.push(
    `<tspan font-size="18" font-weight="700" fill="#FFFFFF">${escapeXml(value)}</tspan>`,
  );
  if (suffix) {
    tspans.push(
      `<tspan font-size="14" font-weight="500" ${fillAttrs(palette.accentText)}> ${escapeXml(suffix)}</tspan>`,
    );
  }

  return [
    `<g>`,
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="16" ${fillAttrs(palette.pillFill)} ${strokeAttrs(palette.pillBorder, 1)}/>`,
    iconSvg,
    `<text x="${textX.toFixed(1)}" y="${(midY + 6).toFixed(1)}" font-family="${escapeXml(FONT_SANS)}">${tspans.join("")}</text>`,
    `</g>`,
  ].join("");
}

export function renderProfileCardSvg(
  profile: ProfileData,
  opts?: Partial<SvgCardOptions>,
): string {
  const paletteOverride = opts?.paletteOverride ?? "auto";
  const showTimestamp = opts?.showTimestamp ?? true;
  const showSecondary = opts?.showSecondary ?? true;

  const paletteKey =
    paletteOverride === "auto" ? profile.paletteKey : paletteOverride;
  const palette = PALETTES[paletteKey] ?? PALETTES.gray;

  const platformName =
    profile.platform === "codeforces" ? "Codeforces" : "AtCoder";
  const platformNameW = profile.platform === "codeforces" ? 116 : 84;
  const markX = SVG_CARD_W - 36 - platformNameW - 38;

  // Hero geometry
  const heroX = 34;
  const heroY = 148;
  const heroW = 532;
  const heroH = 236;

  // Avatar geometry
  const avSize = 152;
  const avX = (SVG_CARD_W - avSize) / 2;
  const avY = 70;
  const avR = 34;

  const avatarInner = profile.avatarDataUrl
    ? `<image x="${avX}" y="${avY}" width="${avSize}" height="${avSize}" href="${escapeXml(profile.avatarDataUrl)}" preserveAspectRatio="xMidYMid slice"/>`
    : [
        `<rect x="${avX}" y="${avY}" width="${avSize}" height="${avSize}" fill="url(#monoGrad)"/>`,
        `<text x="${avX + avSize / 2}" y="${avY + avSize / 2 + 19}" text-anchor="middle" font-family="${escapeXml(FONT_SANS)}" font-size="54" font-weight="800" fill="#FFFFFF">${escapeXml(profile.handle.slice(0, 2).toUpperCase())}</text>`,
      ].join("");

  // Handle
  const handleSize = fitFontSize(profile.handle, heroW - 64, 44, 24, true);

  // Pills
  const maxRatingStr =
    profile.maxRating != null ? String(profile.maxRating) : "—";
  const pillY = 308;
  const pillH = 48;
  let pillsSvg = "";
  if (showSecondary) {
    const pillW = 228;
    const gap = 16;
    const leftX = (SVG_CARD_W - pillW * 2 - gap) / 2;
    pillsSvg =
      renderPill(leftX, pillY, pillW, pillH, palette, "trend", "Max", maxRatingStr, "") +
      renderPill(
        leftX + pillW + gap,
        pillY,
        pillW,
        pillH,
        palette,
        profile.secondaryMetric.kind === "stars" ? "star" : "trophy",
        "",
        formatNumber(profile.secondaryMetric.value),
        profile.secondaryMetric.label,
      );
  } else {
    const pillW = 250;
    pillsSvg = renderPill(
      (SVG_CARD_W - pillW) / 2,
      pillY,
      pillW,
      pillH,
      palette,
      "trend",
      "Max Rating",
      maxRatingStr,
      "",
    );
  }

  // Lower Stats Card
  const statsX = 34;
  const statsY = 410;
  const statsW = 532;
  const statsH = 336;
  const divX = 268;
  const leftColX = statsX + 32;
  const leftColMaxW = divX - leftColX - 20;

  const ratingStr = profile.rating != null ? String(profile.rating) : "Unrated";
  const ratingFontSize = fitFontSize(ratingStr, leftColMaxW, 64, 34, true);
  const levelFontSize = fitFontSize(profile.rankShort, leftColMaxW, 50, 30, true);
  const rankSubtitleSvg =
    profile.rankTitle.toLowerCase() !== profile.rankShort.toLowerCase()
      ? `<text x="${leftColX}" y="${statsY + 298}" font-family="${escapeXml(FONT_SANS)}" font-size="13" font-weight="500" ${fillAttrs(palette.accentText)}>${escapeXml(profile.rankTitle)}</text>`
      : "";

  // Right column
  const rightColX = divX + 28;
  const rightColW = statsX + statsW - 32 - rightColX;
  const solvedText = formatNumber(profile.solvedCount);

  const maxPct = Math.max(36, ...profile.tiers.map((t) => t.pct));
  const startY = statsY + 126;
  const rowStep = 52;

  const tiersSvg = profile.tiers
    .slice(0, 4)
    .map((tier, idx) => {
      const ry = startY + idx * rowStep;
      const barY = ry + 11;
      const barH = 8;
      let fillBarSvg = "";
      if (tier.pct > 0) {
        const ratio = Math.min(1, tier.pct / maxPct);
        const fillW = Math.max(12, rightColW * ratio);
        fillBarSvg = `<rect x="${rightColX}" y="${barY}" width="${fillW.toFixed(1)}" height="${barH}" rx="4" ${fillAttrs(palette.barFill)}/>`;
      }
      return [
        `<text x="${rightColX}" y="${ry}" font-family="${escapeXml(FONT_SANS)}" font-size="17" font-weight="700" fill="#FFFFFF">${escapeXml(tier.label)}</text>`,
        `<text x="${rightColX + rightColW}" y="${ry}" text-anchor="end" font-family="${escapeXml(FONT_MONO)}" font-size="17" font-weight="700" fill="#FFFFFF" fill-opacity="0.94">${tier.pct.toFixed(1)}%</text>`,
        `<rect x="${rightColX}" y="${barY}" width="${rightColW}" height="${barH}" rx="4" ${fillAttrs(palette.barTrack)}/>`,
        fillBarSvg,
      ].join("");
    })
    .join("");

  const footerSvg = showTimestamp
    ? `<text x="36" y="778" font-family="${escapeXml(FONT_MONO)}" font-size="12" font-weight="500" fill="#FFFFFF" fill-opacity="0.62">${escapeXml(profile.fetchedAt)}</text>`
    : "";

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${SVG_CARD_W}" height="${SVG_CARD_H}" viewBox="0 0 ${SVG_CARD_W} ${SVG_CARD_H}" role="img" aria-label="${escapeXml(`${profile.handle} ${platformName} Profile Card`)}">`,
    `<defs>`,
    `<linearGradient id="bgGrad" x1="0" y1="0" x2="${SVG_CARD_W}" y2="${SVG_CARD_H}" gradientUnits="userSpaceOnUse">`,
    stopAttrs("0%", palette.bgStart),
    stopAttrs("52%", palette.bgMid),
    stopAttrs("100%", palette.bgEnd),
    `</linearGradient>`,
    `<radialGradient id="glowGrad" cx="${SVG_CARD_W * 0.82}" cy="${SVG_CARD_H * 0.1}" r="360" gradientUnits="userSpaceOnUse">`,
    stopAttrs("0%", palette.glow),
    stopAttrs("100%", "rgba(255,255,255,0)"),
    `</radialGradient>`,
    `<linearGradient id="glassSheen" x1="0" y1="0" x2="0" y2="1">`,
    `<stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.10"/>`,
    `<stop offset="45%" stop-color="#FFFFFF" stop-opacity="0.02"/>`,
    `<stop offset="100%" stop-color="#000000" stop-opacity="0.06"/>`,
    `</linearGradient>`,
    `<linearGradient id="monoGrad" x1="${avX}" y1="${avY}" x2="${avX + avSize}" y2="${avY + avSize}" gradientUnits="userSpaceOnUse">`,
    `<stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.26"/>`,
    `<stop offset="100%" stop-color="#000000" stop-opacity="0.22"/>`,
    `</linearGradient>`,
    `<pattern id="dotGrid" x="20" y="20" width="22" height="22" patternUnits="userSpaceOnUse">`,
    `<circle cx="0" cy="0" r="1.05" fill="#FFFFFF" fill-opacity="0.065"/>`,
    `</pattern>`,
    `<clipPath id="cardClip"><rect x="0" y="0" width="${SVG_CARD_W}" height="${SVG_CARD_H}" rx="28"/></clipPath>`,
    `<clipPath id="avatarClip"><rect x="${avX}" y="${avY}" width="${avSize}" height="${avSize}" rx="${avR}"/></clipPath>`,
    `<filter id="cardShadow" x="-10%" y="-10%" width="120%" height="125%">`,
    `<feDropShadow dx="0" dy="10" stdDeviation="12" flood-color="#000000" flood-opacity="0.16"/>`,
    `</filter>`,
    `<filter id="avatarShadow" x="-18%" y="-18%" width="136%" height="140%">`,
    `<feDropShadow dx="0" dy="10" stdDeviation="11" flood-color="#000000" flood-opacity="0.24"/>`,
    `</filter>`,
    `</defs>`,
    `<g clip-path="url(#cardClip)">`,
    // 1. Background + glow + dot grid
    `<rect x="0" y="0" width="${SVG_CARD_W}" height="${SVG_CARD_H}" fill="url(#bgGrad)"/>`,
    `<rect x="0" y="0" width="${SVG_CARD_W}" height="${SVG_CARD_H}" fill="url(#glowGrad)"/>`,
    `<rect x="0" y="0" width="${SVG_CARD_W}" height="${SVG_CARD_H}" fill="url(#dotGrid)"/>`,
    // 2. Top-right platform lockup
    profile.platform === "codeforces"
      ? renderCodeforcesMark(markX, 24)
      : renderAtCoderMark(markX, 24),
    `<text x="${SVG_CARD_W - 36}" y="43.5" text-anchor="end" font-family="${escapeXml(FONT_SANS)}" font-size="21" font-weight="700" fill="#FFFFFF">${platformName}</text>`,
    // 3. Upper Hero Card
    renderGlassCard(heroX, heroY, heroW, heroH, 28, palette),
    // Overlapping Avatar
    `<rect x="${avX}" y="${avY}" width="${avSize}" height="${avSize}" rx="${avR}" fill="#FFFFFF" fill-opacity="0.18" filter="url(#avatarShadow)"/>`,
    `<g clip-path="url(#avatarClip)">${avatarInner}</g>`,
    `<rect x="${avX}" y="${avY}" width="${avSize}" height="${avSize}" rx="${avR}" fill="none" stroke="#FFFFFF" stroke-opacity="0.86" stroke-width="3.5"/>`,
    // Handle
    `<text x="${SVG_CARD_W / 2}" y="${266 + Math.round(handleSize * 0.34)}" text-anchor="middle" font-family="${escapeXml(FONT_SANS)}" font-size="${handleSize}" font-weight="800" fill="#FFFFFF">${escapeXml(profile.handle)}</text>`,
    // Pills
    pillsSvg,
    // 4. Lower Stats Card
    renderGlassCard(statsX, statsY, statsW, statsH, 28, palette),
    `<line x1="${divX}" y1="${statsY + 32}" x2="${divX}" y2="${statsY + statsH - 32}" stroke="#FFFFFF" stroke-opacity="0.16" stroke-width="1"/>`,
    // Left Column
    `<text x="${leftColX}" y="${statsY + 54}" font-family="${escapeXml(FONT_MONO)}" font-size="12.5" font-weight="600" ${fillAttrs(palette.accentText)}>RATING</text>`,
    `<text x="${leftColX}" y="${statsY + 132}" font-family="${escapeXml(FONT_SANS)}" font-size="${ratingFontSize}" font-weight="800" fill="#FFFFFF">${escapeXml(ratingStr)}</text>`,
    `<line x1="${leftColX}" y1="${statsY + 168}" x2="${divX - 26}" y2="${statsY + 168}" stroke="#FFFFFF" stroke-opacity="0.14" stroke-width="1"/>`,
    `<text x="${leftColX}" y="${statsY + 206}" font-family="${escapeXml(FONT_MONO)}" font-size="12.5" font-weight="600" ${fillAttrs(palette.accentText)}>LEVEL</text>`,
    `<text x="${leftColX}" y="${statsY + 268}" font-family="${escapeXml(FONT_SANS)}" font-size="${levelFontSize}" font-weight="800" fill="#FFFFFF">${escapeXml(profile.rankShort)}</text>`,
    rankSubtitleSvg,
    // Right Column
    `<text x="${rightColX}" y="${statsY + 54}" font-family="${escapeXml(FONT_MONO)}" font-size="12.5" font-weight="600" ${fillAttrs(palette.accentText)}>SOLVED</text>`,
    `<text x="${rightColX}" y="${statsY + 86}" font-family="${escapeXml(FONT_SANS)}"><tspan font-size="28" font-weight="800" fill="#FFFFFF">${escapeXml(solvedText)}</tspan><tspan dx="8" font-size="14" font-weight="500" ${fillAttrs(palette.accentText)}>problems</tspan></text>`,
    tiersSvg,
    // 5. Footer
    footerSvg,
    `</g>`,
    `</svg>`,
  ].join("");
}

function renderMiniPlatformIcon(
  platform: "codeforces" | "atcoder",
  x: number,
  y: number,
  size: number,
): string {
  const s = size / 14;
  if (platform === "codeforces") {
    return [
      `<g transform="translate(${x.toFixed(1)}, ${y.toFixed(1)}) scale(${s.toFixed(3)})">`,
      `<rect x="1" y="5.5" width="3" height="7.5" rx="0.9" fill="#F5B800"/>`,
      `<rect x="5.5" y="1.5" width="3" height="11.5" rx="0.9" fill="#4DA3FF"/>`,
      `<rect x="10" y="4" width="3" height="9" rx="0.9" fill="#FF5A5F"/>`,
      `</g>`,
    ].join("");
  }
  return [
    `<g transform="translate(${x.toFixed(1)}, ${y.toFixed(1)}) scale(${s.toFixed(3)})">`,
    `<path d="M2.2 12 L7 2 L11.8 12 M4 8.8 L10 8.8" fill="none" stroke="#FFFFFF" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`,
    `</g>`,
  ].join("");
}

export function renderProfileBadgeSvg(
  profile: ProfileData,
  opts?: Partial<SvgBadgeOptions>,
): { svg: string; width: number; height: number } {
  const style: BadgeStyle =
    opts?.style === "for-the-badge" ? "for-the-badge" : "flat";
  const paletteOverride = opts?.paletteOverride ?? "auto";
  const paletteKey =
    paletteOverride === "auto" ? profile.paletteKey : paletteOverride;
  const palette = PALETTES[paletteKey] ?? PALETTES.gray;

  const platformName =
    profile.platform === "codeforces" ? "Codeforces" : "AtCoder";
  const rawLabel = opts?.label?.trim() ? opts.label.trim() : platformName;
  const ratingPart =
    profile.rating != null
      ? `${profile.rating} (${profile.rankShort})`
      : "Unrated";
  const rawValue = `${profile.handle} · ${ratingPart}`;

  const isFTB = style === "for-the-badge";
  const labelText = isFTB ? rawLabel.toUpperCase() : rawLabel;
  const valueText = isFTB ? rawValue.toUpperCase() : rawValue;

  const height = isFTB ? 28 : 20;
  const rx = isFTB ? 4 : 3;
  const fontSize = isFTB ? 10.5 : 11;
  const fontFamily = "Verdana, Geneva, 'DejaVu Sans', sans-serif";
  const padX = isFTB ? 10 : 7;
  const iconSize = isFTB ? 14 : 12;
  const iconGap = isFTB ? 6 : 5;
  const letterFactor = isFTB ? 1.14 : 1.04;

  const labelTextW = Math.ceil(
    estimateTextWidth(labelText, fontSize, isFTB) * letterFactor,
  );
  const valueTextW = Math.ceil(
    estimateTextWidth(valueText, fontSize, true) * letterFactor,
  );

  const leftW = Math.round(padX + iconSize + iconGap + labelTextW + padX);
  const rightW = Math.round(padX + valueTextW + padX);
  const totalW = leftW + rightW;

  const iconX = padX;
  const iconY = (height - iconSize) / 2;
  const labelX = padX + iconSize + iconGap + labelTextW / 2;
  const valueX = leftW + rightW / 2;
  const textY = isFTB ? 17.5 : 14;
  const letterSpacingAttr = isFTB ? ` letter-spacing="0.7"` : "";
  const ariaLabel = `${rawLabel}: ${rawValue}`;

  const sheenDef = isFTB
    ? ""
    : `<linearGradient id="bSheen" x2="0" y2="100%"><stop offset="0" stop-color="#bbb" stop-opacity=".1"/><stop offset="1" stop-opacity=".1"/></linearGradient>`;
  const sheenRect = isFTB
    ? ""
    : `<rect width="${totalW}" height="${height}" fill="url(#bSheen)"/>`;

  const labelShadow = isFTB
    ? ""
    : `<text x="${labelX.toFixed(1)}" y="${textY + 1}" fill="#010101" fill-opacity=".3" text-anchor="middle">${escapeXml(labelText)}</text>`;
  const valueShadow = isFTB
    ? ""
    : `<text x="${valueX.toFixed(1)}" y="${textY + 1}" fill="#010101" fill-opacity=".3" text-anchor="middle" font-weight="700">${escapeXml(valueText)}</text>`;

  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${height}" viewBox="0 0 ${totalW} ${height}" role="img" aria-label="${escapeXml(ariaLabel)}">`,
    `<title>${escapeXml(ariaLabel)}</title>`,
    `<defs>`,
    sheenDef,
    `<clipPath id="bClip"><rect width="${totalW}" height="${height}" rx="${rx}" fill="#fff"/></clipPath>`,
    `</defs>`,
    `<g clip-path="url(#bClip)">`,
    `<rect width="${leftW}" height="${height}" fill="#555555"/>`,
    `<rect x="${leftW}" width="${rightW}" height="${height}" fill="${palette.swatch}"/>`,
    sheenRect,
    `</g>`,
    renderMiniPlatformIcon(profile.platform, iconX, iconY, iconSize),
    `<g fill="#FFFFFF" font-family="${escapeXml(fontFamily)}" font-size="${fontSize}"${letterSpacingAttr}>`,
    labelShadow,
    `<text x="${labelX.toFixed(1)}" y="${textY}" text-anchor="middle"${isFTB ? ` font-weight="500"` : ""}>${escapeXml(labelText)}</text>`,
    valueShadow,
    `<text x="${valueX.toFixed(1)}" y="${textY}" text-anchor="middle" font-weight="700">${escapeXml(valueText)}</text>`,
    `</g>`,
    `</svg>`,
  ].join("");

  return { svg, width: totalW, height };
}
