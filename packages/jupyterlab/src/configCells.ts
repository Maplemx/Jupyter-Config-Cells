import { isMap, isSeq, parseDocument } from "yaml";

export type ConfigCellLanguage = "yaml" | "json" | "jsonc" | "toml" | "dotenv";

export interface ConfigCellMetadata {
  version: 1;
  name: string;
  language: ConfigCellLanguage;
  schema?: string;
  exportPath?: string;
  autoValidate?: boolean;
}

export interface RunnableConfigCell {
  name: string;
  language: ConfigCellLanguage;
  body: string;
}

const TARGET_MARKER_RE = /^\s*(#|\/\/)\s*to:\s*([A-Za-z_][A-Za-z0-9_]*)\s*$/;

export function createConfigCellMetadata(
  language: ConfigCellLanguage,
  name?: string
): ConfigCellMetadata {
  const configName = name || defaultNameForLanguage(language);
  return {
    version: 1,
    name: configName,
    language,
    exportPath: defaultExportPath(language, configName)
  };
}

export function readConfigCellMetadata(metadata: { [key: string]: unknown }): ConfigCellMetadata | undefined {
  const value = metadata.configCell;
  if (!value || typeof value !== "object") {
    return undefined;
  }
  return value as ConfigCellMetadata;
}

export function defaultNameForLanguage(language: ConfigCellLanguage): string {
  switch (language) {
    case "yaml":
      return "model_settings";
    case "json":
    case "jsonc":
      return "request_payload";
    case "toml":
      return "app_settings";
    case "dotenv":
      return "local_env";
  }
}

export function markerFor(language: ConfigCellLanguage, name: string): string | undefined {
  if (language === "json") {
    return undefined;
  }
  const prefix = language === "jsonc" ? "//" : "#";
  return `${prefix} to: ${name}`;
}

export function hasConfigTargetMarker(source: string): boolean {
  return /^\s*(#|\/\/)\s*to:\s*[A-Za-z_][A-Za-z0-9_]*\s*$/m.test(source);
}

export function sourceWithMarker(source: string, language: ConfigCellLanguage, name: string): string {
  if (hasConfigTargetMarker(source)) {
    return source;
  }
  const marker = markerFor(language, name);
  if (!marker) {
    return source;
  }
  const separator = source.startsWith("\n") || source.length === 0 ? "" : "\n";
  return `${marker}${separator}${source}`;
}

export function templateFor(language: ConfigCellLanguage): string {
  switch (language) {
    case "yaml":
      return `${markerFor("yaml", "model_settings")}\nmodel:\n  provider: deepseek\n  name: deepseek-chat\n  temperature: 0.2\n`;
    case "json":
      return '{\n  "stream": true,\n  "messages": []\n}\n';
    case "jsonc":
      return `${markerFor("jsonc", "request_payload")}\n{\n  "stream": true,\n  "messages": []\n}\n`;
    case "toml":
      return `${markerFor("toml", "app_settings")}\n[server]\nhost = "127.0.0.1"\nport = 8000\n`;
    case "dotenv":
      return `${markerFor("dotenv", "local_env")}\nMODEL_NAME=deepseek-chat\n`;
  }
}

export function detectConfigLanguage(source: string): ConfigCellLanguage | undefined {
  const text = source.trim();
  if (!text || text.startsWith("%%")) {
    return undefined;
  }

  const marked = detectMarkedConfigLanguage(text);
  if (marked) {
    return marked;
  }
  if (looksLikeJson(text)) {
    return "jsonc";
  }
  if (looksLikeDotenv(text)) {
    return "dotenv";
  }
  if (looksLikeToml(text)) {
    return "toml";
  }
  if (looksLikeYaml(text)) {
    return "yaml";
  }
  return undefined;
}

export function parseRunnableConfigCell(source: string): RunnableConfigCell | undefined {
  const lines = source.split(/\r?\n/);
  let markerIndex = -1;
  let marker: RegExpMatchArray | null = null;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.trim()) {
      continue;
    }
    marker = line.match(TARGET_MARKER_RE);
    if (!marker) {
      return undefined;
    }
    markerIndex = index;
    break;
  }
  if (markerIndex < 0 || !marker) {
    return undefined;
  }
  const body = lines.filter((_, index) => index !== markerIndex).join("\n");
  return {
    name: marker[2],
    language: marker[1] === "//" ? "jsonc" : inferHashMarkerLanguage(body),
    body
  };
}

export function formatConfigSource(language: ConfigCellLanguage, source: string): string {
  switch (language) {
    case "yaml": return formatYaml(source);
    case "json": return formatJson(source);
    case "jsonc": return formatJsonc(source);
    case "toml": return formatToml(source);
    case "dotenv": return formatDotenv(source);
  }
}

export function validateSyntax(language: ConfigCellLanguage, source: string): string[] {
  try {
    parseConfigValue(language, source);
    return [];
  } catch (error) {
    return [error instanceof Error ? error.message : String(error)];
  }
}

export function parseConfigValue(language: ConfigCellLanguage, source: string): unknown {
  if (language === "yaml") {
    const document = parseDocument(source);
    if (document.errors.length > 0) {
      throw document.errors[0];
    }
    return document.toJSON();
  }
  if (language === "json" || language === "jsonc") {
    return JSON.parse(language === "jsonc" ? stripJsoncComments(source) : source);
  }
  if (language === "dotenv") {
    return parseDotenv(source);
  }
  return parseToml(source);
}

export function buildPythonRunnerSource(
  language: ConfigCellLanguage,
  name: string,
  source: string
): string {
  const value = parseConfigValue(language, source);
  const valueJson = JSON.stringify(value, null, 2);
  return [
    "# Generated by Jupyter Config Cells. Edit the config cell above instead.",
    "import json as _json",
    "",
    `_config_source = ${pythonTripleQuotedString(source)}.strip("\\n")`,
    "",
    `${name} = _json.loads(${pythonTripleQuotedString(valueJson)})`,
    "",
    `print(f"${name}={${name}!r}")`
  ].join("\n");
}

export function stripJsoncComments(text: string): string {
  let result = "";
  let inString = false;
  let escaped = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (inLineComment) {
      if (char === "\n" || char === "\r") {
        inLineComment = false;
        result += char;
      }
      continue;
    }

    if (inBlockComment) {
      if (char === "*" && next === "/") {
        inBlockComment = false;
        index += 1;
      }
      continue;
    }

    if (inString) {
      result += char;
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === "\"") {
        inString = false;
      }
      continue;
    }

    if (char === "\"") {
      inString = true;
      result += char;
      continue;
    }

    if (char === "/" && next === "/") {
      inLineComment = true;
      index += 1;
      continue;
    }

    if (char === "/" && next === "*") {
      inBlockComment = true;
      index += 1;
      continue;
    }

    result += char;
  }

  return result;
}

function defaultExportPath(language: ConfigCellLanguage, name: string): string {
  const extension = language === "dotenv" ? "env" : language;
  return `./configs/${name}.${extension}`;
}

function detectMarkedConfigLanguage(text: string): ConfigCellLanguage | undefined {
  const lines = text.split(/\r?\n/);
  const firstContentIndex = lines.findIndex((line) => line.trim().length > 0);
  if (firstContentIndex < 0) {
    return undefined;
  }
  const firstContent = lines[firstContentIndex].trim();
  if (/^\/\/\s*to:\s*[A-Za-z_][A-Za-z0-9_]*\s*$/.test(firstContent)) {
    return "jsonc";
  }
  if (!/^#\s*to:\s*[A-Za-z_][A-Za-z0-9_]*\s*$/.test(firstContent)) {
    return undefined;
  }

  const body = lines.filter((_, index) => index !== firstContentIndex).join("\n").trim();
  if (!body) {
    return "yaml";
  }
  if (looksLikeDotenv(body)) {
    return "dotenv";
  }
  if (looksLikeToml(body)) {
    return "toml";
  }
  return "yaml";
}

function inferHashMarkerLanguage(source: string): ConfigCellLanguage {
  const detected = detectConfigLanguage(source);
  if (detected === "json" || detected === "jsonc") {
    return "jsonc";
  }
  return detected || "yaml";
}

function looksLikeJson(text: string): boolean {
  if (!text.startsWith("{") && !text.startsWith("[")) {
    return false;
  }
  try {
    JSON.parse(stripJsoncComments(text));
    return true;
  } catch {
    return false;
  }
}

function looksLikeDotenv(text: string): boolean {
  const meaningfulLines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
  return (
    meaningfulLines.length > 0 &&
    meaningfulLines.every((line) => /^(export\s+)?[A-Z_][A-Z0-9_]*\s*=/.test(line))
  );
}

function looksLikeToml(text: string): boolean {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
  // Unambiguous Python syntax: decorators, async/def/class, return type arrows,
  // triple-quoted strings, import statements. None of these appear in TOML.
  const pythonPattern = /^(?:@|async\s|def\s|class\s|import\s|from\s|return\b|raise\b|yield\b|""")/;
  if (lines.some((line) => pythonPattern.test(line) || line.includes(" -> "))) {
    return false;
  }
  // Value must be a TOML literal: quoted string, number, lowercase boolean, date, array, or
  // inline table. This excludes Python assignments whose values are function calls, Python
  // keywords (True/False/None), or arbitrary expressions.
  const tomlKvPattern = /^[A-Za-z0-9_.-]+\s=\s(?:"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|true|false|\d{4}-\d{2}-\d{2}|\[|\{)/;
  return (
    lines.some((line) => /^\[[A-Za-z0-9_.-]+\]$/.test(line)) ||
    lines.some((line) => tomlKvPattern.test(line))
  );
}

function looksLikeYaml(text: string): boolean {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.trim() && !line.trim().startsWith("#"));
  if (lines.length === 0) {
    return false;
  }

  const hasYamlKey = lines.some((line) =>
    /^\s*["']?[A-Za-z_][A-Za-z0-9_.-]*["']?\s*:\s*($|[^=])/.test(line)
  );
  const hasYamlListItem = lines.some((line) => /^\s*-\s+\S/.test(line));
  if (!hasYamlKey && !hasYamlListItem) {
    return false;
  }

  try {
    const document = parseDocument(text);
    if (document.errors.length > 0 || !document.contents) {
      return false;
    }
    return isMap(document.contents) || isSeq(document.contents);
  } catch {
    return false;
  }
}

function parseDotenv(source: string): Record<string, string> {
  const value: Record<string, string> = {};
  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }
    const normalized = line.startsWith("export ") ? line.slice("export ".length).trimStart() : line;
    const equalsIndex = normalized.indexOf("=");
    if (equalsIndex < 0) {
      throw new Error(`Expected KEY=VALUE, got: ${rawLine}`);
    }
    const key = normalized.slice(0, equalsIndex).trim();
    const rawValue = normalized.slice(equalsIndex + 1).trim();
    value[key] = unquoteEnvValue(rawValue);
  }
  return value;
}

function unquoteEnvValue(value: string): string {
  if (
    (value.startsWith("\"") && value.endsWith("\"")) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function parseToml(source: string): Record<string, unknown> {
  const root: Record<string, unknown> = {};
  let target = root;
  for (const rawLine of source.split(/\r?\n/)) {
    const line = stripTomlComment(rawLine).trim();
    if (!line) {
      continue;
    }
    const section = line.match(/^\[([A-Za-z0-9_.-]+)\]$/);
    if (section) {
      target = ensureTomlSection(root, section[1]);
      continue;
    }
    const match = line.match(/^([A-Za-z0-9_.-]+)\s*=\s*(.*)$/);
    if (!match) {
      throw new Error(`Unsupported TOML line: ${rawLine}`);
    }
    target[match[1]] = parseTomlScalar(match[2].trim());
  }
  return root;
}

function ensureTomlSection(root: Record<string, unknown>, path: string): Record<string, unknown> {
  let current = root;
  for (const part of path.split(".")) {
    const existing = current[part];
    if (!existing || typeof existing !== "object" || Array.isArray(existing)) {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  }
  return current;
}

function parseTomlScalar(value: string): unknown {
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  if (/^[+-]?\d+$/.test(value)) {
    return Number.parseInt(value, 10);
  }
  if (/^[+-]?\d+\.\d+$/.test(value)) {
    return Number.parseFloat(value);
  }
  if (value.startsWith("\"") || value.startsWith("'") || value.startsWith("[")) {
    return JSON.parse(value.replace(/'/g, "\""));
  }
  return value;
}

function stripTomlComment(line: string): string {
  let inString = false;
  let quote = "";
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (!inString && (char === "\"" || char === "'")) {
      inString = true;
      quote = char;
      continue;
    }
    if (inString && char === quote) {
      inString = false;
      quote = "";
      continue;
    }
    if (!inString && char === "#") {
      return line.slice(0, index);
    }
  }
  return line;
}

function pythonTripleQuotedString(value: string): string {
  const normalized = value.replace(/\r\n/g, "\n");
  if (!normalized.includes('"""')) {
    return `r"""\n${normalized}\n"""`;
  }
  if (!normalized.includes("'''")) {
    return `r'''\n${normalized}\n'''`;
  }
  return JSON.stringify(normalized);
}

function formatYaml(source: string): string {
  const doc = parseDocument(source);
  return String(doc);
}

function formatJson(source: string): string {
  return JSON.stringify(JSON.parse(source), null, 2);
}

function formatJsonc(source: string): string {
  const noTrailingCommas = source.replace(/,(\s*(?:\/\/[^\n]*\s*)*)([\]}])/g, "$1$2");
  const lines = noTrailingCommas.split(/\r?\n/);
  let depth = 0;
  const output: string[] = [];
  for (const raw of lines) {
    const trimmed = raw.trim();
    if (!trimmed) {
      output.push("");
      continue;
    }
    const startsWithClose = /^[}\]]/.test(trimmed);
    if (startsWithClose) {
      depth = Math.max(0, depth - 1);
    }
    output.push("  ".repeat(depth) + trimmed);
    let opens = 0, closes = 0, inString = false, escape = false;
    for (let i = 0; i < trimmed.length; i++) {
      const ch = trimmed[i];
      if (escape) { escape = false; continue; }
      if (ch === "\\" && inString) { escape = true; continue; }
      if (ch === "\"") { inString = !inString; continue; }
      if (inString) continue;
      if (ch === "/" && trimmed[i + 1] === "/") break;
      if (ch === "{" || ch === "[") opens++;
      else if (ch === "}" || ch === "]") closes++;
    }
    depth = Math.max(0, depth + opens - closes + (startsWithClose ? 1 : 0));
  }
  return output.join("\n");
}

function formatToml(source: string): string {
  return source
    .split(/\r?\n/)
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || /^\[/.test(trimmed)) return trimmed;
      return trimmed.replace(/^([A-Za-z0-9_.-]+)\s*=\s*/, "$1 = ");
    })
    .join("\n");
}

function formatDotenv(source: string): string {
  return source
    .split(/\r?\n/)
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return trimmed;
      const match = trimmed.match(/^((?:export\s+)?[A-Z_][A-Z0-9_]*)\s*=\s*(.*)/);
      return match ? `${match[1]}=${match[2]}` : trimmed;
    })
    .join("\n");
}
