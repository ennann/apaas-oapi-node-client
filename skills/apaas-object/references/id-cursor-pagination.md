# ID Cursor Pagination

Use this when an endpoint exposes `limit`/`offset` but does not provide a reliable `page_token`. Large offset queries can become slow and are more likely to hit rate limits.

## Preferred Order

1. Use SDK iterator helpers when available, for example `recordsWithIterator`, `recordsAcrossObjectsWithIterator`, or `dataset.listWithIterator`.
2. If the endpoint supports `page_token` / `next_page_token`, use token pagination.
3. If only `limit` / `offset` is available, use ID cursor pagination with `_id`.

## ID Cursor Pattern

Keep `offset: 0`, set `count: false`, filter `_id > lastId`, and sort `_id asc`.

```ts
let lastId = 0;
const limit = 200;
const all: any[] = [];

while (true) {
  const res = await client.constant.records({
    object_name: "_currency",
    data: {
      offset: 0,
      limit,
      count: false,
      fields: ["_id", "_name"],
      filter: [{ leftValue: "_id", operator: "gt", rightValue: lastId }],
      sort: [{ field: "_id", direction: "asc" }]
    }
  });

  if (res.code !== "0") throw new Error(res.msg || "query failed");

  const records = res.data?.records || res.data?.items || [];
  all.push(...records);
  if (records.length < limit) break;

  lastId = records[records.length - 1]._id;
}
```

## Page Token Pattern

For record query endpoints that support token pagination:

```ts
const { items } = await client.object.search.recordsWithIterator({
  object_name: "object_store",
  data: {
    page_size: 100,
    use_page_token: true,
    select: ["_id", "name"],
    query_deleted_record: false
  }
});
```

## Rules

- Do not parallelize high-offset reads.
- Do not request `total` or `count` unless the user actually needs it.
- Always sort by `_id asc` when using `_id` as the cursor.
- Stop only when the returned page has fewer records than `limit` or when `has_more` is false.
