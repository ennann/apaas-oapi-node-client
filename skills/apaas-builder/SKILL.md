---
name: apaas-builder
description: "Use for aPaaS Node SDK builder page operations: listing pages, paginating page metadata, reading page details, generating page access URLs with pageParams, parentPageParams, navId, or tabId, and verifying page IDs from live metadata."
---

# aPaaS Builder

Use this skill for `client.page.*`.

## Resolve Page IDs

Start from live page metadata unless the user provides a confirmed page ID.

```ts
const { items } = await client.page.listWithIterator({ limit: 100 });
const target = items.find(page => page.name === "门店详情");
```

Use returned `page_id` values in follow-up calls.

## Page Detail

```ts
const detail = await client.page.detail({
  page_id: "page_id"
});
```

Use detail reads before generating links that require route parameters.

## Page URL

```ts
const url = await client.page.url({
  page_id: "page_id",
  pageParams: { id: "record_id" },
  parentPageParams: {},
  navId: "nav_id",
  tabId: "tab_id"
});
```

Only include optional parameters that are required by the target page. Verify generated URLs by opening them or handing them to the user with the relevant page and record context.
