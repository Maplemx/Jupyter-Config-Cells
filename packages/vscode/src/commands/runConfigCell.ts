import * as vscode from "vscode";
import {
  buildPythonRunnerSource,
  detectConfigLanguage,
  parseRunnableConfigCell
} from "../core/configCells";
import { activeCellIndex, getActiveNotebookEditor } from "../notebook/edits";
import { ConfigCellLanguage, readConfigCellMetadata } from "../notebook/metadata";

const RUNNER_METADATA_KEY = "jupyterConfigCellsRunner";
const RUNNER_TAG = "jupyter-config-cells-runner";

export async function runCurrentConfigCell(cellArg?: vscode.NotebookCell) {
  try {
    const editor = getActiveNotebookEditor();
    const index = cellArg?.index ?? activeCellIndex(editor);
    if (index >= editor.notebook.cellCount) {
      throw new Error("No active notebook cell selected.");
    }
    await runConfigCell(editor, editor.notebook.cellAt(index));
  } catch (error) {
    vscode.window.showErrorMessage(error instanceof Error ? error.message : String(error));
  }
}

export async function runConfigCell(editor: vscode.NotebookEditor, cell: vscode.NotebookCell) {
  const metadata = readConfigCellMetadata(cell.metadata);
  const source = cell.document.getText();
  const parsed = parseRunnableConfigCell(source);
  const language = metadata?.language || detectConfigLanguage(source) || parsed?.language;
  const name = parsed?.name || metadata?.name;
  if (!language || !name) {
    throw new Error("This cell is missing a config target marker such as # to: model_settings.");
  }
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
    throw new Error(`Invalid Python variable name: ${name}`);
  }

  const pythonSource = buildPythonRunnerSource(language, name, parsed?.body ?? source);
  const runnerIndex = await upsertRunnerCell(editor, cell.index, language, name, pythonSource);
  const runner = editor.notebook.cellAt(runnerIndex);
  const previousExecutionOrder = runner.executionSummary?.executionOrder;

  editor.selection = new vscode.NotebookRange(runnerIndex, runnerIndex + 1);
  await collapseSelectedCellInput();
  await vscode.commands.executeCommand("notebook.cell.execute");
  await waitForExecutionComplete(runner, previousExecutionOrder);
  editor.selection = new vscode.NotebookRange(cell.index, cell.index + 1);
}

async function upsertRunnerCell(
  editor: vscode.NotebookEditor,
  configCellIndex: number,
  language: ConfigCellLanguage,
  name: string,
  source: string
): Promise<number> {
  const existingIndex = findAdjacentRunnerCell(editor.notebook, configCellIndex, name);
  const runner = new vscode.NotebookCellData(vscode.NotebookCellKind.Code, source, "python");
  runner.metadata = runnerMetadata(language, name);

  const edit = new vscode.WorkspaceEdit();
  if (existingIndex >= 0) {
    edit.set(editor.notebook.uri, [
      vscode.NotebookEdit.replaceCells(
        new vscode.NotebookRange(existingIndex, existingIndex + 1),
        [runner]
      )
    ]);
    const applied = await vscode.workspace.applyEdit(edit);
    if (!applied) {
      throw new Error("Failed to update generated config runner cell.");
    }
    return existingIndex;
  }

  const insertIndex = configCellIndex + 1;
  edit.set(editor.notebook.uri, [vscode.NotebookEdit.insertCells(insertIndex, [runner])]);
  const applied = await vscode.workspace.applyEdit(edit);
  if (!applied) {
    throw new Error("Failed to insert generated config runner cell.");
  }
  return insertIndex;
}

function findAdjacentRunnerCell(
  notebook: vscode.NotebookDocument,
  configCellIndex: number,
  name: string
): number {
  const nextIndex = configCellIndex + 1;
  if (nextIndex < notebook.cellCount && isRunnerFor(notebook.cellAt(nextIndex), name)) {
    return nextIndex;
  }
  return -1;
}

function isRunnerFor(cell: vscode.NotebookCell, name: string): boolean {
  const value = cell.metadata[RUNNER_METADATA_KEY];
  return (
    !!value &&
    typeof value === "object" &&
    (value as { name?: unknown }).name === name
  );
}

function runnerMetadata(language: ConfigCellLanguage, name: string) {
  return {
    [RUNNER_METADATA_KEY]: {
      version: 1,
      name,
      language
    },
    tags: [RUNNER_TAG],
    inputCollapsed: true,
    outputCollapsed: false,
    jupyter: {
      source_hidden: true,
      outputs_hidden: false
    },
    vscode: {
      languageId: "python"
    }
  };
}

async function collapseSelectedCellInput() {
  try {
    await vscode.commands.executeCommand("notebook.cell.collapseCellInput");
  } catch {
    // Older VS Code versions may not expose this command; metadata still requests hidden input.
  }
}

async function waitForExecutionComplete(
  cell: vscode.NotebookCell,
  previousExecutionOrder: number | undefined
) {
  const started = Date.now();
  while (Date.now() - started < 30000) {
    const summary = cell.executionSummary;
    if (
      summary &&
      summary.executionOrder !== previousExecutionOrder &&
      (summary.timing?.endTime || typeof summary.success === "boolean")
    ) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}
