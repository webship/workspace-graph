/**
 * The AI items this plugin carries (ai/ in the package, the manifest's `ai` block): agents, skills,
 * commands and prompts, each placed by the installer in the workspace folder of its kind.
 *
 * What is checked here is what a person relies on once they are installed: each item has the shape its
 * folder lists and Claude Code loads, and names nothing that does not exist — every cmd-*.sh, every
 * flag, every settings key and every path of the workspace is one this folder or the workspace really has.
 */
import test from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';

// Compiled, these tests run from dist/tests, so the package root is one folder further up.
const PKG = fs.existsSync(path.join(__dirname, '..', 'package.json')) ? path.join(__dirname, '..') : path.join(__dirname, '..', '..');
const read = (f: string) => fs.readFileSync(path.join(PKG, f), 'utf8');
const pkg = JSON.parse(read('package.json'));
const manifest = pkg.workspacePlugin;
const WORKSPACE_KEY: string = manifest.workspace.key;
const names = (kind: string, ext = '.md'): string[] => manifest.ai[kind].map((f: string) => path.basename(f, ext));
const AGENTS = names('agents'), SKILLS = names('skills', ''), AI_COMMANDS = names('commands'), PROMPTS = names('prompts');

// The kinds the workspace knows, and the folder each one lands in (core/workspace-app/plugin-install.js).
const KINDS: Record<string, string> = { agents: 'ai-agents', skills: 'ai-skills', commands: 'ai-commands', prompts: 'ai-prompts' };
// The plugins this one needs: a list, or the `plugins` list of the object form (PLUGINS.md, "Commands on the machine").
const NEEDS: unknown[] = Array.isArray(manifest.needs) ? manifest.needs : (manifest.needs && manifest.needs.plugins) || [];

/** Every file of the package under a path: the file itself, or all the files of a folder (a skill is a folder). */
function filesUnder(rel: string): string[] {
  const abs = path.join(PKG, rel);
  if (!fs.statSync(abs).isDirectory()) return [rel];
  return fs.readdirSync(abs).flatMap((e) => filesUnder(`${rel}/${e}`));
}
const ITEM_FILES: string[] = Object.keys(KINDS).flatMap((kind) => (manifest.ai[kind] || []).flatMap(filesUnder));
/** The file a person reads for each item: the item itself, or the SKILL.md of a skill. */
const ITEM_DOCS: string[] = Object.keys(KINDS).flatMap((kind) => (manifest.ai[kind] || []).map((f: string) => (kind === 'skills' ? `${f}/SKILL.md` : f)));
const frontmatter = (src: string) => (src.startsWith('---\n') ? src.split('\n---\n')[0] : '');

test('the manifest carries one list per kind, each item under ai/<kind>/, and needs the folder each kind lands in', () => {
  assert.deepStrictEqual(Object.keys(manifest.ai).sort(), Object.keys(KINDS).sort(), 'agents, skills, commands, prompts');
  for (const [kind, folder] of Object.entries(KINDS)) {
    const list: string[] = manifest.ai[kind];
    assert.ok(list.length > 0, `the plugin ships at least one of ${kind}`);
    for (const f of list) {
      assert.strictEqual(path.dirname(f), `ai/${kind}`, `${f} is in ai/${kind}/: the cmd-*.sh scripts keep commands/ to themselves`);
      assert.ok(fs.existsSync(path.join(PKG, f)), `${f} is in the package`);
      assert.match(path.basename(f), new RegExp(`^${WORKSPACE_KEY}-[a-z0-9-]+(\\.md)?$`), `${f} carries the folder's name, so it never takes the name of another plugin's item`);
    }
    // An AI folder is never needed by an AI folder: the four would need each other in a circle, and a
    // circle of needs is refused. Its items of the other kinds are placed when their folder is active.
    if (manifest.name.startsWith('ai-')) assert.ok(!NEEDS.includes(folder), `${manifest.name} does not need ${folder}`);
    else assert.ok(NEEDS.includes(folder), `it ships ${kind}, so it needs ${folder}`);
  }
  assert.ok(pkg.files.includes('ai'), 'ai/ is published with the package');
  // What the plugin tells the assistant it ships (src/index.ts), when it exports the names.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const exported = require('../src/index');
  for (const [k, list] of Object.entries({ AGENTS, SKILLS, AI_COMMANDS, PROMPTS })) if (exported[k]) assert.deepStrictEqual(exported[k], list);
  // Commands and prompts share one destination in Claude Code (~/.claude/commands): a name used by both is lost.
  assert.strictEqual(new Set([...AI_COMMANDS, ...PROMPTS]).size, AI_COMMANDS.length + PROMPTS.length, 'no command and prompt share a name');
});

test('an agent is a definition the AI Agents folder can list: named after its file, described, on the fable model', () => {
  for (const f of manifest.ai.agents) {
    const head = frontmatter(read(f));
    assert.match(head, new RegExp(`^name: ${path.basename(f, '.md')}$`, 'm'));
    assert.match(head, /^description: .{80,}$/m, `${f} says when to use it`);
    assert.match(head, /Invoke for/, `${f} names the requests it answers to`);
    assert.match(head, /^model: fable$/m);
    assert.match(head, /^tools:\n(  - \S+\n?)+/m);
  }
});

test('a skill is a folder with a SKILL.md named after it, and says when to use it', () => {
  for (const f of manifest.ai.skills) {
    assert.ok(fs.statSync(path.join(PKG, f)).isDirectory(), `${f} is a folder`);
    const head = frontmatter(read(`${f}/SKILL.md`));
    assert.match(head, new RegExp(`^name: ${path.basename(f)}$`, 'm'));
    assert.match(head, /^description: .{80,}$/m, `${f} says what it does and when to use it`);
    assert.match(head, /Use when/, `${f} names the requests it answers to`);
  }
});

test('a command is a slash command: a description, an argument hint, and $ARGUMENTS where what was typed goes', () => {
  for (const f of manifest.ai.commands) {
    const src = read(f);
    const head = frontmatter(src);
    assert.match(head, /^description: .{40,}$/m, `${f} is described in the command list`);
    assert.match(head, /^argument-hint: .+$/m, `${f} says what to type after it`);
    assert.doesNotMatch(head, /^name:/m, `${f} is named by its file`);
    assert.ok(src.includes('$ARGUMENTS'), `${f} reads what was typed after the command`);
  }
});

test('a prompt is a line that says what it is for, then the whole launch command the New screen form reads', () => {
  for (const f of manifest.ai.prompts) {
    const src = read(f);
    assert.doesNotMatch(src, /^---\n/, `${f} has no frontmatter: it is not installed as a command`);
    assert.match(src.split('\n')[0], /^[A-Z].{20,}\.$/, `${f} opens with one sentence`);
    // The two expressions the dashboard reads a prompt with (core/workspace-app/screens.js).
    const flags = src.match(/^\s*claude\s+([^\n]*?)\s*"""\s*$/m);
    const text = src.match(/claude[^\n]*"""\n([\s\S]*?)\n"""/);
    assert.ok(flags && flags[1].trim() === '--permission-mode bypassPermissions', `${f} carries the claude flags`);
    assert.ok(text && text[1].trim().length > 100, `${f} carries the prompt`);
    assert.match(text![1], /<[a-z|-]+>/, `${f} has placeholders to fill in`);
    assert.match(src.split('```')[0], /can be given to another AI CLI as it is/, `${f} says the text is not tied to one AI CLI`);
    assert.match(text![1], /^# .*container-based \(DDEV by default\)/m, `${f} says where it runs`);
  }
});

// What an item may name. The commands are the ones this plugin places in its folder (commands/), with
// the flags the workspace's argument files give them: tests/fixtures/command-flags.json is read from
// them (github.com/webship/workspace, core/scripts/args, and the argparse block of a command itself).
const FLAGS: Record<string, string[]> = JSON.parse(read('tests/fixtures/command-flags.json'));
const SHIPPED: string[] = fs.existsSync(path.join(PKG, 'commands')) ? fs.readdirSync(path.join(PKG, 'commands')).filter((f) => /^cmd-.*\.sh$/.test(f)).sort() : [];

test('every command an item names is one this folder ships, with the flags it is given', () => {
  assert.deepStrictEqual(Object.keys(FLAGS).filter((k) => !k.startsWith('_')).sort(), SHIPPED, 'the fixture holds every command of the folder, and no other');
  assert.deepStrictEqual([...(manifest.workspace.files || []), ...((manifest.commands && manifest.commands.files) || [])].map((f: string) => path.basename(f)).sort(), SHIPPED, 'and the manifest places every one of them');
  let named = 0;
  for (const f of [...ITEM_FILES, 'README.md']) {
    for (const line of read(f).split('\n')) {
      for (const m of line.matchAll(/(cmd-[a-z0-9-]+\.sh)((?:(?!cmd-)[^`|#])*)/g)) {
        const known: string[] | undefined = FLAGS[m[1]] || (FLAGS._aiFolders as unknown as Record<string, string[]>)[m[1]];
        assert.ok(known, `${f}: ${m[1]} is not a command of this folder`);
        named += 1;
        // The flags of the command itself: what is inside quotes is a value handed to it.
        for (const flag of m[2].replace(/"[^"]*"/g, '""').match(/(?<![\w-])--[a-z][a-z0-9-]*/g) || []) {
          assert.ok(flag === '--help' || known!.includes(flag), `${f}: ${m[1]} has no ${flag}`);
        }
      }
    }
  }
  if (SHIPPED.length > 0) assert.ok(named >= SHIPPED.length || named > 12, `the items do show the folder's commands (${named} mentions)`);
  // Any other flag a table or a sentence shows in backticks is a flag of some command of the folder,
  // of the plugins script or of the claude launch line.
  const any = new Set([...Object.entries(FLAGS).filter(([k]) => !k.startsWith('_')).flatMap(([, v]) => v), ...Object.values(FLAGS._aiFolders as unknown as Record<string, string[]>).flat(), ...FLAGS._workspace]);
  for (const f of ITEM_FILES) {
    for (const m of read(f).matchAll(/`(--[a-z][a-z0-9-]*)[ `]/g)) assert.ok(any.has(m[1]), `${f}: no command of the folder has ${m[1]}`);
  }
});

/** The key paths of a simple YAML file (maps only, two-space indents): `doc.name`, `type`, … */
function yamlKeys(src: string): string[] {
  const keys: string[] = [];
  const stack: string[] = [];
  for (const line of src.split('\n')) {
    const m = line.match(/^( *)([A-Za-z_][A-Za-z0-9_-]*):/);
    if (!m) continue;
    stack.length = m[1].length / 2;
    stack[m[1].length / 2] = m[2];
    keys.push(stack.slice(0, m[1].length / 2 + 1).join('.'));
  }
  return keys;
}

test('every settings key and every path of the workspace an item names exists', () => {
  // tests/fixtures/workspace-paths.json: the keys of the workspace's settings.yml and the paths under
  // core/ the items name, each one seen on a fresh workspace with this plugin installed.
  const fixture = JSON.parse(read('tests/fixtures/workspace-paths.json'));
  const template: string = manifest.workspace.settingsTemplate;
  const own = `core/config/${path.basename(template)}`;
  const keysOf: Record<string, string[]> = { [own]: yamlKeys(read(template)), 'core/config/settings.yml': fixture.settingsKeys };
  let keys = 0;
  for (const f of ITEM_FILES) {
    const src = read(f);
    // A settings table: | `key` | `file` | what it says |
    for (const row of src.matchAll(/^\| ((?:`[A-Za-z0-9_.-]+`(?:, )?)+) \| `(core\/config\/[a-z.-]+\.yml)` \|/gm)) {
      assert.ok(keysOf[row[2]], `${f}: ${row[2]} is not the settings file of this folder or of the workspace`);
      for (const k of row[1].match(/[A-Za-z0-9_.-]+/g) || []) {
        assert.ok(keysOf[row[2]].includes(k), `${f}: ${row[2]} has no key ${k}`);
        keys += 1;
      }
    }
    for (const m of src.matchAll(/workspace\.[a-z-]+\.settings\.yml/g)) assert.strictEqual(m[0], path.basename(template), `${f}: the settings file of this folder is ${path.basename(template)}`);
    for (const m of src.matchAll(/`(core\/[A-Za-z0-9_./-]+)`/g)) assert.ok(m[1] === own || fixture.paths.includes(m[1]), `${f}: ${m[1]} is not a path of the workspace`);
    for (const m of src.matchAll(/~\/workspace\/([a-z][a-z-]*)(?![a-z-]*\.)/g)) assert.ok([WORKSPACE_KEY, 'core', 'backups', ...Object.values(KINDS), ...fixture.folders].includes(m[1]), `${f}: ~/workspace/${m[1]} is not this folder`);
  }
  assert.ok(keys >= 3, `the skill shows the settings keys of the folder (${keys} checked)`);
  assert.match(read(template), new RegExp(`^doc:\\n  name: ${WORKSPACE_KEY}$`, 'm'));
});

/** What an AI CLI is given to follow: the item without its frontmatter, and a prompt without its launch line. */
const bodyOf = (f: string) => read(f).replace(/^---\n[\s\S]*?\n---\n/, '').replace(/^\s*claude --permission-mode bypassPermissions """\s*$/m, '');

test('the body of an item is plain Markdown any AI CLI can follow: Claude Code is the default shape, never a requirement', () => {
  for (const f of ITEM_FILES) {
    const body = bodyOf(f);
    assert.doesNotMatch(body, /\b(Bash|Read|Write|Edit|Glob|Grep|Task|Agent|Skill|WebFetch|TodoWrite) tool\b/, `${f} names a tool of one AI CLI`);
    assert.doesNotMatch(body, /\bsub-?agents?\b|bypassPermissions|allowedTools/i, `${f} names a feature of one AI CLI`);
    assert.doesNotMatch(body, /\bClaude\b(?! Code)/, `${f} says Claude where "the AI assistant" will do`);
  }
  for (const f of manifest.ai.commands) assert.match(bodyOf(f), /(first|second|next|last) word|what was typed|the text typed/i, `${f} says in words what its arguments are`);
});

test('the items say container-based, name the folder and the plugin they come with, and carry no personal value', () => {
  for (const f of ITEM_FILES) {
    const src = read(f);
    assert.doesNotMatch(src, /DDEV-only/i, `${f}: the workspace is container-based, DDEV by default`);
    assert.doesNotMatch(src, /\/home\/(?!YOUR_USER)[a-z]/, `${f} carries no personal path`);
    for (const m of src.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+\.[a-z]{2,}/g) || []) assert.match(m, /@example\.(com|org)$/, `${f}: ${m} is not an example address`);
    assert.doesNotMatch(src, /CHANGE_ME|ghp_|sk-[A-Za-z0-9]{8}/, `${f} carries no password and no token`);
    assert.doesNotMatch(src, /```gherkin/, `${f}: the folder has no step pack to check a phrase against, so it shows none`);
  }
  for (const f of ITEM_DOCS) {
    assert.match(read(f).replace(/\s+/g, ' '), /container-based (workspace )?\(DDEV by default\)|container-based, DDEV by default/, `${f} says what the workspace runs on`);
    assert.ok(read(f).includes(`${WORKSPACE_KEY}/`) || read(f).includes(`~/workspace/${WORKSPACE_KEY}`), `${f} names the folder`);
  }
  for (const f of [...manifest.ai.agents, ...manifest.ai.skills.map((s: string) => `${s}/SKILL.md`)]) assert.ok(read(f).includes(pkg.name), `${f} names the plugin it comes with`);
  const readme = read('README.md');
  for (const name of [...AGENTS, ...SKILLS, ...AI_COMMANDS, ...PROMPTS]) assert.ok(readme.includes(name), `the README lists ${name}`);
  for (const folder of Object.values(KINDS)) assert.ok(readme.includes(`${folder}/`), `the README says what lands in ${folder}/`);
});

// Other AI command-line assistants read the frontmatter with a strict YAML parser: a value such a parser
// cannot read is lost there (the item arrives with an empty description). The default assistant is lenient,
// so the items are held to the strict reading here.
test('the frontmatter of every item is YAML a strict parser reads', () => {
  const ai = JSON.parse(read('package.json')).workspacePlugin.ai || {};
  const files: string[] = [...(ai.agents || []), ...(ai.commands || []), ...(ai.skills || []).map((s: string) => `${s}/SKILL.md`)];
  let seen = 0;
  for (const f of files) {
    const head = frontmatter(read(f));
    assert.ok(head, `${f} has frontmatter`);
    for (const line of head.split('\n').slice(1)) {
      const m = line.match(/^([A-Za-z][A-Za-z0-9_-]*):(?: (.*))?$/);
      if (!m) {
        assert.match(line, /^ +(- )?\S/, `${f}: "${line}" is neither a key nor a part of the key above it`);
        continue;
      }
      const value = (m[2] || '').trim();
      seen += 1;
      if (value === '') continue; // a list follows
      if (value.startsWith("'")) { assert.match(value, /^'(?:[^']|'')*'$/, `${f}: the value of ${m[1]} is not a closed single-quoted value`); continue; }
      if (value.startsWith('"')) { assert.doesNotThrow(() => JSON.parse(value), `${f}: the value of ${m[1]} is not a closed double-quoted value`); continue; }
      if (/^\[.*\]$/.test(value)) continue; // a list on one line
      assert.doesNotMatch(value, /: |:$| #/, `${f}: the value of ${m[1]} holds ": " or " #". A strict YAML parser stops there, and the assistant that uses one gets no ${m[1]}: reword it, or quote the value`);
      assert.doesNotMatch(value, /^(?:[[\]{}>|*&!%@\`#,]|[-?:] )/, `${f}: the value of ${m[1]} starts with a sign YAML keeps for itself: quote the value`);
    }
  }
  assert.ok(seen > 0, 'the items carry frontmatter');
});
