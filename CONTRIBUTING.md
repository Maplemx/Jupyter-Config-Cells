# Contributing

Thanks for helping improve Jupyter Config Cells.

## Development Setup

Install package dependencies:

```bash
npm run install:packages
```

VS Code extension:

```bash
npm run build:vscode
```

JupyterLab extension:

```bash
npm run build:jupyterlab
```

All packages:

```bash
npm run build
```

## Code Style

- Keep source code, identifiers, comments, and commit messages in English.
- Documentation may be bilingual when useful.
- Keep notebook metadata compatible with standard `.ipynb` files.
- Do not commit secrets, local `.env` files, or files under `spec/`.

## Pull Requests

Please include:

- A clear summary of the behavior change.
- Tests or a note explaining why tests are not applicable.
- Screenshots or short recordings for visible VS Code extension changes.
