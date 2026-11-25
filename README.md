# 选手名片（`profile-card`）

XCPC Workstation 社交分享图片插件：输入任意 **Codeforces** 或 **AtCoder** Handle（或一键填入工作站已绑定账号），生成 2× 高清（1200×1600）段位色选手名片，支持一键复制到剪贴板或导出 PNG。

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

## 发布打包

```bash
npm run build
xcpc plugin pack ./dist
```
