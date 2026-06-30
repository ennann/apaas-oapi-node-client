---
name: apaas-object
description: "Use for aPaaS Node SDK object metadata and record operations: listing objects, reading fields, exporting metadata to Markdown, querying records, count, create, update, delete, batch operations, pagination, and record-level error recovery."
---

# aPaaS Object

Use this skill for `client.object.*`.

## Workflow

1. Initialize the client with `apaas-shared`.
2. Resolve object and field API names from live metadata.
3. Read before write when the payload depends on field type or readonly status.
4. Use iterator helpers for full-result work.
5. Check SDK response codes and failed item lists.

## Metadata

Prefer metadata calls before record work:

```ts
const objects = await client.object.listWithIterator({
  filter: { type: "custom", quickQuery: "store" },
  limit: 50
});

const fields = await client.object.metadata.fields({
  object_name: "object_store"
});

const markdown = await client.object.metadata.export2markdown({
  object_names: ["object_store", "_user"]
});
```

Use returned API names, not user-facing labels, in later calls.

## Record Reads

- Use `search.record` for one known record ID.
- Use `search.records` for one page.
- Use `search.recordsWithIterator` for full-table or full-filter tasks.
- Use `search.count` when only the count is needed.

```ts
const { total, items } = await client.object.search.recordsWithIterator({
  object_name: "object_store",
  data: {
    need_total_count: true,
    page_size: 100,
    offset: 0,
    select: ["_id", "store_code", "store_name"],
    use_page_token: true
  }
});
```

Do not answer global max/min/top/count questions from a single page unless the user asked for a sample.

## Record Writes

Use storage fields only. Re-read metadata when unsure.

```ts
await client.object.create.record({
  object_name: "object_event_log",
  record: {
    name: "sync_started",
    content: "nightly job started"
  }
});

await client.object.update.record({
  object_name: "object_store",
  record_id: "record_id",
  record: { store_name: "新门店名称" }
});
```

For large batches, use `recordsWithIterator` helpers and inspect failures:

```ts
const result = await client.object.update.recordsWithIterator({
  object_name: "object_store",
  records,
  limit: 100
});

if (result.failedCount > 0) {
  console.warn(result.failed);
}
```

## Delete Rules

- Confirm target object and record IDs before delete.
- Prefer `delete.recordsWithIterator` for large deletes so partial failures are visible.
- Report `successCount`, `failedCount`, and failed IDs after batch deletion.
