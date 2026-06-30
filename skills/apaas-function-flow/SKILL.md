---
name: apaas-function-flow
description: "Use for aPaaS Node SDK cloud function and automation flow execution: invoking functions, executing v1/v2 flows, preparing operator payloads, checking returned code/msg/data, and avoiding unsafe repeated workflow submissions."
---

# aPaaS Function Flow

Use this skill for `client.function.*` and `client.automation.*`.

## Function Invoke

Use when the target is a named cloud function and the caller already knows the function contract.

```ts
const res = await client.function.invoke({
  name: "SyncStoreManager",
  params: {
    store_id: "record_id"
  }
});

if (res.code !== "0") {
  throw new Error(res.msg || "function invoke failed");
}
```

## Automation Flow

Use `automation.v1.execute` only for v1 flow endpoints and `automation.v2.execute` for v2 endpoints. Always pass an explicit operator object from a real user record or documented service account.

```ts
const res = await client.automation.v2.execute({
  flow_api_name: "store_manager_change",
  operator: {
    _id: 123456,
    email: "operator@example.com"
  },
  params: {
    store_id: "record_id",
    new_manager_id: "user_record_id"
  }
});
```

## Safety

- Treat flow execution as a write operation; confirm before triggering production workflows.
- Do not resubmit failed flows with `is_resubmit` unless the user explicitly requests it and `pre_instance_id` is known.
- Log flow/function names and result codes, not secrets or full sensitive payloads.
- If the flow mutates records, verify the target record after execution with `apaas-object`.
