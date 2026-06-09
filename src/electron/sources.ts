import fs from 'node:fs/promises';
import path from 'node:path';

export type SkillSource = {
  name: string;
  dir: string;
};

const sourceScanDepth = 5;

const namedSourceCandidates: Array<{ name: string; relativeDir: string }> = [
  { name: 'Codex', relativeDir: '.codex/skills' },
  { name: 'Agent Skills', relativeDir: '.agents/skills' },
  { name: 'Superpowers', relativeDir: 'superpowers/skills' },
  { name: 'Cursor', relativeDir: '.cursor/skills' },
  { name: 'Cursor Built-in', relativeDir: '.cursor/skills-cursor' },
  { name: 'WorkBuddy', relativeDir: '.workbuddy/skills' },
  { name: 'CodeBuddy', relativeDir: '.codebuddy/skills' },
  { name: 'SkillHub', relativeDir: '.skillhub' },
  { name: 'Baoyu Skills', relativeDir: '.baoyu-skills' },
  { name: 'Qwen', relativeDir: '.qwen/skills' },
  { name: 'Trae', relativeDir: '.trae/skills' },
  { name: 'Trae CN', relativeDir: '.trae-cn/skills' },
  { name: 'OpenHands', relativeDir: '.openhands/skills' },
  { name: 'Pochi', relativeDir: '.pochi/skills' },
  { name: 'Roo', relativeDir: '.roo/skills' },
  { name: 'Continue', relativeDir: '.continue/skills' },
  { name: 'Windsurf', relativeDir: '.codeium/windsurf/skills' },
  { name: 'Tabnine', relativeDir: '.tabnine/agent/skills' },
  { name: 'iFlow', relativeDir: '.iflow/skills' },
  { name: 'Forge', relativeDir: '.forge/skills' },
  { name: 'Kiro', relativeDir: '.kiro/skills' },
  { name: 'Aider Desk', relativeDir: '.aider-desk/skills' },
  { name: 'CC Switch', relativeDir: '.cc-switch/skills' },
  { name: 'Claude', relativeDir: '.claude/skills' }
];

function titleCaseToolName(value: string) {
  return value
    .replace(/^\./, '')
    .split(/[-_]/g)
    .filter(Boolean)
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(' ');
}

async function pathExists(targetPath: string) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function hasSkillFile(dir: string, depth = 0): Promise<boolean> {
  if (depth > sourceScanDepth || !(await pathExists(dir))) return false;

  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return false;
  }

  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;

    const fullPath = path.join(dir, entry.name);
    if (entry.isFile() && entry.name === 'SKILL.md') return true;
    if (entry.isDirectory() && (await hasSkillFile(fullPath, depth + 1))) return true;
  }

  return false;
}

async function configSkillSources(homeDir: string): Promise<SkillSource[]> {
  const configDir = path.join(homeDir, '.config');
  if (!(await pathExists(configDir))) return [];

  let entries;
  try {
    entries = await fs.readdir(configDir, { withFileTypes: true });
  } catch {
    return [];
  }

  const sources: SkillSource[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    sources.push({
      name: titleCaseToolName(entry.name),
      dir: path.join(configDir, entry.name, 'skills')
    });
  }
  return sources;
}

async function traeSkillSources(homeDir: string): Promise<SkillSource[]> {
  let entries;
  try {
    entries = await fs.readdir(homeDir, { withFileTypes: true });
  } catch {
    return [];
  }

  return entries
    .filter((entry) => entry.isDirectory() && /^\.trae/i.test(entry.name))
    .map((entry) => ({
      name: titleCaseToolName(entry.name),
      dir: path.join(homeDir, entry.name, 'skills')
    }));
}

export async function discoverSkillSources(homeDir: string): Promise<SkillSource[]> {
  const candidates: SkillSource[] = [
    ...namedSourceCandidates.map((source) => ({
      name: source.name,
      dir: path.join(homeDir, source.relativeDir)
    })),
    ...(await traeSkillSources(homeDir)),
    ...(await configSkillSources(homeDir))
  ];

  const seenDirs = new Set<string>();
  const discovered: SkillSource[] = [];

  for (const candidate of candidates) {
    const normalizedDir = path.normalize(candidate.dir);
    if (seenDirs.has(normalizedDir)) continue;
    seenDirs.add(normalizedDir);

    if (await hasSkillFile(normalizedDir)) {
      discovered.push({ ...candidate, dir: normalizedDir });
    }
  }

  return discovered.sort((a, b) => {
    const priority = ['Agent Skills', 'Codex', 'Cursor', 'Superpowers'];
    const aIndex = priority.indexOf(a.name);
    const bIndex = priority.indexOf(b.name);
    if (aIndex !== -1 || bIndex !== -1) {
      return (aIndex === -1 ? 99 : aIndex) - (bIndex === -1 ? 99 : bIndex);
    }
    return a.name.localeCompare(b.name);
  });
}
