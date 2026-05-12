import * as vscode from "vscode";
import { formatConfigSource } from "../core/configCells";
import { getActiveNotebookEditor, activeCellIndex } from "../notebook/edits";
import { readConfigCellMetadata } from "../notebook/metadata";

export async function formatCurrentConfigCell() {
  const editor = getActiveNotebookEditor();
  const index = activeCellIndex(editor);
  if (index >= editor.notebook.cellCount) {
    vscode.window.showWarningMessage("No active notebook cell selected.");
    return;
  }
  const cell = editor.notebook.cellAt(index);
  const metadata = readConfigCellMetadata(cell.metadata);
  if (!metadata) {
    vscode.window.showWarningMessage("Current cell is not a config cell.");
    return;
  }
  const source = cell.document.getText();
  let formatted: string;
  try {
    formatted = formatConfigSource(metadata.language, source);
  } catch {
    vscode.window.showErrorMessage(`Cannot format: config cell has syntax errors. Fix them first.`);
    return;
  }
  if (formatted === source) {
    return;
  }
  const edit = new vscode.WorkspaceEdit();
  const fullRange = new vscode.Range(0, 0, cell.document.lineCount, 0);
  edit.replace(cell.document.uri, fullRange, formatted);
  await vscode.workspace.applyEdit(edit);
}
