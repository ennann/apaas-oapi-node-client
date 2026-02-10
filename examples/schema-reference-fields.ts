/**
 * Schema 管理示例 - 关联字段专题
 * 
 * 本示例演示如何创建包含各种关联字段的数据对象
 */

import { apaas } from '../src/index';

// 初始化客户端
const client = new apaas.Client({
    clientId: 'your_client_id',
    clientSecret: 'your_client_secret',
    namespace: 'your_namespace',
    logLevel: 'info'
});

/**
 * 示例 1: 创建基础对象（供应商和产品分类）
 * 
 * 在创建关联字段之前，需要先创建目标对象
 */
async function example1_CreateBaseObjects() {
    console.log('\n=== 示例 1: 创建基础对象 ===');

    const result = await client.schema.create({
        objects: [
            {
                api_name: 'supplier',
                label: {
                    zh_cn: '供应商',
                    en_us: 'Supplier'
                },
                settings: {
                    display_name: 'code',
                    allow_search_fields: ['_id', 'code', 'name'],
                    search_layout: ['code', 'name']
                },
                fields: [
                    {
                        api_name: 'code',
                        label: { zh_cn: '供应商编码', en_us: 'Supplier Code' },
                        type: {
                            name: 'text',
                            settings: {
                                required: true,
                                unique: true,
                                case_sensitive: false,
                                max_length: 50
                            }
                        },
                        encrypt_type: 'none'
                    },
                    {
                        api_name: 'name',
                        label: { zh_cn: '供应商名称', en_us: 'Supplier Name' },
                        type: {
                            name: 'text',
                            settings: {
                                required: true,
                                max_length: 200
                            }
                        },
                        encrypt_type: 'none'
                    },
                    {
                        api_name: 'contact',
                        label: { zh_cn: '联系方式', en_us: 'Contact' },
                        type: {
                            name: 'phone',
                            settings: {}
                        },
                        encrypt_type: 'none'
                    }
                ]
            },
            {
                api_name: 'category',
                label: {
                    zh_cn: '产品分类',
                    en_us: 'Category'
                },
                settings: {
                    display_name: 'name',
                    allow_search_fields: ['_id', 'name'],
                    search_layout: ['name']
                },
                fields: [
                    {
                        api_name: 'name',
                        label: { zh_cn: '分类名称', en_us: 'Category Name' },
                        type: {
                            name: 'text',
                            settings: {
                                required: true,
                                unique: true,
                                max_length: 100
                            }
                        },
                        encrypt_type: 'none'
                    }
                ]
            }
        ]
    });

    console.log('创建结果:', JSON.stringify(result, null, 2));
}

/**
 * 示例 2: 创建包含 lookup 字段的对象（单值关联）
 * 
 * lookup 字段用于关联另一个对象的单条记录
 */
async function example2_CreateObjectWithLookup() {
    console.log('\n=== 示例 2: 创建包含 lookup 字段的对象 ===');

    const result = await client.schema.create({
        objects: [
            {
                api_name: 'product',
                label: {
                    zh_cn: '产品',
                    en_us: 'Product'
                },
                settings: {
                    display_name: 'code',
                    allow_search_fields: ['_id', 'code', 'name'],
                    search_layout: ['code', 'name', 'supplier']
                },
                fields: [
                    {
                        api_name: 'code',
                        label: { zh_cn: '产品编码', en_us: 'Product Code' },
                        type: {
                            name: 'text',
                            settings: {
                                required: true,
                                unique: true,
                                max_length: 50
                            }
                        },
                        encrypt_type: 'none'
                    },
                    {
                        api_name: 'name',
                        label: { zh_cn: '产品名称', en_us: 'Product Name' },
                        type: {
                            name: 'text',
                            settings: {
                                required: true,
                                max_length: 200
                            }
                        },
                        encrypt_type: 'none'
                    },
                    {
                        api_name: 'supplier',
                        label: { zh_cn: '供应商', en_us: 'Supplier' },
                        type: {
                            name: 'lookup',
                            settings: {
                                objectAPIName: 'supplier',  // 🔗 关联到 supplier 对象
                                required: false,
                                displayStyle: 'default'
                            }
                        },
                        encrypt_type: 'none'
                    },
                    {
                        api_name: 'price',
                        label: { zh_cn: '价格', en_us: 'Price' },
                        type: {
                            name: 'number',
                            settings: {
                                decimalPlacesNumber: 2,
                                displayAsPercentage: false
                            }
                        },
                        encrypt_type: 'none'
                    }
                ]
            }
        ]
    });

    console.log('创建结果:', JSON.stringify(result, null, 2));
}

/**
 * 示例 3: 创建包含 lookup_multi 字段的对象（多值关联）
 * 
 * lookup_multi 字段用于关联另一个对象的多条记录（最多 200 条）
 */
async function example3_CreateObjectWithLookupMulti() {
    console.log('\n=== 示例 3: 创建包含 lookup_multi 字段的对象 ===');

    const result = await client.schema.update({
        objects: [
            {
                api_name: 'product',
                fields: [
                    {
                        operator: 'add',  // 向已有对象添加字段
                        api_name: 'categories',
                        label: { zh_cn: '产品分类', en_us: 'Categories' },
                        type: {
                            name: 'lookup_multi',
                            settings: {
                                objectAPIName: 'category',  // 🔗 关联到 category 对象
                                multiple: true  // 多选
                            }
                        },
                        encrypt_type: 'none'
                    }
                ]
            }
        ]
    });

    console.log('更新结果:', JSON.stringify(result, null, 2));
}

/**
 * 示例 4: 创建引用字段（referenceField）
 * 
 * 引用字段用于引用关联对象中的字段值
 * 注意：这是系统自动维护的字段，创建后不能直接写入
 */
async function example4_CreateReferenceField() {
    console.log('\n=== 示例 4: 创建引用字段 ===');

    const result = await client.schema.update({
        objects: [
            {
                api_name: 'product',
                fields: [
                    {
                        operator: 'add',
                        api_name: 'supplier_name',
                        label: { zh_cn: '供应商名称', en_us: 'Supplier Name' },
                        type: {
                            name: 'referenceField',
                            settings: {
                                guideFieldAPIName: 'supplier',      // 📎 引导字段（lookup 字段）
                                fieldAPIName: 'name',               // 📋 引用的目标字段
                                referenceObjectApiName: 'supplier'  // 引用的对象
                            }
                        },
                        encrypt_type: 'none'
                    },
                    {
                        operator: 'add',
                        api_name: 'supplier_contact',
                        label: { zh_cn: '供应商联系方式', en_us: 'Supplier Contact' },
                        type: {
                            name: 'referenceField',
                            settings: {
                                guideFieldAPIName: 'supplier',
                                fieldAPIName: 'contact',
                                referenceObjectApiName: 'supplier'
                            }
                        },
                        encrypt_type: 'none'
                    }
                ]
            }
        ]
    });

    console.log('更新结果:', JSON.stringify(result, null, 2));
}

/**
 * 示例 5: 创建订单对象（用于演示 rollup 汇总字段）
 */
async function example5_CreateOrderObject() {
    console.log('\n=== 示例 5: 创建订单对象 ===');

    const result = await client.schema.create({
        objects: [
            {
                api_name: 'order',
                label: {
                    zh_cn: '订单',
                    en_us: 'Order'
                },
                settings: {
                    display_name: 'order_no',
                    allow_search_fields: ['_id', 'order_no'],
                    search_layout: ['order_no', 'customer']
                },
                fields: [
                    {
                        api_name: 'order_no',
                        label: { zh_cn: '订单号', en_us: 'Order No' },
                        type: {
                            name: 'text',
                            settings: {
                                required: true,
                                unique: true,
                                max_length: 50
                            }
                        },
                        encrypt_type: 'none'
                    },
                    {
                        api_name: 'customer',
                        label: { zh_cn: '客户名称', en_us: 'Customer' },
                        type: {
                            name: 'text',
                            settings: {
                                required: true,
                                max_length: 200
                            }
                        },
                        encrypt_type: 'none'
                    }
                ]
            },
            {
                api_name: 'order_item',
                label: {
                    zh_cn: '订单明细',
                    en_us: 'Order Item'
                },
                settings: {
                    display_name: 'product_name',
                    allow_search_fields: ['_id', 'order', 'product_name'],
                    search_layout: ['order', 'product_name', 'quantity', 'amount']
                },
                fields: [
                    {
                        api_name: 'order',
                        label: { zh_cn: '订单', en_us: 'Order' },
                        type: {
                            name: 'lookup',
                            settings: {
                                objectAPIName: 'order',  // 🔗 关联到 order 对象
                                required: true
                            }
                        },
                        encrypt_type: 'none'
                    },
                    {
                        api_name: 'product_name',
                        label: { zh_cn: '产品名称', en_us: 'Product Name' },
                        type: {
                            name: 'text',
                            settings: {
                                required: true,
                                max_length: 200
                            }
                        },
                        encrypt_type: 'none'
                    },
                    {
                        api_name: 'quantity',
                        label: { zh_cn: '数量', en_us: 'Quantity' },
                        type: {
                            name: 'number',
                            settings: {
                                decimalPlacesNumber: 0
                            }
                        },
                        encrypt_type: 'none'
                    },
                    {
                        api_name: 'unit_price',
                        label: { zh_cn: '单价', en_us: 'Unit Price' },
                        type: {
                            name: 'number',
                            settings: {
                                decimalPlacesNumber: 2
                            }
                        },
                        encrypt_type: 'none'
                    },
                    {
                        api_name: 'amount',
                        label: { zh_cn: '金额', en_us: 'Amount' },
                        type: {
                            name: 'number',
                            settings: {
                                decimalPlacesNumber: 2
                            }
                        },
                        encrypt_type: 'none'
                    }
                ]
            }
        ]
    });

    console.log('创建结果:', JSON.stringify(result, null, 2));
}

/**
 * 示例 6: 创建汇总字段（rollup）
 * 
 * 汇总字段用于对关联对象的数据进行聚合计算
 * 注意：这是系统自动维护的字段，创建后不能直接写入
 */
async function example6_CreateRollupField() {
    console.log('\n=== 示例 6: 创建汇总字段 ===');

    const result = await client.schema.update({
        objects: [
            {
                api_name: 'order',
                fields: [
                    {
                        operator: 'add',
                        api_name: 'total_amount',
                        label: { zh_cn: '订单总金额', en_us: 'Total Amount' },
                        type: {
                            name: 'rollup',
                            settings: {
                                objectAPIName: 'order_item',           // 📦 被汇总的对象
                                lookupFieldAPIName: 'order',           // 🔗 关联字段（order_item 中的 order 字段）
                                fieldAPIName: 'amount',                // 📋 要汇总的字段
                                functionType: 'sum'                    // 📊 汇总函数：sum（求和）
                                // 其他可用函数：avg(平均), count(计数), max(最大), min(最小), countDistinct(去重计数)
                            }
                        },
                        encrypt_type: 'none'
                    },
                    {
                        operator: 'add',
                        api_name: 'item_count',
                        label: { zh_cn: '明细数量', en_us: 'Item Count' },
                        type: {
                            name: 'rollup',
                            settings: {
                                objectAPIName: 'order_item',
                                lookupFieldAPIName: 'order',
                                fieldAPIName: '_id',    // 对 _id 计数
                                functionType: 'count'    // 计数
                            }
                        },
                        encrypt_type: 'none'
                    }
                ]
            }
        ]
    });

    console.log('更新结果:', JSON.stringify(result, null, 2));
}

/**
 * 示例 7: 使用关联字段 - 向 lookup 字段写入数据
 * 
 * 创建对象后，可以向关联字段写入数据
 * 注意：只需要提供 _id 字段即可
 */
async function example7_WriteToLookupField() {
    console.log('\n=== 示例 7: 向关联字段写入数据 ===');

    // 假设 supplier 对象中已有一条记录，_id 为 1767211281913907
    const supplierId = 1767211281913907;

    // 创建产品记录，并关联供应商
    const result = await client.object.create({
        apiName: 'product',
        records: [
            {
                code: 'P001',
                name: '苹果',
                price: 5.99,
                supplier: { _id: supplierId },  // ✅ 只需要提供 _id
                categories: [                    // lookup_multi 提供多个 _id
                    { _id: 1767211281913908 },
                    { _id: 1767211281913909 }
                ]
            }
        ]
    });

    console.log('创建产品结果:', JSON.stringify(result, null, 2));
}

/**
 * 主函数：依次执行所有示例
 */
async function main() {
    try {
        // 注意：执行顺序很重要，因为后面的对象依赖前面创建的对象
        
        // 步骤 1: 创建基础对象（供应商、分类）
        await example1_CreateBaseObjects();
        
        // 步骤 2: 创建产品对象（包含 lookup 字段）
        await example2_CreateObjectWithLookup();
        
        // 步骤 3: 添加 lookup_multi 字段
        await example3_CreateObjectWithLookupMulti();
        
        // 步骤 4: 添加引用字段
        await example4_CreateReferenceField();
        
        // 步骤 5: 创建订单相关对象
        await example5_CreateOrderObject();
        
        // 步骤 6: 添加汇总字段
        await example6_CreateRollupField();
        
        // 步骤 7: 向关联字段写入数据（演示）
        // await example7_WriteToLookupField();
        
        console.log('\n✅ 所有示例执行完成！');
        
    } catch (error) {
        console.error('❌ 执行出错:', error);
    }
}

// 执行主函数
// main();

/**
 * ⚠️ 重要提醒：关联字段创建注意事项
 * 
 * 1. 创建顺序：
 *    - 必须先创建目标对象，再创建包含关联字段的对象
 *    - 例如：先创建 supplier，再创建包含 supplier lookup 字段的 product
 * 
 * 2. objectAPIName 必须正确：
 *    - 确保 settings.objectAPIName 指向的对象已存在
 *    - 对象 API 名称区分大小写
 * 
 * 3. 系统维护字段（不能直接写入）：
 *    - referenceField（引用字段）：系统根据 lookup 字段自动计算
 *    - rollup（汇总字段）：系统根据关联数据自动汇总
 *    - formula（公式字段）：系统根据公式自动计算
 * 
 * 4. lookup_multi 限制：
 *    - 最多可以关联 200 条记录
 *    - 超过限制会导致写入失败
 * 
 * 5. 写入数据格式：
 *    - lookup: { supplier: { _id: 123456 } }
 *    - lookup_multi: { categories: [{ _id: 111 }, { _id: 222 }] }
 *    - 只需要提供 _id，不需要提供 _name 等其他字段
 * 
 * 6. 关联字段的依赖关系：
 *    - referenceField 依赖 lookup 字段
 *    - rollup 依赖 lookup 字段
 *    - 删除 lookup 字段前，需要先删除依赖它的 referenceField 和 rollup 字段
 * 
 * 7. 响应验证：
 *    - 检查 data.items[].status.code 确认是否创建成功
 *    - 顶层 code=0 只表示请求格式正确，不代表真正创建成功
 */

export {
    example1_CreateBaseObjects,
    example2_CreateObjectWithLookup,
    example3_CreateObjectWithLookupMulti,
    example4_CreateReferenceField,
    example5_CreateOrderObject,
    example6_CreateRollupField,
    example7_WriteToLookupField
};
