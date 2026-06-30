---
name: apaas-schema
description: "Use for aPaaS Node SDK schema management: creating objects, updating object labels/settings, adding/replacing/removing fields, deleting objects, field type mapping, lookup/reference field dependencies, and schema change safety checks."
---

# aPaaS Schema

Use this skill for `client.schema.*`.

## Required References

- Before creating or updating fields, read `references/field-schema-rules.md`. It contains the verified metadata-to-create type mapping and option color rules.
- For whole-app object maintenance, SQL/ER conversion, multi-object dependencies, or delete/rebuild workflows, read `references/schema-maintenance-sop.md`.

## Workflow

1. Use `apaas-shared` to initialize the client.
2. Read current objects with `client.object.listWithIterator()`.
3. Read existing fields with `client.object.metadata.fields({ object_name })`.
4. For new objects, create shells first, then add fields with `schema.update`.
5. For dependency fields, create base fields first, then lookup fields, then reference fields.
6. Check request-level, silent-failure, and item-level response status.
7. After the call, re-read metadata to verify the effective schema.

## Create Object

Create objects as shells first. Do not rely on `schema.create({ fields })` to create fields.

```ts
await client.schema.create({
  objects: [{
    api_name: "product",
    label: { zh_cn: "产品", en_us: "Product" },
    settings: {
      display_name: "_id",
      allow_search_fields: ["_id"],
      search_layout: []
    }
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
