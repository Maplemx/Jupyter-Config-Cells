import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from "@jupyterlab/application";
import {
  CommandToolbarButton,
  ICommandPalette,
  showDialog,
  Dialog
} from "@jupyterlab/apputils";
import {
  INotebookTracker,
  NotebookActions,
  NotebookPanel
} from "@jupyterlab/notebook";
import {
  buildPythonRunnerSource,
  ConfigCellLanguage,
  createConfigCellMetadata,
  detectConfigLanguage,
  parseRunnableConfigCell,
  readConfigCellMetadata,
  sourceWithMarker,
  templateFor,
  validateSyntax
} from "./configCells";

const PLUGIN_ID = "jupyterlab-config-cells:plugin";
const RUNNER_METADATA_KEY = "jupyterConfigCellsRunner";
const RUNNER_TAG = "jupyter-config-cells-runner";
const DECLARATION_METADATA_KEY = "jupyterConfigCellsDeclarations";
const DECLARATION_TAG = "jupyter-config-cells-declarations";

const COMMANDS = {
  open: "jupyter-config-cells:open",
  toVariable: "jupyter-config-cells:to-variable",
  setType: "jupyter-config-cells:set-type",
  validate: "jupyter-config-cells:validate-current",
  insertYaml: "jupyter-config-cells:insert-yaml",
  insertJsonc: "jupyter-config-cells:insert-jsonc",
  insertToml: "jupyter-config-cells:insert-toml",
  insertEnv: "jupyter-config-cells:insert-env",
  autoDetect: "jupyter-config-cells:auto-detect"
};

const extension: JupyterFrontEndPlugin<void> = {
  id: PLUGIN_ID,
  autoStart: true,
  requires: [INotebookTracker],
  optional: [ICommandPalette],
  activate: (
    app: JupyterFrontEnd,
    tracker: INotebookTracker,
    palette: ICommandPalette | null
  ) => {
    registerCommands(app, tracker);
    registerPalette(palette);
    tracker.widgetAdded.connect((_, panel) => {
      panel.context.ready.then(() => {
        attachToolbar(app, panel);
        attachAutoDetect(panel);
        void autoDetectPanel(panel);
      }).catch((error) => showError(error));
    });
  }
};

function registerCommands(app: JupyterFrontEnd, tracker: INotebookTracker) {
  const { commands } = app;

  commands.addCommand(COMMANDS.open, {
    label: "Config",
    caption: "Open Jupyter Config Cells actions",
    execute: async () => openActions(app, tracker)
  });
  commands.addCommand(COMMANDS.toVariable, {
    label: "Convert to Variable",
    caption: "Assign the active config cell to its target Python variable",
    execute: async () => toVariable(tracker.currentWidget)
  });
  commands.addCommand(COMMANDS.setType, {
    label: "Set Cell Type",
    caption: "Set the active cell as YAML, JSONC, TOML, or ENV config",
    execute: async () => setType(tracker.currentWidget)
  });
  commands.addCommand(COMMANDS.validate, {
    label: "Validate Current",
    caption: "Validate the active config cell",
    execute: async () => validateCurrent(tracker.currentWidget)
  });
  commands.addCommand(COMMANDS.insertYaml, {
    label: "Insert YAML Config Cell",
    execute: async () => insertConfigCell(tracker.currentWidget, "yaml")
  });
  commands.addCommand(COMMANDS.insertJsonc, {
    label: "Insert JSONC Config Cell",
    execute: async () => insertConfigCell(tracker.currentWidget, "jsonc")
  });
  commands.addCommand(COMMANDS.insertToml, {
    label: "Insert TOML Config Cell",
    execute: async () => insertConfigCell(tracker.currentWidget, "toml")
  });
  commands.addCommand(COMMANDS.insertEnv, {
    label: "Insert ENV Config Cell",
    execute: async () => insertConfigCell(tracker.currentWidget, "dotenv")
  });
  commands.addCommand(COMMANDS.autoDetect, {
    label: "Auto-detect Config Cells",
    execute: async () => autoDetectPanel(tracker.currentWidget)
  });
}

function registerPalette(palette: ICommandPalette | null) {
  if (!palette) {
    return;
  }
  for (const command of Object.values(COMMANDS)) {
    palette.addItem({ command, category: "Jupyter Config Cells" });
  }
}

function attachToolbar(app: JupyterFrontEnd, panel: NotebookPanel) {
  if (Array.from(panel.toolbar.names()).includes("jupyter-config-cells")) {
    return;
  }
  panel.toolbar.insertItem(
    10,
    "jupyter-config-cells",
    new CommandToolbarButton({
      commands: app.commands,
      id: COMMANDS.open,
      label: "Config"
    })
  );
}

function attachAutoDetect(panel: NotebookPanel) {
  const notebook = panel.content;
  const schedule = debounce(() => void autoDetectPanel(panel), 500);
  notebook.activeCellChanged.connect(schedule);
  const model = notebook.model as any;
  model?.contentChanged?.connect?.(schedule);
  model?.cells?.changed?.connect?.(schedule);
}

async function openActions(app: JupyterFrontEnd, tracker: INotebookTracker) {
  const result = await showDialog({
    title: "Jupyter Config Cells",
    body: "Choose an action for the active notebook cell.",
    buttons: [
      Dialog.cancelButton(),
      Dialog.okButton({ label: "To Variable" }),
      Dialog.okButton({ label: "Set Type" }),
      Dialog.okButton({ label: "Validate" }),
      Dialog.okButton({ label: "Insert YAML" })
    ]
  });

  switch (result.button.label) {
    case "To Variable":
      await app.commands.execute(COMMANDS.toVariable);
      break;
    case "Set Type":
      await app.commands.execute(COMMANDS.setType);
      break;
    case "Validate":
      await app.commands.execute(COMMANDS.validate);
      break;
    case "Insert YAML":
      await insertConfigCell(tracker.currentWidget, "yaml");
      break;
  }
}

async function insertConfigCell(panel: NotebookPanel | null, language: ConfigCellLanguage) {
  const notebook = getNotebook(panel);
  NotebookActions.insertBelow(notebook);
  const cell = notebook.activeCell as any;
  const metadata = createConfigCellMetadata(language);
  setCellSource(cell, templateFor(language));
  setConfigMetadata(cell, metadata);
  setCellLanguage(cell, language);
  if (panel) {
    panel.context.model.dirty = true;
  }
}

async function setType(panel: NotebookPanel | null) {
  const notebook = getNotebook(panel);
  const language = await chooseLanguage();
  if (!language) {
    return;
  }
  convertCell(notebook, notebook.activeCellIndex, language);
  if (panel) {
    panel.context.model.dirty = true;
  }
}

async function validateCurrent(panel: NotebookPanel | null) {
  const notebook = getNotebook(panel);
  const cell = notebook.activeCell as any;
  const source = getCellSource(cell);
  const parsed = parseRunnableConfigCell(source);
  const metadata = readConfigCellMetadata(readCellMetadata(cell));
  const language = metadata?.language || detectConfigLanguage(source) || parsed?.language;
  if (!language) {
    await showDialog({
      title: "Jupyter Config Cells",
      body: "The active cell is not a recognized config cell.",
      buttons: [Dialog.okButton()]
    });
    return;
  }
  const errors = validateSyntax(language, parsed?.body ?? source);
  await showDialog({
    title: "Jupyter Config Cells",
    body: errors.length === 0 ? "Config cell is valid." : errors.join("\n"),
    buttons: [Dialog.okButton()]
  });
}

async function toVariable(panel: NotebookPanel | null) {
  if (!panel) {
    throw new Error("Open a notebook before using Jupyter Config Cells.");
  }
  const notebook = getNotebook(panel);
  const configIndex = notebook.activeCellIndex;
  const configCell = notebook.activeCell as any;
  const source = getCellSource(configCell);
  const parsed = parseRunnableConfigCell(source);
  const metadata = readConfigCellMetadata(readCellMetadata(configCell));
  const language = metadata?.language || detectConfigLanguage(source) || parsed?.language;
  const name = parsed?.name || metadata?.name;
  if (!language || !name) {
    throw new Error("This cell is missing a config target marker such as # to: model_settings.");
  }
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
    throw new Error(`Invalid Python variable name: ${name}`);
  }

  const runnerSource = buildPythonRunnerSource(language, name, parsed?.body ?? source);
  const runnerIndex = upsertRunnerCell(panel, configIndex, language, name, runnerSource);
  notebook.activeCellIndex = runnerIndex;
  NotebookActions.hideCode(notebook);
  await (NotebookActions.run as any)(notebook, panel.sessionContext);
  notebook.activeCellIndex = configIndex;
}

async function autoDetectPanel(panel: NotebookPanel | null) {
  if (!panel?.content.model) {
    return;
  }
  const notebook = panel.content;
  let changed = removeGeneratedDeclarationCells(notebook);
  for (let index = 0; index < notebook.widgets.length; index += 1) {
    const metadata = readConfigCellMetadata(readCellMetadata(notebook.widgets[index] as any));
    if (!metadata) {
      continue;
    }
    notebook.activeCellIndex = index;
    NotebookActions.changeCellType(notebook, "code");
    const cell = notebook.widgets[index] as any;
    setCellLanguage(cell, metadata.language);
    changed = true;
  }
  for (const cell of notebook.widgets as any[]) {
    if (readConfigCellMetadata(readCellMetadata(cell))) {
      continue;
    }
    const language = detectConfigLanguage(getCellSource(cell));
    if (!language) {
      continue;
    }
    convertCell(notebook, notebook.widgets.indexOf(cell), language);
    changed = true;
  }
  if (changed) {
    panel.context.model.dirty = true;
  }
}

function convertCell(notebook: any, index: number, language: ConfigCellLanguage) {
  notebook.activeCellIndex = index;
  NotebookActions.changeCellType(notebook, "code");
  const cell = notebook.widgets[index] as any;
  const source = getCellSource(cell);
  const existing = readConfigCellMetadata(readCellMetadata(cell));
  const metadata = createConfigCellMetadata(language, existing?.name);
  setCellSource(cell, sourceWithMarker(source, language, metadata.name));
  setConfigMetadata(cell, metadata);
  setCellLanguage(cell, language);
}

function upsertRunnerCell(
  panel: NotebookPanel,
  configIndex: number,
  language: ConfigCellLanguage,
  name: string,
  source: string
): number {
  const notebook = panel.content;
  const existingIndex = findAdjacentRunnerCell(notebook.widgets as any[], configIndex, name);
  if (existingIndex >= 0) {
    const existing = notebook.widgets[existingIndex] as any;
    setCellSource(existing, source);
    setRunnerMetadata(existing, language, name);
    setCellLanguage(existing, "python");
    return existingIndex;
  }

  notebook.activeCellIndex = configIndex;
  NotebookActions.insertBelow(notebook);
  const runner = notebook.activeCell as any;
  setCellSource(runner, source);
  setRunnerMetadata(runner, language, name);
  setCellLanguage(runner, "python");
  return notebook.activeCellIndex;
}

function findAdjacentRunnerCell(cells: any[], configIndex: number, name: string): number {
  const nextIndex = configIndex + 1;
  if (nextIndex >= cells.length) {
    return -1;
  }
  const value = readCellMetadata(cells[nextIndex])[RUNNER_METADATA_KEY];
  if (value && typeof value === "object" && (value as { name?: unknown }).name === name) {
    return nextIndex;
  }
  return -1;
}

function removeGeneratedDeclarationCells(notebook: any): boolean {
  let changed = false;
  for (let index = notebook.widgets.length - 1; index >= 0; index -= 1) {
    const metadata = readCellMetadata(notebook.widgets[index]);
    const tags = Array.isArray(metadata.tags) ? metadata.tags : [];
    if (metadata[DECLARATION_METADATA_KEY] === true || tags.includes(DECLARATION_TAG)) {
      notebook.activeCellIndex = index;
      NotebookActions.deleteCells(notebook);
      changed = true;
    }
  }
  return changed;
}

async function chooseLanguage(): Promise<ConfigCellLanguage | undefined> {
  const result = await showDialog({
    title: "Set Config Cell Type",
    body: "Choose a config language.",
    buttons: [
      Dialog.cancelButton(),
      Dialog.okButton({ label: "YAML" }),
      Dialog.okButton({ label: "JSONC" }),
      Dialog.okButton({ label: "TOML" }),
      Dialog.okButton({ label: "ENV" })
    ]
  });
  switch (result.button.label) {
    case "YAML":
      return "yaml";
    case "JSONC":
      return "jsonc";
    case "TOML":
      return "toml";
    case "ENV":
      return "dotenv";
    default:
      return undefined;
  }
}

function getNotebook(panel: NotebookPanel | null) {
  if (!panel) {
    throw new Error("Open a notebook before using Jupyter Config Cells.");
  }
  return panel.content;
}

function getCellSource(cell: any): string {
  const sharedModel = cell?.model?.sharedModel;
  if (typeof sharedModel?.getSource === "function") {
    return sharedModel.getSource();
  }
  if (typeof cell?.model?.toJSON === "function") {
    const value = cell.model.toJSON();
    if (typeof value?.source === "string") {
      return value.source;
    }
    if (Array.isArray(value?.source)) {
      return value.source.join("");
    }
  }
  return String(sharedModel?.source || cell?.model?.value?.text || "");
}

function setCellSource(cell: any, source: string) {
  const sharedModel = cell?.model?.sharedModel;
  if (typeof sharedModel?.setSource === "function") {
    sharedModel.setSource(source);
  } else if (sharedModel) {
    sharedModel.source = source;
  } else if (cell?.model?.value) {
    cell.model.value.text = source;
  }
}

function readCellMetadata(cell: any): { [key: string]: unknown } {
  const sharedModel = cell?.model?.sharedModel;
  if (typeof sharedModel?.getMetadata === "function") {
    return { ...(sharedModel.getMetadata() || {}) };
  }
  const metadata = cell?.model?.metadata;
  if (typeof metadata?.toJSON === "function") {
    return metadata.toJSON();
  }
  return { ...(metadata || {}) };
}

function setCellMetadata(cell: any, key: string, value: unknown) {
  const sharedModel = cell?.model?.sharedModel;
  if (typeof sharedModel?.setMetadata === "function") {
    sharedModel.setMetadata(key, value);
    return;
  }
  const metadata = cell?.model?.metadata;
  if (typeof metadata?.set === "function") {
    metadata.set(key, value);
    return;
  }
  if (metadata) {
    metadata[key] = value;
  }
}

function setConfigMetadata(cell: any, metadata: ReturnType<typeof createConfigCellMetadata>) {
  setCellMetadata(cell, "language", metadata.language);
  setCellMetadata(cell, "configCell", metadata);
  setCellMetadata(cell, "vscode", {
    ...(readCellMetadata(cell).vscode as Record<string, unknown> | undefined),
    languageId: metadata.language
  });
}

function setRunnerMetadata(
  cell: any,
  language: ConfigCellLanguage,
  name: string
) {
  const existing = readCellMetadata(cell);
  const tags = Array.isArray(existing.tags) ? existing.tags : [];
  setCellMetadata(cell, RUNNER_METADATA_KEY, { version: 1, name, language });
  setCellMetadata(cell, "tags", tags.includes(RUNNER_TAG) ? tags : [...tags, RUNNER_TAG]);
  setCellMetadata(cell, "jupyter", {
    ...(typeof existing.jupyter === "object" ? existing.jupyter : {}),
    source_hidden: true,
    outputs_hidden: false
  });
  setCellMetadata(cell, "vscode", {
    ...(typeof existing.vscode === "object" ? existing.vscode : {}),
    languageId: "python"
  });
}

function setCellLanguage(cell: any, language: ConfigCellLanguage | "python") {
  const mime = mimeTypeFor(language);
  if (cell?.model) {
    cell.model.mimeType = mime;
  }
  if (cell?.editor?.model) {
    cell.editor.model.mimeType = mime;
  }
  setCellMetadata(cell, "language", language);
}

function mimeTypeFor(language: ConfigCellLanguage | "python"): string {
  switch (language) {
    case "python":
      return "text/x-python";
    case "yaml":
      return "text/x-yaml";
    case "json":
    case "jsonc":
      return "application/json";
    case "toml":
      return "text/x-toml";
    case "dotenv":
      return "text/plain";
  }
}

function debounce(callback: () => void, delay: number): () => void {
  let timer: number | undefined;
  return () => {
    if (timer) {
      window.clearTimeout(timer);
    }
    timer = window.setTimeout(callback, delay);
  };
}

function showError(error: unknown) {
  void showDialog({
    title: "Jupyter Config Cells",
    body: error instanceof Error ? error.message : String(error),
    buttons: [Dialog.okButton()]
  });
}

export default extension;
