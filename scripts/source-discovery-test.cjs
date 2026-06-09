const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');

const { discoverSkillSources } = require('../dist-electron/sources.js');

function writeSkill(root, relativeDir, name = 'sample') {
  const dir = path.join(root, relativeDir);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'SKILL.md'), `---\nname: ${name}\ndescription: test\n---\n`);
}

async function main() {
  const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'skillkeeper-sources-'));

  writeSkill(tempHome, '.cursor/skills/cursor-user', 'cursor-user');
  writeSkill(tempHome, '.cursor/skills-cursor/cursor-builtin', 'cursor-builtin');
  writeSkill(tempHome, '.workbuddy/skills/workbuddy-skill', 'workbuddy-skill');
  writeSkill(tempHome, '.codebuddy/skills/codebuddy-skill', 'codebuddy-skill');
  writeSkill(tempHome, 'Downloads/skills/downloaded-skill', 'downloaded-skill');
  fs.mkdirSync(path.join(tempHome, '.qwen/skills'), { recursive: true });

  const sources = await discoverSkillSources(tempHome);
  const names = sources.map((source) => source.name);
  const dirs = sources.map((source) => source.dir);

  assert.ok(names.includes('Cursor'));
  assert.ok(names.includes('Cursor Built-in'));
  assert.ok(names.includes('WorkBuddy'));
  assert.ok(names.includes('CodeBuddy'));
  assert.ok(!dirs.some((dir) => dir.includes('Downloads')));
  assert.ok(!names.includes('Qwen'));

  fs.rmSync(tempHome, { recursive: true, force: true });
  console.log('Source discovery passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
