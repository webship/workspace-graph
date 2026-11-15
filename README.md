# @webship.co/workspace-graph

The **Graphs** workspace and the knowledge-graph feature of the [Webship Workspace](https://github.com/webship/workspace) dashboard:
the `graphs/` folder (type `code`), its settings file (`core/config/workspace.graphs.settings.yml`),
its commands and its docs, as a plugin — plus the **Graph** menu on every project row that has a graphify command (build with graphify, open the graph, read its report, download it, serve it over MCP, delete it) and the Obsidian vault made from a graph (build, read the notes in the browser, open the map, download), with the `/graph/…` and `/obsidian/…` pages.

## Use it

```bash
cd ~/workspace
bash core/scripts/plugins.sh --require github:webship/workspace-graph
bash core/scripts/plugins.sh --activate graph --with-needs     # puts `graphs` on the workspaces list of settings.yml
bash core/scripts/plugins.sh --install graph      # the folder, its settings file (once), its commands, its docs (once)
```

The settings file and the docs are placed once and never overwritten: they hold what you put there.
`--deactivate` takes the workspace off the list; the folder and its content stay.

## What it needs

The AI items land in the four AI folders, so the manifest needs them (`needs`): `ai-agents`, `ai-skills`, `ai-commands`, `ai-prompts`. `--activate graph` and `--install graph` stop while one is missing and name it; with `--with-needs` they are required, activated and installed first.

A graph is made of a project, and `cmd-tools-graphify.sh` and `cmd-tools-obsidian.sh` are placed in every folder of sites or code. On a workspace that has no such folder they land only in `graphs/` itself and the Graph menu has no row to be on, so the manifest suggests one (`suggests`: `dev`, `test`, `sandboxes`, `demos`, `projects`, `products`, `drupal-modules`, `drupal-themes`, `drupal-recipes`, `drupal-profiles`, `drupal-site-templates`, `libraries`): `--require` and `--list` say whether the workspace has one, and nothing is added for you. A folder added later gets the two commands when it is installed.

On the machine it needs `python3`; a part of it uses `graphify` (which `cmd-tools-graphify.sh` installs for you, with `uv` or `pipx`, when it is missing). `bash core/scripts/plugins.sh --check graph` says which are there.

## The AI items

The plugin carries its own AI items (`ai/` in the package, the manifest's `ai` block), written for the work this folder is for. `--install` places each one in the workspace folder of its kind, when that folder is an active workspace folder; `--uninstall` removes them, and keeps one that was edited in its folder.

| Item | Kind | Lands in | What it is for |
| --- | --- | --- | --- |
| `graphs-mapper` | Agent | `ai-agents/graphs-mapper.md` | Maps a project into a knowledge graph from its own folder, answers questions from it, keeps `graphs/` in order, makes a vault of a graph; never sends file contents to a model unasked |
| `graphs-workflow` | Skill | `ai-skills/graphs-workflow/` | How work is done with the graphs: build from the project's folder, read the report, ask, check against the file; the three commands with their flags, the settings keys |
| `/graphs-query` | Command | `ai-commands/graphs-query.md` | `/graphs-query <workspace>/<project> <question>`: checks the graph is there, asks it without rebuilding and says which file has the final word |
| `graphs-map-a-project` | Prompt | `ai-prompts/graphs-map-a-project.md` | A new session that maps a project into a knowledge graph and says what it is made of |

From its folder an item is installed into the AI CLI (Claude Code by default) like any other: the folder's page on the dashboard, or `bash cmd-tools-ai-items.sh <name> --install` in the AI folder (`--to dev/<project>` for one project). A prompt is not installed: the New screen form lists it as the start of a new session. The body of every item is plain Markdown any AI CLI can follow; Claude Code is the default shape (the frontmatter, the launch line of a prompt). Every command, flag, settings key and path an item names is checked by `tests/items.test.ts`; the shape of the items is the one of the reference, [`docs/plugin-items-pattern.md` of the WordPress plugin](https://github.com/webship/workspace-wordpress/blob/1.0.x/docs/plugin-items-pattern.md).

## The commands

| Command |
| --- |
| `cmd-tools-graphs.sh` |

The bash functions these commands call live in the dashboard's `core/scripts/functions`.
