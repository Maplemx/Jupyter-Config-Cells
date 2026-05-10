# Release Checklist

## GitHub

1. Confirm repository URLs point to `https://github.com/Maplemx/Jupyter-Config-Cells`.
2. Confirm `spec/`, local `.env` files, build output, and dependency directories are ignored.
3. Run:

```bash
npm run install:packages
npm test
npm run build
```

4. Create the public GitHub repository.
5. Add the remote and push:

```bash
git remote add origin git@github.com:Maplemx/Jupyter-Config-Cells.git
git branch -M main
git add .
git commit -m "Initial open source release"
git push -u origin main
```

## VS Code Marketplace

1. Create a publisher in the Visual Studio Marketplace.
2. Create a Marketplace personal access token with extension publishing permission.
3. Add the token to GitHub repository secrets as `VSCE_PAT`.
4. Run the `Publish VS Code Extension` workflow manually, or publish locally:

```bash
npm run install:packages
npm run build:vscode
cd packages/vscode
npm install -g @vscode/vsce
vsce login Maplemx
vsce publish
```

## JupyterLab npm Package

1. Finalize `name`, `repository`, `bugs`, and `homepage` in `packages/jupyterlab/package.json`.
2. Build and publish the JupyterLab package:

```bash
npm --prefix packages/jupyterlab install
npm run build:jupyterlab
cd packages/jupyterlab
npm publish
```
