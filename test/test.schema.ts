import { apaas } from '../src/index';

async function listAllObjects(client: any, stepName: string) {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📋 ${stepName}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    const objects = await client.object.listWithIterator();
    
    console.log(`[Info] 数据库中的对象总数: ${objects.total}`);
    
    if (objects.items.length > 0) {
        console.log(`[Info] 对象列表:\n`);
        objects.items.forEach((obj: any, index: number) => {
            const label = obj.label?.zh_CN || obj.label?.en_US || obj.apiName;
            console.log(`  ${index + 1}. ${label} (${obj.apiName})`);
        });
        console.log('');
    }
    
    return objects;
}

async function main() {
    const TEST_OBJECT_NAME = 'object_sdk_test';
    
    console.log('\n╔════════════════════════════════════════════╗');
    console.log('║     aPaaS Schema API 完整测试流程          ║');
    console.log('╚════════════════════════════════════════════╝\n');

    const client = new apaas.Client({
        clientId: 'c_a4dd955086ec45a882b9',
        clientSecret: 'a62fc785b97a4847810a4f319ccbdb5e',
        namespace: 'package_5dc5b7__c'
    });

    await client.init();
    client.setLoggerLevel(3);
    console.log(client.token);

    try {
        const initialObjects = await listAllObjects(client, 'Step 1: 初始状态');
        
        const existingTest = initialObjects.items.find((obj: any) => obj.apiName === TEST_OBJECT_NAME);
        if (existingTest) {
            console.log(`[Info] 先删除现有测试对象...\n`);
            await client.schema.delete({ api_names: [TEST_OBJECT_NAME] });
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        console.log(`✨ Step 2: 创建对象 ${TEST_OBJECT_NAME}\n`);
        const createResult = await client.schema.create({
            objects: [{
                api_name: TEST_OBJECT_NAME,
                label: { zh_cn: 'SDK 测试对象', en_us: 'SDK Test Object' },
                settings: { 
                    display_name: 'code',  // 使用自定义字段作为展示名称
                    allow_search_fields: ['_id', 'code'],  // 不要包含 _name，会报错
                    search_layout: ['code']
                },
                fields: [
                    // 只定义自定义字段
                    {
                        api_name: 'code',
                        label: { zh_cn: '编码', en_us: 'Code' },
                        type: { 
                            name: 'text', 
                            settings: { 
                                required: true,
                                unique: false,
                                case_sensitive: false,
                                multiline: false,
                                max_length: 100
                            }
                        },
                        encrypt_type: 'none'
                    }
                ]
            }]
        });
        console.log(`[Create] code=${createResult.code}, msg=${createResult.msg}`);
        console.log(`[Create] data:`, JSON.stringify(createResult.data, null, 2));
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        await listAllObjects(client, 'Step 2.1: 创建后验证');

        console.log(`🔄 Step 3: 更新对象\n`);
        const updateResult = await client.schema.update({
            objects: [{
                api_name: TEST_OBJECT_NAME,
                label: { zh_cn: 'SDK 测试对象【已更新】', en_us: 'SDK Test [Updated]' }
            }]
        });
        console.log(`[Update] code=${updateResult.code}, msg=${updateResult.msg}\n`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        await listAllObjects(client, 'Step 3.1: 更新后验证');
        return;

        console.log(`🗑️ Step 4: 删除对象\n`);
        const deleteResult = await client.schema.delete({
            api_names: [TEST_OBJECT_NAME]
        });
        console.log(`[Delete] code=${deleteResult.code}, msg=${deleteResult.msg}\n`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const afterDelete = await listAllObjects(client, 'Step 4.1: 删除后验证');

        console.log(`\n╔════════════════════════════════════════════╗`);
        console.log(`║              测试完成汇总                  ║`);
        console.log(`╚════════════════════════════════════════════╝\n`);
        console.log(`✅ 创建: code=${createResult.code}`);
        console.log(`✅ 更新: code=${updateResult.code}`);
        console.log(`✅ 删除: code=${deleteResult.code}`);
        console.log(`初始对象数: ${initialObjects.total}, 最终对象数: ${afterDelete.total}\n`);

    } catch (error: any) {
        console.error('\n❌ 测试失败！', error.message);
        throw error;
    }
}

main().then(() => console.log('✨ 测试完成\n')).catch(err => console.error('💥', err.message));
