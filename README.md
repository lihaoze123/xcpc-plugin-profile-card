# 选手名片（`profile-card`）

XCPC Workstation 社交分享图片插件：输入任意 **Codeforces** 或 **AtCoder** Handle（或一键填入工作站已绑定账号），支持桌面端生成 2× 高清（1200×1600）段位色选手名片（一键复制/导出 PNG），也支持通过 `xcpc tool run` 无头生成矢量 SVG 嵌入 GitHub Profile README。

## 本地开发与联调

```bash
npm install
npm run build
xcpc plugin check ./dist
xcpc plugin link ./dist
xcpc plugin trust profile-card
```

增量开发监听：

```bash
npm run dev
```

## 无头 CLI / GitHub Actions 生成 SVG

安装并信任插件后，可直接通过 `xcpc tool run` 生成可嵌入 GitHub Profile README 的矢量名片与 Rating 徽章 SVG：

```bash
# 生成竖版社交名片 SVG（600×800）
xcpc tool run profile-card:render_card \
  --input platform=codeforces \
  --input handle=jiangly \
  --json \
  | jq -r '.blocks[] | select(.type=="svg") | .svg' > card.svg

# 生成 shields.io 风格 Rating 徽章 SVG（style 支持 flat / for-the-badge）
xcpc tool run profile-card:render_badge \
  --input platform=codeforces \
  --input handle=jiangly \
  --input style=for-the-badge \
  --json \
  | jq -r '.blocks[] | select(.type=="svg") | .svg' > badge.svg
```

- `render_card` 可选参数：`palette`、`show_secondary`、`show_timestamp`、`refresh`。
- `render_badge` 可选参数：`style`（`flat` / `for-the-badge`）、`palette`、`label`、`refresh`。

## 发布打包

```bash
npm run build
xcpc plugin pack ./dist
```
