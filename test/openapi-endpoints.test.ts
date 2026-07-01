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
            const responseData = Array.isArray(data?.department_ids)
                ? data.department_ids.map((id: string) => ({ id }))
                : Array.isArray(data?.user_ids)
                ? data.user_ids.map((id: string) => ({ id }))
                : { items: [], datasets: [], has_more: false };
            return { data: { code: '0', msg: 'success', data: responseData } };
        }),
        get: jest.fn(async (url: string, config?: any) => {
            calls.push({ method: 'GET', url, config });
            return { data: { code: '0', msg: 'success', data: { items: [], has_more: false } } };
        }),
        patch: jest.fn(),
        delete: jest.fn(async (url: string, config?: any) => {
            calls.push({ method: 'DELETE', url, config });
            return { data: { code: '0', msg: 'success', data: {} } };
        })
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

    it('normalizes enum option metadata color names and custom source before schema writes', async () => {
        const { client, calls } = createMockClient();

        expect(client.object.schema).toBe(client.schema);

        await client.object.schema.update({
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

        const settings = calls[0].data.objects[0].fields[0].type.settings;
        expect(settings.option_source).toBeUndefined();
        expect(settings.option_type).toBe('local');
        expect(settings.options.map((option: any) => option.color))
            .toEqual(['B', 'W', 'V', 'I', 'N']);
    });

    it('normalizes legacy enum option_type custom to UI-editable local source', async () => {
        const { client, calls } = createMockClient();

        await client.object.schema.update({
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
                            option_type: 'custom',
                            options: [
                                { label: { zh_cn: '蓝', en_us: 'Blue' }, api_name: 'blue', color: 'blue', active: true }
                            ]
                        }
                    },
                    encrypt_type: 'none'
                }]
            }]
        });

        const settings = calls[0].data.objects[0].fields[0].type.settings;
        expect(settings.option_type).toBe('local');
        expect(settings.options[0].color).toBe('B');
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

    it('wraps function, automation, builder page, and global config endpoints', async () => {
        const { client, calls } = createMockClient();

        await client.function.invoke({ name: 'sync_store', params: { store_id: 'record_id' } });
        await client.automation.v1.execute({
            flow_api_name: 'flow_v1',
            operator: { _id: 100, email: 'operator@example.com' },
            params: { store_id: 'record_id' }
        });
        await client.automation.v2.execute({
            flow_api_name: 'flow_v2',
            operator: { _id: 100, email: 'operator@example.com' },
            params: { store_id: 'record_id' },
            is_resubmit: true,
            pre_instance_id: 'instance_id'
        });
        await client.page.list({ limit: 10, offset: 0 });
        await client.page.detail({ page_id: 'page_id' });
        await client.page.url({
            page_id: 'page_id',
            pageParams: { id: 'record_id' },
            navId: 'nav_id',
            tabId: 'tab_id'
        });
        await client.global.options.detail({ api_name: 'store_status' });
        await client.global.options.list({ limit: 20, offset: 0, filter: { quickQuery: 'status' } });
        await client.global.variables.detail({ api_name: 'current_region' });
        await client.global.variables.list({ limit: 20, offset: 0 });

        expect(calls.map((call) => `${call.method} ${call.url}`)).toEqual([
            'POST /api/cloudfunction/v1/namespaces/package_test__c/invoke/sync_store',
            'POST /api/flow/v1/namespaces/package_test__c/flows/flow_v1/execute',
            'POST /v2/namespaces/package_test__c/flows/flow_v2/execute',
            'POST /api/builder/v1/namespaces/package_test__c/meta/pages',
            'GET /api/builder/v1/namespaces/package_test__c/meta/pages/page_id',
            'POST /api/builder/v1/namespaces/package_test__c/meta/pages/page_id/link',
            'GET /api/data/v1/namespaces/package_test__c/globalOptions/store_status',
            'POST /api/data/v1/namespaces/package_test__c/globalOptions/list',
            'GET /api/data/v1/namespaces/package_test__c/globalVariables/current_region',
            'POST /api/data/v1/namespaces/package_test__c/globalVariables/list'
        ]);
        expect(calls[0].data).toEqual({ params: { store_id: 'record_id' } });
        expect(calls[1].data).toEqual({
            operator: { _id: 100, email: 'operator@example.com' },
            params: { store_id: 'record_id' }
        });
        expect(calls[2].data).toEqual({
            operator: { _id: 100, email: 'operator@example.com' },
            params: { store_id: 'record_id' },
            is_resubmit: true,
            pre_instance_id: 'instance_id'
        });
        expect(calls[5].data).toEqual({
            pageParams: { id: 'record_id' },
            navId: 'nav_id',
            tabId: 'tab_id'
        });
        expect(calls[7].data).toEqual({ limit: 20, offset: 0, filter: { quickQuery: 'status' } });
        expect(calls[9].data).toEqual({ limit: 20, offset: 0 });
    });

    it('wraps Feishu user and department ID exchange endpoints with explicit input ID types', async () => {
        const { client, calls } = createMockClient();

        await client.department.exchange({
            department_id_type: 'external_open_department_id',
            department_id: 'oc_xxx'
        });
        await client.department.batchExchange({
            department_id_type: 'department_id',
            department_ids: ['d1', 'd2']
        });
        await client.user.exchange({
            user_id_type: 'external_open_id',
            user_id: 'ou_xxx',
            feishu_app_id: 'cli_xxx'
        });
        await client.user.batchExchange({
            user_id_type: 'external_user_id',
            user_ids: ['u1', 'u2'],
            feishu_app_id: 'cli_xxx'
        });

        expect(calls.map((call) => `${call.method} ${call.url}`)).toEqual([
            'POST /api/integration/v2/feishu/getDepartments',
            'POST /api/integration/v2/feishu/getDepartments',
            'POST /api/integration/v2/feishu/getUsers',
            'POST /api/integration/v2/feishu/getUsers'
        ]);
        expect(calls[0].data).toEqual({
            department_id_type: 'external_open_department_id',
            department_ids: ['oc_xxx']
        });
        expect(calls[1].data).toEqual({
            department_id_type: 'department_id',
            department_ids: ['d1', 'd2']
        });
        expect(calls[2].data).toEqual({
            user_id_type: 'external_open_id',
            feishu_app_id: 'cli_xxx',
            user_ids: ['ou_xxx']
        });
        expect(calls[3].data).toEqual({
            user_id_type: 'external_user_id',
            feishu_app_id: 'cli_xxx',
            user_ids: ['u1', 'u2']
        });
    });

    it('wraps attachment file and avatar endpoints with binary download options', async () => {
        const { client, calls } = createMockClient();

        await client.attachment.file.upload({ file: Buffer.from('file') });
        await client.attachment.file.download({ file_id: 'file_token' });
        await client.attachment.file.delete({ file_id: 'file_token' });
        await client.attachment.avatar.upload({ image: Buffer.from('image') });
        await client.attachment.avatar.download({ image_id: 'image_token' });

        expect(calls.map((call) => `${call.method} ${call.url}`)).toEqual([
            'POST /api/attachment/v1/files',
            'GET /api/attachment/v1/files/file_token',
            'DELETE /v1/files/file_token',
            'POST /api/attachment/v1/images',
            'GET /api/attachment/v1/images/image_token'
        ]);
        expect(calls[1].config.responseType).toBe('arraybuffer');
        expect(calls[4].config.responseType).toBe('arraybuffer');
    });
});
