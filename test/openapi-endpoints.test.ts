import { apaas } from '../src/index';

function createMockClient() {
    const client: any = new apaas.Client({
        clientId: 'client_id',
        clientSecret: 'client_secret',
        namespace: 'package_test__c'
    });

    client.accessToken = 'T:test';
    client.expireTime = Date.now() + 60 * 60 * 1000;

    const calls: Array<{ method: string; url: string; data?: any; config?: any }> = [];
    client.axiosInstance = {
        defaults: { baseURL: 'https://ae-openapi.feishu.cn' },
        post: jest.fn(async (url: string, data?: any, config?: any) => {
            calls.push({ method: 'POST', url, data, config });
            return { data: { code: '0', msg: 'success', data: { items: [], datasets: [], has_more: false } } };
        }),
        get: jest.fn(async (url: string, config?: any) => {
            calls.push({ method: 'GET', url, config });
            return { data: { code: '0', msg: 'success', data: { items: [], has_more: false } } };
        }),
        patch: jest.fn(),
        delete: jest.fn()
    };

    return { client, calls };
}

describe('OpenAPI endpoint coverage', () => {
    it('wraps data, constant object, and dataset endpoints', async () => {
        const { client, calls } = createMockClient();

        await client.object.oql({ query: 'SELECT _id FROM _user' });
        await client.object.search.recordsAcrossObjects({
            q: 'Ethan',
            search_objects: [{ api_name: '_user', select: ['_id'] }],
            page_size: 20,
            metadata: 'Label'
        });
        await client.constant.records({ object_name: '_currency', data: { limit: 100, count: false } });
        await client.constant.record({ object_name: '_country', record_id: 'CN' });
        await client.constant.metadata.fields({ object_name: '_timeZone' });
        await client.constant.metadata.field({ object_name: '_currency', field_name: '_name' });
        await client.dataset.list({ page_type: 'cursor', page_size: 100 });

        expect(calls.map((call) => `${call.method} ${call.url}`)).toEqual([
            'POST /api/data/v1/namespaces/package_test__c/records/query',
            'POST /v1/namespaces/package_test__c/objects/records/search',
            'POST /api/data/v1/namespaces/package_test__c/objects/_currency/records',
            'GET /api/data/v1/namespaces/package_test__c/objects/_country/CN',
            'GET /api/data/v1/namespaces/package_test__c/meta/objects/_timeZone',
            'GET /api/data/v1/namespaces/package_test__c/meta/objects/_currency/fields/_name',
            'POST /v1/namespaces/package_test__c/datasets'
        ]);
        expect(calls[0].data).toEqual({ query: 'SELECT _id FROM _user' });
        expect(calls[1].data.search_objects[0].api_name).toBe('_user');
        expect(calls[6].data).toEqual({ page_type: 'cursor', page_size: 100 });
    });

    it('normalizes enum option metadata color names before schema writes', async () => {
        const { client, calls } = createMockClient();

        await client.schema.update({
            objects: [{
                api_name: 'product',
                fields: [{
                    operator: 'add',
                    api_name: 'status',
                    label: { zh_cn: '状态', en_us: 'Status' },
                    type: {
                        name: 'enum',
                        settings: {
                            required: false,
                            multiple: false,
                            option_source: 'custom',
                            global_option_api_name: '',
                            options: [
                                { label: { zh_cn: '蓝', en_us: 'Blue' }, api_name: 'blue', color: 'blue', active: true },
                                { label: { zh_cn: '青', en_us: 'Cyan' }, api_name: 'cyan', color: 'cyan', active: true },
                                { label: { zh_cn: '品红', en_us: 'Magenta' }, api_name: 'magenta', color: 'magenta', active: true },
                                { label: { zh_cn: '蓝紫', en_us: 'Blue Magenta' }, api_name: 'blue_magenta', color: 'blueMagenta', active: true },
                                { label: { zh_cn: '灰', en_us: 'Grey' }, api_name: 'grey', color: 'grey', active: true }
                            ]
                        }
                    },
                    encrypt_type: 'none'
                }]
            }]
        });

        expect(calls[0].data.objects[0].fields[0].type.settings.options.map((option: any) => option.color))
            .toEqual(['B', 'W', 'V', 'I', 'N']);
    });

    it('wraps workflow and integration endpoints from the API doc', async () => {
        const { client, calls } = createMockClient();

        await client.workflow.execution.status({ execution_id: 1848390852196499 });
        await client.workflow.definition.detail({ flow_api_name: 'flow_api' });
        await client.workflow.userTask.flows({ limit: 10, offset: 0 });
        await client.workflow.userTask.instanceIds({
            page_size: 10,
            start_time: 1701328075494,
            api_ids: ['flow_api']
        });
        await client.workflow.userTask.instanceDetail({ approval_instance_id: 'instance_id', includes: ['ApprovalTask_FormData'] });
        await client.workflow.userTask.instanceTasks({ approval_instance_ids: ['instance_id'], task_status: 'in_process' });
        await client.workflow.userTask.tasks({ type: 'pending', source: 'assignMe', kunlun_user_id: 'user_id' });
        await client.workflow.userTask.detail({ task_id: 'task_id' });
        await client.workflow.userTask.agree({ approval_task_id: 'approval_task_id', user_id: 'user_id', opinion: '同意' });
        await client.workflow.userTask.reject({ approval_task_id: 'approval_task_id', user_id: 'user_id' });
        await client.workflow.userTask.transfer({
            approval_task_id: 'approval_task_id',
            user_id: 'user_id',
            from_user_ids: ['from_user'],
            to_user_ids: ['to_user']
        });
        await client.workflow.userTask.addAssignee({
            approval_task_id: 'approval_task_id',
            user_id: 'user_id',
            approvers: ['approver'],
            add_assignee_type: 'currentAndAddAssign'
        });
        await client.workflow.userTask.cc({ task_id: 'task_id', cc_user_ids: ['cc_user'], operator_user_id: 'operator' });
        await client.workflow.userTask.expedite({ task_id: 'task_id', expediting_user_ids: ['assignee'], operator_user_id: 'operator' });
        await client.workflow.userTask.cancelInstance({ approval_instance_id: 'instance_id', user_id: 'user_id' });
        await client.workflow.userTask.rollbackPoints({ task_id: 'task_id', operator_user_id: 'operator' });
        await client.workflow.userTask.rollback({ task_id: 'task_id', operator_user_id: 'operator', to_task_id: 'target_task' });
        await client.workflow.userTask.startChat({ task_id: 'task_id', operator_user_id: 'operator', chat_name: '群聊' });
        await client.integration.lark.defaultTenantAccessToken();
        await client.integration.lark.defaultAppAccessToken();
        await client.integration.lark.tenantAccessToken({ lark_integration_api_name: 'larkIntegration_api' });
        await client.integration.lark.appAccessToken({ lark_integration_api_name: 'larkIntegration_api' });

        expect(calls.map((call) => `${call.method} ${call.url}`)).toEqual([
            'GET /api/v2/workflow/namespaces/package_test__c/open_api/execution',
            'GET /api/flow/v1/namespaces/package_test__c/flow/flow_api',
            'POST /api/flow/v1/namespaces/package_test__c/user_task/flow_list',
            'GET /api/flow/v1/namespaces/package_test__c/instances/listids',
            'GET /api/flow/v1/namespaces/package_test__c/instances/instance_id',
            'GET /api/flow/v1/namespaces/package_test__c/instances/usertasks',
            'POST /api/flow/v1/namespaces/package_test__c/user_tasks',
            'GET /api/flow/v1/namespaces/package_test__c/user_task/task_id/detail',
            'POST /api/flow/v1/namespaces/package_test__c/user_task/approval_task_id/agree',
            'POST /api/flow/v1/namespaces/package_test__c/user_task/approval_task_id/reject',
            'POST /api/flow/v1/namespaces/package_test__c/user_task/approval_task_id/trans',
            'POST /api/flow/v1/namespaces/package_test__c/user_task/approval_task_id/add_assignee',
            'POST /api/flow/v1/namespaces/package_test__c/user_task/task_id/cc',
            'POST /api/flow/v1/namespaces/package_test__c/user_task/task_id/expediting',
            'POST /api/flow/v1/namespaces/package_test__c/instance/instance_id/cancel',
            'POST /api/flow/v1/namespaces/package_test__c/user_task/task_id/rollback_points',
            'POST /api/flow/v1/namespaces/package_test__c/user_task/task_id/rollback',
            'POST /api/flow/v1/namespaces/package_test__c/user_task/task_id/chat',
            'GET /api/integration/v1/namespaces/package_test__c/defaultLark/tenantAccessToken',
            'GET /api/integration/v1/namespaces/package_test__c/defaultLark/appAccessToken',
            'GET /api/integration/v1/namespaces/package_test__c/lark/tenantAccessToken/larkIntegration_api',
            'GET /api/integration/v1/namespaces/package_test__c/lark/appAccessToken/larkIntegration_api'
        ]);
        expect(calls[0].config.params).toEqual({ executionId: 1848390852196499 });
        expect(calls[3].config.data).toEqual({ start_time: '1701328075494', api_ids: ['flow_api'] });
        expect(calls[8].data).toEqual({ user_id: 'user_id', opinion: '同意' });
    });
});
