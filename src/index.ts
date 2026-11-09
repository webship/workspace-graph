/**
 * The knowledge graphs for Webship Workspace: the graphs workspace (`graphs/`) as a plugin, and the
 * Graph menu on every project row that has a graphify command — build the graph, open it, read its
 * report, download it, serve it over MCP, delete it — with the Obsidian vault made from it (build,
 * read the notes, open the map, download, delete), the `/graph/…` and `/obsidian/…` pages, and the
 * graphs list the workspace page shows.
 *
 * Everything the dashboard is asked for goes through `api`; the store lives in the graphs workspace,
 * never inside a project.
 */

import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import type { ActionContext, PageContext, PluginApi, RowContext } from '@webship.co/workspace-plugin-api';

const graphs = require('./lib/graphs');
const obsidian = require('./lib/obsidian');

export const WORKSPACE_KEY = 'graphs';
export { graphs, obsidian };

export function register(api: PluginApi): void {
  const lib = api.lib as any;
  const { esc, workspaceDir, listProjects, isValidWorkspace, NAME_RE, ROOT, iconHtml, humanSize, humanTime, commandBlock, runningJobKey, startJob, jobFragment, startInScreen, screenStartedHtml, findScript, cssVersionNow, lists, typeAllows } = lib;
  const { graphStoreDir, hasGraph, listGraphs } = graphs;
  const { vaultDir, indexNote, vaultView, vaultCanvas, vaultFrame, obsidianMenuItems } = obsidian;
  const post = (name: string) => `/actions/p/${api.name}/${name}`;
  const findGraphifyScript = (dir: string) => findScript(dir, [/^cmd-tools?-graphify\.sh$/]);

  // ---- The graphs workspace page ------------------------------------------------------------------

  function graphRowsHtml(state: any): string {
    const { SORTS, defaultSort, paginate, listControlsHtml, listPagerHtml } = lists;
    const all = listGraphs();
    const st = state;
    const filtered = st.q ? all.filter((g: any) => g.name.toLowerCase().includes(st.q.toLowerCase())) : all;
    const sorted = filtered.slice().sort((SORTS[st.sort] || SORTS[defaultSort()] || SORTS.newest).cmp);
    const p = paginate(sorted, st);
    const vals = (g: any, extra = '') => `hx-vals='{"workspace":"${esc(g.workspace)}","projectName":"${esc(g.project)}"${extra}}' hx-target="#webship-workspace-output" hx-swap="innerHTML"`;
    const rows = p.slice.map((g: any) => `
    <div class="uk-card uk-card-default uk-card-small uk-card-body uk-margin-small project-row">
      <div class="item-row-body">
        <span class="uk-text-bold">${iconHtml('tabler:hierarchy-2', 0.8)} ${esc(g.project)}
          <span class="uk-text-meta item-machine" title="The workspace the project lives in">${esc(g.workspace)}</span></span>
        <div class="item-meta-line">
          <span class="uk-text-meta item-time">${esc(humanTime(g.mtime))}</span>
          <span class="uk-text-meta">· ${esc(humanSize(g.size))}</span>
          ${g.nodes != null ? `<span class="uk-label" title="Nodes and edges, from graphify's own build file">${g.nodes} nodes${g.links != null ? ` · ${g.links} edges` : ''}</span>` : ''}
          ${g.projectExists ? '' : '<span class="uk-label" title="The project is gone — the graph outlived it, and is safe to delete">project removed</span>'}
        </div>
        <div class="project-actions">
          ${g.hasHtml ? `<a class="uk-button uk-button-default uk-button-small" href="/graph/${esc(g.workspace)}/${esc(g.project)}" target="_blank" title="Loads vis-network from unpkg.com, so it needs internet"><span uk-icon="icon: image; ratio: .7"></span> Open</a>` : ''}
          ${g.hasReport ? `<a class="uk-button uk-button-default uk-button-small" href="/graph/${esc(g.workspace)}/${esc(g.project)}/report" target="_blank"><span uk-icon="icon: file-text; ratio: .7"></span> Report</a>` : ''}
          <a class="uk-button uk-button-default uk-button-small" href="/graph/${esc(g.workspace)}/${esc(g.project)}/download"><span uk-icon="icon: download; ratio: .7"></span> Download</a>
          ${g.projectExists ? `<button class="uk-button uk-button-secondary uk-button-small" hx-post="${post('graphify')}" ${vals(g)} title="Re-extract and re-cluster from the project"><span uk-icon="icon: refresh; ratio: .7"></span> Rebuild</button>` : ''}
          <button class="uk-button uk-button-danger uk-button-small arm-step" hx-post="${post('graph-remove')}" ${vals(g, ',"confirm":"yes"')} hx-trigger="confirmed-remove"><span uk-icon="icon: trash; ratio: .7"></span> Delete</button>
        </div>
      </div>
    </div>`).join('');
    // The controls get the BARE URL: htmx appends the included inputs without deduping, and
    // readPageState reads the FIRST q/sort. The pager keeps the qs form so page links keep the search.
    const bareUrl = `/fragments/p/${api.name}/list`;
    const qs = new URLSearchParams();
    if (st.q) qs.set('q', st.q);
    if (st.sort !== defaultSort()) qs.set('sort', st.sort);
    const url = `${bareUrl}${qs.toString() ? `?${qs}` : ''}`;
    const pager = listPagerHtml(url, '#webship-workspace-projects', p, st, 'graphs');
    return `
    <h3 class="uk-margin-small-bottom">Graphs <span class="uk-badge">${all.length}</span></h3>
    <p class="uk-text-meta uk-margin-small-bottom">One directory per project in <code>${esc(path.join(ROOT, 'graphs'))}/&lt;workspace&gt;/&lt;project&gt;/</code>,
      built by <code>cmd-tools-graphify.sh</code> from the project's workspace folder. Query one with
      <code>graphify query "…" --graph ${esc(path.join(ROOT, 'graphs'))}/&lt;workspace&gt;/&lt;project&gt;/graph.json</code>.</p>
    ${listControlsHtml(bareUrl, '#webship-workspace-projects', st, 'graphs')}
    ${pager}
    ${rows || '<p class="uk-text-meta">No graphs yet — build one from the Graph menu on any project row.</p>'}
    ${pager}`;
  }

  (api as any).addWorkspaceView(WORKSPACE_KEY, {
    listHtml: (state: any) => `
    <div id="webship-workspace-projects" hx-get="/fragments/p/${api.name}/list" hx-trigger="refresh-projects from:body">
      ${graphRowsHtml(state)}
    </div>
`,
    count: () => listGraphs().length,
    noFilesActions: true,
    noNewForm: true,
  });

  api.addFragment(({ req, send, rest }: any) => {
    if (rest === 'list') return send(graphRowsHtml(lists.readPageState(req)));
    // The Graph menu's body, asked for as the menu opens (see the row menu below): the same gates as
    // the row's, read for this one project.
    const m = /^menu\/([a-z0-9_-]+)\/([a-zA-Z0-9_-]+)$/.exec(rest);
    if (m && isValidWorkspace(m[1]) && NAME_RE.test(m[2]) && typeAllows(m[1], 'graphify') && findGraphifyScript(workspaceDir(m[1]))) return send(graphMenuBody(m[1], m[2]));
    return send('<ul class="uk-nav uk-dropdown-nav"><li class="uk-nav-header">No such menu.</li></ul>', 404);
  });

  // ---- The Graph menu on a project row ---------------------------------------------------------

  const fragment = (rest: string) => `/fragments/p/${api.name}/${rest}`;
  // A dashboard since 1.0.0-rc2 fetches a row menu's body when the menu opens (`row-menu-body`): the
  // page carries the button and the caption, and graphMenuBody() answers from the fragment above for
  // that one project. An older dashboard gets the whole menu inline, as it always did.
  const lazy = !!(api.capabilities && api.capabilities.has('row-menu-body'));
  const graphButton = '<button class="uk-button uk-button-default uk-button-small" type="button" title="Knowledge graph"><span uk-icon="icon: git-fork; ratio: .7"></span> Graph <span uk-icon="icon: chevron-down; ratio: .6"></span></button>';
  const rowVals = (key: string, p: string) => (extra = '') => `hx-vals='{"workspace":"${esc(key)}","projectName":"${esc(p)}"${extra}}' hx-target="#webship-workspace-output" hx-swap="innerHTML"`;
  const isBuilt = (key: string, p: string) => hasGraph(key, p, 'graph.json') || hasGraph(key, p, 'graph.html');

  /** The dropdown's inner HTML for one project: build or rebuild, and what a built graph offers. */
  function graphMenuBody(key: string, p: string, vals: (extra?: string) => string = rowVals(key, p)): string {
    const built = isBuilt(key, p);
    const busy = !!runningJobKey(`graphify:${key}/${p}`);
    const items = obsidianMenuItems(key, p, vals, busy, post);
    return `<ul class="uk-nav uk-dropdown-nav">
        <li data-entry="build the graph"><a href hx-post="${post('graphify')}" ${vals()} class="${busy ? 'uk-disabled' : ''}"><span uk-icon="icon: play; ratio: .7"></span> ${built ? 'Rebuild the graph' : 'Build the graph'}${busy ? ' (running…)' : ''}</a></li>
        ${built ? `<li class="uk-nav-divider"></li>
        ${hasGraph(key, p, 'graph.html') ? `<li><a href="/graph/${esc(key)}/${esc(p)}" target="_blank" title="Loads vis-network from unpkg.com, so it needs internet"><span uk-icon="icon: image; ratio: .7"></span> Open the graph</a></li>` : ''}
        ${hasGraph(key, p, 'GRAPH_REPORT.md') ? `<li><a href="/graph/${esc(key)}/${esc(p)}/report" target="_blank"><span uk-icon="icon: file-text; ratio: .7"></span> Read the report</a></li>` : ''}
        <li><a href="/graph/${esc(key)}/${esc(p)}/download" title="The graph as a .tar.gz, to hand to another workspace"><span uk-icon="icon: download; ratio: .7"></span> Download to share</a></li>
        <li><a href hx-post="${post('graph-mcp-command')}" ${vals()}><span uk-icon="icon: link; ratio: .7"></span> Connect over MCP…</a></li>
        ${items}
        <li class="uk-nav-divider"></li>
        <li><a href class="uk-text-danger arm-step" hx-post="${post('graph-remove')}" ${vals(',"confirm":"yes"')} hx-trigger="confirmed-remove"><span uk-icon="icon: trash; ratio: .7"></span> Delete the graph</a></li>` : ''}
      </ul>`;
  }

  api.addRowMenu('graph', { label: 'Graph', row: 1 }, ({ key, project: p, dir, allowed, vals }: RowContext) => {
    if (!allowed.has('graphify') || !findGraphifyScript(dir)) return null;
    const caption = isBuilt(key, p) ? 'built' : 'none';
    if (lazy) return { html: graphButton, body: fragment(`menu/${encodeURIComponent(key)}/${encodeURIComponent(p)}`), caption };
    return `<span class="act-with-status"><div class="uk-inline act-menu act-menu-graph">
      ${graphButton}
      <div uk-dropdown="mode: click; pos: bottom-right">${graphMenuBody(key, p, vals)}</div>
    </div><span class="act-status uk-text-meta">${caption}</span></span>`;
  });

  // ---- Actions ----------------------------------------------------------------------------------

  api.addAction('graphify', async ({ form, send, workspace }: ActionContext) => {
    const dir = workspaceDir(workspace);
    const script = findGraphifyScript(dir);
    const projectName = String(form.projectName || '');
    if (!script) return send('<div class="msg error">No graphify script in this workspace.</div>', 400);
    if (!NAME_RE.test(projectName) || !listProjects(dir).includes(projectName)) return send('<div class="msg error">Unknown project.</div>', 400);
    // graphify has no cross-process lock: two runs against one graphify-out/ race on its files.
    if (runningJobKey(`graphify:${workspace}/${projectName}`)) return send('<div class="msg error">A graph is already being built for this project.</div>', 409);
    const started = await startInScreen({ workspace, project: projectName, projectDir: dir, ownerDir: path.join(dir, projectName), verb: 'graphify',
      cmdLine: `bash ${JSON.stringify(script)} ${JSON.stringify(projectName)}`, label: 'graphify' });
    return send(screenStartedHtml(started, 'graphify', projectName), started.ok ? 200 : (started.already ? 409 : 500));
  });

  api.addAction('graph-mcp-command', ({ form, send, workspace }: ActionContext) => {
    const projectName = String(form.projectName || '');
    if (!NAME_RE.test(projectName)) return send('<div class="msg error">Unknown project.</div>', 400);
    const graph = path.join(graphStoreDir(workspace, projectName), 'graph.json');
    if (!fs.existsSync(graph)) return send('<div class="msg error">No graph yet — build it first.</div>', 409);
    return send(commandBlock(
      `Serve the ${workspace}/${projectName} graph to the Claude Code CLI`,
      [`cd ${ROOT}/graphs && bash cmd-tools-graphs.sh ${workspace}/${projectName} -a mcp-register`,
        `claude mcp add --scope user graph-${workspace}-${projectName} -- graphify-mcp ${graph.replace(ROOT, '~/workspace')}`],
      'Run either one <strong>on the host</strong>, in a terminal. The first is the workspace command; '
      + 'the second is what it runs. stdio, so there is no port and no daemon — the CLI starts the server '
      + 'when a session needs it. Open a NEW session to see the tools; rebuilding the graph needs no re-registration.'));
  });

  api.addAction('graph-remove', ({ form, send, workspace, res }: ActionContext) => {
    if (form.confirm !== 'yes') return send('<div class="msg error">Deleting requires confirmation.</div>', 400);
    const projectName = String(form.projectName || '');
    // The project may be gone — a graph outlives it, and that is exactly a graph worth deleting.
    if (!NAME_RE.test(projectName)) return send('<div class="msg error">Unknown project.</div>', 400);
    if (runningJobKey(`graphify:${workspace}/${projectName}`)) return send('<div class="msg error">A graph run is in progress for this project — wait for it to finish.</div>', 409);
    let real: string;
    try {
      real = fs.realpathSync(graphStoreDir(workspace, projectName));
      const base = fs.realpathSync(path.join(ROOT, 'graphs'));
      if (!real.startsWith(base + path.sep)) throw new Error('outside');
    } catch (_) { return send('<div class="msg assistant">No graph to delete.</div>'); }
    fs.rmSync(real, { recursive: true, force: true });
    (res as any).setHeader('HX-Trigger', 'refresh-projects');
    return send(`<div class="msg assistant">🗑️ Deleted the graph for <strong>${esc(projectName)}</strong>. Rebuild it any time from the Graph menu.</div>`);
  });

  api.addAction('obsidian', ({ form, send, workspace }: ActionContext) => {
    const dir = workspaceDir(workspace);
    const script = 'cmd-tools-obsidian.sh';
    const projectName = String(form.projectName || '');
    if (!fs.existsSync(path.join(dir, script))) return send('<div class="msg error">This workspace has no Obsidian script.</div>', 400);
    if (!NAME_RE.test(projectName) || !listProjects(dir).includes(projectName)) return send('<div class="msg error">Unknown project.</div>', 400);
    if (!fs.existsSync(path.join(graphStoreDir(workspace, projectName), 'graph.json'))) return send('<div class="msg error">No graph to convert yet — build the graph first, from the same menu.</div>', 409);
    const jobKey = `obsidian:${workspace}/${projectName}`;
    if (runningJobKey(jobKey)) return send('<div class="msg error">A vault is already being built for this project.</div>', 409);
    const id = startJob(`🗂️ Obsidian <strong>${esc(projectName)}</strong>`, 'bash', [script, projectName], dir,
      { timeoutMs: 10 * 60 * 1000, echoLine: `bash ${script} ${projectName}`, key: jobKey });
    return send(jobFragment(id).html);
  });

  api.addAction('obsidian-remove', ({ form, send, workspace }: ActionContext) => {
    if (form.confirm !== 'yes') return send('<div class="msg error">Deleting requires confirmation.</div>', 400);
    const projectName = String(form.projectName || '');
    if (!NAME_RE.test(projectName)) return send('<div class="msg error">Unknown project.</div>', 400);
    const dir = vaultDir(workspace, projectName);
    if (!fs.existsSync(dir)) return send('<div class="msg">There was no vault to delete.</div>');
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) { return send(`<div class="msg error">Could not delete the vault: ${esc((e as Error).message)}</div>`, 500); }
    return send('<div class="msg">Vault deleted. The graph it was made from is untouched.</div>');
  });

  // ---- The pages: the graph, its report, its archive; the vault's notes, map, index, archive --------

  const tarOut = (res: any, real: string, filename: string) => {
    res.writeHead(200, { 'Content-Type': 'application/gzip', 'Content-Disposition': `attachment; filename="${filename.replace(/[^A-Za-z0-9._-]/g, '_')}"`, 'X-Content-Type-Options': 'nosniff' });
    const tar = spawn('tar', ['-czf', '-', '-C', path.dirname(real), path.basename(real)], { stdio: ['ignore', 'pipe', 'pipe'] });
    tar.stdout.pipe(res);
    tar.stderr.resume();
    tar.on('error', () => { try { res.destroy(); } catch (_) { /* client gone */ } });
    res.on('close', () => { try { tar.kill(); } catch (_) { /* already exited */ } });
  };
  // Resolve symlinks before trusting a path: a project directory that is a link would otherwise read
  // outside the workspace, and the dashboard container bind-mounts ~/.claude as well as ~/workspace.
  const insideStore = (p: string, wantDir: boolean) => {
    try {
      const base = fs.realpathSync(path.join(ROOT, 'graphs'));
      const real = fs.realpathSync(p);
      if (!real.startsWith(base + path.sep)) return null;
      const st = fs.statSync(real);
      return (wantDir ? st.isDirectory() : st.isFile()) ? real : null;
    } catch (_) { return null; }
  };

  api.addPage(/^\/obsidian\/([a-z0-9_-]+)\/([a-zA-Z0-9_.-]+)\/(index|download|view|canvas|frame)$/, ({ req, res, match }: PageContext) => {
    const [, wsKey, project, what] = match;
    if (!isValidWorkspace(wsKey) || project.includes('..')) { res.writeHead(400); return res.end('bad name'); }
    const real = insideStore(vaultDir(wsKey, project), true);
    if (!real) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('No vault yet — build one from the Graph menu on the project row.'); }
    const q = new URL(String((req as any).url || '/'), 'http://localhost').searchParams;
    if (what === 'frame') { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); return res.end(vaultFrame(wsKey, project, String(q.get('what') || 'view'))); }
    if (what === 'view' || what === 'canvas') {
      let page: string;
      try { page = what === 'view' ? vaultView(wsKey, project, String(q.get('note') || ''), cssVersionNow()) : vaultCanvas(wsKey, project, cssVersionNow()); } catch (e) { res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end(`Could not read the vault: ${(e as Error).message}`); }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); return res.end(page);
    }
    if (what === 'index') {
      let md: string;
      try { md = fs.readFileSync(path.join(real, indexNote(project)), 'utf8'); } catch (_) { res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' }); return res.end('<div class="msg error">The vault has no index note. Rebuild it.</div>'); }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(`<h3>${esc(project)} <span class="uk-text-meta">Obsidian vault</span></h3>
        <p class="uk-text-meta">${esc(real)}</p>
        <p><a class="uk-button uk-button-primary uk-button-small" href="${esc(`obsidian://open?path=${encodeURIComponent(real)}`)}">Open in Obsidian</a>
           <a class="uk-button uk-button-default uk-button-small" href="/obsidian/${esc(wsKey)}/${esc(project)}/download">Download</a></p>
        <pre class="uk-background-muted uk-padding-small" style="white-space:pre-wrap">${esc(md)}</pre>`);
    }
    return tarOut(res, real, `${wsKey}--${project}--obsidian.tar.gz`);
  });

  api.addPage(/^\/graph\/([a-z0-9_-]+)\/([a-zA-Z0-9_.-]+)\/download$/, ({ res, match }: PageContext) => {
    const [, wsKey, project] = match;
    if (!isValidWorkspace(wsKey) || project.includes('..')) { res.writeHead(400); return res.end('bad name'); }
    const real = insideStore(graphStoreDir(wsKey, project), true);
    if (!real) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('No graph yet — build one from the Graph menu on the project row.'); }
    return tarOut(res, real, `${wsKey}--${project}--graph.tar.gz`);
  });

  api.addPage(/^\/graph\/([a-z0-9_-]+)\/([a-zA-Z0-9_-]+)(\/report)?$/, ({ res, match }: PageContext) => {
    const [, wsKey, project, report] = match;
    if (!isValidWorkspace(wsKey)) { res.writeHead(404); return res.end(); }
    const real = insideStore(path.join(graphStoreDir(wsKey, project), report ? 'GRAPH_REPORT.md' : 'graph.html'), false);
    if (!real) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('No graph yet — press Graph on the project row to build one.'); }
    // graph.html is generated from the project's own code: scripts sandboxed away from this origin, streamed.
    res.writeHead(200, { 'Content-Type': report ? 'text/plain; charset=utf-8' : 'text/html; charset=utf-8', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': 'sandbox allow-scripts allow-popups;' });
    return fs.createReadStream(real).pipe(res);
  });

  api.addAssistantContext(() => 'The graphs/ workspace holds one knowledge graph per project (built by cmd-tools-graphify.sh, @webship.co/workspace-graph); the Graph menu on a project row builds, opens, downloads, serves over MCP or deletes it, and makes an Obsidian vault from it.');
}
