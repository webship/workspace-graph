Map a project into a knowledge graph and say what it is made of.

The launch line is for Claude Code, the default; the text between the triple quotes can be given to another AI CLI as it is.

```
claude --permission-mode bypassPermissions """
Map the project <project> of the <workspace> folder into a knowledge graph and tell me what it is made of
# ~/workspace/<workspace>/<project> · the graph lands in ~/workspace/graphs/<workspace>/<project>
# container-based (DDEV by default): the mapping reads files on this machine, no container is touched
# never --deep (it sends file contents to a language model) without my yes

1. bash cmd-tools-graphify.sh --help
   in the folder ~/workspace/<workspace>; tell me the scopes it offers
2. bash cmd-tools-graphify.sh <project> --scope custom
   a first, quick map of the project's own code
3. read ~/workspace/graphs/<workspace>/<project>/GRAPH_REPORT.md
   tell me how many entities and links it holds, and its most connected parts
4. bash cmd-tools-graphify.sh <project> --query "which parts does everything else depend on?"
5. open two of the files the answer points at and tell me whether the code agrees

If a command fails, show the line that failed and stop. Do not retry with other flags.
Report what the project is made of, in a few lines, and what the graph does not cover.
"""
```
