import test from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import os from 'os';
import path from 'path';

const PKG = fs.existsSync(path.join(__dirname, '..', 'package.json')) ? path.join(__dirname, '..') : path.join(__dirname, '..', '..');

function fakeApi(root: string) {
  const calls: any = { rowMenus: {}, actions: {}, fragments: [], pages: [], views: {}, context: [] };
  const api: any = {
    name: 'graph',
    lib: {
      esc: (s: unknown) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string)),
      ROOT: root, workspaceDir: (ws: string) => path.join(root, ws), listProjects: (dir: string) => fs.readdirSync(dir).filter((f) => !f.startsWith('cmd-')),
      isValidWorkspace: (ws: string) => ['dev', 'graphs'].includes(ws), NAME_RE: /^[a-zA-Z0-9_-]+$/,
      iconHtml: (n: string) => `<i data-icon="${n}"></i>`, humanSize: (n: number) => `${n} B`, humanTime: (d: Date) => String(d),
      commandBlock: (t: string, lines: string[]) => `<pre>${t}\n${lines.join('\n')}</pre>`, runningJobKey: () => null,
      startJob: () => 'job-1', jobFragment: () => ({ html: 'job-html' }), startInScreen: async (o: any) => { calls.screen = o; return { ok: true }; }, screenStartedHtml: () => 'started',
      findScript: (dir: string, patterns: RegExp[]) => { try { return fs.readdirSync(dir).find((f) => patterns.some((p) => p.test(f))) || null; } catch (_) { return null; } },
      cssVersionNow: () => 'v1',
      lists: { SORTS: { newest: { cmp: (a: any, b: any) => b.mtime - a.mtime } }, defaultSort: () => 'newest', paginate: (l: any[], st: any) => ({ slice: l, page: 1, pages: 1, total: l.length }), listControlsHtml: () => '<controls>', listPagerHtml: () => '<pager>', readPageState: () => ({ q: '', sort: 'newest' }) },
    },
    addRowMenu: (slot: string, spec: any, fn: any) => { calls.rowMenus[slot] = { spec, fn }; },
    addAction: (name: string, fn: any) => { calls.actions[name] = fn; },
    addFragment: (fn: any) => calls.fragments.push(fn), addPage: (re: RegExp, fn: any) => calls.pages.push({ re, fn }),
    addWorkspaceView: (key: string, view: any) => { calls.views[key] = view; }, addAssistantContext: (fn: any) => calls.context.push(fn()),
  };
  return { api, calls };
}

function tree() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'graph-plugin-'));
  fs.mkdirSync(path.join(root, 'core', 'config'), { recursive: true });
  fs.writeFileSync(path.join(root, 'core', 'config', 'settings.yml'), 'workspaces:\n  - dev\n  - graphs\n');
  fs.mkdirSync(path.join(root, 'dev', 'site1'), { recursive: true });
  fs.writeFileSync(path.join(root, 'dev', 'cmd-tools-graphify.sh'), '#!/usr/bin/env bash\n');
  fs.mkdirSync(path.join(root, 'graphs', 'dev', 'site1', 'obsidian'), { recursive: true });
  fs.writeFileSync(path.join(root, 'graphs', 'dev', 'site1', 'graph.json'), JSON.stringify({ nodes: [{}, {}, {}], links: [{}] }));
  fs.writeFileSync(path.join(root, 'graphs', 'dev', 'site1', 'graph.html'), '<html></html>');
  fs.writeFileSync(path.join(root, 'graphs', 'dev', 'site1', 'obsidian', 'site1.md'), '---\ncluster: 1\n---\n# site1\n\n- [[other]] and `code`\n');
  fs.writeFileSync(path.join(root, 'graphs', 'dev', 'site1', 'obsidian', 'other.md'), '# other\n');
  fs.mkdirSync(path.join(root, 'graphs', 'dev', 'site1', 'obsidian', '.obsidian'));
  return root;
}

test('the manifest: the graphs workspace, the graphify type action, the commands, the functions and the args all ship', () => {
  const m = JSON.parse(fs.readFileSync(path.join(PKG, 'package.json'), 'utf8')).workspacePlugin;
  assert.strictEqual(m.workspace.key, 'graphs');
  assert.deepStrictEqual(m.typeActions, { graphify: ['sites', 'code'] });
  for (const f of [...m.commands.files, ...m.workspace.files, ...m.scripts.functions, ...m.scripts.args, m.workspace.settingsTemplate, ...m.features]) assert.ok(fs.existsSync(path.join(PKG, f)), `${f} ships`);
});

test('the store is read from the graphs workspace: one row per project, with counts', () => {
  process.env.WORKSPACE_ROOT = tree();
  delete require.cache[require.resolve('../src/lib/graphs')];
  const g = require('../src/lib/graphs');
  const rows = g.listGraphs();
  assert.strictEqual(rows.length, 1);
  assert.strictEqual(rows[0].name, 'dev/site1');
  assert.deepStrictEqual([rows[0].nodes, rows[0].links, rows[0].hasHtml, rows[0].projectExists], [3, 1, true, true]);
  assert.ok(g.hasGraph('dev', 'site1', 'graph.json'));
  assert.ok(!g.hasGraph('dev', 'nope', 'graph.json'));
});

test('register() owns the graphs page, draws the Graph menu where graphify is allowed, and serves the vault', async () => {
  const root = tree();
  process.env.WORKSPACE_ROOT = root;
  delete require.cache[require.resolve('../src/lib/graphs')]; delete require.cache[require.resolve('../src/lib/obsidian')]; delete require.cache[require.resolve('../src/index')];
  const { register } = require('../src/index');
  const { api, calls } = fakeApi(root);
  register(api);
  assert.ok(calls.views.graphs.noNewForm && calls.views.graphs.noFilesActions);
  assert.strictEqual(calls.views.graphs.count(), 1);
  assert.match(calls.views.graphs.listHtml({ q: '', sort: 'newest' }), /dev\/site1|site1/);
  assert.match(calls.views.graphs.listHtml({ q: '', sort: 'newest' }), /\/actions\/p\/graph\/graph-remove/);
  assert.deepStrictEqual(calls.rowMenus.graph.spec, { label: 'Graph', row: 1 });
  const ctx = (allowed: string[]) => ({ key: 'dev', project: 'site1', dir: path.join(root, 'dev'), meta: {}, allowed: new Set(allowed), vals: (extra = '') => `hx-vals='{"workspace":"dev","projectName":"site1"${extra}}'` });
  const menu = calls.rowMenus.graph.fn(ctx(['graphify']));
  assert.match(menu, /Rebuild the graph/);
  assert.match(menu, /Obsidian/);
  assert.match(menu, /\/actions\/p\/graph\/obsidian"/);
  assert.match(menu, /built</);
  assert.strictEqual(calls.rowMenus.graph.fn(ctx([])), null);
  let out = '';
  await calls.actions.graphify({ form: { projectName: 'site1' }, send: (h: string) => { out = h; }, workspace: 'dev' });
  assert.strictEqual(out, 'started');
  assert.match(calls.screen.cmdLine, /cmd-tools-graphify\.sh" "site1"/);
  await calls.actions['graph-mcp-command']({ form: { projectName: 'site1' }, send: (h: string) => { out = h; }, workspace: 'dev' });
  assert.match(out, /graphify-mcp/);
  const page = calls.pages.find((p: any) => p.re.test('/obsidian/dev/site1/view'));
  let body = ''; const res: any = { writeHead() {}, end(s: string) { body = s; } };
  page.fn({ req: { url: '/obsidian/dev/site1/view?note=site1' }, res, match: ['', 'dev', 'site1', 'view'] });
  assert.match(body, /class="wl" href=/, 'the wikilink to a note that exists is a link');
  assert.match(body, /cluster 1/);
  const graphPage = calls.pages.find((p: any) => p.re.test('/graph/dev/site1'));
  let code = 0; const res2: any = { writeHead(c: number) { code = c; }, end() {} };
  graphPage.fn({ res: res2, match: ['', 'dev', 'nope', undefined] });
  assert.strictEqual(code, 404);
});

test('on a dashboard that fetches menu bodies, the Graph row carries the button and the caption, and the fragment serves the body behind the same gates', () => {
  const root = tree();
  process.env.WORKSPACE_ROOT = root;
  delete require.cache[require.resolve('../src/lib/graphs')]; delete require.cache[require.resolve('../src/lib/obsidian')]; delete require.cache[require.resolve('../src/index')];
  const { register } = require('../src/index');
  const { api, calls } = fakeApi(root);
  api.capabilities = new Set(['row-menu-body']);
  api.lib.typeAllows = (ws: string, action: string) => ws === 'dev' && action === 'graphify';
  register(api);
  const ctx = (allowed: string[]) => ({ key: 'dev', project: 'site1', dir: path.join(root, 'dev'), meta: {}, allowed: new Set(allowed), vals: () => '' });
  const menu = calls.rowMenus.graph.fn(ctx(['graphify']));
  assert.strictEqual(menu.body, '/fragments/p/graph/menu/dev/site1');
  assert.strictEqual(menu.caption, 'built');
  assert.match(menu.html, /> Graph </);
  assert.doesNotMatch(menu.html, /uk-dropdown|hx-post/, 'the page carries the button alone');
  assert.strictEqual(calls.rowMenus.graph.fn(ctx([])), null, 'the gate on the row is unchanged');
  let out = { html: '', status: 200 };
  const send = (html: string, status = 200) => { out = { html, status }; };
  calls.fragments[0]({ send, rest: 'menu/dev/site1' });
  assert.strictEqual(out.status, 200);
  assert.match(out.html, /^<ul class="uk-nav uk-dropdown-nav">/);
  assert.match(out.html, /Rebuild the graph/);
  assert.match(out.html, /\/actions\/p\/graph\/obsidian"/);
  assert.match(out.html, /hx-vals='\{"workspace":"dev","projectName":"site1"\}' hx-target="#webship-workspace-output"/);
  calls.fragments[0]({ send, rest: 'menu/graphs/site1' });
  assert.strictEqual(out.status, 404, 'a workspace whose type does not allow graphify has no menu body');
  calls.fragments[0]({ send, rest: 'menu/dev/site1/extra' });
  assert.strictEqual(out.status, 404);
});
