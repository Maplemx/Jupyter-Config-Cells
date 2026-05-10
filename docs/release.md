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

1. Use Node.js 20 or newer for `@vscode/vsce`.
2. Create or verify the `Maplemx` publisher in the Visual Studio Marketplace.
3. Create a Marketplace personal access token with extension publishing permission for that publisher.
4. Add the token to GitHub repository secrets as `VSCE_PAT`.
5. Run the `Publish VS Code Extension` workflow manually, or publish locally:

```bash
npm run build:vscode
cd packages/vscode
npm install -g @vscode/vsce
vsce login Maplemx
vsce publish
```

## JupyterLab npm Package

1. Log in to the official npm registry. If the global registry is npmmirror, keep the registry flag:

```bash
npm login --registry=https://registry.npmjs.org/
```

2. Build and publish the JupyterLab package:

```bash
npm --prefix packages/jupyterlab install
npm run build:jupyterlab
cd packages/jupyterlab
npm publish --registry=https://registry.npmjs.org/ --access public
```
