const assert = require("node:assert/strict");
const core = require("../lib/configCells");

runCoreRegressionTests(core);

function runCoreRegressionTests({
  buildPythonRunnerSource,
  createConfigCellMetadata,
  detectConfigLanguage,
  parseConfigValue,
  parseRunnableConfigCell,
  sourceWithMarker,
  validateSyntax
}) {
  const yaml = `# to: test_settings
test_dict:
    test_key_1: testing
    test_key_2: 123
    test_key_3:
        - abc
        - 456
test_list:
    - 13
    - 13
    - ltt
    - 677
    - ok: true
      msg: It works.
`;

  assert.equal(detectConfigLanguage(yaml), "yaml");
  const parsedYaml = parseRunnableConfigCell(yaml);
  assert.deepEqual(
    { name: parsedYaml.name, language: parsedYaml.language },
    { name: "test_settings", language: "yaml" }
  );
  assert.deepEqual(parseConfigValue(parsedYaml.language, parsedYaml.body), {
    test_dict: {
      test_key_1: "testing",
      test_key_2: 123,
      test_key_3: ["abc", 456]
    },
    test_list: [13, 13, "ltt", 677, { ok: true, msg: "It works." }]
  });

  const jsonc = `// to: request_payload
{
  // comment
  "ok": true,
  "url": "https://example.com/a//b"
}
`;
  assert.equal(detectConfigLanguage(jsonc), "jsonc");
  const parsedJsonc = parseRunnableConfigCell(jsonc);
  assert.deepEqual(parseConfigValue(parsedJsonc.language, parsedJsonc.body), {
    ok: true,
    url: "https://example.com/a//b"
  });

  assert.equal(
    sourceWithMarker("model:\n  name: test\n", "yaml", "model_settings"),
    "# to: model_settings\nmodel:\n  name: test\n"
  );
  assert.deepEqual(createConfigCellMetadata("toml", "app_settings"), {
    version: 1,
    name: "app_settings",
    language: "toml",
    exportPath: "./configs/app_settings.toml"
  });

  const runner = buildPythonRunnerSource(parsedYaml.language, parsedYaml.name, parsedYaml.body);
  assert.match(runner, /import json as _json/);
  assert.match(runner, /print\(f"test_settings=\{test_settings!r\}"\)/);
  assert.doesNotMatch(runner, /jupyter_config_cells|%load_ext|yaml|toml/);

  assert.deepEqual(validateSyntax("jsonc", parsedJsonc.body), []);
  assert.ok(validateSyntax("jsonc", "{ bad").length > 0);
}

console.log("core regression tests passed");
