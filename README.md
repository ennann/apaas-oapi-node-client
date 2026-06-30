# apaas-oapi-client

[![npm version](https://img.shields.io/npm/v/apaas-oapi-client.svg)](https://www.npmjs.com/package/apaas-oapi-client)
[![license](https://img.shields.io/npm/l/apaas-oapi-client.svg)](LICENSE)

🚀 **aPaaS OpenAPI Node.js 客户端 SDK**

封装 aPaaS 平台 RESTful API 的 Node.js SDK，简化接口调用，内置限流与 token 缓存功能。

---

## ✨ **功能特性**

### 数据操作
- ✅ records 查询（支持分页迭代）
- ✅ record 单条查询、单条更新、单条删除
- ✅ record 批量创建、批量更新、批量删除

### 对象结构管理（Schema）
- ✅ **创建数据对象**（批量）
- ✅ **更新数据对象**（批量，支持添加/修改/删除字段）
- ✅ **删除数据对象**（批量）
- ✅ **字段类型完整文档**（20+ 字段类型，含示例）

### 其他功能
- ✅ 获取 accessToken（自动刷新）
- ✅ **导出数据对象文档为 Markdown**
- ✅ 内置 Bottleneck 限流器
- ✅ 自定义日志等级

---

## 🤖 **AI Agent / Skills**

本仓库内置面向 AI Agent 的模块化 Skills，路径为 [skills](./skills)。设计采用 `shared + domain skill + references` 的轻量结构：主 `SKILL.md` 负责路由和安全边界，复杂规则放到 `references/` 按需读取。

| Skill | 适用场景 |
| --- | --- |
| `apaas-shared` | Client 初始化、凭证安全、namespace、token、日志、分页与错误处理 |
| `apaas-object` | 对象列表、字段元数据、记录查询/创建/更新/删除、Markdown 导出 |
| `apaas-schema` | 对象和字段结构管理、字段类型映射、lookup/reference 依赖规则 |
| `apaas-function-flow` | 云函数调用、自动化流程 v1/v2 执行 |
| `apaas-builder` | 页面列表、页面详情、页面访问链接 |
| `apaas-global` | 全局选项、环境变量读取与审计 |
| `apaas-exchange-attachment` | 用户/部门 ID 交换、附件和头像上传下载 |

从仓库根目录安装到 Codex Skill 目录：

```bash
mkdir -p "${CODEX_HOME:-$HOME/.codex}/skills"
cp -R skills/apaas-* "${CODEX_HOME:-$HOME/.codex}/skills/"
```

通过 npx 从 npm 直接安装：

```bash
npx apaas-oapi-client install-skills
```

从已安装 npm 包的项目安装：

```bash
mkdir -p "${CODEX_HOME:-$HOME/.codex}/skills"
cp -R node_modules/apaas-oapi-client/skills/apaas-* "${CODEX_HOME:-$HOME/.codex}/skills/"
```

使用建议：

- 写入前先用 `apaas-object` 读取真实 metadata。
- Schema 字段变更前先读 `apaas-schema/references/field-schema-rules.md`。
- 删除、批量写入、流程执行都按写操作处理，先确认目标和影响。

---

## 📦 **安装**

```bash
npm install apaas-oapi-client
```

---

## 🚀 **快速开始**

### 创建数据对象

```typescript
import { apaas } from 'apaas-oapi-client';

const client = new apaas.Client({
    clientId: 'your_client_id',
    clientSecret: 'your_client_secret',
    namespace: 'your_namespace'
});

await client.init();

// 创建数据对象
await client.schema.create({
    objects: [{
        api_name: 'product',
        label: { zh_cn: '产品', en_us: 'Product' },
        settings: {
            display_name: 'code',
            allow_search_fields: ['_id', 'code']
        },
        fields: [
            {
                api_name: 'code',
                label: { zh_cn: '编号', en_us: 'Code' },
                type: { name: 'text', settings: { required: true } },
                encrypt_type: 'none'
            }
        ]
    }]
});

// 更新对象：添加字段
await client.schema.update({
    objects: [{
        api_name: 'product',
        fields: [{
            operator: 'add',  // 添加新字段
            api_name: 'name',
            label: { zh_cn: '名称', en_us: 'Name' },
            type: { name: 'text', settings: { required: true } },
            encrypt_type: 'none'
        }]
    }]
});
```

---

## 📖 **使用文档**

- 完整说明、初始化示例与 API 用法请查看 [UserManual.md](./UserManual.md)
- Schema 管理完整示例请查看 [examples/schema-operations.ts](./examples/schema-operations.ts)
- **关联字段创建示例**（lookup/lookup_multi/referenceField/rollup）请查看 [examples/schema-reference-fields.ts](./examples/schema-reference-fields.ts)
