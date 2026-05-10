import * as vscode from "vscode";
import { getActiveNotebookEditor, activeCellIndex } from "../notebook/edits";
import { readConfigCellMetadata } from "../notebook/metadata";
import { scanConfigCells } from "../notebook/scanner";

export async function exportCurrentConfigCell(output: vscode.OutputChannel) {
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
  await exportCell(editor.notebook.uri, metadata.exportPath, cell.document.getText(), output);
}

export async function exportAllConfigCells(output: vscode.OutputChannel) {
  const editor = getActiveNotebookEditor();
  let count = 0;
  for (const record of scanConfigCells(editor.notebook)) {
    if (!record.metadata.exportPath) {
      output.appendLine(`Skipped ${record.metadata.name}: missing exportPath`);
      continue;
    }
    await exportCell(editor.notebook.uri, record.metadata.exportPath, record.cell.document.getText(), output);
    count += 1;
  }
  vscode.window.showInformationMessage(`Exported ${count} config cell(s).`);
}

async function exportCell(
  notebookUri: vscode.Uri,
  exportPath: string | undefined,
  source: string,
  output: vscode.OutputChannel
) {
  let target: vscode.Uri | undefined;
  if (exportPath) {
    const base = vscode.Uri.joinPath(notebookUri, "..");
    target = vscode.Uri.joinPath(base, exportPath);
  } else {
    target = await vscode.window.showSaveDialog({ saveLabel: "Export Config Cell" });
  }
  if (!target) {
    return;
  }
  try {
    await vscode.workspace.fs.stat(target);
    const choice = await vscode.window.showWarningMessage(
      `Overwrite ${target.fsPath}?`,
      { modal: true },
      "Overwrite"
    );
    if (choice !== "Overwrite") {
      return;
    }
  } catch {
    // File does not exist.
  }
  await vscode.workspace.fs.createDirectory(vscode.Uri.joinPath(target, ".."));
  await vscode.workspace.fs.writeFile(target, Buffer.from(source, "utf8"));
  output.appendLine(`Exported ${target.fsPath}`);
}

