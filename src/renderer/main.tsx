import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import {
  Clock,
  CheckSquare,
  ExternalLink,
  FileText,
  FolderOpen,
  HardDrive,
  Info,
  Layers3,
  Monitor,
  Moon,
  RefreshCw,
  Search,
  Sparkles,
  Star,
  Sun,
  Tag,
  Trash2,
  X
} from 'lucide-react';
import type { ScanResult, SkillSummary } from '../types';
import './styles.css';

type SourceRow = {
  name: string;
  count: number;
  path: string;
  id: SourceFilterId;
  tone: string;
};

type SourceFilterId =
  | 'favorites'
  | 'all'
  | 'agent-skills'
  | 'codex'
  | 'codex-user'
  | 'codex-builtin'
  | 'superpowers'
  | `source:${string}`;
type CodexKind = 'user' | 'builtin';
type ThemePreference = 'system' | 'light' | 'dark';
type ResolvedTheme = 'light' | 'dark';

type SourceFilter = {
  id: SourceFilterId;
  label: string;
  count: number;
  tone: string;
  title: string;
  subtitle: string;
  match: (skill: SkillSummary) => boolean;
};

const previewSkills: SkillSummary[] = [
  {
    id: 'preview-aihot',
    name: 'aihot',
    title: 'AI 热点追踪',
    description: '适用于 AI 资讯、AI 日报、趋势分析和热点追踪。',
    category: '研究分析',
    source: 'Codex',
    sourcePath: '~/.codex/skills',
    folderPath: '~/.codex/skills/aihot',
    skillFile: '~/.codex/skills/aihot/SKILL.md',
    version: 'local',
    updatedAt: new Date().toISOString(),
    sizeLabel: '4.2 KB',
    tags: ['AI资讯', '深度研究'],
    status: 'normal',
    rating: 5,
    runs: 0,
    favorite: false,
    dependencyHints: [],
    preview: ''
  }
];

const previewData: ScanResult = {
  skills: previewSkills,
  stats: {
    total: previewSkills.length,
    conflicts: 0,
    dependencies: 0,
    invalid: 0,
    normal: previewSkills.length,
    sources: [{ name: 'Codex', count: 1 }],
    categories: [{ name: '研究分析', count: 1 }],
    scannedAt: new Date().toISOString(),
    sourceCount: 1
  }
};

const themePreferenceStorageKey = 'skillkeeper.themePreference';
const favoriteSkillIdsStorageKey = 'skillkeeper.favoriteSkillIds';

function isThemePreference(value: string | null): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark';
}

function readThemePreference(): ThemePreference {
  try {
    const stored = window.localStorage.getItem(themePreferenceStorageKey);
    return isThemePreference(stored) ? stored : 'system';
  } catch {
    return 'system';
  }
}

function systemTheme(): ResolvedTheme {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

const skillkeeperApi =
  window.skillkeeper ??
  ({
    scanSkills: async () => previewData,
    openPath: async () => undefined,
    revealPath: async () => undefined,
    copyText: async () => undefined,
    trashSkills: async (items) => ({ deletedIds: items.map((item) => item.id), failures: [] })
  } satisfies Window['skillkeeper']);

function readFavoriteSkillIds() {
  try {
    const stored = window.localStorage.getItem(favoriteSkillIdsStorageKey);
    if (!stored) return new Set<string>();
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return new Set<string>();
    return new Set(parsed.filter((value): value is string => typeof value === 'string'));
  } catch {
    return new Set<string>();
  }
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value));
}

function formatShortDateTime(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value));
}

function parseSizeLabel(label: string) {
  const match = label.trim().match(/^([\d.]+)\s*(B|KB|MB|GB)$/i);
  if (!match) return 0;

  const value = Number(match[1]);
  const unit = match[2].toUpperCase() as 'B' | 'KB' | 'MB' | 'GB';
  const multipliers: Record<typeof unit, number> = {
    B: 1,
    KB: 1024,
    MB: 1024 * 1024,
    GB: 1024 * 1024 * 1024
  };

  return Number.isFinite(value) ? value * multipliers[unit] : 0;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

function compactPath(value: string) {
  return value
    .replace(/^\/Users\/[^/]+/, '~')
    .replace(/\/SKILL\.md$/, '')
    .replace(/\/+/g, '/');
}

function sourceTone(name: string) {
  const normalized = name.toLowerCase();
  if (normalized.includes('super')) return 'green';
  if (normalized.includes('agent')) return 'violet';
  if (normalized.includes('cursor')) return 'amber';
  if (normalized.includes('work')) return 'rose';
  if (normalized.includes('hub')) return 'amber';
  if (normalized.includes('baoyu')) return 'rose';
  return 'blue';
}

function sourceSlug(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function sourceFilterId(name: string): SourceFilterId {
  if (name === 'Agent Skills') return 'agent-skills';
  if (name === 'Codex') return 'codex';
  if (name === 'Superpowers') return 'superpowers';
  return `source:${sourceSlug(name) || 'source'}`;
}

function sourceTestId(id: SourceFilterId) {
  return `source-filter-${id.startsWith('source:') ? id.slice('source:'.length) : id}`;
}

function sourceLabel(pathValue: string, fallback: string) {
  const compact = compactPath(pathValue);
  if (compact.endsWith('/skills')) return `${fallback} Skills`;
  return compact.split('/').filter(Boolean).at(-1) || fallback;
}

function skillDescription(skill: SkillSummary) {
  return skill.description || skill.title || '暂无简介';
}

function isCodexBuiltin(skill: SkillSummary) {
  return skill.source === 'Codex' && compactPath(skill.folderPath).includes('~/.codex/skills/.system');
}

function codexKind(skill: SkillSummary): CodexKind {
  return isCodexBuiltin(skill) ? 'builtin' : 'user';
}

function codexKindLabel(skill: SkillSummary) {
  if (skill.source !== 'Codex') return skill.source;
  return codexKind(skill) === 'builtin' ? 'Codex-内置' : 'Codex-用户';
}

function buildSources(skills: SkillSummary[], stats: ScanResult['stats']): SourceRow[] {
  return stats.sources.map((source) => {
    const sample = skills.find((skill) => skill.source === source.name);
    return {
      name: source.name,
      count: source.count,
      path: sample?.sourcePath || '',
      id: sourceFilterId(source.name),
      tone: sourceTone(source.name)
    };
  });
}

function buildSourceFilters(skills: SkillSummary[]): SourceFilter[] {
  const codexSkills = skills.filter((skill) => skill.source === 'Codex');
  const codexUserSkills = codexSkills.filter((skill) => codexKind(skill) === 'user');
  const codexBuiltinSkills = codexSkills.filter((skill) => codexKind(skill) === 'builtin');
  const sourceCounts = new Map<string, number>();
  for (const skill of skills) sourceCounts.set(skill.source, (sourceCounts.get(skill.source) || 0) + 1);

  const filters: SourceFilter[] = [
    {
      id: 'all',
      label: '全部来源',
      count: skills.length,
      tone: 'blue',
      title: '全部技能',
      subtitle: '本机 AI Skill 工作区',
      match: () => true
    },
    {
      id: 'favorites',
      label: '收藏',
      count: skills.filter((skill) => skill.favorite).length,
      tone: 'amber',
      title: '收藏',
      subtitle: '你标记收藏的 Skill',
      match: (skill) => skill.favorite
    }
  ];

  for (const [sourceName, count] of sourceCounts.entries()) {
    if (sourceName === 'Codex') {
      filters.push({
        id: 'codex',
        label: 'Codex',
        count: codexSkills.length,
        tone: 'blue',
        title: 'Codex',
        subtitle: '全部 Codex Skill',
        match: (skill) => skill.source === 'Codex'
      });
      filters.push({
        id: 'codex-user',
        label: 'Codex-用户',
        count: codexUserSkills.length,
        tone: 'blue',
        title: 'Codex-用户',
        subtitle: '不包含内置 Skill 的 Codex 用户库',
        match: (skill) => skill.source === 'Codex' && codexKind(skill) === 'user'
      });
      filters.push({
        id: 'codex-builtin',
        label: 'Codex-内置',
        count: codexBuiltinSkills.length,
        tone: 'blue',
        title: 'Codex-内置',
        subtitle: 'Codex 系统内置 Skill',
        match: (skill) => skill.source === 'Codex' && codexKind(skill) === 'builtin'
      });
      continue;
    }

    const id = sourceFilterId(sourceName);
    filters.push({
      id,
      label: sourceName,
      count,
      tone: sourceTone(sourceName),
      title: sourceName,
      subtitle: `${sourceName} 来源下的 Skill`,
      match: (skill) => skill.source === sourceName
    });
  }

  return filters;
}

function latestUpdatedAt(skills: SkillSummary[], fallback: string) {
  if (skills.length === 0) return fallback;
  return skills.reduce(
    (latest, skill) => (new Date(skill.updatedAt).getTime() > new Date(latest).getTime() ? skill.updatedAt : latest),
    skills[0].updatedAt
  );
}

function formatLastUsed(value: string | undefined) {
  return value ? formatDate(value) : '暂无记录';
}

function App() {
  const [data, setData] = React.useState<ScanResult | null>(null);
  const [query, setQuery] = React.useState('');
  const [activeFilterId, setActiveFilterId] = React.useState<SourceFilterId>('all');
  const [selectedSkillId, setSelectedSkillId] = React.useState<string | null>(null);
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);
  const [isScanning, setIsScanning] = React.useState(false);
  const [favoriteSkillIds, setFavoriteSkillIds] = React.useState<Set<string>>(() => readFavoriteSkillIds());
  const [isDeleteMode, setIsDeleteMode] = React.useState(false);
  const [selectedForDelete, setSelectedForDelete] = React.useState<Set<string>>(() => new Set());
  const [trashConfirmationOpen, setTrashConfirmationOpen] = React.useState(false);
  const [isTrashing, setIsTrashing] = React.useState(false);
  const [themePreference, setThemePreference] = React.useState<ThemePreference>(() => readThemePreference());
  const [preferredSystemTheme, setPreferredSystemTheme] = React.useState<ResolvedTheme>(() => systemTheme());
  const resolvedTheme: ResolvedTheme = themePreference === 'system' ? preferredSystemTheme : themePreference;

  const refresh = React.useCallback(async () => {
    setIsScanning(true);
    try {
      const result = await skillkeeperApi.scanSkills();
      setData(result);
    } finally {
      setIsScanning(false);
    }
  }, []);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  React.useEffect(() => {
    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!media) return undefined;

    const updateSystemTheme = () => setPreferredSystemTheme(media.matches ? 'dark' : 'light');
    updateSystemTheme();
    media.addEventListener('change', updateSystemTheme);
    return () => media.removeEventListener('change', updateSystemTheme);
  }, []);

  React.useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme;
    document.documentElement.dataset.themePreference = themePreference;
    document.documentElement.style.colorScheme = resolvedTheme;
    try {
      window.localStorage.setItem(themePreferenceStorageKey, themePreference);
    } catch {
      // Ignore storage failures; the visual theme still applies for this session.
    }
  }, [resolvedTheme, themePreference]);

  React.useEffect(() => {
    try {
      window.localStorage.setItem(favoriteSkillIdsStorageKey, JSON.stringify([...favoriteSkillIds]));
    } catch {
      // Favorites are a local convenience; ignore storage failures for this session.
    }
  }, [favoriteSkillIds]);

  const skills = React.useMemo(() => {
    return (data?.skills ?? []).map((skill) => ({
      ...skill,
      favorite: favoriteSkillIds.has(skill.id)
    }));
  }, [data, favoriteSkillIds]);

  const sourceRows = React.useMemo(() => {
    if (!data) return [];
    return buildSources(skills, data.stats);
  }, [data, skills]);

  const sourceFilters = React.useMemo(() => buildSourceFilters(skills), [skills]);
  const sourceFiltersById = React.useMemo(() => {
    return new Map(sourceFilters.map((filter) => [filter.id, filter]));
  }, [sourceFilters]);
  const activeFilter = sourceFiltersById.get(activeFilterId) ?? sourceFiltersById.get('all')!;

  React.useEffect(() => {
    if (activeFilterId !== 'all' && !sourceFiltersById.has(activeFilterId)) {
      setActiveFilterId('all');
    }
  }, [activeFilterId, sourceFiltersById]);

  const sourceScopedSkills = React.useMemo(() => {
    if (!activeFilter) return [];
    return skills.filter(activeFilter.match);
  }, [activeFilter, skills]);

  const visibleSkills = React.useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return sourceScopedSkills;
    return sourceScopedSkills.filter((skill) =>
      [skill.name, skill.title, skill.description, skill.source, codexKindLabel(skill), skill.folderPath]
        .join(' ')
        .toLowerCase()
        .includes(keyword)
    );
  }, [query, sourceScopedSkills]);

  React.useEffect(() => {
    if (visibleSkills.length === 0) {
      setSelectedSkillId(null);
      return;
    }

    if (!selectedSkillId || !visibleSkills.some((skill) => skill.id === selectedSkillId)) {
      setSelectedSkillId(visibleSkills[0].id);
    }
  }, [selectedSkillId, visibleSkills]);

  const selectedSkill = React.useMemo(() => {
    return visibleSkills.find((skill) => skill.id === selectedSkillId) ?? visibleSkills[0] ?? null;
  }, [selectedSkillId, visibleSkills]);

  const scopedTotalSize = React.useMemo(() => {
    return formatBytes(sourceScopedSkills.reduce((sum, skill) => sum + parseSizeLabel(skill.sizeLabel), 0));
  }, [sourceScopedSkills]);

  const scopedSourceCount =
    activeFilterId === 'all'
      ? sourceRows.length
      : activeFilterId === 'favorites'
        ? new Set(sourceScopedSkills.map((skill) => skill.source)).size
        : 1;
  const scopedLastUpdated = latestUpdatedAt(sourceScopedSkills, data?.stats.scannedAt || new Date().toISOString());
  const topUsageCount = sourceScopedSkills.reduce((max, skill) => Math.max(max, skill.runs), 0);
  const selectedForDeleteSkills = React.useMemo(
    () => skills.filter((skill) => selectedForDelete.has(skill.id)),
    [selectedForDelete, skills]
  );

  const showToast = (message: string) => {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(null), 1400);
  };

  const openFolder = async (folderPath: string) => {
    if (!folderPath) return;
    showToast(`正在打开：${compactPath(folderPath)}`);
    await skillkeeperApi.openPath(folderPath);
  };

  const copySkillName = async (skillName: string) => {
    await skillkeeperApi.copyText(skillName);
    showToast(`已复制：${skillName}`);
  };

  const toggleFavorite = (skillId: string) => {
    setFavoriteSkillIds((current) => {
      let next = new Set(current);
      try {
        const stored = window.localStorage.getItem(favoriteSkillIdsStorageKey);
        next = stored === null ? new Set<string>() : readFavoriteSkillIds();
      } catch {
        next = new Set(current);
      }
      if (next.has(skillId)) next.delete(skillId);
      else next.add(skillId);
      return next;
    });
  };

  const toggleDeleteMode = () => {
    setIsDeleteMode((current) => {
      const next = !current;
      if (!next) {
        setSelectedForDelete(new Set());
        setTrashConfirmationOpen(false);
      }
      return next;
    });
  };

  const cancelDeleteMode = () => {
    setIsDeleteMode(false);
    setSelectedForDelete(new Set());
    setTrashConfirmationOpen(false);
  };

  const toggleSkillForDelete = (skillId: string) => {
    setSelectedForDelete((current) => {
      const next = new Set(current);
      if (next.has(skillId)) next.delete(skillId);
      else next.add(skillId);
      return next;
    });
  };

  const selectAllVisible = () => {
    setSelectedForDelete(new Set(visibleSkills.map((skill) => skill.id)));
  };

  const requestTrashSelected = () => {
    if (selectedForDeleteSkills.length === 0) return;
    setTrashConfirmationOpen(true);
  };

  const confirmTrashSelected = async () => {
    if (selectedForDeleteSkills.length === 0) return;
    setIsTrashing(true);
    const result = await skillkeeperApi.trashSkills(
      selectedForDeleteSkills.map((skill) => ({
        id: skill.id,
        name: skill.name,
        folderPath: skill.folderPath
      }))
    );
    setIsTrashing(false);

    const deletedCount = result.deletedIds.length;
    if (result.failures.length > 0) {
      showToast(`已移到废纸篓 ${deletedCount} 个，${result.failures.length} 个失败`);
      setSelectedForDelete(new Set(result.failures.map((failure) => failure.id)));
    } else {
      showToast(`已移到废纸篓：${deletedCount} 个 Skill`);
      setSelectedForDelete(new Set());
      setIsDeleteMode(false);
    }

    window.setTimeout(() => setTrashConfirmationOpen(false), 900);
    refresh();
  };

  if (!data) {
    return (
      <main className="loading-screen">
        <div className="logo">SK</div>
        <p>正在扫描本机 Skill...</p>
      </main>
    );
  }

  return (
    <div className="app">
      <aside className="sources">
        <div className="brand">
          <div className="logo">SK</div>
          <div>
            <strong>SkillKeeper</strong>
            <span>AI Skill Workspace</span>
          </div>
        </div>

        <nav className="sidebar-section" aria-label="Skill 来源">
          <span className="section-label">Sources</span>
          <button
            className={activeFilterId === 'all' ? 'source active' : 'source'}
            data-testid="source-filter-all"
            onClick={() => setActiveFilterId('all')}
          >
            <span className="source-left">
              <Layers3 size={15} />
              全部来源
            </span>
            <em>{sourceFiltersById.get('all')?.count ?? 0}</em>
          </button>

          <button
            className={activeFilterId === 'favorites' ? 'source active source-favorites' : 'source source-favorites'}
            data-testid="source-filter-favorites"
            data-tone="amber"
            onClick={() => setActiveFilterId('favorites')}
          >
            <span className="source-left">
              <Star size={15} />
              收藏
            </span>
            <em>{sourceFiltersById.get('favorites')?.count ?? 0}</em>
          </button>

          <div className="source-tree">
            {sourceRows.map((source) => {
              if (source.name === 'Codex') {
                return (
                  <React.Fragment key={source.path || source.name}>
                    <button
                      className={activeFilterId === 'codex' ? 'source active' : 'source'}
                      data-testid="source-filter-codex"
                      data-tone="blue"
                      onClick={() => setActiveFilterId('codex')}
                    >
                      <span className="source-left">
                        <span className="source-dot" />
                        Codex
                      </span>
                      <em>{sourceFiltersById.get('codex')?.count ?? source.count}</em>
                    </button>

                    <div className="source-children" aria-label="Codex 子来源">
                      <button
                        className={
                          activeFilterId === 'codex-user' ? 'source source-child active' : 'source source-child'
                        }
                        data-testid="source-filter-codex-user"
                        data-tone="blue"
                        onClick={() => setActiveFilterId('codex-user')}
                      >
                        <span className="source-left">Codex-用户</span>
                        <em>{sourceFiltersById.get('codex-user')?.count ?? 0}</em>
                      </button>
                      <button
                        className={
                          activeFilterId === 'codex-builtin' ? 'source source-child active' : 'source source-child'
                        }
                        data-testid="source-filter-codex-builtin"
                        data-tone="blue"
                        onClick={() => setActiveFilterId('codex-builtin')}
                      >
                        <span className="source-left">Codex-内置</span>
                        <em>{sourceFiltersById.get('codex-builtin')?.count ?? 0}</em>
                      </button>
                    </div>
                  </React.Fragment>
                );
              }

              return (
                <button
                  className={activeFilterId === source.id ? 'source active' : 'source'}
                  data-testid={sourceTestId(source.id)}
                  data-tone={source.tone}
                  key={source.path || source.name}
                  onClick={() => setActiveFilterId(source.id)}
                >
                  <span className="source-left">
                    <span className="source-dot" />
                    {source.name}
                  </span>
                  <em>{sourceFiltersById.get(source.id)?.count ?? source.count}</em>
                </button>
              );
            })}
          </div>
        </nav>

        <section className="sidebar-section">
          <span className="section-label">Locations</span>
          <div className="location-list">
            {sourceRows.map((source) => (
              <button
                className="location-row"
                key={source.path}
                onClick={() => openFolder(source.path)}
                title={source.path}
              >
                <FolderOpen size={15} />
                <span>{sourceLabel(source.path, source.name)}</span>
                <ExternalLink size={13} />
              </button>
            ))}
          </div>
        </section>

        <section className="scan-panel">
          <span className="section-label">Scan Overview</span>
          <div className="scan-row">
            <span>技能总数</span>
            <strong>{sourceScopedSkills.length}</strong>
          </div>
          <div className="scan-row">
            <span>来源数量</span>
            <strong>{scopedSourceCount}</strong>
          </div>
          <div className="scan-row">
            <span>总大小</span>
            <strong>{scopedTotalSize}</strong>
          </div>
          <div className="scan-row">
            <span>最高调用</span>
            <strong>{topUsageCount}</strong>
          </div>
          <div className="scan-row">
            <span>最近扫描</span>
            <strong title={formatDateTime(data.stats.scannedAt)}>{formatShortDateTime(data.stats.scannedAt)}</strong>
          </div>
        </section>
      </aside>

      <main className="content">
        <header className="workspace-header">
          <div className="title-block">
            <span className="eyebrow">
              <Sparkles size={14} />
              Workspace
            </span>
            <h1>{activeFilter.title}</h1>
          </div>

          <div className="header-actions">
            <label className="search">
              <Search size={17} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜索技能名称、描述、来源或路径..."
              />
            </label>
            <div className="theme-switcher" data-testid="theme-switcher" aria-label="外观模式">
              <button
                aria-label="跟随系统"
                className={themePreference === 'system' ? 'theme-option active' : 'theme-option'}
                data-testid="theme-system"
                onClick={() => setThemePreference('system')}
                title="跟随系统"
              >
                <Monitor size={15} />
              </button>
              <button
                aria-label="浅色"
                className={themePreference === 'light' ? 'theme-option active' : 'theme-option'}
                data-testid="theme-light"
                onClick={() => setThemePreference('light')}
                title="浅色"
              >
                <Sun size={15} />
              </button>
              <button
                aria-label="暗黑"
                className={themePreference === 'dark' ? 'theme-option active' : 'theme-option'}
                data-testid="theme-dark"
                onClick={() => setThemePreference('dark')}
                title="暗黑"
              >
                <Moon size={15} />
              </button>
            </div>
            <button className="refresh" onClick={refresh} disabled={isScanning}>
              <RefreshCw size={15} className={isScanning ? 'spinning' : undefined} />
              重新扫描
            </button>
          </div>
        </header>

        <section className="metrics" aria-label="Skill 统计">
          <article className="metric-card" data-tone="blue">
            <div>
              <span>Skill 总数</span>
              <strong data-testid="metric-total">{sourceScopedSkills.length}</strong>
            </div>
            <Layers3 size={22} />
          </article>
          <article className="metric-card" data-tone="violet">
            <div>
              <span>来源数量</span>
              <strong>{scopedSourceCount}</strong>
            </div>
            <Sparkles size={22} />
          </article>
          <article className="metric-card" data-tone="green">
            <div>
              <span>总大小</span>
              <strong>{scopedTotalSize}</strong>
            </div>
            <HardDrive size={22} />
          </article>
          <article className="metric-card" data-tone="amber">
            <div>
              <span>最高调用</span>
              <strong>{topUsageCount}</strong>
            </div>
            <Clock size={22} />
          </article>
        </section>

        <div className="list-toolbar">
          <div>
            <span>Skill Library</span>
            <em>按调用次数排列</em>
          </div>
          <div className={isDeleteMode ? 'delete-controls open' : 'delete-controls'}>
            <button
              className={isDeleteMode ? 'icon-tool active' : 'icon-tool'}
              data-testid="delete-mode-toggle"
              onClick={toggleDeleteMode}
              title={isDeleteMode ? '收起删除模式' : '删除模式'}
              aria-label={isDeleteMode ? '收起删除模式' : '删除模式'}
            >
              <Trash2 size={15} />
            </button>
            {isDeleteMode && (
              <>
                <button data-testid="select-all-visible" onClick={selectAllVisible}>
                  <CheckSquare size={14} />
                  全选当前列表
                </button>
                <strong>{selectedForDelete.size} 已选</strong>
                <button
                  className="danger"
                  data-testid="trash-selected-skills"
                  disabled={selectedForDelete.size === 0 || isTrashing}
                  onClick={requestTrashSelected}
                >
                  <Trash2 size={14} />
                  移到废纸篓
                </button>
                <button data-testid="cancel-delete-mode" onClick={cancelDeleteMode}>
                  <X size={14} />
                  取消
                </button>
              </>
            )}
          </div>
        </div>

        <section className={isDeleteMode ? 'list delete-mode' : 'list'} aria-label="Skill 列表">
          {visibleSkills.map((skill) => (
            <article
              className={selectedSkill?.id === skill.id ? 'skill-card active' : 'skill-card'}
              key={skill.id}
              onClick={() => setSelectedSkillId(skill.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  setSelectedSkillId(skill.id);
                }
              }}
              role="button"
              tabIndex={0}
            >
              <div
                className={isDeleteMode ? 'delete-slot open' : 'delete-slot'}
                onClick={(event) => event.stopPropagation()}
              >
                {isDeleteMode && (
                  <input
                    aria-label={`选择 ${skill.name}`}
                    checked={selectedForDelete.has(skill.id)}
                    data-testid="delete-skill-checkbox"
                    onChange={() => toggleSkillForDelete(skill.id)}
                    type="checkbox"
                  />
                )}
              </div>
              <div className="skill-mark" data-tone={sourceTone(skill.source)}>
                {skill.name.slice(0, 1).toUpperCase()}
              </div>
              <div className="skill-info">
                <div className="skill-title">
                  <strong>{skill.name}</strong>
                  <span data-tone={sourceTone(skill.source)}>{codexKindLabel(skill)}</span>
                </div>
                <p>{skillDescription(skill)}</p>
                <small title={skill.folderPath}>{compactPath(skill.folderPath)}</small>
              </div>
              <div className="skill-meta">
                <span>{formatDate(skill.updatedAt)}</span>
                <em>{skill.runs} 次</em>
                <div className="skill-card-tools">
                  <button
                    className={skill.favorite ? 'favorite-button active' : 'favorite-button'}
                    data-testid="favorite-skill"
                    onClick={(event) => {
                      event.stopPropagation();
                      toggleFavorite(skill.id);
                    }}
                    title={skill.favorite ? '取消收藏' : '收藏 Skill'}
                    aria-label={skill.favorite ? '取消收藏' : '收藏 Skill'}
                  >
                    <Star size={15} fill={skill.favorite ? 'currentColor' : 'none'} />
                  </button>
                  <Info size={16} />
                </div>
              </div>
            </article>
          ))}
        </section>

        {visibleSkills.length === 0 && (
          <div className="empty">
            <strong>没有匹配的 Skill</strong>
            <span>换个关键词，或切回全部来源。</span>
          </div>
        )}
      </main>

      <aside className="inspector" data-testid="skill-inspector">
        {selectedSkill ? (
          <>
            <div className="inspector-header">
              <div className="skill-mark inspector-mark" data-tone={sourceTone(selectedSkill.source)}>
                {selectedSkill.name.slice(0, 1).toUpperCase()}
              </div>
              <div>
                <span className="eyebrow">
                  <Info size={13} />
                  Skill Detail
                </span>
                <div className="inspector-title-row">
                  <h2>{selectedSkill.name}</h2>
                  <button
                    className={selectedSkill.favorite ? 'favorite-button detail-favorite active' : 'favorite-button detail-favorite'}
                    data-testid="favorite-skill-detail"
                    onClick={() => toggleFavorite(selectedSkill.id)}
                    title={selectedSkill.favorite ? '取消收藏' : '收藏 Skill'}
                    aria-label={selectedSkill.favorite ? '取消收藏' : '收藏 Skill'}
                  >
                    <Star size={16} fill={selectedSkill.favorite ? 'currentColor' : 'none'} />
                  </button>
                </div>
                <div className="detail-badges">
                  <span data-tone={sourceTone(selectedSkill.source)}>{selectedSkill.source}</span>
                  <span>{codexKindLabel(selectedSkill)}</span>
                </div>
              </div>
            </div>

            <section className="detail-section">
              <span className="section-label">Description</span>
              <p className="detail-description" data-testid="skill-detail-description">
                {skillDescription(selectedSkill)}
              </p>
            </section>

            <section className="detail-section">
              <span className="section-label">Location</span>
              <div className="detail-row">
                <FolderOpen size={14} />
                <span title={selectedSkill.folderPath}>{compactPath(selectedSkill.folderPath)}</span>
              </div>
              <div className="detail-row">
                <FileText size={14} />
                <span title={selectedSkill.skillFile}>{compactPath(selectedSkill.skillFile)}</span>
              </div>
            </section>

            <section className="detail-section detail-grid">
              <div>
                <span>更新时间</span>
                <strong>{formatDate(selectedSkill.updatedAt)}</strong>
              </div>
              <div>
                <span>大小</span>
                <strong>{selectedSkill.sizeLabel}</strong>
              </div>
              <div>
                <span>调用次数</span>
                <strong data-testid="skill-usage-count">{selectedSkill.runs}</strong>
              </div>
              <div>
                <span>最近调用</span>
                <strong data-testid="skill-last-used">{formatLastUsed(selectedSkill.lastUsedAt)}</strong>
              </div>
              <div>
                <span>分类</span>
                <strong>{selectedSkill.category}</strong>
              </div>
              <div>
                <span>状态</span>
                <strong>{selectedSkill.status}</strong>
              </div>
            </section>

            <section className="detail-section">
              <span className="section-label">Tags</span>
              <div className="tag-list">
                {(selectedSkill.tags.length > 0 ? selectedSkill.tags : [selectedSkill.category]).map((tag) => (
                  <span key={tag}>
                    <Tag size={12} />
                    {tag}
                  </span>
                ))}
              </div>
            </section>

            <div className="detail-actions">
              <button data-testid="open-skill-folder" onClick={() => openFolder(selectedSkill.folderPath)}>
                <FolderOpen size={15} />
                打开文件夹
              </button>
              <button data-testid="copy-skill-name" onClick={() => copySkillName(selectedSkill.name)}>
                <FileText size={15} />
                复制 Skill 名称
              </button>
            </div>
          </>
        ) : (
          <div className="inspector-empty">
            <Info size={18} />
            <strong>未选择 Skill</strong>
            <span>从列表中选择一个 Skill 查看基础信息。</span>
          </div>
        )}
      </aside>

      {trashConfirmationOpen && (
        <div className="confirmation-backdrop">
          <section className="trash-confirmation" data-testid="trash-confirmation" role="dialog" aria-modal="true">
            <div className="confirmation-icon">
              <Trash2 size={18} />
            </div>
            <div>
              <strong>移到废纸篓</strong>
              <p>
                将 {selectedForDeleteSkills.length} 个 Skill 移到 macOS 废纸篓。前几个：
                {selectedForDeleteSkills
                  .slice(0, 4)
                  .map((skill) => skill.name)
                  .join('、')}
              </p>
            </div>
            <div className="confirmation-actions">
              <button onClick={() => setTrashConfirmationOpen(false)}>先不删</button>
              <button
                className="danger"
                data-testid="confirm-trash-skills"
                disabled={isTrashing}
                onClick={confirmTrashSelected}
              >
                <Trash2 size={14} />
                {isTrashing ? '处理中...' : '移到废纸篓'}
              </button>
            </div>
          </section>
        </div>
      )}

      {toastMessage && (
        <div className="toast">
          {toastMessage}
        </div>
      )}
    </div>
  );
}

type RootElement = HTMLElement & {
  skillkeeperRoot?: Root;
};

const rootElement = document.getElementById('root') as RootElement;
rootElement.skillkeeperRoot ??= createRoot(rootElement);
rootElement.skillkeeperRoot.render(<App />);
