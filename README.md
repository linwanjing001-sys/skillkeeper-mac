# SkillKeeper Mac

SkillKeeper is a local macOS workspace for discovering, browsing, and managing AI Skills across Codex, Agent Skills, Superpowers, Cursor, WorkBuddy, CodeBuddy, and other local tool directories.

It is built with Electron, React, TypeScript, and Vite.

## Highlights

- Dynamic local Skill discovery from tool directories such as `~/.codex/skills`, `~/.agents/skills`, `~/superpowers/skills`, `~/.cursor/skills`, `~/.workbuddy/skills`, `~/.codebuddy/skills`, `~/.config/*/skills`, and more.
- Codex source hierarchy with `Codex-用户` and `Codex-内置` sub-filters.
- Usage-count sorting based on local Codex/Agent session logs and SkillKeeper usage logs.
- Favorites stored locally in `localStorage`.
- Delete mode that moves selected Skill folders to the macOS Trash instead of permanently deleting them.
- Right-side Skill inspector with description, source, location, size, status, tags, usage count, and last-used time.
- Light/dark/system theme switcher with a jewel-style dark mode.
- macOS app icon and local decorative UI assets.

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
