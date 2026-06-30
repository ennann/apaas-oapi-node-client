import {
    checkSchemaResponse,
    createSchemaObjectsInStages,
    deleteAllCustomObjects,
    splitSchemaFieldsByDependency,
    validateSchemaResponse
} from '../src/index';

describe('schema runtime helpers', () => {
    it('validates request, silent, and item level schema failures', () => {
        const silent = validateSchemaResponse({ code: '0', data: null }, 'silent');
        expect(silent.ok).toBe(false);
        expect(silent.failures[0].layer).toBe('silent');

        expect(() => checkSchemaResponse({
            code: '0',
            data: {
                items: [{
                    api_name: 'product',
                    status: { code: 'k_ec_000015', message: 'field type is required' }
                }]
            }
        }, 'item')).toThrow('field type is required');

        expect(checkSchemaResponse({
            code: '0',
            data: {
                items: [{ api_name: 'product', status: { code: '0' } }]
            }
        }, 'ok').code).toBe('0');
    });

    it('splits fields into base, lookup, and reference phases', () => {
        const split = splitSchemaFieldsByDependency([
            { api_name: 'name', label: { zh_cn: '名称', en_us: 'Name' }, type: { name: 'text' } },
            { api_name: 'owner', label: { zh_cn: '负责人', en_us: 'Owner' }, type: { name: 'lookup' } },
            { api_name: 'owner_name', label: { zh_cn: '负责人姓名', en_us: 'Owner Name' }, type: { name: 'reference_field' } }
        ]);

        expect(split.baseFields.map((field) => field.api_name)).toEqual(['name']);
        expect(split.lookupFields.map((field) => field.api_name)).toEqual(['owner']);
        expect(split.referenceFields.map((field) => field.api_name)).toEqual(['owner_name']);
    });

    it('creates schema objects in safe stages', async () => {
        const calls: Array<{ name: string; params: any }> = [];
        const client: any = {
            schema: {
                create: jest.fn(async (params) => {
                    calls.push({ name: 'create', params });
                    return { code: '0', data: { items: params.objects.map((object: any) => ({ api_name: object.api_name, status: { code: '0' } })) } };
                }),
                update: jest.fn(async (params) => {
                    calls.push({ name: 'update', params });
                    return { code: '0', data: { items: params.objects.map((object: any) => ({ api_name: object.api_name, status: { code: '0' } })) } };
                }),
                delete: jest.fn()
            },
            object: {
                listWithIterator: jest.fn(async () => ({ items: [] })),
                metadata: {
                    fields: jest.fn(async () => ({ code: '0', data: { fields: [{ apiName: '_id' }] } }))
                }
            }
        };

        await createSchemaObjectsInStages(client, [
            {
                api_name: 'customer',
                label: { zh_cn: '客户', en_us: 'Customer' },
                settings: { display_name: 'name', allow_search_fields: ['_id', 'name'] },
                fields: [
                    { api_name: 'name', label: { zh_cn: '名称', en_us: 'Name' }, type: { name: 'text' } }
                ]
            },
            {
                api_name: 'order',
                label: { zh_cn: '订单', en_us: 'Order' },
                fields: [
                    { api_name: 'customer', label: { zh_cn: '客户', en_us: 'Customer' }, type: { name: 'lookup' } },
                    { api_name: 'customer_name', label: { zh_cn: '客户名称', en_us: 'Customer Name' }, type: { name: 'reference_field' } }
                ]
            }
        ], { verify: false });

        expect(calls[0]).toMatchObject({
            name: 'create',
            params: {
                objects: [
                    { api_name: 'customer', settings: { display_name: '_id', allow_search_fields: ['_id'], search_layout: [] } },
                    { api_name: 'order', settings: { display_name: '_id', allow_search_fields: ['_id'], search_layout: [] } }
                ]
            }
        });
        expect(calls[0].params.objects[0].fields).toBeUndefined();
        expect(calls.map((call) => call.name)).toEqual(['create', 'update', 'update', 'update', 'update']);
        expect(calls[1].params.objects[0].fields[0].api_name).toBe('name');
        expect(calls[2].params.objects[0].fields[0].api_name).toBe('customer');
        expect(calls[3].params.objects[0].fields[0].api_name).toBe('customer_name');
        expect(calls[4].params.objects[0]).toEqual({
            api_name: 'customer',
            settings: { display_name: 'name', allow_search_fields: ['_id', 'name'] }
        });
    });

    it('deletes custom objects in dependency order', async () => {
        const calls: Array<{ name: string; params: any }> = [];
        const client: any = {
            schema: {
                create: jest.fn(),
                update: jest.fn(async (params) => {
                    calls.push({ name: 'update', params });
                    return { code: '0', data: { items: params.objects.map((object: any) => ({ api_name: object.api_name, status: { code: '0' } })) } };
                }),
                delete: jest.fn(async (params) => {
                    calls.push({ name: 'delete', params });
                    return { code: '0', data: null };
                })
            },
            object: {
                listWithIterator: jest.fn()
                    .mockResolvedValueOnce({ items: [{ apiName: '_user' }, { apiName: 'order' }] })
                    .mockResolvedValueOnce({ items: [{ apiName: '_user' }] }),
                metadata: {
                    fields: jest.fn(async () => ({
                        code: '0',
                        data: {
                            fields: [
                                { apiName: '_id', type: { name: 'bigint' } },
                                { apiName: 'customer_name', type: { name: 'referenceField' } },
                                { apiName: 'customer', type: { name: 'lookup' } },
                                { apiName: 'note', type: { name: 'text' } }
                            ]
                        }
                    }))
                }
            }
        };

        await expect(deleteAllCustomObjects(client)).rejects.toThrow('confirm');
        await deleteAllCustomObjects(client, { confirm: true, removeOtherFields: true });

        expect(calls.map((call) => call.name)).toEqual(['update', 'update', 'update', 'delete']);
        expect(calls[0].params.objects[0].fields[0].api_name).toBe('customer_name');
        expect(calls[1].params.objects[0].fields[0].api_name).toBe('customer');
        expect(calls[2].params.objects[0].fields[0].api_name).toBe('note');
        expect(calls[3].params.api_names).toEqual(['order']);
    });
});
