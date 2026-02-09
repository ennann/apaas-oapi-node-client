/**
 * aPaaS 数据对象字段类型定义
 * 记录了平台支持的所有字段类型、存储格式和示例
 */

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
