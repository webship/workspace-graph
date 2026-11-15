---
name: graphs-workflow
description: How work is done in the `graphs/` folder of the Webship Workspace — how a project is mapped into a knowledge graph with `cmd-tools-graphify.sh` from its own folder, how the graph is queried, where it is kept, how the graphs are listed, collected, removed and made known to an AI CLI with `cmd-tools-graphs.sh`, how a vault is made with `cmd-tools-obsidian.sh`, with the flags of each command and the settings keys of the folder. Use when asked to "map this project", "ask the graph", "which projects have a graph", "make an Obsidian vault", or when one of these commands is about to be run.
argument-hint: '[what you are about to do in graphs]'
---

# graphs-workflow

`~/workspace/graphs` is the Graphs folder of a Webship Workspace (container-based, DDEV by default).
Graphs holds every project's knowledge graph, one folder per project: what the code is made of and what depends on what, kept outside the project it was made from. It comes with the Graphs plugin (`@webship.co/workspace-graph`), which places the commands below in the folder. Every command finds the workspace from its own path; run it from the folder, and read `bash <command> --help` before quoting a flag.

## The order of work

1. **Build** from the project's folder: `cd ~/workspace/dev`, then
   `bash cmd-tools-graphify.sh mysite` (`--scope custom` for a first, quick look).
2. **Read** `~/workspace/graphs/dev/mysite/GRAPH_REPORT.md` first.
3. **Ask**: `bash cmd-tools-graphify.sh mysite --query "the question"`.
4. **Check the answer against the file** it points at.
5. **Keep the folder in order**: `bash cmd-tools-graphs.sh` lists the graphs,
   `bash cmd-tools-graphs.sh --graphs-action collect` gathers strays.

## Commands

| Command | What it does | Flags |
| --- | --- | --- |
| `cmd-tools-graphify.sh` | Builds the knowledge graph of a project, or asks it with `--query`. Placed in every active folder of sites or code, and run from there: `<project>` | `--all` `--deep` `--exclude` `--force` `--no-yaml` `--query` `--scope` `--store` |
| `cmd-tools-graphs.sh` | The graphs of this folder: `[graph]`, and `--graphs-action` is `list` (the default), `collect`, `remove`, `mcp-register`, `mcp-unregister` or `serve` | `--graphs-action` |
| `cmd-tools-obsidian.sh` | A vault of notes from the graph of a project, a note per entity and a canvas. Placed like the build command: `<project>` | `--max-canvas-nodes` `--remove` `--status` |

## Settings

| Key | File | What it says |
| --- | --- | --- |
| `doc.name` | `core/config/workspace.graphs.settings.yml` | The folder under the workspace root: `graphs` |
| `type` | `core/config/workspace.graphs.settings.yml` | `code`: the rows of the page are packages and repositories, with the Build, Backup, Remove and Checks actions |
| `presentation.subtitle`, `presentation.noun`, `presentation.kind` | `core/config/workspace.graphs.settings.yml` | How the page reads: one item is a `graph`, laid out as a list of `files` |
| `assistant.name`, `assistant.placeholder` | `core/config/workspace.graphs.settings.yml` | What the assistant is called on this page; `default` takes the workspace's |
| `workspaces` | `core/config/settings.yml` | The active folders; `graphs` is on it once the plugin is activated |

## Rules

- **Build a graph from the project's own folder, never from `graphs/`**: the build writes into
  the project and the result is moved to `graphs/<workspace>/<project>/`, so a repository never
  gains a generated folder.
- **`--deep` sends file contents to a language model.** Never add it unasked; the default build
  reads the code on this machine only.
- **A graph of code is not the whole project.** It maps classes, functions and what calls what;
  say what the graph does not cover when you answer from it, and read the file itself for the
  final word.
- **`--graphs-action remove` deletes a graph**: only when asked. It can be built again.
- The workspace is container-based (DDEV by default); the mapping tool runs on the machine, on
  files only, and never touches a project's containers.

The Graphs plugin places these beside this one, each in the workspace folder of its kind: the agent `graphs-mapper` (`ai-agents/`), the command `/graphs-query` (`ai-commands/`) and the prompt `graphs-map-a-project` (`ai-prompts/`).
