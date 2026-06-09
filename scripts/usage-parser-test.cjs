const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');

const { collectSkillUsage } = require('../dist-electron/usage.js');

async function main() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'skillkeeper-usage-'));
  const sessionsDir = path.join(tempRoot, 'sessions');
  const logFile = path.join(tempRoot, 'skillkeeper', 'usage-events.jsonl');
  const skillRoot = path.join(tempRoot, 'skills');
  const pathSkillFile = path.join(skillRoot, 'path-skill', 'SKILL.md');
  fs.mkdirSync(sessionsDir, { recursive: true });

  const file = path.join(sessionsDir, 'sample.jsonl');
  const rows = [
    {
      timestamp: '2026-06-01T10:00:00.000Z',
      payload: {
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text: 'Using aihot skill to collect AI news.' }]
      }
    },
    {
      timestamp: '2026-06-01T11:00:00.000Z',
      payload: {
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text: 'Activated skill: aihot for today.' }]
      }
    },
    {
      timestamp: '2026-06-01T12:00:00.000Z',
      payload: {
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text: 'Using deep-research skill for a benchmark.' }]
      }
    },
    {
      timestamp: '2026-06-01T13:00:00.000Z',
      payload: {
        type: 'message',
        role: 'developer',
        content: [{ type: 'text', text: 'Available skills include aihot skill and deep-research skill.' }]
      }
    },
    {
      timestamp: '2026-06-01T14:00:00.000Z',
      payload: {
        type: 'tool_search_output',
        tools: [{ name: 'aihot' }]
      }
    },
    {
      timestamp: '2026-06-01T15:00:00.000Z',
      payload: {
        type: 'function_call',
        name: 'exec_command',
        arguments: JSON.stringify({
          cmd: `sed -n '1,220p' ${pathSkillFile}`,
          workdir: tempRoot
        })
      }
    }
  ];

  fs.writeFileSync(file, rows.map((row) => JSON.stringify(row)).join('\n'));

  const usage = await collectSkillUsage(
    [
      { id: 'aihot-id', name: 'aihot' },
      { id: 'deep-id', name: 'deep-research' },
      { id: pathSkillFile, name: 'path-skill' },
      { id: 'unused-id', name: 'unused-skill' }
    ],
    [sessionsDir],
    logFile
  );

  assert.equal(usage.get('aihot-id')?.count, 2);
  assert.equal(usage.get('aihot-id')?.lastUsedAt, '2026-06-01T11:00:00.000Z');
  assert.equal(usage.get('deep-id')?.count, 1);
  assert.equal(usage.get(pathSkillFile)?.count, 1);
  assert.equal(usage.get(pathSkillFile)?.lastUsedAt, '2026-06-01T15:00:00.000Z');
  assert.equal(usage.get('unused-id')?.count, 0);

  const persisted = fs.readFileSync(logFile, 'utf8').trim().split('\n').map((line) => JSON.parse(line));
  assert.equal(persisted.length, 4);
  assert.equal(persisted.filter((event) => event.skillName === 'aihot').length, 2);

  fs.rmSync(sessionsDir, { recursive: true, force: true });

  const usageFromSkillKeeperLog = await collectSkillUsage(
    [
      { id: 'aihot-id', name: 'aihot' },
      { id: 'deep-id', name: 'deep-research' },
      { id: pathSkillFile, name: 'path-skill' },
      { id: 'unused-id', name: 'unused-skill' }
    ],
    [sessionsDir],
    logFile
  );

  assert.equal(usageFromSkillKeeperLog.get('aihot-id')?.count, 2);
  assert.equal(usageFromSkillKeeperLog.get('deep-id')?.count, 1);
  assert.equal(usageFromSkillKeeperLog.get(pathSkillFile)?.count, 1);

  const usageAfterRepeatedScan = await collectSkillUsage(
    [
      { id: 'aihot-id', name: 'aihot' },
      { id: 'deep-id', name: 'deep-research' },
      { id: pathSkillFile, name: 'path-skill' },
      { id: 'unused-id', name: 'unused-skill' }
    ],
    [sessionsDir],
    logFile
  );

  assert.equal(usageAfterRepeatedScan.get('aihot-id')?.count, 2);
  assert.equal(usageAfterRepeatedScan.get('deep-id')?.count, 1);
  assert.equal(usageAfterRepeatedScan.get(pathSkillFile)?.count, 1);

  fs.rmSync(tempRoot, { recursive: true, force: true });
  console.log('Usage parser passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
