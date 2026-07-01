---
name: apaas-attachment
description: "Use for aPaaS Node SDK attachment and avatar operations: uploading, downloading, and deleting files with client.attachment.file.*, uploading and downloading avatar images with client.attachment.avatar.*, and safely handling binary payloads and record attachment fields."
---

# aPaaS Attachment

## Overview

Use this skill for `client.attachment.file.*` and `client.attachment.avatar.*`.

## File Operations

```ts
const uploaded = await client.attachment.file.upload({
  file: fs.createReadStream("/path/to/file.zip")
});

const data = await client.attachment.file.download({
  file_id: "file_token"
});

await client.attachment.file.delete({
  file_id: "file_token"
});
```

`upload` posts multipart form field `file` to `/api/attachment/v1/files`. `download` returns binary data with `responseType: "arraybuffer"`. `delete` is destructive and must be confirmed before use.

## Avatar Operations

```ts
const avatar = await client.attachment.avatar.upload({
  image: fs.createReadStream("/path/to/avatar.jpg")
});

const imageData = await client.attachment.avatar.download({
  image_id: "image_token"
});
```

`upload` posts multipart form field `image` to `/api/attachment/v1/images`. `download` returns binary image data with `responseType: "arraybuffer"`.

## Record Fields

Before writing an attachment, avatar, or logo field on an object record, read object metadata with `client.object.metadata.fields({ object_name })` and match the field's returned value shape. Do not assume upload response fields can be written directly to every attachment-like field.

## Safety

- Confirm deletes before calling `client.attachment.file.delete`.
- Do not print binary payloads, raw file contents, access tokens, or private file metadata.
- Stream files from disk when possible; avoid loading large files into memory for ad hoc scripts.
