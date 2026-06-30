# Schema Maintenance SOP

Use this reference for whole-application object maintenance: reading object structure, creating objects, editing fields, deleting fields, deleting objects, converting SQL/ER designs, and managing lookup/reference dependencies.

## Non-Negotiable Rules

- Read live object metadata before writing.
- Do not modify or delete system objects `_user` and `_department`.
- Do not create, replace, or remove fields whose API name starts with `_`.
- Treat `schema.create`, `schema.update`, and `schema.delete` as high-risk writes.
- Batch `schema.create/update/delete` calls by at most 10 objects.
- After every write, re-read metadata and verify the expected object/field shape.

## Response Validation

Check three layers after every raw schema call with the SDK helper:

```ts
client.schema.checkResponse(result, "schema.update");
```

`code: "0"` with `data: null` is not success. It usually means a required setting is missing, for example `text.multiline` or `auto_number.generation_method`.

## Create Objects: Three Stages

Do not create a full object with raw `schema.create({ fields })`. Use `client.schema.createWithStages()` when fields are involved. It enforces this sequence even when there is no obvious dependency cycle.

1. Stage 1a: create object shells only.
2. Stage 1b: add base fields with `schema.update` and `operator: "add"`.
3. Stage 2: add `lookup` / `lookup_multi` fields after all target objects exist.
4. Stage 3: add `reference_field` after its single-value lookup exists.
5. Final: update `display_name`, `allow_search_fields`, and `search_layout` after fields exist.

```ts
await client.schema.createWithStages({
  objects: [{
    api_name: "customer",
    label: { zh_cn: "客户", en_us: "Customer" },
    settings: { display_name: "name", allow_search_fields: ["_id", "name"], search_layout: [] },
    fields: [{
      operator: "add",
      api_name: "name",
      label: { zh_cn: "客户名称", en_us: "Name" },
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

## Update Fields

- Add: send `operator: "add"` and the full field definition.
- Replace: send `operator: "replace"` and the full `type.name + type.settings`; label-only replace fails.
- Remove: send `operator: "remove"` and only `api_name`.
- Skip existing fields when rerunning idempotently.

```ts
await client.schema.addFieldsIdempotent({
  object_name: "customer",
  fields: fieldsToAdd
});
```

## Dependency Order

Add order:

1. Object shells
2. Base fields
3. `lookup` / `lookup_multi`
4. `reference_field`

Remove order:

1. `reference_field`
2. `lookup` / `lookup_multi`
3. Other custom fields
4. Custom objects

Never add a lookup and a reference field that depends on it in the same `schema.update` batch; execution order is not guaranteed.

## Delete All Custom Objects

Use the SDK helper for environment cleanup or model rebuilds:

```ts
await client.schema.deleteAllCustomObjects({
  confirm: true,
  removeOtherFields: true
});
```

The helper lists custom objects, reads fields, removes `referenceField`, then `lookup`, then optional other custom fields, deletes objects in batches of 10, and re-lists objects to verify deletion.

## SQL / ER To aPaaS Mapping

Map relational designs into aPaaS objects only after presenting a conversion table for user confirmation.

| SQL Concept | aPaaS Mapping |
| --- | --- |
| Table | Object |
| Primary key `id` | Ignore; aPaaS provides `_id` |
| `created_at` / `updated_at` audit columns | Usually ignore; aPaaS provides system fields |
| `VARCHAR(n)` / `CHAR(n)` | `text` with `max_length: n`, `multiline: false` |
| `TEXT` / long text | `text` with `multiline: true`, `max_length: 100000` |
| `INT` / `INTEGER` / `BIGINT` | `bigint` |
| `FLOAT` / `DOUBLE` | `float` |
| `DECIMAL(p,s)` | `decimal` with `decimal_places: s` |
| `DATE` | `date` |
| `DATETIME` / `TIMESTAMP` | `datetime` |
| `BOOLEAN` / `TINYINT(1)` | `boolean` |
| `ENUM(...)` | `enum` with `options` |
| Foreign key | `lookup` with `multiple: false` |
| Pure join table | Usually eliminate; use `lookup` with `multiple: true` on one side |
| Join table with business fields | Keep as an object with two lookup fields |

Semantic overrides:

- Column names containing `email` / `mail`: prefer `email`.
- Column names containing `phone` / `mobile` / `tel`: prefer `phone`.
- Column names containing `avatar` / `logo`: prefer `avatar`.
- Column names containing `region` / `province` / `city`: consider `region`, but ask before converting address text to region.

Unsupported SQL features:

- Stored procedures
- Triggers
- Views
- Composite primary keys
- Composite unique constraints
- CHECK constraints
- Partitioning

## Confirmation Table

Before creating from SQL/ER input, present a table like this and wait for confirmation:

| SQL Table | aPaaS Object | Treatment |
| --- | --- | --- |
| customer | customer | Create |
| customer_tag | - | Convert pure join table into multi lookup |

| Object | SQL Column | SQL Type | aPaaS Type | API Name | Notes |
| --- | --- | --- | --- | --- | --- |
| customer | id | INT PK | - | - | Ignored; use `_id` |
| customer | status | ENUM | enum | status | Confirm labels and colors |
| order | customer_id | FK | lookup | customer | Target object must exist first |
