# Graphs

Every project's knowledge graph, one directory per project:
`graphs/<workspace>/<project>/` with `graph.json`, `GRAPH_REPORT.md` and `graph.html`.

Part of the **Webship Workspace** (`~/workspace`), a container-based harness (DDEV by default). The rules in the root
`CLAUDE.md` apply here too; what follows is what is specific to this folder.

## Why the graph is not in the project

A graph is tens of megabytes, its clustering is not bit-stable so every rebuild re-diffs in full,
and many of the projects worth mapping are repositories we ship — none should gain a generated
directory because somebody mapped it. `cmd-tools-graphify.sh` builds it in the project's own
workspace folder and the result is moved here.

**Build one from the project's workspace, never from here:**

```bash
cd ~/workspace/dev && bash cmd-tools-graphify.sh <project>
```

## Commands here

```bash
bash cmd-tools-graphs.sh                              # Graphs (list, collect, serve over MCP)
```

Every one locates the workspace from its own path, so there is nothing to export and nothing to
install. `--help` on any of them lists its arguments.

## AI items for this folder

The plugin of this folder (`@webship.co/workspace-graph`) places its own AI items in the AI folders of the
workspace, when they are active:

- `graphs-mapper` (`ai-agents/`): Maps a project into a knowledge graph from its own folder, answers questions from it, keeps `graphs/` in order, makes a vault of a graph; never sends file contents to a model unasked
- `graphs-workflow` (`ai-skills/`): How work is done with the graphs: build from the project's folder, read the report, ask, check against the file; the three commands with their flags, the settings keys
- `/graphs-query` (`ai-commands/`): `/graphs-query <workspace>/<project> <question>`: checks the graph is there, asks it without rebuilding and says which file has the final word
- `graphs-map-a-project` (`ai-prompts/`): A new session that maps a project into a knowledge graph and says what it is made of
