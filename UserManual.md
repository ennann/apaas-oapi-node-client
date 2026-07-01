# 背景

aPaaS 平台有完整的 Open API 能力，但是目前这些能力全都以单独接口的形式提供给开发者，不方便开发者调试和调用。
在此背景下，我们在一店一群项目的基础上，封装 aPaaS 平台 RESTful API 的 Node.js SDK，简化接口调用，内置限流与 token 缓存功能。

## ✨ **功能特性**

- ✅ 获取 accessToken，自动管理 token 有效期
	
- ✅ record 单条查询、批量查询（支持分页迭代）

- ✅ record 单条创建、批量创建（支持分页迭代）

- ✅ record 单条更新、批量更新
	
- ✅ record 单条删除、批量删除

- ✅ OQL、跨对象搜索、常量对象、数据集列表

- ✅ 工作流人工任务、异步流程状态、飞书集成 token
	
- ✅ 内置 Bottleneck 限流器，基于 API 接口配置限流规则
	
- ✅ 自定义日志等级
	
- ……
	





**📦 安装**

```Bash
npm install apaas-oapi-client
# or
yarn add apaas-oapi-client
```

***



# **🚀 快速开始**

```JavaScript
const { apaas } = require('apaas-oapi-client');

async function main() {
  const client = new apaas.Client({
    clientId: 'your_client_id',
    clientSecret: 'your_client_secret',
    namespace: 'app_xxx'
  });

  await client.init();
  client.setLoggerLevel(3); // 设置日志等级 (0-5)

  console.log('Access Token:', client.token);
  console.log('Namespace:', client.currentNamespace);
}

main();
```

***



## **🤖 AI Agent / Skills 使用说明**

本 SDK 随包提供面向 AI Agent 的模块化 Skills，目录位于 `skills/`。推荐让 Agent 先使用 `apaas-shared` 读取通用规则，再按任务选择具体 Skill。

| **Skill** | **适用场景** |
| :-- | :-- |
| `apaas-shared` | Client 初始化、凭证安全、namespace、token、日志、OpenAPI 覆盖、分页与错误码处理 |
| `apaas-object` | 对象列表、字段元数据、记录查询/创建/更新/删除、OQL、跨对象搜索、常量对象、数据集 |
| `apaas-object-schema` | 对象结构管理、字段类型映射、lookup/reference 依赖规则 |
| `apaas-function-flow` | 云函数调用、自动化流程 v1/v2 执行、工作流人工任务、飞书集成 token |
| `apaas-builder` | 页面列表、页面详情、页面访问链接 |
| `apaas-global` | 全局选项、环境变量读取与审计 |
| `apaas-lark-id-exchange` | 用户/部门飞书/Lark ID 互换，包含单个和批量映射 |
| `apaas-attachment` | 附件文件与头像图片上传、下载、删除 |

### **安装 Skills**

从 GitHub 安装单个 Skill：

```Bash
npx skills add https://github.com/ennann/apaas-oapi-node-client --skill apaas-object
```

安装全部 aPaaS Skills：

```Bash
npx skills add https://github.com/ennann/apaas-oapi-node-client --skill '*'
```

查看仓库内可安装的 Skills：

```Bash
npx skills add https://github.com/ennann/apaas-oapi-node-client --list
```

从 npm 包安装到本机 Codex Skill 目录：

```Bash
npx apaas-oapi-client install-skills
```

或从已安装依赖的项目中复制：

```Bash
mkdir -p "${CODEX_HOME:-$HOME/.codex}/skills"
cp -R node_modules/apaas-oapi-client/skills/apaas-* "${CODEX_HOME:-$HOME/.codex}/skills/"
```

### **选择规则**

- 写入记录、查询记录、OQL、常量对象、数据集：使用 `apaas-object`。
- 新建对象、改字段、删字段、删对象：使用 `apaas-object-schema`。
- 对象结构变更前，Agent 应先读取 `apaas-object-schema/references/field-schema-rules.md`。
- 大量读取优先使用 iterator 或 `apaas-object/references/id-cursor-pagination.md`。
- 删除、批量写入、流程执行、结构变更都按高风险写操作处理，执行前确认目标和影响。

`client.object.schema.*` 是对象结构编辑的推荐入口；`client.schema.*` 仍作为旧代码兼容入口保留。

***



## **🔐 认证**

### **初始化 Client**

| **参数** | **类型** | **说明** |
| :-- | :-- | :-- |
| clientId | string | 应用 clientId |
| clientSecret | string | 应用 clientSecret |
| namespace | string | 命名空间 |
| disableTokenCache | boolean | 是否禁用 token 缓存，默认 false |

***



## **📝 日志等级**

可调用 setLoggerLevel(level) 设置日志等级。

| **Level** | **名称** | **说明** |
| :-- | :-- | :-- |
| 0 | fatal | 严重错误 |
| 1 | error | 错误 |
| 2 | warn | 警告 |
| 3 | info | 信息（默认） |
| 4 | debug | 调试信息 |
| 5 | trace | 追踪 |

***



# 💾 **数据模块**

## **📋 对象列表接口**

### **获取所有对象（数据表）**

```JavaScript
const res = await client.object.list({
  offset: 0,
  limit: 100,
  filter: {
    type: 'custom',
    quickQuery: 'store'
  }
});
console.log(res);
```

***

## **🔍 查询接口**

查询条件请根据实际需求自行拼装。详情参考 API 接口文档示例。

### **单条查询**

```JavaScript
const res = await client.object.search.record({
  object_name: 'object_store',
  record_id: 'your_record_id',
  select: ['field1', 'field2']
});
console.log(res);
```

***

### **批量查询**

每次查询最多返回 100 条记录。

```JavaScript
const res = await client.object.search.records({
  object_name: 'object_store',
  data: {
    need_total_count: true,
    page_size: 100,
    offset: 0
  }
});
console.log(res);
```

***

### **分页查询所有记录**

在上一个请求的基础上，封装每次查询最多返回 100 条记录。

```JavaScript
const { total, items } = await client.object.search.recordsWithIterator({
  object_name: 'object_store',
  data: {
    need_total_count: true,
    page_size: 100,
    offset: 0
  }
});

console.log('Total:', total);
console.log('Items:', items);
```

***

### **执行 OQL**

```JavaScript
const res = await client.object.oql({
  query: 'SELECT _id, _name FROM _user WHERE _type = $1 LIMIT 10',
  args: ['_employee']
});
console.log(res);
```

### **跨对象搜索**

```JavaScript
const res = await client.object.search.recordsAcrossObjects({
  q: 'Ethan',
  search_objects: [{
    api_name: '_user',
    select: ['_id', '_name'],
    search_fields: ['_name']
  }],
  page_size: 20,
  metadata: 'Label'
});
console.log(res);
```




***

## **➕ 创建接口**

### **单条创建**

```JavaScript
const res = await client.object.create.record({
  object_name: 'object_event_log',
  record: {
    name: 'Sample text',
    content: 'Sample text'
  }
});
console.log(res);
```

### **批量创建（最多 100 条）**

```JavaScript
const res = await client.object.create.records({
  object_name: 'object_event_log',
  records: [
    { name: 'Sample text 1', content: 'Sample text 1' },
    { name: 'Sample text 2', content: 'Sample text 2' }
  ]
});
console.log(res);
```

### **批量创建（支持超过 100 条，自动拆分）**

> ⚠️ 超过 100 条会自动拆分为多次请求，SDK 已自动分组限流

```JavaScript
const { total, items } = await client.object.create.recordsWithIterator({
  object_name: 'object_event_log',
  records: [
    { name: 'Sample text 1', content: 'Sample text 1' },
    { name: 'Sample text 2', content: 'Sample text 2' },
    // ... 可以超过 100 条
  ]
});
console.log('Total:', total);
console.log('Items:', items);
```



## **✏️ 更新接口**

### **单条更新**

```JavaScript
const res = await client.object.update.record({
  object_name: 'object_store',
  record_id: 'your_record_id',
  record: { field1: 'newValue' }
});
console.log(res);
```

***

### **批量更新（最多 100 条）**

```JavaScript
const res = await client.object.update.records({
  object_name: 'object_store',
  records: [
    { _id: 'id1', field1: 'value1' },
    { _id: 'id2', field1: 'value2' }
  ]
});
console.log(res);
```

### **批量更新（支持超过 100 条，自动拆分）**

> ⚠️ 超过 100 条会自动拆分为多次请求，SDK 已自动分组限流

```JavaScript
const results = await client.object.update.recordsWithIterator({
  object_name: 'object_store',
  records: [
    { _id: 'id1', field1: 'value1' },
    { _id: 'id2', field1: 'value2' },
    // ... 可以超过 100 条
  ]
});
console.log(results); // 返回所有子请求的结果数组
```

***



## **🗑️ 删除接口**

### **单条删除**

```JavaScript
const res = await client.object.delete.record({
  object_name: 'object_store',
  record_id: 'your_record_id'
});
console.log(res);
```

***

### **批量删除（最多 100 条）**

```JavaScript
const res = await client.object.delete.records({
  object_name: 'object_store',
  ids: ['id1', 'id2', 'id3']
});
console.log(res);
```

### **批量删除（支持超过 100 条，自动拆分）**

> ⚠️ 超过 100 条会自动拆分为多次请求，SDK 已自动分组限流

```JavaScript
const results = await client.object.delete.recordsWithIterator({
  object_name: 'object_store',
  ids: ['id1', 'id2', 'id3', /* ... 可以超过 100 条 */]
});
console.log(results); // 返回所有子请求的结果数组
```

***



## **📊 对象元数据接口**

### **获取指定对象字段元数据**

```JavaScript
const res = await client.object.metadata.field({
  object_name: '_user',
  field_name: '_id'
});
console.log(res);
```

### **获取指定对象所有字段信息**

```JavaScript
const res = await client.object.metadata.fields({
  object_name: 'object_store'
});
console.log(res);
```

### **导出数据对象文档为 Markdown**

将数据对象的元数据导出为详细的 Markdown 文档，包含完整的字段信息、类型、配置等。

```JavaScript
const fs = require('fs');

// 方式一：导出所有对象（推荐，无需参数）
const markdown = await client.object.metadata.export2markdown();
fs.writeFileSync('all_objects.md', markdown, 'utf-8');

// 方式二：只导出指定的对象
const markdown2 = await client.object.metadata.export2markdown({
  object_names: ['object_store', 'object_order', '_user']
});
fs.writeFileSync('specific_objects.md', markdown2, 'utf-8');

// 方式三：结合 listWithIterator 灵活筛选
const allObjects = await client.object.listWithIterator();
const customObjects = allObjects.items
  .filter(obj => !obj.apiName.startsWith('_'))  // 只要自定义对象
  .map(obj => obj.apiName);

const markdown3 = await client.object.metadata.export2markdown({
  object_names: customObjects
});
fs.writeFileSync('custom_objects.md', markdown3, 'utf-8');

console.log('✅ 文档导出成功！');
```

**生成的 Markdown 文档包含：**
- 📋 自动生成的目录（带锚点链接）
- 📊 每个对象的详细信息（中英文名称、创建时间、字段数量）
- 📝 字段列表（中文名称、API名称、类型、必填、唯一性）
- ⚙️ 字段配置详情：
  - **选项字段**：展示所有选项值
  - **公式字段**：显示公式表达式和返回类型
  - **引用字段**：显示引用来源和字段
  - **汇总字段（rollup）**：汇总类型（计数/求和/平均值等）、汇总对象、关联字段、过滤条件
  - **lookup 字段**：显示关联对象
  - 其他配置：最大长度、小数位、显示样式等
- 🎯 字段智能排序（系统字段、业务字段、特殊字段分类展示）

***

# **🧩 常量对象与数据集**

## **常量对象**

支持 `_currency`、`_country`、`_timeZone`。

```JavaScript
const currencies = await client.constant.records({
  object_name: '_currency',
  data: {
    limit: 100,
    offset: 0,
    count: false,
    fields: ['_id', '_name']
  }
});

const country = await client.constant.record({
  object_name: '_country',
  record_id: 'CN'
});
```

## **数据集**

```JavaScript
const datasets = await client.dataset.listWithIterator({
  page_size: 100
});
console.log(datasets);
```

***



# **📎 附件模块**

## **文件操作**

### **上传文件**

```JavaScript
const fs = require('fs');

const res = await client.attachment.file.upload({
  file: fs.createReadStream('/path/to/file.zip')
});
console.log(res);
// 返回: { code: "0", msg: "success", data: { fileId, type, name, size } }
```

### **下载文件**

```JavaScript
const fileData = await client.attachment.file.download({
  file_id: '625d2f602af94d46972073db32a99ed2'
});
// 返回文件二进制流
```

### **删除文件**

```JavaScript
const res = await client.attachment.file.delete({
  file_id: '625d2f602af94d46972073db32a99ed2'
});
console.log(res);
```

## **头像图片操作**

### **上传头像图片**

```JavaScript
const fs = require('fs');

const res = await client.attachment.avatar.upload({
  image: fs.createReadStream('/path/to/avatar.jpg')
});
console.log(res);
```

### **下载头像图片**

```JavaScript
const imageData = await client.attachment.avatar.download({
  image_id: 'c70d03b21d3c40468ee710d984cfb7a8_o'
});
// 返回图片二进制流
```

***



# **💽 全局数据模块**

## **全局选项**

### **查询全局选项详情**

```JavaScript
const res = await client.global.options.detail({
  api_name: 'global_option_abc'
});
console.log(res);
```

### **查询全局选项列表**

```JavaScript
const res = await client.global.options.list({
  limit: 10,
  offset: 0,
  filter: { quickQuery: 'Sample Text' }
});
console.log(res);
```

### **分页查询所有全局选项**

```JavaScript
const { total, items } = await client.global.options.listWithIterator({
  limit: 100,
  filter: { quickQuery: 'Sample Text' }
});
console.log('Total:', total);
console.log('Items:', items);
```

## **环境变量**

### **查询环境变量详情**

```JavaScript
const res = await client.global.variables.detail({
  api_name: 'global_variable_abc'
});
console.log(res);
```

### **查询环境变量列表**

```JavaScript
const res = await client.global.variables.list({
  limit: 10,
  offset: 0,
  filter: { quickQuery: 'Sample Text' }
});
console.log(res);
```

### **分页查询所有环境变量**

```JavaScript
const { total, items } = await client.global.variables.listWithIterator({
  limit: 100,
  filter: { quickQuery: 'Sample Text' }
});
console.log('Total:', total);
console.log('Items:', items);
```

***



# **📄 页面模块**

### **获取所有页面**

```JavaScript
const res = await client.page.list({
  limit: 10,
  offset: 0
});
console.log(res);
```

### **分页查询所有页面**

```JavaScript
const { total, items } = await client.page.listWithIterator({
  limit: 100
});
console.log('Total:', total);
console.log('Items:', items);
```

### **获取页面详情**

```JavaScript
const res = await client.page.detail({
  page_id: 'appPage_page'
});
console.log(res);
```

### **获取页面访问地址**

```JavaScript
const res = await client.page.url({
  page_id: 'appPage_page',
  pageParams: { var_page: '1234567890' },
  parentPageParams: {
    navId: 'page_nav_id',
    pageApiName: 'page_name'
  },
  navId: 'page_nav_id',
  tabId: 'tab_id'
});
console.log(res);
// 返回: { code: "0", msg: "success", data: { link: "https://..." } }
```

***



# **🏢 部门模块**

## **部门 ID 交换**

`department_id_type` 表示传入 ID 的类型，接口会返回同一个部门的其他 ID 映射，不是选择输出字段。

可选值：

- `department_id`：aPaaS/Lark 部门 ID，例如 `1758534140403815`
- `external_department_id`：外部平台部门 ID，无固定格式
- `external_open_department_id`：外部 open department ID，通常以 `oc_` 开头

### **单个部门 ID 交换**

```JavaScript
const res = await client.department.exchange({
  department_id_type: 'external_department_id',
  department_id: 'Y806608904'
});
console.log(res);
```

### **批量部门 ID 交换**

每次最多 200 个，SDK 已自动拆分限流。

```JavaScript
const res = await client.department.batchExchange({
  department_id_type: 'external_department_id',
  department_ids: ['id1', 'id2', 'id3']
});
console.log(res);
```

***

<br>

# **👤 用户模块**

## **用户 ID 交换**

`user_id_type` 表示传入 ID 的类型，接口会返回同一个用户的其他 ID 映射，不是选择输出字段。用户 ID 交换必须传真实 `feishu_app_id`。

可选值：

- `user_id`：aPaaS/Lark 用户 ID，例如 `1758534140403815`
- `external_user_id`：外部平台用户 ID，无固定格式
- `external_open_id`：外部 open ID，通常以 `ou_` 开头

### **单个用户 ID 交换**

```JavaScript
const res = await client.user.exchange({
  user_id_type: 'external_open_id',
  user_id: 'ou_xxx',
  feishu_app_id: 'cli_xxx'
});
console.log(res);
```

### **批量用户 ID 交换**

每次最多 200 个，SDK 已自动拆分限流。返回后需要检查 `failedCount` 和 `failed`。

```JavaScript
const res = await client.user.batchExchange({
  user_id_type: 'external_user_id',
  user_ids: ['u1', 'u2', 'u3'],
  feishu_app_id: 'cli_xxx'
});
console.log(res);
```

***

<br>

# **🔄 自动化流程模块**

## **V1 版本 - 执行流程**

```JavaScript
const res = await client.automation.v1.execute({
  flow_api_name: 'automation_cd05fdab67d',
  operator: {
    _id: 100,
    email: 'sample@feishu.cn'
  },
  params: {
    varRecord_ab67d031d44: {
      _id: 100
    }
  }
});
console.log(res);
// 返回: { code: "0", msg: "success", data: { errMsg, executionId, status, data, errCode } }
```

## **V2 版本 - 执行流程**

V2 版本支持流程重新提交功能。

```JavaScript
const res = await client.automation.v2.execute({
  flow_api_name: 'automation_a9ec6ee5fb1',
  operator: {
    _id: 100,
    email: 'sample@feishu.cn'
  },
  params: {
    storeId: 100
  },
  is_resubmit: true,
  pre_instance_id: '1835957428957195'
});
console.log(res);
// 返回: { code: "0", msg: "success", data: { errMsg, executionId, status, data, errCode } }
```

## **查询异步流程状态**

```JavaScript
const status = await client.workflow.execution.status({
  execution_id: '1848390852196499'
});
console.log(status);
```

## **获取流程定义详情**

```JavaScript
const flow = await client.workflow.definition.detail({
  flow_api_name: 'package_xxx__c__action_xxx'
});
console.log(flow);
```

## **人工任务**

```JavaScript
const tasks = await client.workflow.userTask.tasks({
  type: 'pending',
  source: 'assignMe',
  kunlun_user_id: '1783981209205788',
  limit: 20,
  offset: 0
});

await client.workflow.userTask.agree({
  approval_task_id: '1785996265147395',
  user_id: '1783981209205788',
  opinion: '同意'
});
```

***

# **🔗 集成模块**

## **飞书集成 Token**

```JavaScript
const tenantToken = await client.integration.lark.defaultTenantAccessToken();

const appToken = await client.integration.lark.appAccessToken({
  lark_integration_api_name: 'larkIntegration_xxx'
});
```

***

<br>

# **☁️ 云函数模块**

```JavaScript
const res = await client.function.invoke({
  name: 'StoreMemberUpdate',
  params: { key: 'value' }
});
console.log(res);
```

***

<br>

## **🛠️ 高级**

### **获取当前 token**

```JavaScript
console.log(client.token);
```

### **获取 token 过期时间**

```JavaScript
console.log(client.tokenExpireTime); // 返回剩余秒数
```

### **获取当前 namespace**

```JavaScript
console.log(client.currentNamespace);
```

***



## **💡 备注**

- 本 SDK 默认使用 [axios](https://www.npmjs.com/package/axios) 请求。

- 内置 [bottleneck](https://www.npmjs.com/package/bottleneck) 进行请求限流。

- 日志打印默认使用 console.log 并带时间戳，可通过 setLoggerLevel 动态控制输出等级。


***



> 由 [aPaaS OAPI Client SDK](https://www.npmjs.com/package/apaas-oapi-client) 提供支持，如有问题请提交 Issue 反馈。

---
