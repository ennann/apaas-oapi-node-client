---
name: apaas-object-schema
description: "Use for aPaaS Node SDK object schema management with client.object.schema.*: creating objects, updating object labels/settings, adding/replacing/removing fields, deleting objects, field type mapping, lookup/reference field dependencies, SQL/ER conversion, staged creation, and schema change safety checks. client.schema.* remains a compatibility alias."
---

# aPaaS Object Schema

## Overview

Use this skill for object structure edits through `client.object.schema.*`. `client.schema.*` remains a compatibility alias for older code.

## Required References

- Before creating or updating fields, read `references/field-schema-rules.md`. It contains the verified metadata-to-create type mapping and option color rules.
- For whole-app object maintenance, SQL/ER conversion, multi-object dependencies, or delete/rebuild workflows, read `references/schema-maintenance-sop.md`.

## Workflow

1. Use `apaas-shared` to initialize the client.
2. Read current objects with `client.object.listWithIterator()`.
3. Read existing fields with `client.object.metadata.fields({ object_name })`.
4. Prefer `client.object.schema.createWithStages()` for new objects with fields.
5. Use `client.object.schema.addFieldsIdempotent()` when adding fields to an existing object.
6. Check raw object schema write responses with `client.object.schema.checkResponse()`.
7. After the call, use `client.object.schema.verifyObjects()` to verify the effective structure.

## Create Object

Create objects through the SDK staging helper when fields are involved. It creates shells first, then base fields, then lookup fields, then reference fields, then final settings.

```ts
await client.object.schema.createWithStages({
  objects: [{
    api_name: "product",
    label: { zh_cn: "产品", en_us: "Product" },
    settings: {
      display_name: "name",
      allow_search_fields: ["_id", "name"],
      search_layout: []
    },
    fields: [{
      operator: "add",
      api_name: "name",
      label: { zh_cn: "产品名称", en_us: "Name" },
      type: {
        name: "text",
        settings: {
          required: true,
          unique: false,
          case_sensitive: false,
          multiline: false,
          max_length: 100
        }
      },
      encrypt_type: "none"
    }]
  }]
});
```

## Update Object Or Fields

- Add field: `operator: "add"` and full field definition.
- Replace field: `operator: "replace"` and full `type.name + type.settings`.
- Remove field: `operator: "remove"` and `api_name` only.
- Update label/settings without field changes by omitting `fields`.

```ts
await client.object.schema.addFieldsIdempotent({
  object_name: "product",
  fields: [{
    operator: "add",
    api_name: "description",
    label: { zh_cn: "产品描述", en_us: "Description" },
    type: {
      name: "text",
      settings: {
        required: false,
        unique: false,
        case_sensitive: false,
        multiline: true,
        max_length: 100000
      }
    },
    encrypt_type: "none"
  }]
});
```

## Delete Rules

- Confirm the object API names before `client.object.schema.delete`.
- Do not delete objects as a cleanup shortcut if records or references may still depend on them.
- Remove `reference_field` before removing its lookup field.
- For environment rebuilds, use `client.object.schema.deleteAllCustomObjects({ confirm: true })`.
