# Jupyter Config Cells for JupyterLab

Use YAML, JSON, JSONC, TOML, and ENV directly in JupyterLab notebooks without turning configuration into noisy Python boilerplate.

## Features

- Notebook toolbar `Config` button
- command palette entries for insert, set type, validate, auto-detect, export, and convert to variable
- local YAML, JSON, JSONC, TOML, and ENV detection and parsing
- generated hidden Python runner cell for `To Variable`
- no Python runtime package or `%load_ext` setup required

Use a marker comment to name the target variable:

```yaml
# to: model_settings
model:
  provider: deepseek
  name: deepseek-chat
```

## Development

```bash
npm install
npm run build
jupyter labextension develop . --overwrite
jupyter lab
```

The extension uses standard notebook cell metadata under `metadata.configCell`.
