# Metadata Schema

Config cells are standard Jupyter code cells with a `metadata.configCell` object.

```json
{
  "configCell": {
    "version": 1,
    "name": "model_settings",
    "language": "yaml",
    "schema": "./schemas/model_settings.schema.json",
    "exportPath": "./settings/model_settings.yaml",
    "autoValidate": true
  }
}
```

Required fields:

| Field | Type | Description |
| --- | --- | --- |
| `version` | number | Metadata schema version. |
| `name` | string | Config cell name. |
| `language` | string | `yaml`, `json`, `jsonc`, `toml`, or `dotenv`. |

Optional fields:

| Field | Type | Description |
| --- | --- | --- |
| `schema` | string | JSON Schema path. |
| `exportPath` | string | Export destination. |
| `autoValidate` | boolean | Whether validation should run automatically. |
