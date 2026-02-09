import axios from 'axios';

async function testRawRequest() {
    // 先获取 token
    const tokenRes = await axios.post('https://ae-openapi.feishu.cn/auth/v1/appToken', {
        clientId: 'c_a4dd955086ec45a882b9',
        clientSecret: 'a62fc785b97a4847810a4f319ccbdb5e'
    });

    console.log('[Token] code:', tokenRes.data.code);
    console.log('[Token] token:', tokenRes.data.data?.accessToken?.substring(0, 20) + '...');

    if (tokenRes.data.code !== '0') {
        console.error('[Error] Failed to get token');
        return;
    }

    const token = tokenRes.data.data.accessToken;

    // 发送创建对象请求
    const createRes = await axios.post(
        'https://ae-openapi.feishu.cn/v1/namespaces/package_5dc5b7__c/objects/batch_create',
        {
            objects: [{
                api_name: 'object_test_raw',
                label: {
                    zh_cn: '测试对象',
                    en_us: 'Test Object'
                },
                fields: [{
                    api_name: 'test_field',
                    label: {
                        zh_cn: '测试字段',
                        en_us: 'Test Field'
                    },
                    type: {
                        name: 'text',
                        settings: {}
                    },
                    encrypt_type: null
                }]
            }]
        },
        {
            headers: {
                'Authorization': token,
                'Content-Type': 'application/json'
            }
        }
    );

    console.log('\n[Create] Status:', createRes.status);
    console.log('[Create] Full Response:', JSON.stringify(createRes.data, null, 2));
    console.log('[Create] Headers:', createRes.headers);
}

testRawRequest().catch(err => {
    console.error('[Error]', err.message);
    if (err.response) {
        console.error('[Error Response]', JSON.stringify(err.response.data, null, 2));
    }
});
