---
name: apaas-exchange-attachment
description: "Use for aPaaS Node SDK identity exchange and attachment operations: department ID exchange, user ID exchange, batch exchange with retry results, file upload/download/delete, avatar image upload/download, and safe handling of IDs and binary payloads."
---

# aPaaS Exchange Attachment

Use this skill for `client.department.*`, `client.user.*`, and `client.attachment.*`.

## Department Exchange

```ts
const department = await client.department.exchange({
  department_id_type: "department_id",
  department_id: "1758534140403815"
});

const batch = await client.department.batchExchange({
  department_id_type: "external_department_id",
  department_ids: ["dept-a", "dept-b"]
});
```

Check `failedCount` after batch exchange.

## User Exchange

```ts
const user = await client.user.exchange({
  user_id_type: "external_open_id",
  user_id: "ou_xxx",
  feishu_app_id: "cli_xxx"
});

const batch = await client.user.batchExchange({
  user_id_type: "external_user_id",
  user_ids: ["u1", "u2"],
  feishu_app_id: "cli_xxx"
});
```

Use real `feishu_app_id`; do not guess it from namespace.

## Attachments

```ts
const uploaded = await client.attachment.file.upload({ file });
const data = await client.attachment.file.download({ file_id: "file_token" });
await client.attachment.file.delete({ file_id: "file_token" });

const avatar = await client.attachment.avatar.upload({ image });
const imageData = await client.attachment.avatar.download({ image_id: "image_token" });
```

## Safety

- Confirm deletes before calling `attachment.file.delete`.
- Do not print binary payloads, raw access tokens, or private file contents.
- For record attachment fields, read object metadata first and write only the field shape expected by the platform.
