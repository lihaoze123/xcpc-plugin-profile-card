import {
  PALETTES,
  formatNumber,
  type CardPalette,
  type PaletteKey,
  type ProfileData,
} from "./shared";

export interface CardRenderOptions {
  paletteOverride: PaletteKey;
  customAvatarUrl?: string | null;
  showTimestamp: boolean;
  showSecondary: boolean;
}

export const CARD_LOGICAL_W = 600;
export const CARD_LOGICAL_H = 800;
export const CARD_SCALE = 2;

const FONT_SANS =
  '"Inter", "SF Pro Display", "Segoe UI", "PingFang SC", "Noto Sans CJK SC", system-ui, -apple-system, sans-serif';
const FONT_MONO =
  '"JetBrains Mono", "SF Mono", "Cascadia Mono", ui-monospace, monospace';

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function fitFontSize(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  startSize: number,
  minSize: number,
  weight = 700,
): number {
  let size = startSize;
  while (size > minSize) {
    ctx.font = `${weight} ${size}px ${FONT_SANS}`;
    if (ctx.measureText(text).width <= maxWidth) return size;
    size -= 2;
  }
  return minSize;
}

function drawCodeforcesMark(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
): void {
  // Subtle translucent pill behind the colored 3-bar emblem so it stays crisp on red too.
  ctx.save();
  roundRectPath(ctx, x, y, 28, 24, 7);
  ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
  ctx.fill();

  // Yellow bar (left)
  roundRectPath(ctx, x + 5.5, y + 10, 4.2, 9.5, 1.8);
  ctx.fillStyle = "#F5B800";
  ctx.fill();

  // Blue bar (middle)
  roundRectPath(ctx, x + 11.9, y + 4.5, 4.2, 15, 1.8);
  ctx.fillStyle = "#2F80ED";
  ctx.fill();

  // Red bar (right)
  roundRectPath(ctx, x + 18.3, y + 8, 4.2, 11.5, 1.8);
  ctx.fillStyle = "#E53935";
  ctx.fill();
  ctx.restore();
}

function drawAtCoderMark(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
): void {
  ctx.save();
  roundRectPath(ctx, x, y, 28, 24, 7);
  ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
  ctx.fill();

  ctx.strokeStyle = "#1E293B";
  ctx.lineWidth = 2.3;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(x + 8, y + 18.5);
  ctx.lineTo(x + 14, y + 5.5);
  ctx.lineTo(x + 20, y + 18.5);
  ctx.moveTo(x + 10.2, y + 14.5);
  ctx.lineTo(x + 17.8, y + 14.5);
  ctx.stroke();
  ctx.restore();
}

function drawTrendIcon(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
): void {
  ctx.save();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.92)";
  ctx.lineWidth = 2.1;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(cx - 8, cy + 4.5);
  ctx.lineTo(cx - 2.5, cy - 1);
  ctx.lineTo(cx + 1.5, cy + 2);
  ctx.lineTo(cx + 8, cy - 5);
  ctx.moveTo(cx + 3.5, cy - 5);
  ctx.lineTo(cx + 8, cy - 5);
  ctx.lineTo(cx + 8, cy - 0.5);
  ctx.stroke();
  ctx.restore();
}

function drawStarIcon(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
): void {
  ctx.save();
  ctx.fillStyle = "#FDE047";
  ctx.beginPath();
  const spikes = 5;
  const outerR = 8.2;
  const innerR = 3.8;
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = (i * Math.PI) / spikes - Math.PI / 2;
    const px = cx + Math.cos(angle) * r;
    const py = cy + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawTrophyIcon(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
): void {
  ctx.save();
  ctx.strokeStyle = "#FDE047";
  ctx.lineWidth = 1.9;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(cx - 5, cy - 6.5);
  ctx.lineTo(cx + 5, cy - 6.5);
  ctx.lineTo(cx + 4, cy + 0.5);
  ctx.quadraticCurveTo(cx, cy + 3.8, cx - 4, cy + 0.5);
  ctx.closePath();
  ctx.moveTo(cx, cy + 2.5);
  ctx.lineTo(cx, cy + 6.5);
  ctx.moveTo(cx - 4, cy + 6.5);
  ctx.lineTo(cx + 4, cy + 6.5);
  ctx.stroke();
  ctx.restore();
}

function drawGlassCard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  palette: CardPalette,
): void {
  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.16)";
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 10;
  roundRectPath(ctx, x, y, w, h, r);
  ctx.fillStyle = palette.cardFill;
  ctx.fill();
  ctx.restore();

  // Subtle top highlight sheen
  ctx.save();
  roundRectPath(ctx, x, y, w, h, r);
  const sheen = ctx.createLinearGradient(x, y, x, y + h);
  sheen.addColorStop(0, "rgba(255, 255, 255, 0.10)");
  sheen.addColorStop(0.45, "rgba(255, 255, 255, 0.02)");
  sheen.addColorStop(1, "rgba(0, 0, 0, 0.06)");
  ctx.fillStyle = sheen;
  ctx.fill();

  ctx.strokeStyle = palette.cardBorder;
  ctx.lineWidth = 1.25;
  ctx.stroke();
  ctx.restore();
}

function drawPill(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  palette: CardPalette,
  icon: "trend" | "star" | "trophy",
  prefix: string,
  value: string,
  suffix: string,
): void {
  ctx.save();
  roundRectPath(ctx, x, y, w, h, 16);
  ctx.fillStyle = palette.pillFill;
  ctx.fill();
  ctx.strokeStyle = palette.pillBorder;
  ctx.lineWidth = 1;
  ctx.stroke();

  // Measure text components to center cleanly inside pill.
  const iconSpace = 24;
  ctx.font = `500 15px ${FONT_SANS}`;
  const prefixW = prefix ? ctx.measureText(prefix).width + 6 : 0;
  ctx.font = `700 18px ${FONT_SANS}`;
  const valueW = ctx.measureText(value).width;
  ctx.font = `500 14px ${FONT_SANS}`;
  const suffixW = suffix ? ctx.measureText(suffix).width + 5 : 0;

  const totalW = iconSpace + prefixW + valueW + suffixW;
  let curX = x + (w - totalW) / 2;
  const midY = y + h / 2;

  if (icon === "trend") drawTrendIcon(ctx, curX + 9, midY);
  else if (icon === "star") drawStarIcon(ctx, curX + 9, midY - 0.5);
  else drawTrophyIcon(ctx, curX + 9, midY);
  curX += iconSpace;

  ctx.textBaseline = "middle";
  ctx.textAlign = "left";

  if (prefix) {
    ctx.font = `500 15px ${FONT_SANS}`;
    ctx.fillStyle = palette.accentText;
    ctx.fillText(prefix, curX, midY + 0.5);
    curX += prefixW;
  }

  ctx.font = `700 18px ${FONT_SANS}`;
  ctx.fillStyle = "#FFFFFF";
  ctx.fillText(value, curX, midY + 0.5);
  curX += valueW;

  if (suffix) {
    ctx.font = `500 14px ${FONT_SANS}`;
    ctx.fillStyle = palette.accentText;
    ctx.fillText(suffix, curX + 5, midY + 0.5);
  }
  ctx.restore();
}

export async function renderProfileCard(
  canvas: HTMLCanvasElement,
  profile: ProfileData,
  opts: CardRenderOptions,
): Promise<void> {
  canvas.width = CARD_LOGICAL_W * CARD_SCALE;
  canvas.height = CARD_LOGICAL_H * CARD_SCALE;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const paletteKey =
    opts.paletteOverride === "auto" ? profile.paletteKey : opts.paletteOverride;
  const palette = PALETTES[paletteKey] ?? PALETTES.gray;

  ctx.save();
  ctx.scale(CARD_SCALE, CARD_SCALE);

  // 1. Rich diagonal editorial rank gradient
  const bgGrad = ctx.createLinearGradient(0, 0, CARD_LOGICAL_W, CARD_LOGICAL_H);
  bgGrad.addColorStop(0, palette.bgStart);
  bgGrad.addColorStop(0.52, palette.bgMid);
  bgGrad.addColorStop(1, palette.bgEnd);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, CARD_LOGICAL_W, CARD_LOGICAL_H);

  // Ambient top-right glow
  const glowGrad = ctx.createRadialGradient(
    CARD_LOGICAL_W * 0.82,
    CARD_LOGICAL_H * 0.1,
    10,
    CARD_LOGICAL_W * 0.82,
    CARD_LOGICAL_H * 0.1,
    360,
  );
  glowGrad.addColorStop(0, palette.glow);
  glowGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = glowGrad;
  ctx.fillRect(0, 0, CARD_LOGICAL_W, CARD_LOGICAL_H);

  // Subtle architectural dot-matrix texture
  ctx.fillStyle = "rgba(255, 255, 255, 0.065)";
  for (let gx = 20; gx < CARD_LOGICAL_W; gx += 22) {
    for (let gy = 20; gy < CARD_LOGICAL_H; gy += 22) {
      ctx.beginPath();
      ctx.arc(gx, gy, 1.05, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 2. Top header bar (clean platform lockup only, no redundant top-left label)
  ctx.save();
  ctx.textBaseline = "middle";
  const platformName =
    profile.platform === "codeforces" ? "Codeforces" : "AtCoder";
  ctx.font = `700 21px ${FONT_SANS}`;
  const nameW = ctx.measureText(platformName).width;
  const markX = CARD_LOGICAL_W - 36 - nameW - 38;
  if (profile.platform === "codeforces") {
    drawCodeforcesMark(ctx, markX, 24);
  } else {
    drawAtCoderMark(ctx, markX, 24);
  }
  ctx.fillStyle = "#FFFFFF";
  ctx.textAlign = "right";
  ctx.fillText(platformName, CARD_LOGICAL_W - 36, 36.5);
  ctx.restore();

  // 3. Upper Hero Card
  const heroX = 34;
  const heroY = 148;
  const heroW = 532;
  const heroH = 236;
  drawGlassCard(ctx, heroX, heroY, heroW, heroH, 28, palette);

  // Overlapping Squircle Avatar
  const avSize = 152;
  const avX = (CARD_LOGICAL_W - avSize) / 2;
  const avY = 70;
  const avR = 34;

  const avatarSrc = opts.customAvatarUrl || profile.avatarDataUrl || null;
  const avatarImg = avatarSrc ? await loadImage(avatarSrc) : null;

  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.24)";
  ctx.shadowBlur = 22;
  ctx.shadowOffsetY = 10;
  roundRectPath(ctx, avX, avY, avSize, avSize, avR);
  ctx.fillStyle = "rgba(255, 255, 255, 0.18)";
  ctx.fill();
  ctx.restore();

  ctx.save();
  roundRectPath(ctx, avX, avY, avSize, avSize, avR);
  ctx.clip();
  if (avatarImg && avatarImg.naturalWidth > 0) {
    const scale = Math.max(
      avSize / avatarImg.naturalWidth,
      avSize / avatarImg.naturalHeight,
    );
    const drawW = avatarImg.naturalWidth * scale;
    const drawH = avatarImg.naturalHeight * scale;
    const dx = avX + (avSize - drawW) / 2;
    const dy = avY + (avSize - drawH) / 2;
    ctx.drawImage(avatarImg, dx, dy, drawW, drawH);
  } else {
    // Sleek typographic monogram fallback
    const monoGrad = ctx.createLinearGradient(avX, avY, avX + avSize, avY + avSize);
    monoGrad.addColorStop(0, "rgba(255, 255, 255, 0.26)");
    monoGrad.addColorStop(1, "rgba(0, 0, 0, 0.22)");
    ctx.fillStyle = monoGrad;
    ctx.fillRect(avX, avY, avSize, avSize);
    const initials = profile.handle.slice(0, 2).toUpperCase();
    ctx.font = `800 54px ${FONT_SANS}`;
    ctx.fillStyle = "#FFFFFF";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(initials, avX + avSize / 2, avY + avSize / 2 + 2);
  }
  ctx.restore();

  // Crisp luminous avatar ring
  ctx.save();
  roundRectPath(ctx, avX, avY, avSize, avSize, avR);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.86)";
  ctx.lineWidth = 3.5;
  ctx.stroke();
  ctx.restore();

  // Handle
  const handleSize = fitFontSize(ctx, profile.handle, heroW - 64, 44, 24, 800);
  ctx.save();
  ctx.font = `800 ${handleSize}px ${FONT_SANS}`;
  ctx.fillStyle = "#FFFFFF";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(profile.handle, CARD_LOGICAL_W / 2, 266);
  ctx.restore();

  // Metric Pills
  const maxRatingStr =
    profile.maxRating != null ? String(profile.maxRating) : "—";
  const pillY = 308;
  const pillH = 48;
  if (opts.showSecondary) {
    const pillW = 228;
    const gap = 16;
    const leftX = (CARD_LOGICAL_W - pillW * 2 - gap) / 2;
    drawPill(
      ctx,
      leftX,
      pillY,
      pillW,
      pillH,
      palette,
      "trend",
      "Max",
      maxRatingStr,
      "",
    );
    drawPill(
      ctx,
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
    drawPill(
      ctx,
      (CARD_LOGICAL_W - pillW) / 2,
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

  // 4. Lower Stats Card
  const statsX = 34;
  const statsY = 410;
  const statsW = 532;
  const statsH = 336;
  drawGlassCard(ctx, statsX, statsY, statsW, statsH, 28, palette);

  // Subtle vertical hairline divider between left & right columns
  const divX = 268;
  ctx.save();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(divX, statsY + 32);
  ctx.lineTo(divX, statsY + statsH - 32);
  ctx.stroke();
  ctx.restore();

  // Left Column: Rating & Level
  const leftColX = statsX + 32;
  const leftColMaxW = divX - leftColX - 20;

  ctx.save();
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  // Eyebrow: RATING
  ctx.font = `600 12.5px ${FONT_MONO}`;
  ctx.fillStyle = palette.accentText;
  ctx.fillText("RATING", leftColX, statsY + 54);

  const ratingStr =
    profile.rating != null ? String(profile.rating) : "Unrated";
  const ratingFontSize = fitFontSize(ctx, ratingStr, leftColMaxW, 64, 34, 800);
  ctx.font = `800 ${ratingFontSize}px ${FONT_SANS}`;
  ctx.fillStyle = "#FFFFFF";
  ctx.fillText(ratingStr, leftColX, statsY + 132);

  // Horizontal subtle divider inside left column
  ctx.strokeStyle = "rgba(255, 255, 255, 0.14)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(leftColX, statsY + 168);
  ctx.lineTo(divX - 26, statsY + 168);
  ctx.stroke();

  // Eyebrow: LEVEL
  ctx.font = `600 12.5px ${FONT_MONO}`;
  ctx.fillStyle = palette.accentText;
  ctx.fillText("LEVEL", leftColX, statsY + 206);

  const levelFontSize = fitFontSize(
    ctx,
    profile.rankShort,
    leftColMaxW,
    50,
    30,
    800,
  );
  ctx.font = `800 ${levelFontSize}px ${FONT_SANS}`;
  ctx.fillStyle = "#FFFFFF";
  ctx.fillText(profile.rankShort, leftColX, statsY + 268);

  // Show full rank subtitle only when it adds information beyond the abbreviation
  if (profile.rankTitle.toLowerCase() !== profile.rankShort.toLowerCase()) {
    ctx.font = `500 13px ${FONT_SANS}`;
    ctx.fillStyle = palette.accentText;
    ctx.fillText(profile.rankTitle, leftColX, statsY + 298);
  }
  ctx.restore();

  // Right Column: Solved + 4 Difficulty Tiers
  const rightColX = divX + 28;
  const rightColW = statsX + statsW - 32 - rightColX;

  ctx.save();
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";

  // Header: SOLVED + big count
  ctx.font = `600 12.5px ${FONT_MONO}`;
  ctx.fillStyle = palette.accentText;
  ctx.fillText("SOLVED", rightColX, statsY + 54);

  const solvedText = formatNumber(profile.solvedCount);
  ctx.font = `800 28px ${FONT_SANS}`;
  ctx.fillStyle = "#FFFFFF";
  const solvedW = ctx.measureText(solvedText).width;
  ctx.fillText(solvedText, rightColX, statsY + 86);

  ctx.font = `500 14px ${FONT_SANS}`;
  ctx.fillStyle = palette.accentText;
  ctx.fillText("problems", rightColX + solvedW + 8, statsY + 85);

  // 4 Tier Bars
  const maxPct = Math.max(
    36,
    ...profile.tiers.map((t) => t.pct),
  );
  const startY = statsY + 126;
  const rowStep = 52;

  profile.tiers.slice(0, 4).forEach((tier, idx) => {
    const ry = startY + idx * rowStep;

    ctx.font = `700 17px ${FONT_SANS}`;
    ctx.fillStyle = "#FFFFFF";
    ctx.textAlign = "left";
    ctx.fillText(tier.label, rightColX, ry);

    ctx.font = `700 17px ${FONT_MONO}`;
    ctx.fillStyle = "rgba(255, 255, 255, 0.94)";
    ctx.textAlign = "right";
    ctx.fillText(`${tier.pct.toFixed(1)}%`, rightColX + rightColW, ry);

    // Progress bar track
    const barY = ry + 11;
    const barH = 8;
    roundRectPath(ctx, rightColX, barY, rightColW, barH, 4);
    ctx.fillStyle = palette.barTrack;
    ctx.fill();

    // Progress bar fill
    if (tier.pct > 0) {
      const ratio = Math.min(1, tier.pct / maxPct);
      const fillW = Math.max(12, rightColW * ratio);
      roundRectPath(ctx, rightColX, barY, fillW, barH, 4);
      ctx.fillStyle = palette.barFill;
      ctx.fill();
    }
  });
  ctx.restore();

  // 5. Footer
  if (opts.showTimestamp) {
    ctx.save();
    ctx.textBaseline = "middle";
    ctx.font = `500 12px ${FONT_MONO}`;
    ctx.fillStyle = "rgba(255, 255, 255, 0.62)";
    ctx.textAlign = "left";
    ctx.fillText(profile.fetchedAt, 36, 774);
    ctx.restore();
  }

  ctx.restore();
}
