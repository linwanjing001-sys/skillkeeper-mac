import fs from 'node:fs/promises';
import path from 'node:path';

export type UsageSkill = {
  id: string;
  name: string;
};

export type SkillUsage = {
  count: number;
  lastUsedAt?: string;
};

type UsageEvent = {
  eventId: string;
  skillId: string;
  skillName: string;
  usedAt?: string;
};

async function pathExists(targetPath: string) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function findJsonlFiles(dir: string): Promise<string[]> {
  if (!(await pathExists(dir))) return [];

  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await findJsonlFiles(fullPath)));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.jsonl')) {
      files.push(fullPath);
    }
  }

  return files;
}

function extractContentText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(extractContentText).filter(Boolean).join('\n');
  if (!value || typeof value !== 'object') return '';

  const record = value as Record<string, unknown>;
  return ['text', 'message', 'content', 'body', 'arguments', 'input']
    .map((key) => extractContentText(record[key]))
    .filter(Boolean)
    .join('\n');
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function hasExplicitSkillUse(text: string, skillName: string) {
  const name = escapeRegExp(skillName);
  const patterns = [
    new RegExp(`\\busing\\s+(?:the\\s+)?${name}\\s+skill\\b`, 'i'),
    new RegExp(`\\b(?:activated|triggered)\\s+(?:the\\s+)?${name}\\s+skill\\b`, 'i'),
    new RegExp(`\\b(?:activated|triggered)\\s+skill\\s*[:：-]\\s*${name}\\b`, 'i'),
    new RegExp(`\\bskill\\s*[:：-]\\s*${name}\\s+(?:activated|triggered|used)\\b`, 'i')
  ];

  return patterns.some((pattern) => pattern.test(text));
}

function normalizePathText(value: string) {
  return value.replace(/\\/g, '/');
}

function hasSkillFileUse(text: string, skillId: string) {
  if (!skillId.endsWith('/SKILL.md')) return false;
  return normalizePathText(text).includes(normalizePathText(skillId));
}

function isUsageCandidate(payload: Record<string, unknown>) {
  return (
    (payload.type === 'message' && payload.role === 'assistant') ||
    payload.type === 'agent_message' ||
    payload.type === 'assistant_message' ||
    payload.type === 'function_call' ||
    payload.type === 'custom_tool_call'
  );
}

function latestTimestamp(current: string | undefined, candidate: string | undefined) {
  if (!candidate) return current;
  if (!current) return candidate;
  return new Date(candidate).getTime() > new Date(current).getTime() ? candidate : current;
}

async function readUsageEvents(logFile: string): Promise<UsageEvent[]> {
  if (!(await pathExists(logFile))) return [];

  let content: string;
  try {
    content = await fs.readFile(logFile, 'utf8');
  } catch {
    return [];
  }

  const events: UsageEvent[] = [];
  for (const line of content.split('\n')) {
    if (!line.trim()) continue;

    try {
      const parsed = JSON.parse(line) as Partial<UsageEvent>;
      if (!parsed.eventId || !parsed.skillId || !parsed.skillName) continue;
      events.push({
        eventId: parsed.eventId,
        skillId: parsed.skillId,
        skillName: parsed.skillName,
        usedAt: parsed.usedAt
      });
    } catch {
      continue;
    }
  }

  return events;
}

function usageFromEvents(skills: UsageSkill[], events: UsageEvent[]) {
  const usage = new Map<string, SkillUsage>();
  for (const skill of skills) usage.set(skill.id, { count: 0 });

  for (const event of events) {
    const current = usage.get(event.skillId);
    if (!current) continue;

    usage.set(event.skillId, {
      count: current.count + 1,
      lastUsedAt: latestTimestamp(current.lastUsedAt, event.usedAt)
    });
  }

  return usage;
}

async function appendUsageEvents(logFile: string, events: UsageEvent[]) {
  if (events.length === 0) return;
  await fs.mkdir(path.dirname(logFile), { recursive: true });
  await fs.appendFile(logFile, `${events.map((event) => JSON.stringify(event)).join('\n')}\n`, 'utf8');
}

async function collectSessionEvents(skills: UsageSkill[], roots: string[], knownEventIds = new Set<string>()) {
  const events: UsageEvent[] = [];
  const files = (await Promise.all(roots.map(findJsonlFiles))).flat().sort();
  const sortedSkills = [...skills].sort((a, b) => b.name.length - a.name.length);

  for (const file of files) {
    let content: string;
    try {
      content = await fs.readFile(file, 'utf8');
    } catch {
      continue;
    }

    const lines = content.split('\n');
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
      const line = lines[lineIndex];
      if (!line.trim()) continue;

      let parsed: unknown;
      try {
        parsed = JSON.parse(line);
      } catch {
        continue;
      }

      const record = parsed as Record<string, unknown>;
      const payload = record.payload as Record<string, unknown> | undefined;
      if (!payload || !isUsageCandidate(payload)) continue;

      const text = extractContentText(payload);
      if (!text) continue;

      const timestamp =
        typeof record.timestamp === 'string'
          ? record.timestamp
          : typeof payload.timestamp === 'string'
            ? payload.timestamp
            : undefined;

      for (const skill of sortedSkills) {
        if (!hasExplicitSkillUse(text, skill.name) && !hasSkillFileUse(text, skill.id)) continue;

        const eventId = `${file}:${lineIndex + 1}:${skill.id}`;
        if (knownEventIds.has(eventId)) continue;

        knownEventIds.add(eventId);
        events.push({
          eventId,
          skillId: skill.id,
          skillName: skill.name,
          usedAt: timestamp
        });
      }
    }
  }

  return events;
}

export async function collectSkillUsage(
  skills: UsageSkill[],
  roots: string[],
  logFile?: string
): Promise<Map<string, SkillUsage>> {
  if (logFile) {
    const existingEvents = await readUsageEvents(logFile);
    const knownEventIds = new Set(existingEvents.map((event) => event.eventId));
    const newEvents = await collectSessionEvents(skills, roots, knownEventIds);
    await appendUsageEvents(logFile, newEvents);
    return usageFromEvents(skills, [...existingEvents, ...newEvents]);
  }

  const usage = new Map<string, SkillUsage>();
  for (const skill of skills) usage.set(skill.id, { count: 0 });

  const files = (await Promise.all(roots.map(findJsonlFiles))).flat();
  const sortedSkills = [...skills].sort((a, b) => b.name.length - a.name.length);

  for (const file of files) {
    let content: string;
    try {
      content = await fs.readFile(file, 'utf8');
    } catch {
      continue;
    }

    for (const line of content.split('\n')) {
      if (!line.trim()) continue;

      let parsed: unknown;
      try {
        parsed = JSON.parse(line);
      } catch {
        continue;
      }

      const record = parsed as Record<string, unknown>;
      const payload = record.payload as Record<string, unknown> | undefined;
      if (!payload || !isUsageCandidate(payload)) continue;

      const text = extractContentText(payload);
      if (!text) continue;

      const timestamp =
        typeof record.timestamp === 'string'
          ? record.timestamp
          : typeof payload.timestamp === 'string'
            ? payload.timestamp
            : undefined;

      for (const skill of sortedSkills) {
        if (!hasExplicitSkillUse(text, skill.name) && !hasSkillFileUse(text, skill.id)) continue;
        const current = usage.get(skill.id) ?? { count: 0 };
        usage.set(skill.id, {
          count: current.count + 1,
          lastUsedAt: latestTimestamp(current.lastUsedAt, timestamp)
        });
      }
    }
  }

  return usage;
}
