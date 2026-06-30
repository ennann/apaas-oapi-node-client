# Field Schema Rules

Use this reference before `client.schema.create` or `client.schema.update` field changes.

- Verified source in this repo: `src/FIELD_SCHEMA_RULES.md`
- Machine-readable source: `src/field-schema-rules.ts`
- Verification date in source: `2026-02-10`

## Metadata To Create Type Mapping

| Metadata Type | Create Type | Notes |
| --- | --- | --- |
| `text` | `text` | Single-line text, commonly `max_length=255`. |
| `text_multiline` | `text` | Use `multiline=true`, commonly `max_length=100000`. |
| `bigint` | `bigint` | Same type name. |
| `number` | `float` | `number` create type fails. |
| `date` | `date` | Same type name. |
| `datetime` | `datetime` | Same type name. |
| `option` | `enum` | `option` create type fails. |
| `boolean` | `boolean` | Same type name. |
| `lookup` | `lookup` | Single value, `multiple=false`. |
| `lookup_multi` | `lookup` | Multi value, `multiple=true`. |
| `referenceField` | `reference_field` | Depends on a single-value lookup field. |
| `file` | `attachment` | `file` create type fails. |
| `autoId` | `auto_number` | `autoId` create type fails. |
| `richText` | `richText` | Same type name. |
| `mobileNumber` | `phone` | `mobileNumber` create type fails. |
| `avatarOrLogo` | `avatar` | `avatarOrLogo` create type fails. |
| `email` | `email` | Same type name. |
| `region` | `region` | Same type name. |
| `decimal` | `decimal` | Same type name. |
| `multilingual` | `multilingual` | Same type name. |

## Dependency Rules

- Create target objects before lookup fields that reference them.
- Create `lookup` or `lookup_multi` before `reference_field`.
- Use only a single-value `lookup` as `reference_field.current_lookup_field_api_name`.
- Do not use `lookup_multi` as the guide field for `reference_field`.
- Remove `reference_field` before removing its lookup field.

## Batch Update Rules

- `add`: use `operator: "add"` and send the full field definition.
- `replace`: use `operator: "replace"` and send full `type.name` plus `type.settings`.
- `remove`: use `operator: "remove"` and send only `api_name`.
- Label-only replace without `type` fails with `k_ec_000015 field type is required`.

## Option Colors

Allowed option colors:

- `blue`
- `cyan`
- `green`
- `yellow`
- `orange`
- `red`
- `magenta`
- `purple`
- `blueMagenta`
- `grey`

## Minimal Lookup Example

```ts
{
  operator: "add",
  api_name: "owner",
  label: { zh_cn: "负责人", en_us: "Owner" },
  type: {
    name: "lookup",
    settings: {
      objectAPIName: "_user",
      multiple: false
    }
  },
  encrypt_type: "none"
}
```

## Minimal Reference Field Example

```ts
{
  operator: "add",
  api_name: "owner_lark_id",
  label: { zh_cn: "负责人飞书 ID", en_us: "Owner Lark ID" },
  type: {
    name: "reference_field",
    settings: {
      current_lookup_field_api_name: "owner",
      target_reference_field_api_name: "_lark_user_id"
    }
  },
  encrypt_type: "none"
}
```
