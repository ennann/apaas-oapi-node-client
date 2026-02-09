/**
 * Schema 管理示例：创建、更新、删除数据对象
 * 
 * 本示例演示如何使用 client.schema.* 接口管理 aPaaS 数据对象结构
 */

import { apaas } from '../src/index';

async function main() {
    // 初始化客户端
    const client = new apaas.Client({
        clientId: 'your_client_id',
        clientSecret: 'your_client_secret',
        namespace: 'your_namespace'
    });

    await client.init();

    // ============================================================
    // 示例 1: 创建数据对象
    // ============================================================
    console.log('示例 1: 创建数据对象\n');
    
    const createResult = await client.schema.create({
        objects: [{
            api_name: 'product',
            label: {
                zh_cn: '产品',
                en_us: 'Product'
            },
            settings: {
                display_name: 'name',  // 使用 name 字段作为展示名称
                allow_search_fields: ['_id', 'code', 'name'],  // 不要包含 _name
                search_layout: ['code', 'name']
            },
            fields: [
                {
                    api_name: 'code',
                    label: { zh_cn: '产品编号', en_us: 'Product Code' },
                    type: {
                        name: 'text',
                        settings: {
                            required: true,
                            unique: true,
                            case_sensitive: false,
                            multiline: false,
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
                            unique: false,
                            case_sensitive: false,
                            multiline: false,
                            max_length: 200
                        }
                    },
                    encrypt_type: 'none'
                },
                {
                    api_name: 'price',
                    label: { zh_cn: '价格', en_us: 'Price' },
                    type: {
                        name: 'decimal',
                        settings: {
                            required: true,
                            unique: false,
                            display_as_percentage: false,
                            decimal_places: 2
                        }
                    },
                    encrypt_type: 'none'
                }
            ]
        }]
    });

    console.log('创建结果:', createResult);
    console.log('');

    // ============================================================
    // 示例 2: 更新数据对象 - 添加字段 (operator: 'add')
    // ============================================================
    console.log('示例 2: 更新对象 - 添加新字段\n');
    
    const addFieldResult = await client.schema.update({
        objects: [{
            api_name: 'product',
            fields: [
                {
                    operator: 'add',  // 添加新字段
                    api_name: 'description',
                    label: { zh_cn: '产品描述', en_us: 'Description' },
                    type: {
                        name: 'text',
                        settings: {
                            required: false,
                            unique: false,
                            case_sensitive: false,
                            multiline: true,
                            max_length: 1000
                        }
                    },
                    encrypt_type: 'none'
                },
                {
                    operator: 'add',
                    api_name: 'stock',
                    label: { zh_cn: '库存数量', en_us: 'Stock' },
                    type: {
                        name: 'bigint',
                        settings: {
                            required: true,
                            unique: false
                        }
                    },
                    encrypt_type: 'none'
                }
            ]
        }]
    });

    console.log('添加字段结果:', addFieldResult);
    console.log('');

    // ============================================================
    // 示例 3: 更新数据对象 - 修改字段 (operator: 'replace')
    // ============================================================
    console.log('示例 3: 更新对象 - 修改现有字段\n');
    
    const replaceFieldResult = await client.schema.update({
        objects: [{
            api_name: 'product',
            fields: [
                {
                    operator: 'replace',  // 修改现有字段
                    api_name: 'price',
                    label: { zh_cn: '销售价格', en_us: 'Sale Price' },  // 修改标签
                    type: {
                        name: 'decimal',
                        settings: {
                            required: false,  // 修改为非必填
                            unique: false,
                            display_as_percentage: false,
                            decimal_places: 2
                        }
                    }
                }
            ]
        }]
    });

    console.log('修改字段结果:', replaceFieldResult);
    console.log('');

    // ============================================================
    // 示例 4: 更新数据对象 - 删除字段 (operator: 'remove')
    // ============================================================
    console.log('示例 4: 更新对象 - 删除字段\n');
    
    const removeFieldResult = await client.schema.update({
        objects: [{
            api_name: 'product',
            fields: [
                {
                    operator: 'remove',  // 删除字段
                    api_name: 'stock'  // 只需要 api_name，其他属性会被忽略
                }
            ]
        }]
    });

    console.log('删除字段结果:', removeFieldResult);
    console.log('');

    // ============================================================
    // 示例 5: 更新对象标签和设置（不修改字段）
    // ============================================================
    console.log('示例 5: 更新对象标签和设置\n');
    
    const updateLabelResult = await client.schema.update({
        objects: [{
            api_name: 'product',
            label: {
                zh_cn: '产品信息',  // 修改标签
                en_us: 'Product Information'
            },
            settings: {
                display_name: 'code',  // 改用 code 作为展示名称
                allow_search_fields: ['_id', 'code', 'name', 'description'],
                search_layout: ['code', 'name', 'description']
            }
            // 不传 fields 数组，表示不修改字段
        }]
    });

    console.log('更新标签结果:', updateLabelResult);
    console.log('');

    // ============================================================
    // 示例 6: 批量操作（同时添加、修改、删除字段）
    // ============================================================
    console.log('示例 6: 批量操作多个字段\n');
    
    const batchUpdateResult = await client.schema.update({
        objects: [{
            api_name: 'product',
            fields: [
                // 添加新字段
                {
                    operator: 'add',
                    api_name: 'category',
                    label: { zh_cn: '产品分类', en_us: 'Category' },
                    type: {
                        name: 'text',
                        settings: { required: false }
                    },
                    encrypt_type: 'none'
                },
                // 修改现有字段
                {
                    operator: 'replace',
                    api_name: 'description',
                    label: { zh_cn: '详细描述', en_us: 'Detailed Description' }
                },
                // 删除字段
                {
                    operator: 'remove',
                    api_name: 'category'  // 刚添加又删除（仅作演示）
                }
            ]
        }]
    });

    console.log('批量操作结果:', batchUpdateResult);
    console.log('');

    // ============================================================
    // 示例 7: 删除整个对象
    // ============================================================
    console.log('示例 7: 删除数据对象\n');
    
    const deleteResult = await client.schema.delete({
        api_names: ['product']
    });

    console.log('删除结果:', deleteResult);
    console.log('');

    // ============================================================
    // 重要提示
    // ============================================================
    console.log('\n==================== 重要提示 ====================\n');
    console.log('1. display_name 不能使用 _name（会报错），应使用自定义字段');
    console.log('2. allow_search_fields 不能包含 _name');
    console.log('3. 系统字段（_id, _name 等）会自动创建，不需要在 fields 中定义');
    console.log('4. 每个字段都应该指定 encrypt_type（none/rand/fix/ope）');
    console.log('5. 更新字段时，operator 是必填的：');
    console.log('   - add: 添加新字段');
    console.log('   - replace: 修改现有字段');
    console.log('   - remove: 删除字段（只需要 api_name）');
    console.log('6. 响应结构是双层的：');
    console.log('   - 顶层 code="0" 表示请求格式正确');
    console.log('   - 实际状态在 data.items[].status 中');
    console.log('\n=================================================\n');
}

// 运行示例
if (require.main === module) {
    main().catch(err => {
        console.error('❌ 错误:', err.message);
        process.exit(1);
    });
}

export { main };
