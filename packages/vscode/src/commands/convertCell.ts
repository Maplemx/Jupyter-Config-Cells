import * as vscode from "vscode";
import { sourceWithMarker } from "../core/configCells";
import { getActiveNotebookEditor, activeCellIndex } from "../notebook/edits";
import {
  ConfigCellLanguage,
  createConfigCellMetadata,
  readConfigCellMetadata
} from "../notebook/metadata";

export async function convertCurrentCell(languageArg?: ConfigCellLanguage, cellArg?: vscode.NotebookCell) {
  try {
    const language =
      languageArg ||
      ((await vscode.window.showQuickPick(["yaml", "json", "jsonc", "toml", "dotenv"], {
        placeHolder: "Select config language"
      })) as ConfigCellLanguage | undefined);
    if (!language) {
      return;
    }
    const editor = getActiveNotebookEditor();
    const index = cellArg?.index ?? activeCellIndex(editor);
    await convertCellInEditor(editor, index, language);
  } catch (error) {
    vscode.window.showErrorMessage(error instanceof Error ? error.message : String(error));
  }
}

export async function convertCellInEditor(
  editor: vscode.NotebookEditor,
  index: number,
  language: ConfigCellLanguage
) {
  if (index >= editor.notebook.cellCount) {
    throw new Error("No active notebook cell selected.");
  }
  const current = editor.notebook.cellAt(index);
  const source = current.document.getText();
  const existingMetadata = readConfigCellMetadata(current.metadata);
  const metadata = createConfigCellMetadata(language, existingMetadata?.name);
  const replacement = new vscode.NotebookCellData(
    vscode.NotebookCellKind.Code,
    sourceWithMarker(source, language, metadata.name),
    language
  );
  replacement.metadata = {
    ...current.metadata,
    language,
    configCell: metadata,
    vscode: {
      ...(typeof current.metadata.vscode === "object" ? current.metadata.vscode : {}),
      languageId: language
    }
  };
  const edit = new vscode.WorkspaceEdit();
  edit.set(editor.notebook.uri, [
    vscode.NotebookEdit.replaceCells(new vscode.NotebookRange(index, index + 1), [replacement])
  ]);
  const applied = await vscode.workspace.applyEdit(edit);
  if (!applied) {
    throw new Error("Failed to update notebook cell.");
  }
  const updated = editor.notebook.cellAt(index);
  await ensureCellDocumentLanguage(updated, language);
}

async function ensureCellDocumentLanguage(cell: vscode.NotebookCell, language: ConfigCellLanguage) {
  if (cell.document.languageId === language) {
    return;
  }
  await vscode.languages.setTextDocumentLanguage(cell.document, language);
  if (cell.document.languageId === language) {
    return;
  }
  await new Promise((resolve) => setTimeout(resolve, 100));
  if (cell.document.languageId !== language) {
    await vscode.languages.setTextDocumentLanguage(cell.document, language);
  }
}
