import { app, BrowserWindow, clipboard, ipcMain, shell } from 'electron';
import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';
import { discoverSkillSources } from './sources.js';
import { collectSkillUsage } from './usage.js';

type SkillStatus = 'normal' | 'conflict' | 'dependency' | 'invalid';

type SkillSummary = {
  id: string;
  name: string;
  title: string;
  description: string;
  category: string;
  source: string;
  sourcePath: string;
  folderPath: string;
  skillFile: string;
  version: string;
  updatedAt: string;
  sizeLabel: string;
  tags: string[];
  status: SkillStatus;
  rating: number;
  runs: number;
  lastUsedAt?: string;
  favorite: boolean;
  dependencyHints: string[];
  preview: string;
};

type ScanResult = {
  skills: SkillSummary[];
  stats: {
    total: number;
    conflicts: number;
    dependencies: number;
    invalid: number;
    normal: number;
    sources: Array<{ name: string; count: number }>;
    categories: Array<{ name: string; count: number }>;
    scannedAt: string;
    sourceCount: number;
  };
};

type TrashSkillItem = {
  id: string;
  name: string;
  folderPath: string;
};

type TrashSkillsResult = {
  deletedIds: string[];
  failures: Array<{ id: string; name: string; error: string }>;
};

const homeDir = os.homedir();
const maxScanDepth = 5;

const defaultUsageRoots = [path.join(homeDir, '.codex', 'sessions'), path.join(homeDir, '.agents', 'sessions')];
const defaultUsageLogFile = path.join(app.getPath('userData'), 'usage-events.jsonl');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1024,
    minHeight: 680,
    title: 'SkillKeeper',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 18, y: 18 },
    backgroundColor: '#f4f5f7',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  if (app.isPackaged) {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  } else {
    win.loadURL('http://127.0.0.1:5173');
  }
}

async function pathExists(targetPath: string) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function findSkillFiles(dir: string, depth = 0): Promise<string[]> {
  if (depth > maxScanDepth || !(await pathExists(dir))) return [];

  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  const files: string[] = [];

  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;

    const fullPath = path.join(dir, entry.name);
    if (entry.isFile() && entry.name === 'SKILL.md') {
      files.push(fullPath);
      continue;
    }

    if (entry.isDirectory()) {
      files.push(...(await findSkillFiles(fullPath, depth + 1)));
    }
  }

  return files;
}

function parseFrontmatter(content: string) {
  if (!content.startsWith('---')) return {};
  const end = content.indexOf('\n---', 3);
  if (end === -1) return {};

  const block = content.slice(3, end).trim();
  const values: Record<string, string> = {};
  let pendingBlockKey: string | null = null;
  let blockScalar: string[] = [];

  const flushBlockScalar = () => {
    if (!pendingBlockKey) return;
    values[pendingBlockKey] = blockScalar
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    pendingBlockKey = null;
    blockScalar = [];
  };

  for (const line of block.split('\n')) {
    if (pendingBlockKey) {
      if (/^\s+/.test(line) || line.trim() === '') {
        blockScalar.push(line.trim());
        continue;
      }
      flushBlockScalar();
    }

    const index = line.indexOf(':');
    if (index === -1) continue;

    const key = line.slice(0, index).trim();
    const value = line
      .slice(index + 1)
      .trim()
      .replace(/^["']|["']$/g, '');

    if (!key) continue;
    if (value === '>' || value === '|') {
      pendingBlockKey = key;
      blockScalar = [];
      continue;
    }
    values[key] = value;
  }

  flushBlockScalar();
  return values;
}

function firstHeading(content: string) {
  return content.match(/^#\s+(.+)$/m)?.[1]?.trim();
}

function inferCategory(text: string) {
  const source = text.toLowerCase();

  if (/design|image|visual|slides|ppt|cover|brand|logo|ui|ux|creative|设计|图像|视觉|海报|封面|品牌/.test(source)) {
    return '设计创意';
  }
  if (/data|csv|xlsx|sheet|analysis|analytics|rank|research|paper|资讯|研究|分析|论文|数据/.test(source)) {
    return '研究分析';
  }
  if (/code|dev|debug|test|mcp|api|plugin|hook|开发|编程|代码|测试|调试/.test(source)) {
    return '开发编程';
  }
  if (/agent|subagent|workflow|automation|自动化|智能体|代理|流程/.test(source)) {
    return 'Agent工具';
  }
  if (/doc|mail|calendar|meeting|markdown|office|write|writing|文档|会议|邮件|写作|办公/.test(source)) {
    return '办公效率';
  }
  if (/json|pdf|parse|convert|format|translate|转换|解析|格式|翻译/.test(source)) {
    return '数据处理';
  }

  return '办公效率';
}

function inferTags(text: string, category: string) {
  const source = text.toLowerCase();
  const tags = new Set<string>([category]);

  const candidates: Array<[RegExp, string]> = [
    [/research|paper|deep|研究|论文/, '深度研究'],
    [/data|csv|xlsx|sheet|数据/, '数据分析'],
    [/write|writing|article|文案|写作|文章/, '写作助手'],
    [/design|image|visual|设计|图像|视觉/, '视觉创意'],
    [/code|debug|test|开发|代码|测试|调试/, '工程开发'],
    [/agent|workflow|automation|自动化|流程/, 'Agent工作流'],
    [/ppt|slides|deck|演示/, '演示文稿'],
    [/markdown|doc|文档/, '文档处理']
  ];

  for (const [pattern, label] of candidates) {
    if (pattern.test(source)) tags.add(label);
  }

  return [...tags].slice(0, 3);
}

function dependencyHints(content: string) {
  const hints = new Set<string>();
  const lines = content.split('\n');
  const dependencyPattern =
    /((npm|pnpm|yarn|pip|uv|brew|cargo|gem)\s+install|需要安装|安装依赖|依赖安装|requires\s+(node|python|rust|xcode|brew|api|key|token))/i;

  for (const line of lines) {
    if (dependencyPattern.test(line)) {
      hints.add(line.trim().slice(0, 120));
    }
  }

  return [...hints].slice(0, 3);
}

function compactPreview(content: string) {
  return content
    .replace(/^---[\s\S]*?\n---/, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/[#*_>`-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 620);
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

async function buildSkill(file: string, source: string, sourcePath: string): Promise<SkillSummary> {
  const content = await fs.readFile(file, 'utf8');
  const stat = await fs.stat(file);
  const frontmatter = parseFrontmatter(content);
  const dir = path.dirname(file);
  const name = path.basename(dir);
  const title = frontmatter.name || firstHeading(content) || name;
  const description = frontmatter.description || compactPreview(content).slice(0, 140) || '暂无简介';
  const semanticText = `${name} ${title} ${description}`;
  const category = inferCategory(semanticText);
  const dependencies = dependencyHints(content);

  return {
    id: file,
    name,
    title,
    description,
    category,
    source,
    sourcePath,
    folderPath: dir,
    skillFile: file,
    version: frontmatter.version || 'local',
    updatedAt: stat.mtime.toISOString(),
    sizeLabel: formatBytes(stat.size),
    tags: inferTags(semanticText, category),
    status: dependencies.length > 0 ? 'dependency' : 'normal',
    rating: Math.min(5, 3 + Math.ceil(Math.min(2, stat.size / 6000))),
    runs: 0,
    favorite: false,
    dependencyHints: dependencies,
    preview: compactPreview(content)
  };
}

function countBy(items: SkillSummary[], key: keyof Pick<SkillSummary, 'source' | 'category'>) {
  const counts = new Map<string, number>();
  for (const item of items) counts.set(item[key], (counts.get(item[key]) || 0) + 1);
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

async function scanSkills(): Promise<ScanResult> {
  const skills: SkillSummary[] = [];
  const sources = await discoverSkillSources(homeDir);

  for (const source of sources) {
    const files = await findSkillFiles(source.dir);
    for (const file of files) {
      try {
        skills.push(await buildSkill(file, source.name, source.dir));
      } catch {
        skills.push({
          id: file,
          name: path.basename(path.dirname(file)),
          title: path.basename(path.dirname(file)),
          description: '这个 Skill 文件暂时无法解析。',
          category: '办公效率',
          source: source.name,
          sourcePath: source.dir,
          folderPath: path.dirname(file),
          skillFile: file,
          version: 'local',
          updatedAt: new Date().toISOString(),
          sizeLabel: '-',
          tags: ['待检查'],
          status: 'invalid',
          rating: 3,
          runs: 0,
          favorite: false,
          dependencyHints: [],
          preview: ''
        });
      }
    }
  }

  const nameCounts = new Map<string, number>();
  for (const skill of skills) nameCounts.set(skill.name, (nameCounts.get(skill.name) || 0) + 1);

  for (const skill of skills) {
    if ((nameCounts.get(skill.name) || 0) > 1) {
      skill.status = 'conflict';
    }
  }

  const conflicts = skills.filter((skill) => skill.status === 'conflict').length;
  const dependencies = skills.filter((skill) => skill.status === 'dependency').length;
  const invalid = skills.filter((skill) => skill.status === 'invalid').length;
  const normal = skills.length - conflicts - dependencies - invalid;
  const usage = await collectSkillUsage(
    skills.map((skill) => ({ id: skill.id, name: skill.name })),
    defaultUsageRoots,
    defaultUsageLogFile
  );

  for (const skill of skills) {
    const skillUsage = usage.get(skill.id);
    skill.runs = skillUsage?.count ?? 0;
    skill.lastUsedAt = skillUsage?.lastUsedAt;
  }

  return {
    skills: skills.sort((a, b) => {
      if (a.runs !== b.runs) return b.runs - a.runs;
      return a.name.localeCompare(b.name);
    }),
    stats: {
      total: skills.length,
      conflicts,
      dependencies,
      invalid,
      normal,
      sources: countBy(skills, 'source'),
      categories: countBy(skills, 'category'),
      scannedAt: new Date().toISOString(),
      sourceCount: sources.length
    }
  };
}

async function trashSkills(items: TrashSkillItem[]): Promise<TrashSkillsResult> {
  const deletedIds: string[] = [];
  const failures: TrashSkillsResult['failures'] = [];

  if (!Array.isArray(items)) {
    return { deletedIds, failures: [{ id: 'invalid', name: 'invalid', error: '删除参数无效' }] };
  }

  if (process.env.SKILLKEEPER_CAPTURE === '1') {
    return {
      deletedIds: items.filter((item) => item?.id).map((item) => item.id),
      failures
    };
  }

  for (const item of items) {
    const id = item?.id || item?.folderPath || 'unknown';
    const name = item?.name || path.basename(item?.folderPath || id);
    try {
      if (!item?.folderPath) throw new Error('缺少 Skill 文件夹路径');
      await shell.trashItem(item.folderPath);
      deletedIds.push(id);
    } catch (error) {
      failures.push({
        id,
        name,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  return { deletedIds, failures };
}

ipcMain.handle('skills:scan', scanSkills);
ipcMain.handle('skills:trash', async (_event, items: TrashSkillItem[]) => trashSkills(items));
ipcMain.handle('path:open', async (_event, targetPath: string) => {
  await shell.openPath(targetPath);
});
ipcMain.handle('path:reveal', async (_event, targetPath: string) => {
  shell.showItemInFolder(targetPath);
});
ipcMain.handle('clipboard:copy-text', async (_event, text: string) => {
  clipboard.writeText(text);
});

if (process.env.SKILLKEEPER_CAPTURE !== '1') {
  app.whenReady().then(createWindow);

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
}
