# @webship.co/workspace-graph

The **Graphs** workspace and the knowledge-graph feature of the [Webship Workspace](https://github.com/webship/workspace) dashboard:
the `graphs/` folder (type `code`), its settings file (`core/config/workspace.graphs.settings.yml`),
its commands and its docs, as a plugin — plus the **Graph** menu on every project row that has a graphify command (build with graphify, open the graph, read its report, download it, serve it over MCP, delete it) and the Obsidian vault made from a graph (build, read the notes in the browser, open the map, download), with the `/graph/…` and `/obsidian/…` pages.

## Use it

```bash
cd ~/workspace
bash core/scripts/plugins.sh --require github:webship/workspace-graph
bash core/scripts/plugins.sh --activate graph     # puts `graphs` on the workspaces list of settings.yml
bash core/scripts/plugins.sh --install graph      # the folder, its settings file (once), its commands, its docs (once)
```

The settings file and the docs are placed once and never overwritten: they hold what you put there.
`--deactivate` takes the workspace off the list; the folder and its content stay.

## The commands

| Command |
| --- |
| `cmd-tools-graphs.sh` |

The bash functions these commands call live in the dashboard's `core/scripts/functions`.
