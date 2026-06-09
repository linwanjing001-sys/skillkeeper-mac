const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const main = fs.readFileSync(path.join(root, 'src/renderer/main.tsx'), 'utf8');
const electronMain = fs.readFileSync(path.join(root, 'src/electron/main.ts'), 'utf8');
const electronSources = fs.existsSync(path.join(root, 'src/electron/sources.ts'))
  ? fs.readFileSync(path.join(root, 'src/electron/sources.ts'), 'utf8')
  : '';
const css = fs.readFileSync(path.join(root, 'src/renderer/styles.css'), 'utf8');

const checks = [
  ['workspace brand copy', main.includes('AI Skill Workspace')],
  ['dashboard metrics', main.includes('metric-card') && main.includes('最近扫描')],
  ['skill cards', main.includes('skill-card') && css.includes('.skill-card')],
  ['path hover title', main.includes('title={skill.folderPath}')],
  ['source path hover title', main.includes('title={source.path}')],
  ['header subtitle removed', !main.includes('个 Skill · {activeFilter.subtitle}')],
  ['single scan action', (main.match(/重新扫描/g) || []).length === 1],
  ['codex child filters', main.includes('Codex-用户') && main.includes('Codex-内置')],
  ['filter ids', main.includes("'codex-user'") && main.includes("'codex-builtin'")],
  ['skill inspector', main.includes('data-testid="skill-inspector"')],
  ['detail folder and copy actions', main.includes('data-testid="open-skill-folder"') && main.includes('data-testid="copy-skill-name"')],
  ['no reveal skill action', !main.includes('定位 SKILL.md') && !main.includes('data-testid="reveal-skill-file"')],
  ['usage sort copy', main.includes('按调用次数排列')],
  ['usage detail copy', main.includes('调用次数') && main.includes('最近调用')],
  ['top usage metric', main.includes('最高调用')],
  ['favorites filter and star actions', main.includes("'favorites'") && main.includes('skillkeeper.favoriteSkillIds') && main.includes('data-testid="source-filter-favorites"') && main.includes('data-testid="favorite-skill"')],
  ['delete mode controls', main.includes('data-testid="delete-mode-toggle"') && main.includes('data-testid="select-all-visible"') && main.includes('data-testid="trash-selected-skills"') && main.includes('移到废纸篓')],
  ['delete checkboxes gated', main.includes('isDeleteMode') && main.includes('data-testid="delete-skill-checkbox"')],
  ['trash api wired', main.includes('trashSkills') && fs.readFileSync(path.join(root, 'src/electron/preload.ts'), 'utf8').includes('trashSkills')],
  ['source discovery wired', electronMain.includes('discoverSkillSources') && electronSources.includes('.cursor') && electronSources.includes('.workbuddy') && electronSources.includes('.codebuddy')],
  ['motion tokens and reduced motion', css.includes('--motion-smooth') && css.includes('prefers-reduced-motion')],
  ['theme preference state', main.includes('ThemePreference') && main.includes('skillkeeper.themePreference')],
  ['theme segmented control', main.includes('data-testid="theme-switcher"') && main.includes('跟随系统') && main.includes('浅色') && main.includes('暗黑')],
  ['theme icons', main.includes('Monitor') && main.includes('Sun') && main.includes('Moon')],
  ['dark theme variables', css.includes('[data-theme="dark"]') && css.includes('--app-bg') && css.includes('--surface') && css.includes('--shadow-glow')],
  [
    'jewel assets referenced',
    ['dark-jewel-backdrop.png', 'gem-surface-texture.png', 'skill-card-sheen.png', 'empty-library-gem.png'].every((asset) =>
      css.includes(asset)
    )
  ],
  ['copy api', main.includes('copyText') && fs.readFileSync(path.join(root, 'src/electron/preload.ts'), 'utf8').includes('copyText')],
  ['skill card selects instead of opens', !main.includes('onClick={() => openFolder(skill.folderPath)}')],
  ['frontmatter block descriptions', electronMain.includes('pendingBlockKey') && electronMain.includes('blockScalar')],
  ['usage module wired', electronMain.includes('collectSkillUsage') && electronMain.includes('lastUsedAt')]
];

const failed = checks.filter(([, passed]) => !passed);
if (failed.length) {
  console.error('UI contract failed:');
  for (const [name] of failed) console.error(`- ${name}`);
  process.exit(1);
}

console.log('UI contract passed');
