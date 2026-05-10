import * as vscode from "vscode";
import { exportAllConfigCells, exportCurrentConfigCell } from "./commands/export";
import { insertConfigCell } from "./commands/insertConfigCell";
import { convertCurrentCell } from "./commands/convertCell";
import { validateAllConfigCells, validateCurrentConfigCell } from "./commands/validate";
import { openCellActions } from "./commands/openCellActions";
import { runCurrentConfigCell } from "./commands/runConfigCell";
import { autoConvertVisibleConfigCells, registerAutoDetect } from "./interaction/autoDetect";
import { ConfigCellLanguage } from "./notebook/metadata";
import { ConfigCellStatusProvider } from "./status/configCellStatusProvider";

export function activate(context: vscode.ExtensionContext) {
  const output = vscode.window.createOutputChannel("Jupyter Config Cells");
  context.subscriptions.push(output);

  context.subscriptions.push(
    vscode.commands.registerCommand("jupyterConfigCells.insertYaml", () =>
      insertConfigCell("yaml")
    ),
    vscode.commands.registerCommand("jupyterConfigCells.insertJson", () =>
      insertConfigCell("json")
    ),
    vscode.commands.registerCommand("jupyterConfigCells.insertJsonc", () =>
      insertConfigCell("jsonc")
    ),
    vscode.commands.registerCommand("jupyterConfigCells.insertToml", () =>
      insertConfigCell("toml")
    ),
    vscode.commands.registerCommand("jupyterConfigCells.insertEnv", () =>
      insertConfigCell("dotenv")
    ),
    vscode.commands.registerCommand("jupyterConfigCells.convertCurrent", (language?: ConfigCellLanguage, cell?: vscode.NotebookCell) =>
      convertCurrentCell(language, cell)
    ),
    vscode.commands.registerCommand("jupyterConfigCells.validateCurrent", () =>
      validateCurrentConfigCell(output)
    ),
    vscode.commands.registerCommand("jupyterConfigCells.validateAll", () =>
      validateAllConfigCells(output)
    ),
    vscode.commands.registerCommand("jupyterConfigCells.exportCurrent", () =>
      exportCurrentConfigCell(output)
    ),
    vscode.commands.registerCommand("jupyterConfigCells.exportAll", () =>
      exportAllConfigCells(output)
    ),
    vscode.commands.registerCommand("jupyterConfigCells.runCurrent", (cell?: vscode.NotebookCell) =>
      runCurrentConfigCell(cell)
    ),
    vscode.commands.registerCommand("jupyterConfigCells.openCellActions", () =>
      openCellActions(output)
    )
  );

  const statusProvider = new ConfigCellStatusProvider();
  context.subscriptions.push(
    statusProvider,
    vscode.notebooks.registerNotebookCellStatusBarItemProvider("jupyter-notebook", statusProvider)
  );
  registerAutoDetect(context, statusProvider);

  for (const editor of vscode.window.visibleNotebookEditors) {
    if (editor.notebook.notebookType === "jupyter-notebook") {
      void autoConvertVisibleConfigCells(editor, statusProvider);
    }
  }

  context.subscriptions.push(
    vscode.window.onDidChangeActiveNotebookEditor((editor) => {
      if (editor?.notebook.notebookType === "jupyter-notebook") {
        void autoConvertVisibleConfigCells(editor, statusProvider);
      }
    }),
    vscode.window.onDidChangeVisibleNotebookEditors((editors) => {
      for (const editor of editors) {
        if (editor.notebook.notebookType === "jupyter-notebook") {
          void autoConvertVisibleConfigCells(editor, statusProvider);
        }
      }
    }),
    vscode.workspace.onDidOpenNotebookDocument((notebook) => {
      if (notebook.notebookType !== "jupyter-notebook") {
        return;
      }
      const editor = vscode.window.visibleNotebookEditors.find(
        (candidate) => candidate.notebook.uri.toString() === notebook.uri.toString()
      );
      if (editor) {
        void autoConvertVisibleConfigCells(editor, statusProvider);
      }
    })
  );
}

export function deactivate() {}
