---
name: apaas-function-flow
description: "Use for aPaaS Node SDK cloud function, automation flow, workflow, user task, and Lark integration token operations: invoking functions, executing v1/v2 flows, querying execution status, task approve/reject/transfer/rollback/chat, checking code/msg/data, and avoiding unsafe repeated workflow submissions."
---

# aPaaS Function Flow

Use this skill for `client.function.*`, `client.automation.*`, `client.workflow.*`, and `client.integration.lark.*`.

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

## Workflow Status And Definition

```ts
const status = await client.workflow.execution.status({
  execution_id: "1848390852196499"
});

const flow = await client.workflow.definition.detail({
  flow_api_name: "package_xxx__c__action_xxx"
});
```

## User Tasks

Use `client.workflow.userTask.*` for human task workflows. Treat approve/reject/transfer/rollback/cancel as writes.

```ts
const tasks = await client.workflow.userTask.tasks({
  type: "pending",
  source: "assignMe",
  kunlun_user_id: "1783981209205788",
  limit: 20,
  offset: 0
});

await client.workflow.userTask.agree({
  approval_task_id: "1785996265147395",
  user_id: "1783981209205788",
  opinion: "同意"
});
```

## Lark Integration Tokens

Use this only when the user needs to call Lark OpenAPI through a configured aPaaS integration.

```ts
const token = await client.integration.lark.defaultTenantAccessToken();

const customToken = await client.integration.lark.appAccessToken({
  lark_integration_api_name: "larkIntegration_xxx"
});
```

## Safety

- Treat flow execution as a write operation; confirm before triggering production workflows.
- Treat user task actions and workflow instance cancel/rollback as write operations.
- Do not resubmit failed flows with `is_resubmit` unless the user explicitly requests it and `pre_instance_id` is known.
- Log flow/function names and result codes, not secrets or full sensitive payloads.
- If the flow mutates records, verify the target record after execution with `apaas-object`.
