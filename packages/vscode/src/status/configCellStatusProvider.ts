import * as vscode from "vscode";
import { detectConfigLanguage } from "../core/configCells";
import { ConfigCellLanguage, readConfigCellMetadata } from "../notebook/metadata";

export class ConfigCellStatusProvider implements vscode.NotebookCellStatusBarItemProvider {
  private readonly changeEmitter = new vscode.EventEmitter<void>();
  readonly onDidChangeCellStatusBarItems = this.changeEmitter.event;

  refresh() {
    this.changeEmitter.fire();
  }

  dispose() {
    this.changeEmitter.dispose();
  }

  provideCellStatusBarItems(cell: vscode.NotebookCell): vscode.ProviderResult<vscode.NotebookCellStatusBarItem[]> {
    if (
      cell.kind !== vscode.NotebookCellKind.Code &&
      cell.kind !== vscode.NotebookCellKind.Markup
    ) {
      return [];
    }

    const metadata = readConfigCellMetadata(cell.metadata);
    if (metadata) {
      const runItem = new vscode.NotebookCellStatusBarItem(
        "$(symbol-variable) To Variable",
        vscode.NotebookCellStatusBarAlignment.Right
      );
      runItem.tooltip = `Convert ${metadata.language.toUpperCase()} config to Python variable ${metadata.name}`;
      runItem.command = {
        command: "jupyterConfigCells.runCurrent",
        title: "Convert Config Cell to Variable",
        arguments: [cell]
      };
      runItem.priority = 20;

      const item = new vscode.NotebookCellStatusBarItem(
        cell.document.languageId === metadata.language
          ? metadata.language.toUpperCase()
          : `Fix ${metadata.language.toUpperCase()} Language`,
        vscode.NotebookCellStatusBarAlignment.Right
      );
      item.tooltip =
        cell.document.languageId === metadata.language
          ? `Config cell: ${metadata.language.toUpperCase()} -> ${metadata.name}`
          : `This cell is marked as ${metadata.language.toUpperCase()} config but VS Code still sees ${cell.document.languageId}. Click to repair.`;
      item.command = {
        command:
          cell.document.languageId === metadata.language
            ? "jupyterConfigCells.openCellActions"
            : "jupyterConfigCells.convertCurrent",
        title: "Config",
        arguments:
          cell.document.languageId === metadata.language ? [] : [metadata.language, cell]
      };
      item.priority = 10;
      return [runItem, item];
    }

    const detected = detectConfigLanguage(cell.document.getText());
    const item = new vscode.NotebookCellStatusBarItem(
      detected ? detected.toUpperCase() : "Set Type",
      vscode.NotebookCellStatusBarAlignment.Right
    );
    item.tooltip = detected
      ? `This cell looks like ${detected.toUpperCase()} config`
      : "Choose YAML, JSON, JSONC, TOML, or ENV for this config cell";
    item.command = {
      command: "jupyterConfigCells.convertCurrent",
      title: "Mark as Config Cell",
      arguments: [detected as ConfigCellLanguage | undefined, cell]
    };
    return [item];
  }
}
