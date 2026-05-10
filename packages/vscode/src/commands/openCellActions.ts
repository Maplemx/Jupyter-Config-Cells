import * as vscode from "vscode";
import { convertCurrentCell } from "./convertCell";
import { exportCurrentConfigCell } from "./export";
import { runCurrentConfigCell } from "./runConfigCell";
import { validateCurrentConfigCell } from "./validate";

export async function openCellActions(output: vscode.OutputChannel) {
  const choice = await vscode.window.showQuickPick(
    [
      {
        label: "Convert to Variable",
        description: "Assign this config cell to its target Python variable"
      },
      {
        label: "Set Cell Type",
        description: "YAML, JSON, JSONC, TOML, or ENV"
      },
      {
        label: "Validate Current",
        description: "Check syntax"
      },
      {
        label: "Export Current",
        description: "Write config file"
      }
    ],
    {
      placeHolder: "Jupyter Config Cells"
    }
  );

  switch (choice?.label) {
    case "Convert to Variable":
      await runCurrentConfigCell();
      break;
    case "Set Cell Type":
      await convertCurrentCell();
      break;
    case "Validate Current":
      await validateCurrentConfigCell(output);
      break;
    case "Export Current":
      await exportCurrentConfigCell(output);
      break;
  }
}
