# SkillKeeper Mac

SkillKeeper 是一个轻量、漂亮、面向本地 AI Skill 的 macOS 管理工具。它可以自动发现 Codex、Agent Skills、Superpowers、Cursor、WorkBuddy、CodeBuddy 等工具目录里的 Skill，并提供浏览、搜索、收藏、统计、删除和详情查看能力。
<img width="2940" height="64" alt="image" src="https://github.com/user-attachments/assets/d2491509-6d3d-4106-8da4-b3bc8f38b6e0" />

<img width="2560" height="1640" alt="image" src="https://github.com/user-attachments/assets/b974527a-ec7d-4fd5-82ea-08d2627615bd" />


## 为什么做这个工具

市面上已经有一些 Skill 管理器或类似工具，但我一直觉得有两个地方不太满意：一是不够美观，二是不够轻量。Skill 本身是 AI 工作流里非常高频、非常个人化的东西，它应该像一个顺手的本地工作台，而不是一个笨重的后台系统。

所以我重新做了 SkillKeeper。它免费开源，主要是想分享给同样在折腾 AI 工作流、Agent、Codex Skill 的朋友们：你可以直接拿来管理自己的本地 Skill，也可以基于这个项目继续改造成更适合自己的版本。

如果你对 AI 产品、Agent 工作流、个人效率工具和开源实践感兴趣，也欢迎关注我的微信公众号：**林万劲的AI思考**。后面我会持续分享更多关于 AI 工具、工作流和开源项目的内容。

## 它能做什么

- 自动扫描本机工具目录中的 Skill，例如 `~/.codex/skills`、`~/.agents/skills`、`~/superpowers/skills`、`~/.cursor/skills`、`~/.workbuddy/skills`、`~/.codebuddy/skills`、`~/.config/*/skills` 等。
- 按来源浏览 Skill，并支持 `Codex-用户` / `Codex-内置` 这样的子来源筛选。
- 根据本机 Codex / Agent session 日志和 SkillKeeper 使用日志估算调用次数，默认按使用次数降序排列。
- 支持收藏 Skill，并在左侧单独查看收藏列表。
- 支持删除模式，进入删除模式后可勾选、全选，并将 Skill 文件夹移动到 macOS 废纸篓。
- 点击 Skill 后在右侧详情页展示简介、来源、路径、大小、状态、标签、调用次数和最近调用时间。
- 支持跟随系统、浅色、暗黑三种外观模式，其中暗黑模式采用宝石质感视觉。
- 保持本地优先，不上传 Skill 内容、对话日志或使用数据。

## 适合谁

- 正在使用 Codex / Agent Skills / Superpowers 的用户。
- 本地 Skill 越来越多，想要一个统一入口的人。
- 想知道哪些 Skill 最常被调用、哪些 Skill 长期闲置的人。
- 希望把自己的 AI 工作流整理得更清爽、更可视化的人。
- 想基于 Electron + React + TypeScript 做本地效率工具的开发者。

## 技术栈

- Electron
- React
- TypeScript
- Vite

## Privacy

SkillKeeper is local-first.

- It scans local Skill directories.
- It estimates usage counts from local session logs.
- It does not upload Skill content, conversation logs, or usage data.
- Favorites are stored locally in the app renderer via `localStorage`.

## Development

```bash
npm install
npm run electron:install
npm run dev
```

The Vite development server runs at:

```text
http://127.0.0.1:5173/
```

`npm run dev` starts both Vite and Electron.

## Verification

```bash
npm run test:usage
npm run test:sources
npm run test:ui
npm run typecheck
npm run build
npm run click-audit
```

## Package For macOS

```bash
npm run package:mac
hdiutil verify release/SkillKeeper-0.1.0-arm64.dmg
```

Build outputs are written to `release/`.

## Notes

- The project keeps `private: true` in `package.json` to avoid accidental npm publishing. It does not affect GitHub open-source distribution.
- Electron downloads use the `npmmirror` mirror in the provided scripts for better reliability in this network environment.

## License

MIT
