# Field Schema Rules (20 Entries)

This file summarizes the verified schema rules for field types in aPaaS.

- Verification date: `2026-02-10`
- Namespace: `package_5dc5b7__c`
- Source object for metadata: `full_field_format`
- Lookup target used in tests: `_user`
- Reference field target used in tests: `_lark_user_id`

## Why this file exists

`object.metadata.fields` returns type names that are not always accepted by `schema.create/schema.update`.
Use this mapping when creating fields.

- Includes `18` official metadata field types
- Plus `2` practical rule extensions:
  - `text_multiline`
  - `lookup_multi`

## Type Mapping (metadata -> create)

| Metadata Type | Create Type | Notes |
| --- | --- | --- |
| `text` | `text` | single-line text, `max_length=255` |
| `text_multiline` | `text` | multiline text, `multiline=true`, `max_length=100000` |
| `bigint` | `bigint` | same |
| `number` | `float` | `number` create type fails |
| `date` | `date` | same |
| `datetime` | `datetime` | same |
| `option` | `enum` | `option` create type fails |
| `boolean` | `boolean` | same |
| `lookup` | `lookup` | single value (`multiple=false`) |
| `lookup_multi` | `lookup` | multi value (`multiple=true`) |
| `referenceField` | `reference_field` | depends on lookup field |
| `file` | `attachment` | `file` create type fails |
| `autoId` | `auto_number` | `autoId` create type fails |
| `richText` | `richText` | same |
| `mobileNumber` | `phone` | `mobileNumber` create type fails |
| `avatarOrLogo` | `avatar` | `avatarOrLogo` create type fails |
| `email` | `email` | same |
| `region` | `region` | same |
| `decimal` | `decimal` | same |
| `multilingual` | `multilingual` | same |

## Dependency rules

- `lookup` needs target object to exist first. In tests, target object is `_user`.
- `lookup_multi` can reference multiple rows (`multiple=true`), but **cannot** be used as guide field for `reference_field`.
- `reference_field` needs:
  - a **single-value** lookup field in the same object (`current_lookup_field_api_name`)
  - a target field in target object (`target_reference_field_api_name`, tested with `_lark_user_id`)

## Option color list

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

## Batch update (`batch_update`) rules

- `add`: use `operator: "add"` and send full field definition.
- `replace`: use `operator: "replace"` and send full `type` (`name + settings`).
  - Label-only replace (without `type`) fails with: `k_ec_000015 field type is required`.
- `remove`: use `operator: "remove"` and only `api_name`.
- Order constraints:
  - add phase: create `lookup`/`lookup_multi` before `reference_field`
  - remove phase: remove `reference_field` before `lookup`/`lookup_multi`

## Canonical machine-readable source

Use `/Users/Ethan/apaas/apaas-sdk/node-client/src/field-schema-rules.ts` as the source of truth for code.
