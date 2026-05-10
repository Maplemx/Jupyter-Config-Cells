# Jupyter Config Cells

> 面向 VS Code 和 JupyterLab 的 YAML、JSONC、TOML、ENV 配置单元格插件。

[English](./README.md) | [中文](./README_CN.md)

Notebook 是很多 AI 和数据项目开始的地方，但配置通常很难自然地放进去。模型参数、API payload、功能开关、prompt 参数、环境变量和实验配置，最后经常变成脆弱的 Python dict、半合法 JSON、复制出来的 YAML 文件，或者无法执行的 markdown 说明。

Jupyter Config Cells 让配置成为 Notebook 里的一等 cell。你可以把 YAML、JSONC、TOML、ENV 配置块放在使用它们的代码旁边，保留语法高亮、校验和导出能力，并且一键注入为 Python 变量，而不需要把原始配置改写成 Python。

项目不再需要 Python runtime。VS Code 和 JupyterLab 扩展会在前端解析配置内容，生成一个默认隐藏的 Python runner cell，并只用 Python 标准库 `json` 完成变量赋值。

## 为什么需要它

- **Notebook 更可读**：配置保留人类熟悉的格式，而不是塞进字符串或 Python dict。
- **Notebook 仍可执行**：`To Variable` 会把解析后的配置注入为当前 kernel 里的真实 Python 变量。
- **避免红字诊断**：YAML/JSONC/TOML/ENV cell 不再被当作错误的 Python。
- **保持可移植**：配置 cell 仍是标准 notebook code cell，只额外使用标准 metadata。
- **少装东西**：不需要 Python 包、不需要 `%load_ext`、不需要 runtime setup cell。
- **适合 Agent 工作流**：模型设置、工具配置、prompt 参数和请求 payload 可以放在测试它们的 notebook 代码旁边。

## 当前状态

项目处于发布前 MVP 阶段。

- VS Code extension：支持插入、转换、校验、导出、自动检测和 `To Variable`。
- JupyterLab extension：支持命令面板、notebook toolbar、自动检测、校验和 `To Variable`。
- 两个插件各自内置本地 TypeScript config-cell core，便于独立发布。

## 快速开始

写一个带目标变量声明的配置 cell：

```yaml
# to: model_settings
model:
  provider: deepseek
  name: deepseek-chat
  temperature: 0.2
```

在 VS Code 或 JupyterLab 中点击 `To Variable`。扩展不会改动原 YAML/JSONC/TOML/ENV cell，而是在下方创建或更新一个默认隐藏的 Python runner cell，并输出明确提示：

```text
model_settings={'model': {'provider': 'deepseek', 'name': 'deepseek-chat', 'temperature': 0.2}}
```

随后可以在后续 Python cell 中使用：

```python
model_settings["model"]["name"]
```

## 支持格式

| 格式 | Marker | Language id | 常见扩展名 |
| --- | --- | --- | --- |
| YAML | `# to: name` | `yaml` | `.yaml`, `.yml` |
| JSONC | `// to: name` | `jsonc` | `.jsonc` |
| TOML | `# to: name` | `toml` | `.toml` |
| dotenv | `# to: name` | `dotenv` | `.env` |

纯 JSON 可用于编辑、校验和导出。需要运行并注入变量的 JSON 配置建议使用 JSONC，因为 `// to: name` marker 是 JSONC 语法。

## 关键能力

- 自动检测明显的配置 cell，并优先用 `metadata.configCell` 修复语言状态。
- 插入可直接编辑的 YAML、JSONC、TOML、ENV 配置 cell。
- 用紧凑的 `Config` 入口把已有 cell 转成配置 cell。
- 生成隐藏 Python runner cell，不改动原始配置文本。
- 转换后输出明确的 `name=value` 结果提示。
- 使用前校验配置语法。
- 根据 `metadata.configCell.exportPath` 导出配置文件。
- VS Code 和 JupyterLab 使用同一套 metadata 模型。

## 开发

安装依赖并构建全部包：

```bash
npm run install:packages
npm run build
```

运行回归测试：

```bash
npm test
```

调试 VS Code 扩展：

```bash
code packages/vscode
```

在 VS Code 中打开 `packages/vscode`，运行 `Run Extension` 调试扩展。示例 notebook 是 `packages/vscode/test/test.ipynb`。

调试 JupyterLab 扩展：

```bash
cd packages/jupyterlab
jupyter labextension develop . --overwrite
jupyter lab
```

## 发布

VS Code Marketplace 发布前，需要先修改 `packages/vscode/package.json` 里的 `publisher`、`repository`、`bugs`、`homepage`。

```bash
npm run install:packages
npm run build:vscode
cd packages/vscode
npm install -g @vscode/vsce
vsce login <publisher>
vsce publish
```

JupyterLab MVP 是纯 JavaScript 扩展。包信息确认后，可以直接发布 `packages/jupyterlab`。

## 相关项目推荐

本项目由 Maplemx 以个人身份发布。如果你对 AI 应用开发框架感兴趣，Maplemx 同时也是 [Agently](https://github.com/AgentEra/Agently) 的核心开发者和负责人之一；Agently 是 [AgentEra](https://github.com/AgentEra) 旗下的开源框架，面向生产级 AI 应用开发，重点提供 contract-first 稳定输出、可测试的 TriggerFlow 编排、可观测的工具/Action 调用日志、可 pause/resume/persist 的执行状态、session memory、分层 YAML/JSON/TOML settings，以及可插拔 Action Runtime，支持本地函数、MCP servers、Python/Bash sandboxes 和自定义后端。

## 开源注意事项

- 代码、变量名、包名、命令名统一使用英文。
- 文档可以同时提供英文和中文。
- `spec/`、`SPEC.md`、`*.spec.md` 已加入 `.gitignore`，不会暴露到公共仓库。
- 默认使用 Apache License 2.0。
