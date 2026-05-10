import * as vscode from "vscode";
import { templateFor } from "../core/configCells";
import { getActiveNotebookEditor, activeCellIndex, insertNotebookCell } from "../notebook/edits";
import { ConfigCellLanguage, createConfigCellMetadata } from "../notebook/metadata";

export async function insertConfigCell(language: ConfigCellLanguage) {
  try {
    const editor = getActiveNotebookEditor();
    const insertPosition = vscode.workspace
      .getConfiguration("jupyterConfigCells")
      .get<string>("insertPosition", "below");
    const currentIndex = activeCellIndex(editor);
    const targetIndex =
      insertPosition === "above"
        ? currentIndex
        : insertPosition === "end"
          ? editor.notebook.cellCount
          : Math.min(currentIndex + 1, editor.notebook.cellCount);
    const metadata = createConfigCellMetadata(language);
    await insertNotebookCell(editor, targetIndex, language, templateFor(language), metadata);
  } catch (error) {
    vscode.window.showErrorMessage(error instanceof Error ? error.message : String(error));
  }
}
