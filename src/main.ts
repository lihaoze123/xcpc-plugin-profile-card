import { getXcpc, type XcpcOjAccount } from "@xcpc-workstation/plugin-sdk/ui";
import type { ToolExecutionResult } from "@xcpc-workstation/plugin-sdk/host";
import { renderProfileCard } from "./cardRenderer";
import {
  PALETTES,
  PALETTE_ORDER,
  type PaletteKey,
  type Platform,
  type ProfileData,
} from "./shared";
import "./style.css";

interface SavedPrefs {
  platform: Platform;
  handle: string;
  paletteOverride: PaletteKey;
  showTimestamp: boolean;
  showSecondary: boolean;
  recent: Array<{ platform: Platform; handle: string }>;
}

const PREFS_KEY = "ui:prefs:v1";
const xcpc = getXcpc();

const state: {
  platform: Platform;
  handle: string;
  paletteOverride: PaletteKey;
  showTimestamp: boolean;
  showSecondary: boolean;
  customAvatarUrl: string | null;
  boundAccounts: XcpcOjAccount[];
  recent: Array<{ platform: Platform; handle: string }>;
  profile: ProfileData | null;
  loading: boolean;
  error: string | null;
  copied: boolean;
} = {
  platform: "codeforces",
  handle: "",
  paletteOverride: "auto",
  showTimestamp: true,
  showSecondary: true,
  customAvatarUrl: null,
  boundAccounts: [],
  recent: [],
  profile: null,
  loading: false,
  error: null,
  copied: false,
};

let copyTimer: number | undefined;

function parseProfileFromToolResult(res: ToolExecutionResult): ProfileData | null {
  for (const block of res.blocks ?? []) {
    if (block.type === "text" && block.title === "__profile_json__") {
      try {
        return JSON.parse(block.content) as ProfileData;
      } catch {
        return null;
      }
    }
  }
  return null;
}

function savePrefs(): void {
  const payload: SavedPrefs = {
    platform: state.platform,
    handle: state.handle,
    paletteOverride: state.paletteOverride,
    showTimestamp: state.showTimestamp,
    showSecondary: state.showSecondary,
    recent: state.recent.slice(0, 6),
  };
  void xcpc.storage.set(PREFS_KEY, payload);
}

function addRecent(platform: Platform, handle: string): void {
  const next = [
    { platform, handle },
    ...state.recent.filter(
      (r) =>
        !(r.platform === platform && r.handle.toLowerCase() === handle.toLowerCase()),
    ),
  ].slice(0, 6);
  state.recent = next;
  savePrefs();
}

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getCanvas(): HTMLCanvasElement | null {
  return document.getElementById("card-canvas") as HTMLCanvasElement | null;
}

async function redrawCanvas(): Promise<void> {
  const canvas = getCanvas();
  if (!canvas || !state.profile) return;
  await renderProfileCard(canvas, state.profile, {
    paletteOverride: state.paletteOverride,
    customAvatarUrl: state.customAvatarUrl,
    showTimestamp: state.showTimestamp,
    showSecondary: state.showSecondary,
  });
}

async function fetchProfile(refresh = false): Promise<void> {
  const handle = state.handle.trim();
  if (!handle) {
    state.error = "请输入选手 Handle";
    renderApp();
    return;
  }
  state.loading = true;
  state.error = null;
  renderApp();

  try {
    const res = await xcpc.runTool<ToolExecutionResult>("fetch_profile", {
      platform: state.platform,
      handle,
      refresh,
    });
    const profile = parseProfileFromToolResult(res);
    if (!profile) {
      throw new Error("未解析到选手数据");
    }
    state.profile = profile;
    state.handle = profile.handle;
    addRecent(profile.platform, profile.handle);
  } catch (err) {
    state.error = err instanceof Error ? err.message : String(err);
  } finally {
    state.loading = false;
    renderApp();
    await redrawCanvas();
  }
}

async function handleCopyImage(): Promise<void> {
  const canvas = getCanvas();
  if (!canvas || !state.profile) return;
  try {
    const dataUrl = canvas.toDataURL("image/png");
    await xcpc.clipboard.writeImage(dataUrl);
    state.copied = true;
    renderApp();
    await redrawCanvas();
    if (copyTimer !== undefined) window.clearTimeout(copyTimer);
    copyTimer = window.setTimeout(() => {
      state.copied = false;
      renderApp();
      void redrawCanvas();
    }, 1800);
  } catch (err) {
    xcpc.toast(
      `复制失败：${err instanceof Error ? err.message : String(err)}`,
      "error",
    );
  }
}

async function handleSavePng(): Promise<void> {
  const canvas = getCanvas();
  if (!canvas || !state.profile) return;
  try {
    const dataUrl = canvas.toDataURL("image/png");
    const base64 = dataUrl.replace(/^data:image\/png;base64,/, "");
    const safeHandle = state.profile.handle.replace(/[^a-zA-Z0-9_-]/g, "_");
    const filename = `${state.profile.platform}-${safeHandle}.png`;
    const saved = await xcpc.files.savePng(filename, base64);
    if (saved) {
      xcpc.toast("已保存名片图片", "success");
    }
  } catch (err) {
    xcpc.toast(
      `保存失败：${err instanceof Error ? err.message : String(err)}`,
      "error",
    );
  }
}

async function handlePickAvatar(): Promise<void> {
  try {
    const picked = await xcpc.files.pickFile({
      title: "选择自定义头像",
      extensions: ["png", "jpg", "jpeg", "webp"],
    });
    if (!picked?.base64) return;
    const ext = picked.name.split(".").pop()?.toLowerCase() ?? "png";
    const mime =
      ext === "jpg" || ext === "jpeg"
        ? "image/jpeg"
        : ext === "webp"
          ? "image/webp"
          : "image/png";
    state.customAvatarUrl = `data:${mime};base64,${picked.base64}`;
    renderApp();
    await redrawCanvas();
  } catch (err) {
    xcpc.toast(
      `读取头像失败：${err instanceof Error ? err.message : String(err)}`,
      "error",
    );
  }
}

function renderApp(): void {
  const root = document.getElementById("app");
  if (!root) return;

  const supportedBound = state.boundAccounts.filter(
    (a) => a.platform === "codeforces" || a.platform === "atcoder",
  );

  const boundHtml = supportedBound.length
    ? `
      <div class="section">
        <div class="section-label">已绑定账号</div>
        <div class="chips">
          ${supportedBound
            .map(
              (acc) => `
              <button class="chip" data-quick-platform="${escapeHtml(acc.platform)}" data-quick-handle="${escapeHtml(acc.handle)}">
                <span class="chip-tag">${acc.platform === "codeforces" ? "CF" : "AT"}</span>
                <span>${escapeHtml(acc.handle)}</span>
              </button>
            `,
            )
            .join("")}
        </div>
      </div>
    `
    : "";

  const boundKeys = new Set(
    supportedBound.map((a) => `${a.platform}:${a.handle.toLowerCase()}`),
  );
  const uniqueRecent = state.recent.filter(
    (item) => !boundKeys.has(`${item.platform}:${item.handle.toLowerCase()}`),
  );

  const recentHtml = uniqueRecent.length
    ? `
      <div class="section">
        <div class="section-label">最近查询</div>
        <div class="chips">
          ${uniqueRecent
            .map(
              (item) => `
              <button class="chip" data-quick-platform="${item.platform}" data-quick-handle="${escapeHtml(item.handle)}">
                <span class="chip-tag">${item.platform === "codeforces" ? "CF" : "AT"}</span>
                <span>${escapeHtml(item.handle)}</span>
              </button>
            `,
            )
            .join("")}
        </div>
      </div>
    `
    : "";

  const swatchesHtml = PALETTE_ORDER.map((key) => {
    const active = state.paletteOverride === key ? "active" : "";
    if (key === "auto") {
      return `<button class="swatch swatch-auto ${active}" data-palette="auto" title="自动（按段位）"></button>`;
    }
    const p = PALETTES[key];
    return `<button class="swatch ${active}" data-palette="${key}" title="${p.name}" style="background:${p.swatch}"></button>`;
  }).join("");

  root.innerHTML = `
    <div class="layout">
      <aside class="sidebar">
        <div class="section">
          <div class="section-label">平台</div>
          <div class="segmented">
            <button class="seg-btn ${state.platform === "codeforces" ? "active" : ""}" data-platform="codeforces">Codeforces</button>
            <button class="seg-btn ${state.platform === "atcoder" ? "active" : ""}" data-platform="atcoder">AtCoder</button>
          </div>
        </div>

        <div class="section">
          <div class="section-label">选手 Handle</div>
          <div class="input-row">
            <input
              id="handle-input"
              class="handle-input"
              type="text"
              placeholder="${state.platform === "codeforces" ? "例如 jiangly" : "例如 tourist"}"
              value="${escapeHtml(state.handle)}"
              autocomplete="off"
              spellcheck="false"
            />
            <button id="fetch-btn" class="btn btn-primary" ${state.loading ? "disabled" : ""}>
              ${state.loading ? "拉取中" : "生成"}
            </button>
            <button id="refresh-btn" class="btn btn-icon" title="强制刷新数据" ${state.loading || !state.handle.trim() ? "disabled" : ""}>
              ↻
            </button>
          </div>
          ${state.error ? `<div class="error-box">${escapeHtml(state.error)}</div>` : ""}
        </div>

        ${boundHtml}
        ${recentHtml}

        <div class="divider"></div>

        <div class="section">
          <div class="section-label">配色（默认按段位）</div>
          <div class="swatches">${swatchesHtml}</div>
        </div>

        <div class="section">
          <div class="section-label">头像</div>
          <div class="avatar-actions">
            <button id="pick-avatar-btn" class="btn">本地选图</button>
            <button id="reset-avatar-btn" class="btn" ${state.customAvatarUrl ? "" : "disabled"}>恢复默认</button>
          </div>
        </div>

        <div class="section">
          <label class="toggle-row">
            <span>显示底部时间戳</span>
            <input id="toggle-ts" type="checkbox" ${state.showTimestamp ? "checked" : ""} />
          </label>
          <label class="toggle-row">
            <span>显示 ${state.platform === "codeforces" ? "Stars" : "Contests"} 胶囊</span>
            <input id="toggle-sec" type="checkbox" ${state.showSecondary ? "checked" : ""} />
          </label>
        </div>

        <div class="export-bar">
          <button id="copy-btn" class="btn btn-primary" ${!state.profile || state.loading ? "disabled" : ""}>
            ${state.copied ? "已复制到剪贴板 ✓" : "复制图片到剪贴板"}
          </button>
          <button id="save-btn" class="btn" ${!state.profile || state.loading ? "disabled" : ""}>
            保存高清 PNG（1200×1600）
          </button>
        </div>
      </aside>

      <main class="stage">
        ${
          state.profile
            ? `<div class="preview-wrap"><canvas id="card-canvas" class="card-canvas"></canvas></div>`
            : `
              <div class="empty-state">
                <div class="empty-title">生成你的段位色选手名片</div>
                <div class="empty-desc">输入任意 Codeforces 或 AtCoder Handle，自动匹配段位配色与难度分布，支持一键复制到剪贴板或导出 2× 高清 PNG。</div>
                <div class="chips">
                  <button class="chip" data-quick-platform="codeforces" data-quick-handle="jiangly">试试 jiangly</button>
                  <button class="chip" data-quick-platform="codeforces" data-quick-handle="tourist">试试 tourist</button>
                  <button class="chip" data-quick-platform="atcoder" data-quick-handle="tourist">AtCoder · tourist</button>
                </div>
              </div>
            `
        }
      </main>
    </div>
  `;

  // Bind events
  root.querySelectorAll<HTMLButtonElement>("[data-platform]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const next = btn.dataset.platform as Platform;
      if (next !== state.platform) {
        state.platform = next;
        savePrefs();
        renderApp();
        void redrawCanvas();
      }
    });
  });

  const input = document.getElementById("handle-input") as HTMLInputElement | null;
  if (input) {
    input.addEventListener("input", () => {
      state.handle = input.value;
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !state.loading) {
        void fetchProfile(false);
      }
    });
  }

  document.getElementById("fetch-btn")?.addEventListener("click", () => {
    void fetchProfile(false);
  });
  document.getElementById("refresh-btn")?.addEventListener("click", () => {
    void fetchProfile(true);
  });

  root
    .querySelectorAll<HTMLButtonElement>("[data-quick-handle]")
    .forEach((btn) => {
      btn.addEventListener("click", () => {
        const p = btn.dataset.quickPlatform as Platform;
        const h = btn.dataset.quickHandle ?? "";
        if (!h) return;
        state.platform = p;
        state.handle = h;
        state.customAvatarUrl = null;
        void fetchProfile(false);
      });
    });

  root.querySelectorAll<HTMLButtonElement>("[data-palette]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.paletteOverride = (btn.dataset.palette as PaletteKey) || "auto";
      savePrefs();
      renderApp();
      void redrawCanvas();
    });
  });

  document.getElementById("pick-avatar-btn")?.addEventListener("click", () => {
    void handlePickAvatar();
  });
  document.getElementById("reset-avatar-btn")?.addEventListener("click", () => {
    state.customAvatarUrl = null;
    renderApp();
    void redrawCanvas();
  });

  document.getElementById("toggle-ts")?.addEventListener("change", (e) => {
    state.showTimestamp = (e.target as HTMLInputElement).checked;
    savePrefs();
    void redrawCanvas();
  });
  document.getElementById("toggle-sec")?.addEventListener("change", (e) => {
    state.showSecondary = (e.target as HTMLInputElement).checked;
    savePrefs();
    void redrawCanvas();
  });

  document.getElementById("copy-btn")?.addEventListener("click", () => {
    void handleCopyImage();
  });
  document.getElementById("save-btn")?.addEventListener("click", () => {
    void handleSavePng();
  });
}

async function bootstrap(): Promise<void> {
  renderApp();

  const [saved, accounts] = await Promise.all([
    xcpc.storage.get<SavedPrefs>(PREFS_KEY).catch(() => null),
    xcpc.oj?.listAccounts().catch(() => [] as XcpcOjAccount[]) ?? Promise.resolve([]),
  ]);

  if (saved) {
    if (saved.platform === "codeforces" || saved.platform === "atcoder") {
      state.platform = saved.platform;
    }
    if (typeof saved.handle === "string") state.handle = saved.handle;
    if (saved.paletteOverride) state.paletteOverride = saved.paletteOverride;
    if (typeof saved.showTimestamp === "boolean") state.showTimestamp = saved.showTimestamp;
    if (typeof saved.showSecondary === "boolean") state.showSecondary = saved.showSecondary;
    if (Array.isArray(saved.recent)) state.recent = saved.recent;
  }

  state.boundAccounts = Array.isArray(accounts) ? accounts : [];

  // If no handle yet, pre-fill the first bound CF/AtCoder account automatically.
  if (!state.handle && state.boundAccounts.length > 0) {
    const first = state.boundAccounts.find(
      (a) => a.platform === "codeforces" || a.platform === "atcoder",
    );
    if (first) {
      state.platform = first.platform as Platform;
      state.handle = first.handle;
    }
  }

  renderApp();

  if (state.handle.trim()) {
    await fetchProfile(false);
  }
}

void bootstrap();
