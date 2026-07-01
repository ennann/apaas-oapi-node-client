---
name: apaas-shared
description: "Use for aPaaS Node SDK shared setup and safety rules: client initialization, credentials, namespace, token cache, logger level, OpenAPI coverage, pagination defaults, retry expectations, write/delete confirmation, and error-code triage before using module-specific apaas skills."
---

# aPaaS Shared

Use this skill before module-specific aPaaS SDK work.

## Baseline

- Use the Node SDK package `apaas-oapi-client`.
- Initialize one `apaas.Client` per namespace.
- Keep `clientId`, `clientSecret`, access tokens, and app secrets out of logs and final answers.
- Prefer `client.setLoggerLevel(3)` for normal work, `4` for debugging, and `5` only when inspecting non-sensitive payloads.
- Treat SDK responses with `code !== "0"` as failed even if the HTTP call succeeded.
- Read [references/openapi-coverage.md](references/openapi-coverage.md) when checking whether an API doc endpoint is already wrapped.
- Read [references/openapi-error-codes.md](references/openapi-error-codes.md) when triaging non-zero response codes.

```ts
import { apaas } from "apaas-oapi-client";

const client = new apaas.Client({
  clientId: process.env.APAAS_CLIENT_ID!,
  clientSecret: process.env.APAAS_CLIENT_SECRET!,
  namespace: process.env.APAAS_NAMESPACE!
});

await client.init();
client.setLoggerLevel(3);
```

## Safety Rules

- Read real metadata before writing records, fields, flows, or pages.
- Confirm user intent before destructive calls: record delete, batch delete, schema delete, field remove, attachment delete.
- For batch operations, inspect `failed`, `failedCount`, or per-item success fields before reporting completion.
- For full-table answers, use iterator methods and verify pagination is exhausted; a single page is only a sample.
- Do not write system fields, readonly fields, formula outputs, lookup outputs, or reference field outputs as ordinary record values.

## Module Routing

- Object metadata and record CRUD: use `apaas-object`.
- OQL, cross-object search, constant objects, and datasets: use `apaas-object`.
- Object schema and field structure changes: use `apaas-object-schema`.
- Cloud functions, automation flows, workflow status, user tasks, and Lark integration tokens: use `apaas-function-flow`.
- Builder page metadata and links: use `apaas-builder`.
- Global options and variables: use `apaas-global`.
- User/department Feishu/Lark ID exchange: use `apaas-lark-id-exchange`.
- File and avatar upload/download/delete: use `apaas-attachment`.

## Error Triage

| Symptom | First action |
| --- | --- |
| Permission or scope error | Verify app permissions and namespace; do not retry blindly. |
| Field value type mismatch | Re-read `client.object.metadata.fields({ object_name })`. |
| Missing field/object | Re-read object list or metadata; use API names from returned data. |
| Batch partially failed | Report failed items and retry only failed IDs/records when safe. |
| Rate limit or transient 5xx | Use SDK iterator/batch helpers and retry only idempotent reads or confirmed-safe writes. |
