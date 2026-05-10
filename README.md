# Jupyter Config Cells

> YAML, JSONC, TOML, and ENV config cells for Jupyter notebooks in VS Code and JupyterLab.

[English](./README.md) | [中文](./README_CN.md)

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](./LICENSE)

Notebooks are where many AI and data projects begin, but configuration rarely fits naturally there. Model settings, API payloads, feature flags, prompt parameters, environment values, and experiment knobs usually end up as fragile Python dictionaries, half-valid JSON snippets, copied YAML files, or markdown notes that cannot be executed.

Jupyter Config Cells makes configuration a first-class notebook cell. You can keep YAML, JSONC, TOML, and ENV blocks next to the code that uses them, preserve syntax highlighting, validate and export them, and assign them to Python variables without turning the original config into Python code.

The project has no Python runtime dependency. VS Code and JupyterLab parse config cells in the extension, generate a hidden Python runner cell, and assign the target variable with Python's standard `json` module.

## Why

- **Keep notebooks readable**: configuration stays in the format humans expect, not embedded inside string literals or Python dicts.
- **Keep notebooks executable**: `To Variable` converts the parsed config into a real Python variable in the current kernel.
- **Avoid red diagnostics**: YAML/JSONC/TOML/ENV cells are treated as their own languages instead of broken Python.
- **Stay portable**: config cells are ordinary notebook code cells with standard metadata.
- **Install less**: no Python package, no `%load_ext`, no runtime setup cell.
- **Support agent workflows**: model settings, tool configs, prompt parameters, and request payloads can live beside the notebook code that tests them.

## Status

This repository is in MVP development and is being prepared for public release.

- VS Code extension: insert, convert, validate, export, auto-detect, and `To Variable`.
- JupyterLab extension: command palette, notebook toolbar, auto-detect, validate, and `To Variable`.
- Each extension owns its local TypeScript config-cell core so it can be published independently.

## Quick Start

Write a config cell with a target variable marker:

```yaml
# to: model_settings
model:
  provider: deepseek
  name: deepseek-chat
  temperature: 0.2
```

Use `To Variable` in VS Code or JupyterLab. The extension keeps the YAML/JSONC/TOML/ENV cell unchanged, creates or updates a generated hidden Python runner cell below it, and prints an explicit confirmation:

```text
model_settings={'model': {'provider': 'deepseek', 'name': 'deepseek-chat', 'temperature': 0.2}}
```

Then use the variable in later Python cells:

```python
model_settings["model"]["name"]
```

## Supported Formats

| Format | Marker | Language id | Typical extension |
| --- | --- | --- | --- |
| YAML | `# to: name` | `yaml` | `.yaml`, `.yml` |
| JSONC | `// to: name` | `jsonc` | `.jsonc` |
| TOML | `# to: name` | `toml` | `.toml` |
| dotenv | `# to: name` | `dotenv` | `.env` |

Plain JSON is supported for editing, validation, and export. Runnable JSON config cells should use JSONC so the `// to: name` marker is valid.

## Key Features

- Auto-detect obvious config cells and repair language metadata from `metadata.configCell`.
- Insert ready-to-edit YAML, JSONC, TOML, and ENV config cells.
- Convert existing cells into config cells with a compact `Config` entry.
- Generate hidden Python runner cells without modifying the original config text.
- Print explicit `name=value` confirmation after conversion.
- Validate config syntax before use.
- Export config cells to files using `metadata.configCell.exportPath`.
- Use the same metadata model in VS Code and JupyterLab.

## Development

Install dependencies and build all packages:

```bash
npm run install:packages
npm run build
```

Run the regression tests:

```bash
npm test
```

For VS Code extension debugging:

```bash
code packages/vscode
```

Open `packages/vscode` in VS Code and run the `Run Extension` launch target. The sample notebook is `packages/vscode/test/test.ipynb`.

For JupyterLab extension debugging:

```bash
cd packages/jupyterlab
jupyter labextension develop . --overwrite
jupyter lab
```

## Publishing

VS Code Marketplace publishing requires a publisher account and a personal access token:

```bash
npm run install:packages
npm run build:vscode
cd packages/vscode
npm install -g @vscode/vsce
vsce login <publisher>
vsce publish
```

Before publishing, update `publisher`, `repository`, `bugs`, and `homepage` in `packages/vscode/package.json`.

JupyterLab packaging is JavaScript-only in this MVP. Publish `packages/jupyterlab` to npm when the package metadata is finalized.

## Related Project

This project is published by Maplemx. If you are interested in AI application frameworks, Maplemx is also a core developer and maintainer of [Agently](https://github.com/AgentEra/Agently), an [AgentEra](https://github.com/AgentEra) open-source framework for building production-grade AI applications. Agently focuses on stable contract-first outputs, testable TriggerFlow orchestration, observable tool/action calls, pause/resume/persist execution, session memory, hierarchical YAML/JSON/TOML settings, and a pluggable Action Runtime for local functions, MCP servers, Python/Bash sandboxes, and custom backends.

## Metadata Model

Config cells are standard notebook code cells:

```json
{
  "cell_type": "code",
  "source": "# to: model_settings\nmodel:\n  name: deepseek-chat\n",
  "metadata": {
    "configCell": {
      "version": 1,
      "name": "model_settings",
      "language": "yaml",
      "exportPath": "./settings/model_settings.yaml"
    }
  }
}
```

## Repository Layout

```text
packages/
  vscode/      VS Code extension
  jupyterlab/  JupyterLab extension
docs/          User and contributor documentation
schemas/       JSON Schema files
examples/      Example notebooks
```

## License

Apache License 2.0.
