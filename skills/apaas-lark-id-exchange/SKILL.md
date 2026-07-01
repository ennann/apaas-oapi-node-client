---
name: apaas-lark-id-exchange
description: "Use for aPaaS Node SDK Feishu/Lark identity exchange: converting user or department IDs between aPaaS/Lark internal IDs, external IDs, and external open IDs with client.department.* and client.user.*, including batch exchange, retry results, and feishu_app_id handling."
---

# aPaaS Lark ID Exchange

## Overview

Use this skill for `client.department.*` and `client.user.*` identity exchange.

## Core Rule

`department_id_type` and `user_id_type` describe the ID type you are passing in. They do not select a single output type. The API returns mapping records that fill the other available ID forms for the same department or user.

## Department IDs

Allowed `department_id_type` values:

| Value | Input means | Hint |
| --- | --- | --- |
| `department_id` | aPaaS/Lark department ID | Numeric-like string such as `1758534140403815` |
| `external_department_id` | External platform department ID | No fixed format |
| `external_open_department_id` | External open department ID | Usually starts with `oc_` |

```ts
const department = await client.department.exchange({
  department_id_type: "external_open_department_id",
  department_id: "oc_xxx"
});

const departments = await client.department.batchExchange({
  department_id_type: "external_department_id",
  department_ids: ["dept-a", "dept-b"]
});
```

Batch exchange uses chunks of 200. Always inspect `failedCount` and `failed` before reporting success.

## User IDs

Allowed `user_id_type` values:

| Value | Input means | Hint |
| --- | --- | --- |
| `user_id` | aPaaS/Lark user ID | Numeric-like string such as `1758534140403815` |
| `external_user_id` | External platform user ID | No fixed format |
| `external_open_id` | External open user ID | Usually starts with `ou_` |

`feishu_app_id` is required for user exchange. Use the real Lark/Feishu app ID; do not infer it from namespace, object name, or client ID.

```ts
const user = await client.user.exchange({
  user_id_type: "external_open_id",
  user_id: "ou_xxx",
  feishu_app_id: "cli_xxx"
});

const users = await client.user.batchExchange({
  user_id_type: "external_user_id",
  user_ids: ["u1", "u2"],
  feishu_app_id: "cli_xxx"
});
```

Batch exchange uses chunks of 200. Report partial failures explicitly.

## Safety

- Do not guess `*_id_type` from a value unless the prefix is unambiguous; prefer caller confirmation or upstream metadata.
- Do not log access tokens, app secrets, raw identity lists, or private user data.
- For large batches, retry only failed IDs when the operation is idempotent.
