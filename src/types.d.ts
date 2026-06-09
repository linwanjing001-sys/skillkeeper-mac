export type SkillStatus = 'normal' | 'conflict' | 'dependency' | 'invalid';

export type SkillSummary = {
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

export type SkillStats = {
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

export type ScanResult = {
  skills: SkillSummary[];
  stats: SkillStats;
};

export type TrashSkillItem = {
  id: string;
  name: string;
  folderPath: string;
};

export type TrashSkillsResult = {
  deletedIds: string[];
  failures: Array<{ id: string; name: string; error: string }>;
};

declare global {
  interface Window {
    skillkeeper: {
      scanSkills: () => Promise<ScanResult>;
      openPath: (path: string) => Promise<void>;
      revealPath: (path: string) => Promise<void>;
      copyText: (text: string) => Promise<void>;
      trashSkills: (items: TrashSkillItem[]) => Promise<TrashSkillsResult>;
    };
  }
}
