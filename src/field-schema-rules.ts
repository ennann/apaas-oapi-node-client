/**
 * Canonical field rules for schema.create/schema.update.
 * Verified in namespace `package_5dc5b7__c` on 2026-02-10.
 *
 * Notes:
 * - `metadataType` is usually the type name returned by object.metadata.fields.
 * - Some entries are rule extensions for practical schema usage (`text_multiline`, `lookup_multi`).
 * - `schemaType` is the type name that should be sent to schema.create/update.
 */

export type MetadataFieldType =
    | 'text'
    | 'text_multiline'
    | 'bigint'
    | 'number'
    | 'date'
    | 'datetime'
    | 'option'
    | 'boolean'
    | 'lookup'
    | 'lookup_multi'
    | 'referenceField'
    | 'file'
    | 'autoId'
    | 'richText'
    | 'mobileNumber'
    | 'avatarOrLogo'
    | 'email'
    | 'region'
    | 'decimal'
    | 'multilingual';

export type SchemaFieldType =
    | 'text'
    | 'bigint'
    | 'float'
    | 'date'
    | 'datetime'
    | 'enum'
    | 'boolean'
    | 'lookup'
    | 'reference_field'
    | 'attachment'
    | 'auto_number'
    | 'richText'
    | 'phone'
    | 'avatar'
    | 'email'
    | 'region'
    | 'decimal'
    | 'multilingual';

export interface FieldCreateRule {
    metadataType: MetadataFieldType;
    schemaType: SchemaFieldType;
    settingsExample: Record<string, unknown>;
    dependsOn?: string[];
    notes?: string;
}

export const SCHEMA_TYPE_BY_METADATA_TYPE: Record<MetadataFieldType, SchemaFieldType> = {
    text: 'text',
    text_multiline: 'text',
    bigint: 'bigint',
    number: 'float',
    date: 'date',
    datetime: 'datetime',
    option: 'enum',
    boolean: 'boolean',
    lookup: 'lookup',
    lookup_multi: 'lookup',
    referenceField: 'reference_field',
    file: 'attachment',
    autoId: 'auto_number',
    richText: 'richText',
    mobileNumber: 'phone',
    avatarOrLogo: 'avatar',
    email: 'email',
    region: 'region',
    decimal: 'decimal',
    multilingual: 'multilingual'
};

export const OPTION_COLOR_LIST = [
    'blue',
    'cyan',
    'green',
    'yellow',
    'orange',
    'red',
    'magenta',
    'purple',
    'blueMagenta',
    'grey'
] as const;

export const FIELD_SCHEMA_RULES: FieldCreateRule[] = [
    {
        metadataType: 'text',
        schemaType: 'text',
        settingsExample: {
            required: false,
            unique: false,
            case_sensitive: false,
            multiline: false,
            max_length: 255
        }
    },
    {
        metadataType: 'text_multiline',
        schemaType: 'text',
        settingsExample: {
            required: false,
            unique: false,
            case_sensitive: false,
            multiline: true,
            max_length: 100000
        }
    },
    {
        metadataType: 'bigint',
        schemaType: 'bigint',
        settingsExample: {
            required: false,
            unique: false
        }
    },
    {
        metadataType: 'number',
        schemaType: 'float',
        settingsExample: {
            required: false,
            unique: false,
            display_as_percentage: false,
            decimal_places_number: 2
        },
        notes: 'Do not send create type as `number`.'
    },
    {
        metadataType: 'date',
        schemaType: 'date',
        settingsExample: {
            required: false
        }
    },
    {
        metadataType: 'datetime',
        schemaType: 'datetime',
        settingsExample: {
            required: false
        }
    },
    {
        metadataType: 'option',
        schemaType: 'enum',
        settingsExample: {
            required: false,
            multiple: false,
            option_source: 'custom',
            global_option_api_name: '',
            options: [
                {
                    label: { zh_cn: 'Option One', en_us: 'Option One' },
                    api_name: 'option_one',
                    description: null,
                    color: 'blue',
                    active: true
                },
                {
                    label: { zh_cn: 'Option Two', en_us: 'Option Two' },
                    api_name: 'option_two',
                    description: null,
                    color: 'green',
                    active: true
                }
            ]
        },
        notes: `Do not send create type as \`option\`. Available option colors: ${OPTION_COLOR_LIST.join(', ')}.`
    },
    {
        metadataType: 'boolean',
        schemaType: 'boolean',
        settingsExample: {
            default_value: true,
            description_if_true: { zh_cn: '1', en_us: '1' },
            description_if_false: { zh_cn: '0', en_us: '0' }
        }
    },
    {
        metadataType: 'lookup',
        schemaType: 'lookup',
        settingsExample: {
            required: false,
            multiple: false,
            referenced_object_api_name: '_user',
            display_as_tree: false,
            display_style: 'select'
        },
        dependsOn: ['Target object must exist first: `_user`'],
        notes: 'Single-value lookup (`multiple: false`), can be used by `reference_field`.'
    },
    {
        metadataType: 'lookup_multi',
        schemaType: 'lookup',
        settingsExample: {
            required: false,
            multiple: true,
            referenced_object_api_name: '_user',
            display_as_tree: false,
            display_style: 'select'
        },
        dependsOn: ['Target object must exist first: `_user`'],
        notes: 'Multi-value lookup (`multiple: true`) cannot be used by `reference_field`.'
    },
    {
        metadataType: 'referenceField',
        schemaType: 'reference_field',
        settingsExample: {
            current_lookup_field_api_name: 'lookup_835c2a2457b',
            target_reference_field_api_name: '_lark_user_id'
        },
        dependsOn: [
            'A single-value lookup field must exist first in the same object',
            'The target field must exist in the lookup target object'
        ],
        notes: 'Guide field must be single lookup (`multiple: false`).'
    },
    {
        metadataType: 'file',
        schemaType: 'attachment',
        settingsExample: {
            required: false,
            any_type: true,
            max_uploaded_num: 10,
            mime_types: []
        },
        notes: 'Do not send create type as `file`.'
    },
    {
        metadataType: 'autoId',
        schemaType: 'auto_number',
        settingsExample: {
            generation_method: 'random',
            digits: 1,
            prefix: '',
            suffix: '',
            start_at: '1'
        },
        notes: 'Do not send create type as `autoId`.'
    },
    {
        metadataType: 'richText',
        schemaType: 'richText',
        settingsExample: {
            required: false,
            max_length: 1000
        }
    },
    {
        metadataType: 'mobileNumber',
        schemaType: 'phone',
        settingsExample: {
            required: false,
            unique: false
        },
        notes: 'Do not send create type as `mobileNumber`.'
    },
    {
        metadataType: 'avatarOrLogo',
        schemaType: 'avatar',
        settingsExample: {
            display_style: 'square'
        },
        notes: 'Do not send create type as `avatarOrLogo`.'
    },
    {
        metadataType: 'email',
        schemaType: 'email',
        settingsExample: {
            required: false,
            unique: false
        }
    },
    {
        metadataType: 'region',
        schemaType: 'region',
        settingsExample: {
            required: false,
            multiple: false,
            has_level_strict: true,
            strict_level: 4
        }
    },
    {
        metadataType: 'decimal',
        schemaType: 'decimal',
        settingsExample: {
            required: false,
            unique: false,
            display_as_percentage: false,
            decimal_places: 2
        }
    },
    {
        metadataType: 'multilingual',
        schemaType: 'multilingual',
        settingsExample: {
            required: false,
            unique: false,
            case_sensitive: false,
            multiline: false,
            max_length: 1000
        }
    }
];

export const SCHEMA_TYPE_MISMATCHES: Array<{
    metadataType: MetadataFieldType;
    schemaType: SchemaFieldType;
}> = FIELD_SCHEMA_RULES
    .filter((rule) => rule.metadataType !== rule.schemaType)
    .map((rule) => ({
        metadataType: rule.metadataType,
        schemaType: rule.schemaType
    }));

export const BATCH_UPDATE_REQUIREMENTS = {
    add: 'Use operator=add with full field definition.',
    replace: 'Use operator=replace and include full `type` (name + settings). Label-only replace fails.',
    remove: 'Use operator=remove with api_name only.',
    dependencyOrder: {
        add: ['lookup/lookup_multi before reference_field'],
        remove: ['reference_field before lookup/lookup_multi']
    },
    referenceFieldConstraint: 'reference_field only works with single lookup (`multiple: false`).'
} as const;
