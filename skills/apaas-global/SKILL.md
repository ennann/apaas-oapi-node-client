---
name: apaas-global
description: "Use for aPaaS Node SDK global data operations: reading global option details, listing global options, reading global variable details, listing global variables, paginating results, and resolving API names from live metadata."
---

# aPaaS Global

Use this skill for `client.global.*`.

## Global Options

```ts
const option = await client.global.options.detail({
  api_name: "store_status"
});

const { total, items } = await client.global.options.listWithIterator({
  limit: 100,
  filter: { quickQuery: "status" }
});
```

Use global options to validate enum-like values before writing records or schema.

## Global Variables

```ts
const variable = await client.global.variables.detail({
  api_name: "current_region"
});

const variables = await client.global.variables.listWithIterator({
  limit: 100
});
```

Do not expose secrets from global variables. When reporting results, summarize key names and operational meaning instead of raw secret values.

## Rules

- Use `listWithIterator` for inventory or audit tasks.
- Use `detail` when an exact API name is known.
- Treat missing global values as configuration problems, not SDK bugs, until live metadata proves otherwise.
