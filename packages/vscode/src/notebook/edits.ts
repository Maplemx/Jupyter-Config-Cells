import * as vscode from "vscode";
import { ConfigCellLanguage, ConfigCellMetadata } from "./metadata";

export function getActiveNotebookEditor(): vscode.NotebookEditor {
  const editor = vscode.window.activeNotebookEditor;
  if (!editor) {
    throw new Error("Open a Jupyter notebook before running this command.");
  }
  return editor;
}

export async function insertNotebookCell(
  editor: vscode.NotebookEditor,
  index: number,
  language: ConfigCellLanguage,
  source: string,
  metadata: ConfigCellMetadata
) {
  const cell = new vscode.NotebookCellData(vscode.NotebookCellKind.Code, source, language);
  cell.metadata = {
    language,
    configCell: metadata,
    vscode: {
      languageId: language
    }
  };
  const edit = new vscode.WorkspaceEdit();
  edit.set(editor.notebook.uri, [vscode.NotebookEdit.insertCells(index, [cell])]);
  const ok = await vscode.workspace.applyEdit(edit);
  if (!ok) {
    throw new Error("Failed to insert config cell.");
  }
  const inserted = editor.notebook.cellAt(index);
  editor.revealRange(new vscode.NotebookRange(index, index + 1));
  return inserted;
}

export async function insertCodeCell(
  editor: vscode.NotebookEditor,
  index: number,
  language: string,
  source: string
) {
  const cell = new vscode.NotebookCellData(vscode.NotebookCellKind.Code, source, language);
  cell.metadata = {
    language,
    vscode: {
      languageId: language
    }
  };
  const edit = new vscode.WorkspaceEdit();
  edit.set(editor.notebook.uri, [vscode.NotebookEdit.insertCells(index, [cell])]);
  const ok = await vscode.workspace.applyEdit(edit);
  if (!ok) {
    throw new Error("Failed to insert notebook cell.");
  }
  editor.revealRange(new vscode.NotebookRange(index, index + 1));
}

export function activeCellIndex(editor: vscode.NotebookEditor): number {
  const selection = editor.selection;
  if (!selection || selection.start === selection.end) {
    return editor.notebook.cellCount;
  }
  return selection.start;
}
