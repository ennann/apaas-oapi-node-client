import type {
    CreateFieldDefinition,
    MultilingualText,
    ObjectSettings,
    UpdateFieldDefinition
} from './field-types';
import { normalizeOptionColorForSchema } from './field-schema-rules';

export const SCHEMA_BATCH_SIZE = 10;

export type SchemaResponseFailureLayer = 'request' | 'silent' | 'item';

export interface SchemaResponseItem {
    api_name?: string;
    apiName?: string;
    name?: string;
    status?: {
        code?: string | number;
        message?: string;
        msg?: string;
    };
    [key: string]: any;
}

export interface SchemaResponse {
    code?: string | number;
    msg?: string;
    message?: string;
    data?: {
        items?: SchemaResponseItem[];
        [key: string]: any;
    } | null;
    [key: string]: any;
}

export interface SchemaResponseFailure {
    layer: SchemaResponseFailureLayer;
    context: string;
    code?: string;
    message: string;
    apiName?: string;
    item?: SchemaResponseItem;
}

export interface SchemaResponseValidationOptions {
    requireItemStatus?: boolean;
    allowDataNull?: boolean;
}

export interface SchemaResponseValidationResult<T extends SchemaResponse = SchemaResponse> {
    ok: boolean;
    result: T;
    failures: SchemaResponseFailure[];
}

export interface SchemaBatchInfo {
    batchIndex: number;
    batchCount: number;
    start: number;
    end: number;
    batchSize: number;
}

export interface SchemaBatchExecuteOptions {
    batchSize?: number;
    context?: string;
    continueOnError?: boolean;
    checkResponse?: boolean;
    responseOptions?: SchemaResponseValidationOptions;
}

export interface SchemaBatchExecuteResult<R extends SchemaResponse = SchemaResponse> {
    ok: boolean;
    total: number;
    batchSize: number;
    batchCount: number;
    results: R[];
    failures: SchemaResponseFailure[];
}

export type SchemaStageFieldDefinition = (CreateFieldDefinition | UpdateFieldDefinition) & {
    operator?: 'add' | 'replace' | 'remove';
};

export interface SchemaManagedObjectDefinition {
    api_name: string;
    label: MultilingualText;
    settings?: ObjectSettings;
    fields?: SchemaStageFieldDefinition[];
    [key: string]: any;
}

export interface SchemaCreateShellsOptions extends SchemaBatchExecuteOptions {
    skipExisting?: boolean;
}

export interface SchemaAddFieldsOptions {
    context?: string;
    skipExisting?: boolean;
    checkResponse?: boolean;
    responseOptions?: SchemaResponseValidationOptions;
}

export interface SchemaAddFieldsResult {
    objectName: string;
    addedFields: string[];
    skippedFields: string[];
    result?: SchemaResponse;
}

export interface SchemaCreateShellsResult {
    requested: string[];
    created: string[];
    skippedExisting: string[];
    batches?: SchemaBatchExecuteResult;
}

export interface SchemaCreateObjectsInStagesOptions extends SchemaBatchExecuteOptions {
    skipExisting?: boolean;
    updateFinalSettings?: boolean;
    verify?: boolean;
    includeMarkdown?: boolean;
}

export interface SchemaCreateObjectsInStagesResult {
    shells: SchemaCreateShellsResult;
    baseFields: SchemaAddFieldsResult[];
    lookupFields: SchemaAddFieldsResult[];
    referenceFields: SchemaAddFieldsResult[];
    finalSettings?: SchemaBatchExecuteResult;
    verification?: SchemaVerificationResult;
}

export interface SchemaObjectVerification {
    objectName: string;
    exists: boolean;
    fields: any[];
    customFields: any[];
}

export interface SchemaVerificationResult {
    objects: SchemaObjectVerification[];
    markdown?: string;
}

export interface SchemaVerificationOptions {
    includeMarkdown?: boolean;
}

export interface SchemaFieldRemovalPlan {
    referenceFieldObjects: Array<{ api_name: string; fields: Array<{ operator: 'remove'; api_name: string }> }>;
    lookupObjects: Array<{ api_name: string; fields: Array<{ operator: 'remove'; api_name: string }> }>;
    otherFieldObjects: Array<{ api_name: string; fields: Array<{ operator: 'remove'; api_name: string }> }>;
}

export interface DeleteAllCustomObjectsOptions extends SchemaBatchExecuteOptions {
    confirm?: boolean;
    removeOtherFields?: boolean;
    verify?: boolean;
}

export interface DeleteAllCustomObjectsResult {
    deletedObjects: string[];
    removalPlan: SchemaFieldRemovalPlan;
    fieldRemovalResults: SchemaBatchExecuteResult[];
    deleteResults?: SchemaBatchExecuteResult;
    remainingObjects?: string[];
}

export interface SchemaClientLike {
    schema: {
        create(params: any): Promise<SchemaResponse>;
        update(params: any): Promise<SchemaResponse>;
        delete(params: any): Promise<SchemaResponse>;
    };
    object: {
        listWithIterator(params?: any): Promise<{ items?: any[] }>;
        metadata: {
            fields(params: { object_name: string }): Promise<any>;
            export2markdown?(options?: { object_names?: string[] }): Promise<string>;
        };
    };
}

export function isSystemSchemaName(apiName: string): boolean {
    return apiName.startsWith('_');
}

export function normalizeSchemaObjectsForWrite<T extends { fields?: any[] }>(objects: T[]): T[] {
    return objects.map((object) => {
        if (!object.fields) {
            return { ...object };
        }

        return {
            ...object,
            fields: object.fields.map((field) => normalizeSchemaFieldForWrite(field))
        };
    });
}

function normalizeSchemaFieldForWrite<T extends { type?: any }>(field: T): T {
    const settings = field.type?.settings;
    if (field.type?.name !== 'enum' || !Array.isArray(settings?.options)) {
        return { ...field };
    }

    return {
        ...field,
        type: {
            ...field.type,
            settings: {
                ...settings,
                options: settings.options.map((option: any) => {
                    if (!option || typeof option !== 'object' || !('color' in option)) {
                        return option;
                    }

                    return {
                        ...option,
                        color: normalizeOptionColorForSchema(option.color)
                    };
                })
            }
        }
    };
}

export function validateSchemaResponse<T extends SchemaResponse>(
    result: T,
    context = 'schema',
    options: SchemaResponseValidationOptions = {}
): SchemaResponseValidationResult<T> {
    const failures: SchemaResponseFailure[] = [];

    if (!result) {
        failures.push({
            layer: 'request',
            context,
            code: 'NO_RESULT',
            message: `${context} request failed: empty response`
        });
        return { ok: false, result, failures };
    }

    if (String(result.code) !== '0') {
        failures.push({
            layer: 'request',
            context,
            code: result.code === undefined ? 'undefined' : String(result.code),
            message: `${context} request failed: ${result.code} ${result.msg || result.message || ''}`.trim()
        });
    }

    if (result.data === null && !options.allowDataNull) {
        failures.push({
            layer: 'silent',
            context,
            code: 'DATA_NULL',
            message: `${context} silently failed: result.code is 0 but result.data is null`
        });
    }

    for (const item of result.data?.items || []) {
        const itemCode = item.status?.code;
        if (itemCode === undefined && options.requireItemStatus) {
            failures.push({
                layer: 'item',
                context,
                code: 'MISSING_STATUS',
                apiName: getItemApiName(item),
                item,
                message: `${context} item status is missing: ${getItemApiName(item) || 'unknown'}`
            });
            continue;
        }

        if (itemCode !== undefined && String(itemCode) !== '0') {
            failures.push({
                layer: 'item',
                context,
                code: String(itemCode),
                apiName: getItemApiName(item),
                item,
                message: `${context} item failed: ${getItemApiName(item) || 'unknown'} ${item.status?.message || item.status?.msg || ''}`.trim()
            });
        }
    }

    return { ok: failures.length === 0, result, failures };
}

export function checkSchemaResponse<T extends SchemaResponse>(
    result: T,
    context = 'schema',
    options?: SchemaResponseValidationOptions
): T {
    const validation = validateSchemaResponse(result, context, options);
    if (!validation.ok) {
        const error = new Error(validation.failures.map((failure) => failure.message).join('; '));
        (error as Error & { failures?: SchemaResponseFailure[] }).failures = validation.failures;
        throw error;
    }
    return result;
}

export async function batchExecute<T, R extends SchemaResponse>(
    items: T[],
    fn: (batch: T[], info: SchemaBatchInfo) => Promise<R>,
    options: SchemaBatchExecuteOptions = {}
): Promise<SchemaBatchExecuteResult<R>> {
    const batchSize = options.batchSize ?? SCHEMA_BATCH_SIZE;
    if (!Number.isInteger(batchSize) || batchSize <= 0) {
        throw new Error('batchSize must be a positive integer.');
    }

    const batchCount = Math.ceil(items.length / batchSize);
    const results: R[] = [];
    const failures: SchemaResponseFailure[] = [];

    for (let start = 0; start < items.length; start += batchSize) {
        const batch = items.slice(start, start + batchSize);
        const batchIndex = Math.floor(start / batchSize) + 1;
        const info: SchemaBatchInfo = {
            batchIndex,
            batchCount,
            start,
            end: start + batch.length,
            batchSize: batch.length
        };
        const context = `${options.context || 'schema batch'} [${batchIndex}/${batchCount}]`;

        try {
            const result = await fn(batch, info);
            results.push(result);

            if (options.checkResponse !== false) {
                const validation = validateSchemaResponse(result, context, options.responseOptions);
                failures.push(...validation.failures);
                if (!validation.ok && !options.continueOnError) {
                    const error = new Error(validation.failures.map((failure) => failure.message).join('; '));
                    (error as Error & { failures?: SchemaResponseFailure[] }).failures = validation.failures;
                    throw error;
                }
            }
        } catch (error) {
            if (!options.continueOnError) {
                throw error;
            }
            failures.push({
                layer: 'request',
                context,
                code: 'EXCEPTION',
                message: error instanceof Error ? error.message : String(error)
            });
        }
    }

    return {
        ok: failures.length === 0,
        total: items.length,
        batchSize,
        batchCount,
        results,
        failures
    };
}

export function splitSchemaFieldsByDependency(fields: SchemaStageFieldDefinition[]): {
    baseFields: SchemaStageFieldDefinition[];
    lookupFields: SchemaStageFieldDefinition[];
    referenceFields: SchemaStageFieldDefinition[];
} {
    const baseFields: SchemaStageFieldDefinition[] = [];
    const lookupFields: SchemaStageFieldDefinition[] = [];
    const referenceFields: SchemaStageFieldDefinition[] = [];

    for (const field of fields) {
        const typeName = getSchemaFieldTypeName(field);
        if (typeName === 'reference_field' || typeName === 'referenceField') {
            referenceFields.push(field);
        } else if (typeName === 'lookup' || typeName === 'lookup_multi') {
            lookupFields.push(field);
        } else {
            baseFields.push(field);
        }
    }

    return { baseFields, lookupFields, referenceFields };
}

export async function createSchemaObjectShells(
    client: SchemaClientLike,
    objects: SchemaManagedObjectDefinition[],
    options: SchemaCreateShellsOptions = {}
): Promise<SchemaCreateShellsResult> {
    assertNoSystemObjects(objects.map((object) => object.api_name), 'createSchemaObjectShells');

    const existingNames = options.skipExisting === false
        ? new Set<string>()
        : await getExistingObjectNames(client);
    const shells = objects
        .filter((object) => !existingNames.has(object.api_name))
        .map(toShellObject);

    const result: SchemaCreateShellsResult = {
        requested: objects.map((object) => object.api_name),
        created: shells.map((object) => object.api_name),
        skippedExisting: objects
            .filter((object) => existingNames.has(object.api_name))
            .map((object) => object.api_name)
    };

    if (shells.length === 0) {
        return result;
    }

    result.batches = await batchExecute(
        shells,
        (batch) => client.schema.create({ objects: batch }),
        {
            batchSize: options.batchSize,
            context: options.context || 'schema.createShells',
            continueOnError: options.continueOnError,
            checkResponse: options.checkResponse,
            responseOptions: options.responseOptions
        }
    );

    return result;
}

export async function addFieldsIdempotent(
    client: SchemaClientLike,
    objectName: string,
    fieldsToAdd: SchemaStageFieldDefinition[],
    options: SchemaAddFieldsOptions = {}
): Promise<SchemaAddFieldsResult> {
    assertNoSystemObjects([objectName], 'addFieldsIdempotent');
    assertNoSystemFields(fieldsToAdd.map((field) => field.api_name), `addFieldsIdempotent(${objectName})`);

    const existingNames = options.skipExisting === false
        ? new Set<string>()
        : await getExistingFieldNames(client, objectName);
    const newFields = fieldsToAdd.filter((field) => !existingNames.has(field.api_name)).map(toAddField);
    const skippedFields = fieldsToAdd
        .filter((field) => existingNames.has(field.api_name))
        .map((field) => field.api_name);

    if (newFields.length === 0) {
        return {
            objectName,
            addedFields: [],
            skippedFields
        };
    }

    const result = await client.schema.update({
        objects: [{ api_name: objectName, fields: newFields }]
    });

    if (options.checkResponse !== false) {
        checkSchemaResponse(result, options.context || `schema.addFieldsIdempotent(${objectName})`, options.responseOptions);
    }

    return {
        objectName,
        addedFields: newFields.map((field) => field.api_name),
        skippedFields,
        result
    };
}

export async function createSchemaObjectsInStages(
    client: SchemaClientLike,
    objects: SchemaManagedObjectDefinition[],
    options: SchemaCreateObjectsInStagesOptions = {}
): Promise<SchemaCreateObjectsInStagesResult> {
    const context = options.context || 'schema.createWithStages';
    const shells = await createSchemaObjectShells(client, objects, {
        ...options,
        context: `${context}.shells`
    });

    const baseFields: SchemaAddFieldsResult[] = [];
    const lookupFields: SchemaAddFieldsResult[] = [];
    const referenceFields: SchemaAddFieldsResult[] = [];

    for (const object of objects) {
        assertNoSystemFields((object.fields || []).map((field) => field.api_name), `${context}(${object.api_name})`);
        const split = splitSchemaFieldsByDependency(object.fields || []);

        if (split.baseFields.length > 0) {
            baseFields.push(await addFieldsIdempotent(client, object.api_name, split.baseFields, {
                context: `${context}.baseFields(${object.api_name})`,
                skipExisting: options.skipExisting,
                checkResponse: options.checkResponse,
                responseOptions: options.responseOptions
            }));
        }

        if (split.lookupFields.length > 0) {
            lookupFields.push(await addFieldsIdempotent(client, object.api_name, split.lookupFields, {
                context: `${context}.lookupFields(${object.api_name})`,
                skipExisting: options.skipExisting,
                checkResponse: options.checkResponse,
                responseOptions: options.responseOptions
            }));
        }

        if (split.referenceFields.length > 0) {
            referenceFields.push(await addFieldsIdempotent(client, object.api_name, split.referenceFields, {
                context: `${context}.referenceFields(${object.api_name})`,
                skipExisting: options.skipExisting,
                checkResponse: options.checkResponse,
                responseOptions: options.responseOptions
            }));
        }
    }

    const result: SchemaCreateObjectsInStagesResult = {
        shells,
        baseFields,
        lookupFields,
        referenceFields
    };

    const finalSettings = options.updateFinalSettings === false
        ? []
        : objects
            .filter((object) => object.settings && Object.keys(object.settings).length > 0)
            .map((object) => ({ api_name: object.api_name, settings: object.settings }));

    if (finalSettings.length > 0) {
        result.finalSettings = await batchExecute(
            finalSettings,
            (batch) => client.schema.update({ objects: batch }),
            {
                batchSize: options.batchSize,
                context: `${context}.finalSettings`,
                continueOnError: options.continueOnError,
                checkResponse: options.checkResponse,
                responseOptions: {
                    ...options.responseOptions,
                    allowDataNull: true
                }
            }
        );
    }

    if (options.verify !== false) {
        result.verification = await verifySchemaObjects(
            client,
            objects.map((object) => object.api_name),
            { includeMarkdown: options.includeMarkdown }
        );
    }

    return result;
}

export async function verifySchemaObjects(
    client: SchemaClientLike,
    objectNames: string[],
    options: SchemaVerificationOptions = {}
): Promise<SchemaVerificationResult> {
    const allObjects = await client.object.listWithIterator();
    const objects: SchemaObjectVerification[] = [];

    for (const objectName of objectNames) {
        const exists = Boolean(allObjects.items?.find((object: any) => object.apiName === objectName || object.api_name === objectName));
        if (!exists) {
            objects.push({
                objectName,
                exists: false,
                fields: [],
                customFields: []
            });
            continue;
        }

        const fieldResult = await client.object.metadata.fields({ object_name: objectName });
        if (fieldResult.code !== undefined && String(fieldResult.code) !== '0') {
            throw new Error(`verifySchemaObjects(${objectName}) failed: ${fieldResult.code} ${fieldResult.msg || fieldResult.message || ''}`.trim());
        }

        const fields = fieldResult.data?.fields || [];
        objects.push({
            objectName,
            exists: true,
            fields,
            customFields: fields.filter((field: any) => !isSystemSchemaName(field.apiName || field.api_name || ''))
        });
    }

    const result: SchemaVerificationResult = { objects };
    if (options.includeMarkdown && client.object.metadata.export2markdown) {
        result.markdown = await client.object.metadata.export2markdown({ object_names: objectNames });
    }
    return result;
}

export function buildFieldRemovalPlan(fieldsByObject: Record<string, any[]>): SchemaFieldRemovalPlan {
    const referenceFieldObjects = new Map<string, Array<{ operator: 'remove'; api_name: string }>>();
    const lookupObjects = new Map<string, Array<{ operator: 'remove'; api_name: string }>>();
    const otherFieldObjects = new Map<string, Array<{ operator: 'remove'; api_name: string }>>();

    for (const [objectName, fields] of Object.entries(fieldsByObject)) {
        for (const field of fields) {
            const apiName = field.api_name || field.apiName;
            if (!apiName || isSystemSchemaName(apiName)) {
                continue;
            }

            const target = getRemovalGroup(field, referenceFieldObjects, lookupObjects, otherFieldObjects);
            const existing = target.get(objectName) || [];
            existing.push({ operator: 'remove', api_name: apiName });
            target.set(objectName, existing);
        }
    }

    return {
        referenceFieldObjects: mapRemovalObjects(referenceFieldObjects),
        lookupObjects: mapRemovalObjects(lookupObjects),
        otherFieldObjects: mapRemovalObjects(otherFieldObjects)
    };
}

export async function deleteAllCustomObjects(
    client: SchemaClientLike,
    options: DeleteAllCustomObjectsOptions = {}
): Promise<DeleteAllCustomObjectsResult> {
    if (options.confirm !== true) {
        throw new Error('deleteAllCustomObjects requires { confirm: true }.');
    }

    const context = options.context || 'schema.deleteAllCustomObjects';
    const allObjects = await client.object.listWithIterator();
    const customObjects = (allObjects.items || []).filter((object: any) => !isSystemSchemaName(object.apiName || object.api_name || ''));
    const objectNames = customObjects.map((object: any) => object.apiName || object.api_name);
    const fieldsByObject: Record<string, any[]> = {};

    for (const objectName of objectNames) {
        const fieldResult = await client.object.metadata.fields({ object_name: objectName });
        if (fieldResult.code !== undefined && String(fieldResult.code) !== '0') {
            throw new Error(`${context}.readFields(${objectName}) failed: ${fieldResult.code} ${fieldResult.msg || fieldResult.message || ''}`.trim());
        }
        fieldsByObject[objectName] = fieldResult.data?.fields || [];
    }

    const removalPlan = buildFieldRemovalPlan(fieldsByObject);
    const fieldRemovalResults: SchemaBatchExecuteResult[] = [];

    for (const [phase, updateObjects] of [
        ['referenceFields', removalPlan.referenceFieldObjects],
        ['lookupFields', removalPlan.lookupObjects],
        ['otherFields', options.removeOtherFields ? removalPlan.otherFieldObjects : []]
    ] as Array<[string, SchemaFieldRemovalPlan['referenceFieldObjects']]>) {
        if (updateObjects.length === 0) {
            continue;
        }

        fieldRemovalResults.push(await batchExecute(
            updateObjects,
            (batch) => client.schema.update({ objects: batch }),
            {
                batchSize: options.batchSize,
                context: `${context}.${phase}`,
                continueOnError: options.continueOnError,
                checkResponse: options.checkResponse,
                responseOptions: options.responseOptions
            }
        ));
    }

    const result: DeleteAllCustomObjectsResult = {
        deletedObjects: objectNames,
        removalPlan,
        fieldRemovalResults
    };

    if (objectNames.length > 0) {
        result.deleteResults = await batchExecute(
            objectNames,
            (batch) => client.schema.delete({ api_names: batch }),
            {
                batchSize: options.batchSize,
                context: `${context}.deleteObjects`,
                continueOnError: options.continueOnError,
                checkResponse: options.checkResponse,
                responseOptions: {
                    ...options.responseOptions,
                    allowDataNull: true
                }
            }
        );
    }

    if (options.verify !== false) {
        const after = await client.object.listWithIterator();
        result.remainingObjects = (after.items || [])
            .filter((object: any) => objectNames.includes(object.apiName || object.api_name))
            .map((object: any) => object.apiName || object.api_name);
        if (result.remainingObjects.length > 0) {
            throw new Error(`${context} verification failed: remaining objects ${result.remainingObjects.join(', ')}`);
        }
    }

    return result;
}

function getItemApiName(item: SchemaResponseItem): string | undefined {
    return item.api_name || item.apiName || item.name;
}

function getSchemaFieldTypeName(field: SchemaStageFieldDefinition | any): string | undefined {
    const type = field.type;
    if (typeof type === 'string') {
        return type;
    }
    return type?.name;
}

function toAddField(field: SchemaStageFieldDefinition): SchemaStageFieldDefinition {
    return {
        ...field,
        operator: 'add'
    };
}

function toShellObject(object: SchemaManagedObjectDefinition): SchemaManagedObjectDefinition {
    const { fields: _fields, ...shell } = object;
    const originalSettings = object.settings || {};
    return {
        ...shell,
        settings: {
            ...originalSettings,
            display_name: '_id',
            allow_search_fields: ['_id'],
            search_layout: []
        }
    };
}

async function getExistingObjectNames(client: SchemaClientLike): Promise<Set<string>> {
    const result = await client.object.listWithIterator();
    return new Set((result.items || []).map((object: any) => object.apiName || object.api_name).filter(Boolean));
}

async function getExistingFieldNames(client: SchemaClientLike, objectName: string): Promise<Set<string>> {
    const result = await client.object.metadata.fields({ object_name: objectName });
    if (result.code !== undefined && String(result.code) !== '0') {
        throw new Error(`getExistingFieldNames(${objectName}) failed: ${result.code} ${result.msg || result.message || ''}`.trim());
    }
    return new Set((result.data?.fields || []).map((field: any) => field.apiName || field.api_name).filter(Boolean));
}

function assertNoSystemObjects(apiNames: string[], context: string): void {
    const systemNames = apiNames.filter(isSystemSchemaName);
    if (systemNames.length > 0) {
        throw new Error(`${context} cannot modify system objects: ${systemNames.join(', ')}`);
    }
}

function assertNoSystemFields(apiNames: string[], context: string): void {
    const systemNames = apiNames.filter(isSystemSchemaName);
    if (systemNames.length > 0) {
        throw new Error(`${context} cannot modify system fields: ${systemNames.join(', ')}`);
    }
}

function getRemovalGroup(
    field: any,
    referenceFieldObjects: Map<string, Array<{ operator: 'remove'; api_name: string }>>,
    lookupObjects: Map<string, Array<{ operator: 'remove'; api_name: string }>>,
    otherFieldObjects: Map<string, Array<{ operator: 'remove'; api_name: string }>>
): Map<string, Array<{ operator: 'remove'; api_name: string }>> {
    const typeName = getSchemaFieldTypeName(field);
    if (typeName === 'reference_field' || typeName === 'referenceField') {
        return referenceFieldObjects;
    }
    if (typeName === 'lookup' || typeName === 'lookup_multi') {
        return lookupObjects;
    }
    return otherFieldObjects;
}

function mapRemovalObjects(
    fieldsByObject: Map<string, Array<{ operator: 'remove'; api_name: string }>>
): Array<{ api_name: string; fields: Array<{ operator: 'remove'; api_name: string }> }> {
    return Array.from(fieldsByObject.entries()).map(([api_name, fields]) => ({ api_name, fields }));
}
