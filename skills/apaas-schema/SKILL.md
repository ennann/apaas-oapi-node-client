---
name: apaas-schema
description: "Use for aPaaS Node SDK schema management: creating objects, updating object labels/settings, adding/replacing/removing fields, deleting objects, field type mapping, lookup/reference field dependencies, and schema change safety checks."
---

# aPaaS Schema

Use this skill for `client.schema.*`.

## Required Reference

Before creating or updating fields, read `references/field-schema-rules.md`. It contains the verified metadata-to-create type mapping and dependency order.

## Workflow

1. Use `apaas-shared` to initialize the client.
2. Read current objects with `client.object.listWithIterator()`.
3. Read existing fields with `client.object.metadata.fields({ object_name })`.
4. Build the smallest schema payload that matches the requested change.
5. For dependency fields, create target objects first, then lookup fields, then reference fields.
6. After the call, re-read metadata to verify the effective schema.

## Create Object

```ts
await client.schema.create({
  objects: [{
    api_name: "product",
    label: { zh_cn: "产品", en_us: "Product" },
    settings: {
      display_name: "name",
      allow_search_fields: ["_id", "code", "name"],
      search_layout: ["code", "name"]
    },
    fields: [{
      api_name: "code",
      label: { zh_cn: "产品编号", en_us: "Product Code" },
      type: {
        name: "text",
        settings: { required: true, unique: true, max_length: 50 }
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
await client.schema.update({
  objects: [{
    api_name: "product",
    fields: [{
      operator: "add",
      api_name: "description",
      label: { zh_cn: "产品描述", en_us: "Description" },
      type: {
        name: "text",
        settings: { multiline: true, max_length: 100000 }
      },
      encrypt_type: "none"
    }]
  }]
});
```

## Delete Rules

- Confirm the object API names before `client.schema.delete`.
- Do not delete objects as a cleanup shortcut if records or references may still depend on them.
- Remove `reference_field` before removing its lookup field.
