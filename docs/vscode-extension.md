# VS Code Extension

The VS Code extension keeps notebook UI light. It auto-detects YAML, JSON, TOML, and dotenv-like code or markdown cells, sets the cell language, and adds a target marker when needed.

The visible notebook entry is a single `Config` action. Config cells also show a compact `To Variable` status item. Use it to assign the current config cell to its target Python variable, set the cell type manually, validate the current cell, or export the current cell.

Command palette entries:

- `Config Cells: Insert YAML`
- `Config Cells: Insert JSON`
- `Config Cells: Insert JSONC`
- `Config Cells: Insert TOML`
- `Config Cells: Insert ENV`
- `Config Cells: Convert to Variable`
- `Config Cells: Set Cell Type`
- `Config Cells: Validate Current`
- `Config Cells: Validate All`
- `Config Cells: Export Current`
- `Config Cells: Export All`

The extension inserts standard code cells and stores config metadata under `metadata.configCell`. Runnable cells use `# to: name` for YAML/TOML/dotenv and `// to: name` for JSONC.

In VS Code, use the config cell `To Variable` item or `Config -> Convert to Variable` for config cells. The extension leaves the YAML/JSONC/TOML/ENV cell unchanged, parses the config in the extension, creates or updates a generated Python runner cell directly below it, collapses the runner source by default, and runs that generated cell through the selected Jupyter kernel. The runner uses Python's standard `json` module.

## Dependency Model

The VS Code extension has no Python package dependency. The selected notebook kernel only needs Python's standard library.

## Local Debugging

Open `packages/vscode` in VS Code and run `Run Extension` from the Run and Debug view. The debug configuration lives in `packages/vscode/.vscode/launch.json`.
