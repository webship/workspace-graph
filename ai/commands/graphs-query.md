---
description: Ask the knowledge graph of a project of the Webship Workspace a question with cmd-tools-graphify.sh --query, building nothing, and answer with what the graph says and which file to read for the final word.
argument-hint: '<workspace>/<project> <question>'
---

# /graphs-query

Ask a project's knowledge graph in `~/workspace/graphs` from: `$ARGUMENTS`

The arguments are the text typed after the command: the first word is the project, as
`<workspace>/<project>` (its folder), and what follows is the question. With no project or no
question, stop and ask for what is missing. The workspace is container-based (DDEV by default);
the graph is read on this machine, and nothing is built or sent anywhere by this command.

## 1. Make sure the graph is there

```bash
cd ~/workspace/graphs
bash cmd-tools-graphs.sh
ls <workspace>/<project>
```

If the project has no graph, say so and stop: it is built from the project's own folder with
`bash cmd-tools-graphify.sh <project>`, which this command does not do.

## 2. Read the summary

Open `<workspace>/<project>/GRAPH_REPORT.md`: what the graph holds, and its most connected
parts.

## 3. Ask

```bash
cd ~/workspace/<workspace>
bash cmd-tools-graphify.sh <project> --query "<question>"
```

Never add `--deep` or `--force`: a question does not rebuild anything.

## 4. Answer

What the graph says, with the entities it names; then open the file the answer points at and
say whether the code agrees. Say what a graph of code does not cover when the question is about
configuration or templates. For a build or a rebuild, hand over to the `graphs-mapper` agent;
the `graphs-workflow` skill has every flag.
