# JupyterLab Extension

The JupyterLab extension uses the same `metadata.configCell` model as the VS Code extension, but keeps its config parser local so the package can be published independently.

## Commands

- `Insert YAML Config Cell`
- `Insert JSONC Config Cell`
- `Insert TOML Config Cell`
- `Insert ENV Config Cell`
- `Set Cell Type`
- `Validate Current`
- `Auto-detect Config Cells`
- `Convert to Variable`

## Runtime Behavior

`Convert to Variable` keeps the original YAML/JSONC/TOML/ENV cell unchanged. It creates or updates a generated Python runner cell directly below the config cell, hides the runner source, runs it through the selected notebook kernel, and prints an explicit `name=value` confirmation.

The generated runner uses Python's standard `json` module and has no Python package dependency.

## Development

```bash
npm --prefix packages/jupyterlab install
npm run build:jupyterlab
cd packages/jupyterlab
jupyter labextension develop . --overwrite
jupyter lab
```
