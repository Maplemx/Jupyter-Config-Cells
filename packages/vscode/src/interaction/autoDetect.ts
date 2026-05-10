import * as vscode from "vscode";
import { detectConfigLanguage } from "../core/configCells";
import { convertCellInEditor, convertCurrentCell } from "../commands/convertCell";
import { readConfigCellMetadata } from "../notebook/metadata";
import { ConfigCellStatusProvider } from "../status/configCellStatusProvider";

const handledDocuments = new Set<string>();
const timers = new Map<string, NodeJS.Timeout>();
const DECLARATION_METADATA_KEY = "jupyterConfigCellsDeclarations";
const DECLARATION_TAG = "jupyter-config-cells-declarations";

export function registerAutoDetect(
  context: vscode.ExtensionContext,
  statusProvider?: ConfigCellStatusProvider
) {
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((event) => {
      const document = event.document;
      const cell = vscode.workspace.notebookDocuments
        .flatMap((notebook) => notebook.getCells())
        .find((candidate) => candidate.document.uri.toString() === document.uri.toString());

      if (!cell || cell.notebook.notebookType !== "jupyter-notebook") {
        return;
      }
      statusProvider?.refresh();
      const metadata = readConfigCellMetadata(cell.metadata);
      if (metadata) {
        if (document.languageId !== metadata.language) {
          const editor = vscode.window.visibleNotebookEditors.find(
            (candidate) => candidate.notebook.uri.toString() === cell.notebook.uri.toString()
          );
          if (editor) {
            void repairConfigCellLanguage(editor, cell.index);
          }
        }
        return;
      }

      const key = document.uri.toString();
      if (handledDocuments.has(key)) {
        return;
      }

      const existing = timers.get(key);
      if (existing) {
        clearTimeout(existing);
      }

      timers.set(
        key,
        setTimeout(() => {
          timers.delete(key);
          void maybeHandleCell(cell);
        }, 800)
      );
    })
  );
}

export async function autoConvertVisibleConfigCells(
  editor: vscode.NotebookEditor,
  statusProvider?: ConfigCellStatusProvider
) {
  if (editor.notebook.notebookType !== "jupyter-notebook") {
    return;
  }
  let changed = await removeGeneratedDeclarationCells(editor);

  for (let index = 0; index < editor.notebook.cellCount; index += 1) {
    const cell = editor.notebook.cellAt(index);
    const metadata = readConfigCellMetadata(cell.metadata);
    if (!metadata) {
      continue;
    }
    if (cell.kind !== vscode.NotebookCellKind.Code || cell.document.languageId !== metadata.language) {
      await repairConfigCellLanguage(editor, index);
      changed = true;
    }
  }

  for (let index = 0; index < editor.notebook.cellCount; index += 1) {
    const cell = editor.notebook.cellAt(index);
    if (
      cell.kind !== vscode.NotebookCellKind.Code &&
      cell.kind !== vscode.NotebookCellKind.Markup
    ) {
      continue;
    }
    const metadata = readConfigCellMetadata(cell.metadata);
    if (metadata) {
      continue;
    }
    const language = detectConfigLanguage(cell.document.getText());
    if (!language) {
      continue;
    }
    handledDocuments.add(cell.document.uri.toString());
    await convertCellInEditor(editor, index, language);
    changed = true;
  }
  statusProvider?.refresh();
}

async function maybeHandleCell(cell: vscode.NotebookCell) {
  const metadata = readConfigCellMetadata(cell.metadata);
  const language = metadata?.language || detectConfigLanguage(cell.document.getText());
  if (!language) {
    return;
  }

  const key = cell.document.uri.toString();
  handledDocuments.add(key);
  const autoApply = vscode.workspace
    .getConfiguration("jupyterConfigCells")
    .get<boolean>("autoSetDetectedCellType", true);
  if (autoApply) {
    const editor = vscode.window.visibleNotebookEditors.find(
      (candidate) => candidate.notebook.uri.toString() === cell.notebook.uri.toString()
    );
    if (editor) {
      if (metadata) {
        await repairConfigCellLanguage(editor, cell.index);
      } else {
        await convertCellInEditor(editor, cell.index, language);
      }
    }
    return;
  }

  const label = language.toUpperCase();
  const choice = await vscode.window.showInformationMessage(
    `This cell looks like ${label} config.`,
    `Set as ${label}`,
    "Choose Type",
    "Ignore"
  );
  if (choice === `Set as ${label}`) {
    await convertCurrentCell(language, cell);
  } else if (choice === "Choose Type") {
    await convertCurrentCell(undefined, cell);
  }
}

async function repairConfigCellLanguage(editor: vscode.NotebookEditor, index: number) {
  if (index >= editor.notebook.cellCount) {
    return;
  }
  const metadata = readConfigCellMetadata(editor.notebook.cellAt(index).metadata);
  if (!metadata) {
    return;
  }
  await convertCellInEditor(editor, index, metadata.language);
}

async function removeGeneratedDeclarationCells(editor: vscode.NotebookEditor): Promise<boolean> {
  const ranges: vscode.NotebookRange[] = [];
  for (let index = editor.notebook.cellCount - 1; index >= 0; index -= 1) {
    if (isGeneratedDeclarationCell(editor.notebook.cellAt(index))) {
      ranges.push(new vscode.NotebookRange(index, index + 1));
    }
  }
  if (ranges.length === 0) {
    return false;
  }
  const edit = new vscode.WorkspaceEdit();
  edit.set(
    editor.notebook.uri,
    ranges.map((range) => vscode.NotebookEdit.deleteCells(range))
  );
  return vscode.workspace.applyEdit(edit);
}

function isGeneratedDeclarationCell(cell: vscode.NotebookCell): boolean {
  if (cell.metadata[DECLARATION_METADATA_KEY] === true) {
    return true;
  }
  return Array.isArray(cell.metadata.tags) && cell.metadata.tags.includes(DECLARATION_TAG);
}
