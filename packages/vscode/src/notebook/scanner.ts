import * as vscode from "vscode";
import { ConfigCellMetadata, readConfigCellMetadata } from "./metadata";

export interface ConfigCellRecord {
  index: number;
  cell: vscode.NotebookCell;
  metadata: ConfigCellMetadata;
}

export function scanConfigCells(notebook: vscode.NotebookDocument): ConfigCellRecord[] {
  const records: ConfigCellRecord[] = [];
  for (let index = 0; index < notebook.cellCount; index += 1) {
    const cell = notebook.cellAt(index);
    const metadata = readConfigCellMetadata(cell.metadata);
    if (metadata) {
      records.push({ index, cell, metadata });
    }
  }
  return records;
}

