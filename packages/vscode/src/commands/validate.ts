import * as vscode from "vscode";
import { validateSyntax } from "../core/configCells";
import { getActiveNotebookEditor, activeCellIndex } from "../notebook/edits";
import { readConfigCellMetadata } from "../notebook/metadata";
import { scanConfigCells } from "../notebook/scanner";

export async function validateCurrentConfigCell(output: vscode.OutputChannel) {
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
  reportValidation(metadata.name, validateSyntax(metadata.language, cell.document.getText()), output);
}

export async function validateAllConfigCells(output: vscode.OutputChannel) {
  const editor = getActiveNotebookEditor();
  let errorCount = 0;
  for (const record of scanConfigCells(editor.notebook)) {
    const errors = validateSyntax(record.metadata.language, record.cell.document.getText());
    errorCount += errors.length;
    reportValidation(record.metadata.name, errors, output, false);
  }
  const message = errorCount === 0 ? "All config cells are valid." : `${errorCount} config cell error(s) found.`;
  vscode.window.showInformationMessage(message);
}

function reportValidation(
  name: string,
  errors: string[],
  output: vscode.OutputChannel,
  showMessage = true
) {
  if (errors.length === 0) {
    output.appendLine(`${name}: valid`);
    if (showMessage) {
      vscode.window.showInformationMessage(`Config cell "${name}" is valid.`);
    }
    return;
  }
  output.appendLine(`${name}: invalid`);
  for (const error of errors) {
    output.appendLine(`  ${error}`);
  }
  output.show(true);
  if (showMessage) {
    vscode.window.showErrorMessage(`Config cell "${name}" has ${errors.length} error(s).`);
  }
}
