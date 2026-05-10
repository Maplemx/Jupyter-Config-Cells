# Jupyter Config Cells

Use YAML, JSON, JSONC, TOML, and ENV directly in VS Code Jupyter notebooks without turning configuration into noisy Python boilerplate.

Config cells stay readable as config, then **Convert to Variable** creates and runs a hidden Python helper cell below the source cell. Your original notebook text is not rewritten, Python diagnostics do not mark config as broken Python, and the helper prints a clear `variable=value` confirmation.

## Why

Jupyter notebooks are excellent for exploration, agent workflows, data tasks, and demos, but configuration usually ends up as fragile Python dictionaries, scattered strings, or external files detached from the notebook narrative.

Jupyter Config Cells keeps configuration next to the code that uses it:

- `# to: model_settings` above YAML, JSON, JSONC, TOML, or ENV content
- automatic config-language detection for obvious cells
- explicit cell actions for insert, set type, validate, export, and convert
- hidden runner cells that assign variables with Python standard libraries where possible
- no Python package, runtime extension, or `%load_ext` required

## Example

```yaml
# to: model_settings
model:
  provider: deepseek
  name: deepseek-chat
```

Run **Convert to Variable**, then use `model_settings` from later Python notebook cells.

## Commands

- `Config Cells: Insert YAML`
- `Config Cells: Insert JSON`
- `Config Cells: Insert JSONC`
- `Config Cells: Insert TOML`
- `Config Cells: Insert ENV`
- `Config Cells: Set Cell Type`
- `Config Cells: Validate Current`
- `Config Cells: Export Current`
- `Config Cells: Convert to Variable`

## Related Project

Jupyter Config Cells is published by Maplemx as an independent open-source project. Maplemx is also a core developer and maintainer of [Agently](https://github.com/AgentEra/Agently), a framework for building production-grade AI applications with contract-first outputs, TriggerFlow orchestration, observable action calls, pause/resume/persist workflows, session memory, hierarchical settings, and pluggable action runtimes.

## Development

```bash
npm install
npm run compile
```

Open this folder in VS Code and launch the extension development host.
