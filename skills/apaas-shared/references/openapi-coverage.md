# OpenAPI Coverage

Source snapshot: API doc share for namespace `package_154107__c`, fetched on 2026-06-30. The left navigation contained 167 doc nodes and 72 unique current endpoints after normalizing namespace/object placeholders.

## Current SDK Coverage

| Doc area | Endpoints | SDK entry |
| --- | --- | --- |
| Auth | `POST /auth/v1/appToken` | `client.init()` / token cache |
| Page | list/detail/link | `client.page.list`, `client.page.detail`, `client.page.url` |
| Object metadata | object list, object metadata, field metadata | `client.object.list*`, `client.object.metadata.*` |
| Object records | get/list/create/update/delete/batch | `client.object.search/create/update/delete.*` |
| Object other APIs | OQL, cross-object search | `client.object.oql`, `client.object.search.recordsAcrossObjects*` |
| Object schema | batch create/update/delete objects | `client.object.schema.create/update/delete`, plus staged helpers / `apaas-object-schema`; `client.schema.*` remains a compatibility alias |
| Constant objects | `_currency`, `_country`, `_timeZone` records and metadata | `client.constant.records`, `record`, `metadata.*` |
| Dataset | dataset list | `client.dataset.list`, `client.dataset.listWithIterator` |
| Attachments | files and images | `client.attachment.file.*`, `client.attachment.avatar.*` / `apaas-attachment` |
| Global config | global options and variables | `client.global.options.*`, `client.global.variables.*` |
| Cloud function invocation | invoke configured cloud functions | `client.function.invoke` / `apaas-function-flow` |
| Workflow execution | async execution status, flow detail | `client.workflow.execution.status`, `client.workflow.definition.detail` |
| Workflow user tasks | task/instance list, detail, agree/reject/transfer/add assignee/cc/expedite/cancel/rollback/chat | `client.workflow.userTask.*` |
| Flow invocation | v1/v2 flow execute | `client.automation.v1.execute`, `client.automation.v2.execute` |
| Lark integration | default/custom app and tenant tokens | `client.integration.lark.*` |
| Feishu/Lark ID exchange | v2 user/department exchange | `client.user.*`, `client.department.*` / `apaas-lark-id-exchange` |

## Deprecated Docs

The doc tree also exposes `历史版本（不推荐）`. Do not add those endpoints as default SDK methods unless a user explicitly asks for legacy compatibility. Prefer current `/v1/data/...`, `/api/data/v1/...`, `/api/flow/v1/...`, and `/api/integration/v1/...` endpoints.

## Validation Checklist

- Run `npm test -- --runInBand` after endpoint changes.
- Run `npm run build` so `dist/index.d.ts` exposes new methods.
- Run `npm pack --dry-run --json` and verify `skills/` plus `dist/` are included.
