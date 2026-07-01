/**
 * aPaaS 数据对象 Schema 管理完整规范
 * 
 * 本文档包含：
 * 1. Schema 接口规范（创建、更新对象）
 * 2. 字段类型完整定义（20+ 字段类型）
 * 3. 系统字段说明（6 个自动创建字段）
 * 4. 最佳实践和注意事项
 */

// ============================================================
// Schema 接口规范
// ============================================================

/**
 * 多语文本结构
 */
export interface MultilingualText {
    zh_cn: string;
    en_us: string;
}

/**
 * 对象设置
 */
export interface ObjectSettings {
    /** 可搜索字段列表 - 注意：不要包含 _name，会报错 */
    allow_search_fields?: string[];
    /** 展示名称字段 - 注意：不要使用 _name，应使用自定义字段 */
    display_name?: string;
    /** 搜索布局字段列表 */
    search_layout?: string[];
}

/**
 * 字段类型定义
 */
export interface FieldTypeDefinition {
    /** 字段类型名称 */
    name: string;
    /** 字段类型设置（根据不同类型有不同的结构） */
    settings?: any;
}

/**
 * 加密类型枚举
 */
export type EncryptType = 'none' | 'rand' | 'fix' | 'ope';

/**
 * 字段操作类型（用于 update 接口）
 */
export type FieldOperator = 'add' | 'replace' | 'remove';

/**
 * 创建对象时的字段定义
 */
export interface CreateFieldDefinition {
    /** 字段 API 名称（必填） */
    api_name: string;
    /** 字段标签（必填） */
    label: MultilingualText;
    /** 字段类型（必填） */
    type: FieldTypeDefinition;
    /** 加密类型（建议显式指定，默认 'none'） */
    encrypt_type?: EncryptType | null;
}

/**
 * 更新对象时的字段定义
 */
export interface UpdateFieldDefinition {
    /** 操作类型（必填）：add=添加字段, replace=修改字段, remove=删除字段 */
    operator: FieldOperator;
    /** 字段 API 名称（必填） */
    api_name: string;
    /** 字段标签（operator=add/replace 时需要） */
    label?: MultilingualText;
    /** 字段类型（operator=add/replace 时需要） */
    type?: FieldTypeDefinition;
    /** 加密类型（可选） */
    encrypt_type?: EncryptType | null;
}

/**
 * 创建对象的定义
 */
export interface CreateObjectDefinition {
    /** 对象 API 名称（必填） */
    api_name: string;
    /** 对象标签（必填） */
    label: MultilingualText;
    /** 对象设置（可选） */
    settings?: ObjectSettings;
    /** 字段列表（可选）。schema.create 会忽略 fields，安全做法是先建空壳，再用 schema.update 添加字段。 */
    fields?: CreateFieldDefinition[];
}

/**
 * 更新对象的定义
 */
export interface UpdateObjectDefinition {
    /** 对象 API 名称（必填） */
    api_name: string;
    /** 对象标签（可选，不传则不修改） */
    label?: MultilingualText;
    /** 对象设置（可选，不传则不修改） */
    settings?: ObjectSettings;
    /** 字段列表（可选，不传则不修改字段） */
    fields?: UpdateFieldDefinition[];
}

/**
 * Schema 接口最佳实践和限制说明
 */
export const SCHEMA_GUIDELINES = {
    /** 批量操作限制 */
    limits: {
        batch_size: 10, // 单次请求最多 10 个对象
    },
    
    /** 系统字段说明 */
    system_fields: {
        description: '系统字段会自动创建，不需要在 fields 数组中定义',
        fields: ['_id', '_name', '_createdBy', '_createdAt', '_updatedBy', '_updatedAt'],
    },
    
    /** display_name 限制 */
    display_name: {
        restriction: '不能使用 _name 作为 display_name',
        reason: '系统会误认为是包含 NOW/TODAY 函数的公式',
        solution: '使用自定义字段（如 code、name 等）',
        example: 'display_name: "code"',
    },
    
    /** allow_search_fields 限制 */
    allow_search_fields: {
        restriction: '不能包含 _name 字段',
        reason: '系统不允许在可搜索字段中使用包含公式的字段',
        solution: '只包含 _id 和其他自定义字段',
        example: 'allow_search_fields: ["_id", "code", "name"]',
    },
    
    /** encrypt_type 说明 */
    encrypt_type: {
        required: true,
        description: '建议每个字段都显式指定 encrypt_type',
        options: {
            none: '不加密（默认）',
            rand: '非确定性加密',
            fix: '固定加密',
            ope: '保序加密',
        },
    },
    
    /** operator 说明（用于 update） */
    operator: {
        required: true,
        description: '更新字段时必须指定操作类型',
        options: {
            add: { description: '添加新字段', required_fields: ['api_name', 'label', 'type'] },
            replace: { description: '修改现有字段', required_fields: ['api_name', 'label', 'type'], note: '必须传完整 type（name + settings），仅修改标签也要带当前字段类型配置' },
            remove: { description: '删除字段', required_fields: ['api_name'], note: '只需要 api_name' },
        },
    },
    
    /** 关联字段说明 */
    reference_fields: {
        description: '关联字段用于在对象之间建立关联关系',
        types: {
            lookup: {
                description: '关联对象（单值）- 关联另一个对象的单条记录',
                settings: {
                    objectAPIName: '目标对象的 API 名称（必填）',
                    required: '是否必填（可选）',
                    displayStyle: '显示样式（可选）'
                },
                example: 'type: { name: "lookup", settings: { objectAPIName: "supplier" } }',
                write_format: '写入时只需要 _id：{ supplier: { _id: 123456 } }'
            },
            lookup_multi: {
                description: '关联对象（多值）- 关联另一个对象的多条记录',
                settings: {
                    objectAPIName: '目标对象的 API 名称（必填）',
                    multiple: 'true（多选）'
                },
                limit: '最多可以关联 200 条记录',
                example: 'type: { name: "lookup_multi", settings: { objectAPIName: "category", multiple: true } }',
                write_format: '写入时提供多个 _id：{ categories: [{ _id: 111 }, { _id: 222 }] }'
            },
            referenceField: {
                description: '引用字段 - 引用关联对象中的字段值（系统自动维护，不可直接写入）',
                settings: {
                    guideFieldAPIName: '引导字段（lookup 字段）',
                    fieldAPIName: '引用的目标字段',
                    referenceObjectApiName: '引用的对象'
                },
                example: 'type: { name: "referenceField", settings: { guideFieldAPIName: "supplier", fieldAPIName: "name", referenceObjectApiName: "supplier" } }',
                note: '系统根据 lookup 字段自动计算，不能直接写入数据'
            },
            rollup: {
                description: '汇总字段 - 对关联对象的数据进行聚合计算（系统自动维护，不可直接写入）',
                settings: {
                    objectAPIName: '被汇总的对象',
                    lookupFieldAPIName: '关联字段（当前对象中的 lookup 字段）',
                    fieldAPIName: '要汇总的字段',
                    functionType: '汇总函数：sum/avg/count/max/min/countDistinct',
                    rangeFilter: '过滤条件（可选）'
                },
                example: 'type: { name: "rollup", settings: { objectAPIName: "order_item", lookupFieldAPIName: "order", fieldAPIName: "amount", functionType: "sum" } }',
                note: '系统根据关联数据自动汇总，不能直接写入数据'
            }
        },
        prerequisites: {
            description: '创建关联字段的前置条件',
            rules: [
                '目标对象必须已存在',
                'objectAPIName 必须准确（区分大小写）',
                'referenceField 和 rollup 依赖的 lookup 字段必须先创建',
                '删除 lookup 字段前，需要先删除依赖它的 referenceField 和 rollup 字段'
            ]
        },
        system_maintained: {
            description: '系统自动维护的字段不能直接写入数据',
            fields: ['referenceField', 'rollup', 'formula'],
            reason: '这些字段的值由系统根据其他字段或公式自动计算'
        }
    },
    
    /** 响应结构说明 */
    response: {
        structure: '双层响应结构',
        top_level: {
            code: '0 表示请求格式正确',
            msg: 'success',
            data: '包含 items 数组',
        },
        item_level: {
            description: '每个对象的实际创建/更新状态',
            location: 'data.items[].status',
            check: '需要检查 status.code 判断是否真正成功',
        },
    },
} as const;

/**
 * 创建对象示例
 */
export const CREATE_OBJECT_EXAMPLE: CreateObjectDefinition = {
    api_name: 'product',
    label: {
        zh_cn: '产品',
        en_us: 'Product',
    },
    settings: {
        display_name: 'code', // ✅ 使用自定义字段
        allow_search_fields: ['_id', 'code', 'name'], // ✅ 不包含 _name
        search_layout: ['code', 'name'],
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
                    max_length: 50,
                },
            },
            encrypt_type: 'none', // ✅ 显式指定
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
                    max_length: 200,
                },
            },
            encrypt_type: 'none',
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
                    decimal_places: 2,
                },
            },
            encrypt_type: 'none',
        },
    ],
};

/**
 * 更新对象示例（添加字段）
 */
export const UPDATE_OBJECT_ADD_FIELD_EXAMPLE: UpdateObjectDefinition = {
    api_name: 'product',
    fields: [
        {
            operator: 'add', // 添加新字段
            api_name: 'description',
            label: { zh_cn: '产品描述', en_us: 'Description' },
            type: {
                name: 'text',
                settings: {
                    required: false,
                    unique: false,
                    case_sensitive: false,
                    multiline: true,
                    max_length: 1000,
                },
            },
            encrypt_type: 'none',
        },
    ],
};

/**
 * 更新对象示例（修改字段）
 */
export const UPDATE_OBJECT_REPLACE_FIELD_EXAMPLE: UpdateObjectDefinition = {
    api_name: 'product',
    fields: [
        {
            operator: 'replace', // 修改现有字段
            api_name: 'price',
            label: { zh_cn: '销售价格', en_us: 'Sale Price' }, // 修改标签
            type: {
                name: 'float',
                settings: {
                    required: false,
                    unique: false,
                    display_as_percentage: false,
                    decimal_places_number: 2,
                },
            },
            encrypt_type: 'none',
        },
    ],
};

/**
 * 更新对象示例（删除字段）
 */
export const UPDATE_OBJECT_REMOVE_FIELD_EXAMPLE: UpdateObjectDefinition = {
    api_name: 'product',
    fields: [
        {
            operator: 'remove', // 删除字段
            api_name: 'description', // 只需要 api_name
        },
    ],
};

/**
 * 更新对象示例（只修改标签和设置）
 */
export const UPDATE_OBJECT_SETTINGS_EXAMPLE: UpdateObjectDefinition = {
    api_name: 'product',
    label: {
        zh_cn: '产品信息', // 修改标签
        en_us: 'Product Information',
    },
    settings: {
        display_name: 'name', // 修改展示名称字段
        allow_search_fields: ['_id', 'code', 'name', 'description'],
        search_layout: ['code', 'name', 'description'],
    },
    // 不传 fields，表示不修改字段
};

// ============================================================
// 字段类型定义
// ============================================================

/**
 * 字段类型元数据接口
 */
export interface FieldTypeMetadata {
    /** API 名称 */
    api_name: string;
    /** 字段类型中文名称 */
    label: string;
    /** 存储数据类型 */
    storage_type: 'String' | 'Number' | 'Boolean' | 'Object' | 'Array';
    /** 是否为系统字段 */
    is_system: boolean;
    /** 字段描述 */
    description: string;
    /** 存储示例 */
    example: any;
    /** 特殊说明 */
    notes?: string;
}

/**
 * aPaaS 平台所有字段类型定义
 */
export const FIELD_TYPES: Record<string, FieldTypeMetadata> = {
    // ==================== 系统默认字段（6个，不可修改）====================
    _id: {
        api_name: '_id',
        label: 'ID',
        storage_type: 'Number',
        is_system: true,
        description: '系统默认字段，数据的关键 ID，唯一键，可被其他对象引用为外键',
        example: 1766662402370564,
        notes: '16位数字，注意该 ID 并不会随着记录的增多而递增生成'
    },

    _name: {
        api_name: '_name',
        label: '展示名称',
        storage_type: 'Array',
        is_system: true,
        description: '系统默认字段，记录的展示名称',
        example: [
            {
                language_code: 2052,
                text: '1766662402370564'
            }
        ],
        notes: '以多语本形式存储，language_code: 2052=中文, 1033=英文'
    },

    _createdBy: {
        api_name: '_createdBy',
        label: '创建人',
        storage_type: 'Object',
        is_system: true,
        description: '系统默认字段，记录创建人信息',
        example: {
            _id: 1766661610377271,
            _name: [
                { language_code: 1033, text: 'San Zhang' },
                { language_code: 2052, text: '张三' }
            ],
            avatar: {
                color: null,
                color_id: '',
                content: null,
                image: {
                    large: 'https://s1-imfile.feishucdn.com/static-resource/v1/52a9a370-1967-42b2-9c30-730fed90d81g~?image_size=noop&cut_type=&quality=&format=png&sticker_format=.webp'
                },
                source: 'image'
            },
            i18n_name: [
                { language_code: 1033, text: 'San Zhang' },
                { language_code: 2052, text: '张三' }
            ],
            id: 1766661610377271,
            is_deleted: false,
            name: '张三'
        },
        notes: '以关联对象的形式存储，关联系统的用户对象。包含 _id、_name（多语数组）、id、name（中文字符串）、avatar 头像信息'
    },

    _createdAt: {
        api_name: '_createdAt',
        label: '创建时间',
        storage_type: 'Number',
        is_system: true,
        description: '系统默认字段，记录创建时间',
        example: 1684823950061,
        notes: '属于日期时间字段，以 13 位毫秒时间戳存储'
    },

    _updatedBy: {
        api_name: '_updatedBy',
        label: '更新人',
        storage_type: 'Object',
        is_system: true,
        description: '系统默认字段，记录最后更新人信息',
        example: {
            _id: 1766661610377271,
            _name: [
                { language_code: 1033, text: 'San Zhang' },
                { language_code: 2052, text: '张三' }
            ],
            avatar: {
                color: null,
                color_id: '',
                content: null,
                image: {
                    large: 'https://s1-imfile.feishucdn.com/static-resource/v1/52a9a370-1967-42b2-9c30-730fed90d81g~?image_size=noop&cut_type=&quality=&format=png&sticker_format=.webp'
                },
                source: 'image'
            },
            i18n_name: [
                { language_code: 1033, text: 'San Zhang' },
                { language_code: 2052, text: '张三' }
            ],
            id: 1766661610377271,
            is_deleted: false,
            name: '张三'
        },
        notes: '以关联对象的形式存储，关联系统的用户对象'
    },

    _updatedAt: {
        api_name: '_updatedAt',
        label: '更新时间',
        storage_type: 'Number',
        is_system: true,
        description: '系统默认字段，记录最后更新时间',
        example: 1688610057236,
        notes: '属于日期时间字段，以 13 位毫秒时间戳存储'
    },

    // ==================== 基础字段类型 ====================
    text: {
        api_name: 'text',
        label: '文本',
        storage_type: 'String',
        is_system: false,
        description: '单行文本字段',
        example: '文本'
    },

    bigint: {
        api_name: 'bigint',
        label: '整数',
        storage_type: 'String',
        is_system: false,
        description: '整数字段',
        example: '10',
        notes: '存储为字符串格式'
    },

    number: {
        api_name: 'number',
        label: '浮点数',
        storage_type: 'Number',
        is_system: false,
        description: '数字字段，可带小数点',
        example: 99.991
    },

    date: {
        api_name: 'date',
        label: '日期',
        storage_type: 'String',
        is_system: false,
        description: '日期字段',
        example: '2023-05-10',
        notes: '格式固定为 "YYYY-MM-DD"，读取和写入都需要按照此格式'
    },

    datetime: {
        api_name: 'datetime',
        label: '日期时间',
        storage_type: 'Number',
        is_system: false,
        description: '日期时间字段',
        example: 1683698580000,
        notes: '以 13 位毫秒时间戳存储'
    },

    phone: {
        api_name: 'phone',
        label: '手机号码',
        storage_type: 'Object',
        is_system: false,
        description: '手机号码字段',
        example: {
            code: '+86',
            key: '+86(CN)',
            number: '17624863925'
        },
        notes: '包含国家/地区 code 和手机号'
    },

    email: {
        api_name: 'email',
        label: '邮箱',
        storage_type: 'String',
        is_system: false,
        description: '邮箱字段',
        example: 'zhaoyizhe@bytedance.com'
    },

    option: {
        api_name: 'option',
        label: '选项',
        storage_type: 'String',
        is_system: false,
        description: '单选字段',
        example: 'enable',
        notes: '字符串内的内容为选项的 API 名称。可通过 context.metadata.object("objectApiName").getField("optionApiName") 获取选项的元数据信息'
    },

    boolean: {
        api_name: 'boolean',
        label: '布尔',
        storage_type: 'Boolean',
        is_system: false,
        description: '布尔值字段',
        example: true
    },

    avatar: {
        api_name: 'avatar',
        label: '头像/标识',
        storage_type: 'Object',
        is_system: false,
        description: '头像或标识字段',
        example: {
            color: null,
            color_id: '',
            content: null,
            image: {
                large: 'https://s1-imfile.feishucdn.com/static-resource/v1/52a9a370-1967-42b2-9c30-730fed90d81g~?image_size=noop&cut_type=&quality=&format=png&sticker_format=.webp'
            },
            source: 'image'
        }
    },

    multilingual: {
        api_name: 'multilingual',
        label: '多语文本',
        storage_type: 'Array',
        is_system: false,
        description: '多语言文本字段',
        example: [
            {
                language_code: 1033,
                text: 'Multilingual-English'
            },
            {
                language_code: 2052,
                text: '多语言-中文'
            }
        ],
        notes: '包含两个对象，中文文本的 language_code 为 2052，英文文本的 language_code 为 1033'
    },

    richText: {
        api_name: 'richText',
        label: '富文本',
        storage_type: 'Object',
        is_system: false,
        description: '富文本字段',
        example: {
            config: [
                {
                    resourceId: 'BIZ_74da2122261247e6bda16834222c8f74',
                    resourceType: 'img',
                    token: '022a7279add24dcca7c5e2ae62afcc5c'
                }
            ],
            preview: '',
            raw: '<div style="white-space: pre;"><span style="color: rgb(245, 74, 69);">红色文本</span>\n</div><div style="white-space: pre;"><span style="text-decoration: underline;"><i><span style="font-weight: bold;">加粗文本</span></i></span>\n</div><div style="white-space: pre;">下面是图片\n</div><div style="white-space: pre;"><img src="/ui/attachment?token=f02efe6d990846eba6d2b6aafe053a6c&amp;preview=true&amp;imgId=BIZ_74da2122261247e6bda16834222c8f74" alt="20230523-143736.jpeg">\n</div>'
        },
        notes: '包含了文件的 token 信息和原始的 html 信息'
    },

    attachment: {
        api_name: 'attachment',
        label: '文件',
        storage_type: 'Array',
        is_system: false,
        description: '文件附件字段',
        example: [
            {
                id: 'BIZ_b38406e0f3a048c2a245ffeb9a14e42a',
                mime_type: 'mp4',
                name: 'test.mp4',
                size: 14216083,
                token: '6a4cb16d29bb43f5bed9735b8c980793'
            }
        ],
        notes: '注意文件的存储只能是数组的形式，即使是设置了最多可上传数量为1，仍然为数组。下载文件：域名前缀 + /ae/api/v1/assets/attachment/download?token=token'
    },

    autoid: {
        api_name: 'autoid',
        label: '自动编号',
        storage_type: 'String',
        is_system: false,
        description: '自动编号字段',
        example: '5'
    },

    decimal: {
        api_name: 'decimal',
        label: '定点数',
        storage_type: 'String',
        is_system: false,
        description: '定点数字段，高精度数字',
        example: '123456789.987654321',
        notes: '存储为字符串格式，保证精度'
    },

    // ==================== 高级字段类型 ====================
    formula: {
        api_name: 'formula',
        label: '公式',
        storage_type: 'String',
        is_system: false,
        description: '公式字段',
        example: '文本',
        notes: '公式字段的返回值取决于选择的返回类型，各个类型的存储请参考文档其他部分'
    },

    rollup: {
        api_name: 'rollup',
        label: '汇总',
        storage_type: 'Number',
        is_system: false,
        description: '汇总字段',
        example: 0,
        notes: '可带有小数点'
    },

    lookup: {
        api_name: 'lookup',
        label: '关联对象',
        storage_type: 'Object',
        is_system: false,
        description: '关联对象字段（单值）',
        example: {
            _id: 1767211281913907,
            _name: '关联其他表的一条记录',
            id: 1767211281913907,
            is_deleted: false,
            name: '关联其他表的一条记录'
        },
        notes: '与关联的用户对象一致，包含 _id 和 _name 之外，也包含了 id 和 name。此处的 _name 并不是多语文本，因为在这个数据对象下的展示名称就为普通文本。向关联对象字段写入数据时，仅写入 _id 属性即可，示例：lookup: { _id: 1767211281913907 }'
    },

    lookup_multi: {
        api_name: 'lookup_multi',
        label: '关联对象-多值',
        storage_type: 'Array',
        is_system: false,
        description: '关联对象字段（多值）',
        example: [
            {
                _id: 1767211281913907,
                _name: '关联其他表的一条记录',
                id: 1767211281913907,
                is_deleted: false,
                name: '关联其他表的一条记录'
            },
            {
                _id: 1767211039388715,
                _name: '关联其他表的另一条记录',
                id: 1767211039388715,
                is_deleted: false,
                name: '关联其他表的另一条记录'
            }
        ],
        notes: '数组里的内容和单条的关联对象字段一致。注意对于多条记录的关联对象，最多可以关联 200 条'
    },

    referenceField: {
        api_name: 'referenceField',
        label: '引用字段',
        storage_type: 'Array',
        is_system: false,
        description: '引用字段',
        example: [
            {
                language_code: 1033,
                text: 'San Zhang'
            },
            {
                language_code: 2052,
                text: '张三'
            }
        ],
        notes: '与公式类似。引用字段的返回值取决于选择的返回类型，各个类型的存储请参考文档其他部分'
    },

    region: {
        api_name: 'region',
        label: '行政区划',
        storage_type: 'Object',
        is_system: false,
        description: '行政区划字段',
        example: {
            _isDeleted: false,
            fullPath: [
                {
                    language_code: 1033,
                    text: 'Xihu / Hangzhou / Zhejiang / Chinese mainland'
                },
                {
                    language_code: 2052,
                    text: '中国大陆 / 浙江 / 杭州市 / 西湖区'
                }
            ],
            id: 1747012778430564,
            level: 4,
            regionCode: '330106'
        },
        notes: '行政区域字段对象内包含了 fullPath 多语文本，以及 id 和 level 层级。行政区划对象中，以 regionCode 作为唯一值。如果想获取某一行政区划的详细记录，可以通过 context.db.object("_region").select("_id", "_cityLevel").where({ _name: application.operator.contain("北京") }).findOne() 获取'
    }
};

/**
 * 系统默认字段列表（每个对象都会自动创建）
 */
export const SYSTEM_FIELDS = ['_id', '_name', '_createdBy', '_createdAt', '_updatedBy', '_updatedAt'] as const;

/**
 * 获取系统字段
 */
export function getSystemFields(): FieldTypeMetadata[] {
    return SYSTEM_FIELDS.map(fieldName => FIELD_TYPES[fieldName]);
}

/**
 * 获取自定义字段类型
 */
export function getCustomFieldTypes(): FieldTypeMetadata[] {
    return Object.values(FIELD_TYPES).filter(field => !field.is_system);
}

/**
 * 根据 API 名称获取字段类型信息
 */
export function getFieldType(apiName: string): FieldTypeMetadata | undefined {
    return FIELD_TYPES[apiName];
}

/**
 * 判断是否为系统字段
 */
export function isSystemField(apiName: string): boolean {
    return SYSTEM_FIELDS.includes(apiName as any);
}

/**
 * 语言代码常量
 */
export const LANGUAGE_CODES = {
    EN_US: 1033,
    ZH_CN: 2052
} as const;

/**
 * 多语文本辅助函数：创建多语文本对象
 */
export function createMultilingualText(zhCn: string, enUs?: string): Array<{ language_code: number; text: string }> {
    return [
        { language_code: LANGUAGE_CODES.ZH_CN, text: zhCn },
        { language_code: LANGUAGE_CODES.EN_US, text: enUs || zhCn }
    ];
}

/**
 * 多语文本辅助函数：从多语文本对象中提取文本
 */
export function extractMultilingualText(
    multilingualText: Array<{ language_code: number; text: string }>,
    languageCode: number = LANGUAGE_CODES.ZH_CN
): string {
    const found = multilingualText.find(item => item.language_code === languageCode);
    return found ? found.text : multilingualText[0]?.text || '';
}
