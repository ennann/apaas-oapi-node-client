# OpenAPI Error Codes

All OpenAPI responses use `code`, `msg`, and often `data`. Treat `code !== "0"` as failed even when HTTP status is 200.

```json
{
  "code": "k_op_ec_10100",
  "msg": "Request parameters are not valid: userId is empty"
}
```

## Families

The 2026-06-30 API doc bundle listed 531 error codes:

| Family | Prefix | Count | Typical area |
| --- | --- | ---: | --- |
| 通用 | `k_ec_` | 26 | generic parameter, permission, naming, unsupported |
| OpenAPI | `k_op_ec_` | 19 | auth, request parsing, rate limit, backend errors |
| 身份集成 | `k_ident_` | 38 | identity provider, user/account integration |
| 元数据 | `k_mt_ec_` | 329 | object/field/schema metadata, record constraints |
| 规则引擎 | `k_ru_ec_` | 24 | rule/formula/field picker validation |
| 流程 | `k_wf_ec_` | 70 | workflow definition, execution, user tasks |
| 权限 | `k_perm_ec_` | 10 | permission and security group errors |
| 图片/附件 | `k_img_ec_` | 15 | image/file upload, preview, storage |

## High-Signal Codes

| Code | Meaning | First action |
| --- | --- | --- |
| `k_ec_000009` | 权限不足 | Verify app permission, namespace, and API credential scope. |
| `k_ec_000011` | 缺少必填参数 | Compare payload with SDK method params and doc body/query/path fields. |
| `k_ec_000012` | 必填参数为空 | Check empty strings, empty arrays, and missing nested fields. |
| `k_ec_000015` | 请求参数不合法 | Read `msg`; for schema writes also run `client.schema.validateResponse`. |
| `k_op_ec_10100` | 请求参数不合法 | Validate body shape and enum values. |
| `k_op_ec_10101` | 无法解析 body | Check JSON serialization and `Content-Type: application/json`. |
| `k_op_ec_10102` | URL 路径参数错误 | Check path params such as object, field, task, flow, or integration API names. |
| `k_op_ec_10201` | 鉴权失败 | Re-init client and verify `clientId/clientSecret`. |
| `k_op_ec_10203` | 无访问权限 | Check package role and API credential permission. |
| `k_op_ec_20003` | 请求被限流 | Reduce concurrency; prefer iterator helpers and ID cursor pagination. |
| `k_mt_ec_900064` | 字段被报表/页面/规则引用，无法删除 | Remove dependent page/rule/report references before schema delete. |
| `k_mt_ec_900075` | 一次最多创建或更新 1000 条记录 | Split record writes into chunks. |
| `k_wf_ec_2001002` | 缺少流程入参 | Re-read flow definition and required input params. |
| `k_wf_ec_2001005` | 流程实例 ID 不存在 | Verify `execution_id` or approval instance ID from list/status APIs. |
| `k_wf_ec_2001008` | 幂等键已使用 | Generate a new idempotency key before resubmit. |
| `k_perm_ec_000001` | 权限不足 | Do not retry blindly; fix permission first. |
| `k_img_ec_000004` | 附件超过 100M | Compress or split file before upload. |
| `k_img_ec_000011` | 文件 ID 错误 | Re-read upload response and avoid mixing image/file IDs. |

## Triage Rules

- Do not rely on HTTP status alone.
- Log `code`, `msg`, and safe request identifiers; do not log secrets or access tokens.
- For batch APIs, inspect item-level status in `data.items` because the request can be partially successful.
- For schema writes, `code: "0"` with `data: null` is a silent failure and must be treated as failed.
