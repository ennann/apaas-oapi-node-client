import dayjs from 'dayjs';
import axios, { AxiosInstance, AxiosError } from 'axios';
import { LoggerLevel } from './logger';
import { functionLimiter } from './limiter';

/**
 * 批量操作结果
 */
interface BatchResult<T> {
    /** 成功的项 */
    success: T[];
    /** 失败的项 */
    failed: Array<{ id: string; error: string }>;
    /** 成功数量 */
    successCount: number;
    /** 失败数量 */
    failedCount: number;
    /** 总数 */
    total: number;
}

/**
 * 重试配置
 */
interface RetryOptions {
    /** 最大重试次数 */
    maxRetries?: number;
    /** 初始延迟时间(ms) */
    initialDelay?: number;
    /** 最大延迟时间(ms) */
    maxDelay?: number;
    /** 延迟倍数 */
    backoffMultiplier?: number;
}

/**
 * 判断错误是否可重试
 */
function isRetryableError(error: any): boolean {
    // 网络错误
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
        return true;
    }

    // Axios 错误
    if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        // 没有响应(网络错误)
        if (!axiosError.response) {
            return true;
        }
        // 5xx 服务器错误
        if (axiosError.response.status >= 500) {
            return true;
        }
        // 429 限流
        if (axiosError.response.status === 429) {
            return true;
        }
    }

    return false;
}

/**
 * 带重试的函数执行
 */
async function executeWithRetry<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {},
    logContext: string = '',
    logger?: (level: LoggerLevel, ...args: any[]) => void
): Promise<T> {
    const {
        maxRetries = 3,
        initialDelay = 1000,
        maxDelay = 10000,
        backoffMultiplier = 2
    } = options;

    let lastError: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;

            // 最后一次尝试，直接抛出
            if (attempt === maxRetries) {
                break;
            }

            // 判断是否可重试
            if (!isRetryableError(error)) {
                throw error;
            }

            // 计算延迟时间(指数退避)
            const delay = Math.min(initialDelay * Math.pow(backoffMultiplier, attempt), maxDelay);

            if (logger) {
                logger(
                    LoggerLevel.warn,
                    `${logContext} Attempt ${attempt + 1}/${maxRetries + 1} failed, retrying in ${delay}ms...`,
                    error instanceof Error ? error.message : String(error)
                );
            }

            // 等待后重试
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    // 所有重试都失败
    throw lastError;
}

/**
 * Client 初始化配置
 */
interface ClientOptions {
    /** 命名空间, 例如 app_xxx */
    namespace: string;
    /** 应用 clientId */
    clientId: string;
    /** 应用 clientSecret */
    clientSecret: string;
    /** 是否禁用 token 缓存, 每次调用强制刷新 token, 默认 false */
    disableTokenCache?: boolean;
}

/**
 * 获取 token 接口返回体
 */
interface TokenResponse {
    code: string;
    data: {
        accessToken: string;
        expireTime: number; // 过期时间戳
    };
    msg: string;
}

/**
 * aPaaS OpenAPI 客户端
 */
class Client {
    private clientId: string;
    private clientSecret: string;
    private namespace: string;
    private disableTokenCache: boolean;
    private accessToken: string | null = null;
    private expireTime: number | null = null;
    private axiosInstance: AxiosInstance;
    private loggerLevel: LoggerLevel = LoggerLevel.info;

    /**
     * 构造函数
     * @param options ClientOptions
     */
    constructor(options: ClientOptions) {
        this.clientId = options.clientId;
        this.clientSecret = options.clientSecret;
        this.namespace = options.namespace;
        this.disableTokenCache = options.disableTokenCache || false;

        this.axiosInstance = axios.create({
            baseURL: 'https://ae-openapi.feishu.cn',
            headers: { 'Content-Type': 'application/json' }
        });
        this.log(LoggerLevel.info, '[client] Client initialized successfully');
    }

    /**
     * 设置日志等级
     * @param level LoggerLevel
     */
    setLoggerLevel(level: LoggerLevel) {
        this.loggerLevel = level;
        this.log(LoggerLevel.info, `[logger] Log level set to ${LoggerLevel[level]}`);
    }

    /**
     * 日志打印方法
     * @param level LoggerLevel
     * @param args 打印内容
     */

    private log(level: LoggerLevel, ...args: any[]) {
        if (this.loggerLevel >= level) {
            const levelStr = LoggerLevel[level];
            const timestamp = dayjs().format('YYYY-MM-DD HH:mm:ss:SSS');
            console.log(`[${levelStr}] [${timestamp}]`, ...args);
        }
    }
    /**
     * 初始化 client, 自动获取 token
     */
    async init() {
        await this.ensureTokenValid();
        this.log(LoggerLevel.info, '[client] Client initialized and ready');
    }

    /**
     * 获取 accessToken
     */
    private async getAccessToken(): Promise<void> {
        const url = '/auth/v1/appToken';
        const res = await this.axiosInstance.post<TokenResponse>(url, {
            clientId: this.clientId,
            clientSecret: this.clientSecret
        });

        if (res.data.code !== '0') {
            this.log(LoggerLevel.error, `[auth] Failed to fetch access token: ${res.data.msg}`);
            throw new Error(`获取 accessToken 失败: ${res.data.msg}`);
        }

        this.accessToken = res.data.data.accessToken;
        this.expireTime = res.data.data.expireTime;
        this.log(LoggerLevel.info, '[auth] Access token refreshed successfully');
    }

    /**
     * 确保 token 有效, 若过期则刷新
     */
    private async ensureTokenValid() {
        if (this.disableTokenCache) {
            this.log(LoggerLevel.debug, '[auth] Token cache disabled, refreshing token');
            await this.getAccessToken();
            return;
        }

        if (!this.accessToken || !this.expireTime) {
            this.log(LoggerLevel.debug, '[auth] No token cached, fetching new token');
            await this.getAccessToken();
            return;
        }

        const now = dayjs().valueOf();
        if (now + 60 * 1000 > this.expireTime) {
            this.log(LoggerLevel.debug, '[auth] Token expired, refreshing');
            await this.getAccessToken();
        }
    }

    /**
     * 获取当前 accessToken
     */
    get token() {
        return this.accessToken;
    }

    /**
     * 获取当前 token 剩余过期时间（单位：秒）
     * @returns 剩余秒数，若无 token 则返回 null
     */
    get tokenExpireTime() {
        if (!this.accessToken || !this.expireTime) {
            this.log(LoggerLevel.warn, '[auth] No valid token available');
            return null;
        }

        const now = dayjs().valueOf();
        const remainMs = this.expireTime - now;

        if (remainMs <= 0) {
            this.log(LoggerLevel.warn, '[auth] Token has expired');
            return 0;
        }

        const remainSeconds = Math.floor(remainMs / 1000);
        this.log(LoggerLevel.debug, `[auth] Token expires in ${remainSeconds} seconds`);
        this.log(LoggerLevel.trace, `[auth] Token expiry details: remaining=${remainSeconds}s, expireTime=${this.expireTime}, now=${now}`);
        return remainSeconds;
    }

    /**
     * 获取当前 namespace
     */
    get currentNamespace() {
        this.log(LoggerLevel.debug, `[namespace] Current namespace: ${this.namespace}`);
        return this.namespace;
    }

    /**
     * 对象模块
     */
    public object = {
        /**
         * 列出所有对象（数据表）
         * @param params 请求参数 { offset?, filter?, limit? }
         * @returns 接口返回结果 { code, items, total, msg, has_more }
         */
        list: async (params?: { offset?: number; filter?: { type?: string; quickQuery?: string }; limit?: number }): Promise<any> => {
            const offset = params?.offset ?? 0;
            const limit = params?.limit ?? 50;
            const filter = params?.filter;
            await this.ensureTokenValid();
            const url = `/api/data/v1/namespaces/${this.namespace}/meta/objects/list`;

            this.log(LoggerLevel.debug, `[object.list] Fetching objects list: offset=${offset}, limit=${limit}`);

            const requestData: any = { offset, limit };
            if (filter) {
                requestData.filter = filter;
            }

            const res = await this.axiosInstance.post(url, requestData, {
                headers: { Authorization: `${this.accessToken}` }
            });

            this.log(LoggerLevel.debug, `[object.list] Objects list fetched successfully: code=${res.data.code}`);
            this.log(LoggerLevel.trace, `[object.list] Response: ${JSON.stringify(res.data)}`);
            
            // 扁平化返回结构并添加 has_more 字段
            const items = res.data?.data?.items || [];
            const total = res.data?.data?.total || 0;
            const currentEnd = offset + limit;
            const has_more = currentEnd < total;
            
            this.log(LoggerLevel.debug, `[object.list] has_more=${has_more}, total=${total}, currentEnd=${currentEnd}`);
            
            return {
                code: res.data.code,
                items,
                total,
                msg: res.data.msg,
                has_more
            };
        },

        /**
         * 列出所有对象（数据表）- 支持自动分页查询
         * @description 该方法会自动处理分页，直到没有更多数据为止
         * @param params 请求参数 { filter?, limit? }
         * @returns { code, msg, items, total, failed? } - code 表示失败的分页数量
         */
        listWithIterator: async (params?: { filter?: { type?: string; quickQuery?: string }; limit?: number }): Promise<{ 
            code: string; 
            msg: string; 
            items: any[]; 
            total: number; 
            failed?: Array<{ offset: number; limit: number; code: string; msg: string }> 
        }> => {
            const filter = params?.filter;
            const limit = params?.limit ?? 50;
            
            let results: any[] = [];
            let offset = 0;
            let total = 0;
            let hasMore = true;
            let page = 0;
            let totalPages = 0;
            let failed: Array<{ offset: number; limit: number; code: string; msg: string }> = [];
            let allSuccess = true;

            this.log(LoggerLevel.info, `[object.listWithIterator] Starting paginated query with limit=${limit}`);

            while (hasMore) {
                try {
                    const res = await this.object.list({
                        offset,
                        limit,
                        filter
                    });

                    if (res.code !== '0') {
                        this.log(LoggerLevel.error, `[object.listWithIterator] Error querying objects: code=${res.code}, msg=${res.msg}, offset=${offset}`);
                        allSuccess = false;
                        failed.push({
                            offset,
                            limit,
                            code: res.code,
                            msg: res.msg || `Query failed with code ${res.code}`
                        });
                        // 继续尝试下一页，而不是直接退出
                        offset += limit;
                        page += 1;
                        continue;
                    }

                    page += 1;

                    if (Array.isArray(res.items)) {
                        results = results.concat(res.items);
                    }

                    if (res.total !== undefined && res.total !== null) {
                        total = res.total;
                    }

                    if (page === 1) {
                        totalPages = Math.ceil(total / limit);
                        this.log(LoggerLevel.info, `[object.listWithIterator] Total objects: ${total}, pages: ${totalPages}`);
                    }

                    // 判断是否还有更多数据
                    hasMore = res.has_more === true;
                    offset += limit;

                    const padLength = totalPages.toString().length;
                    const pageStr = page.toString().padStart(padLength, '0');
                    const totalPagesStr = totalPages.toString().padStart(padLength, '0');

                    this.log(LoggerLevel.info, `[object.listWithIterator] Page completed: [${pageStr}/${totalPagesStr}]`);
                    this.log(LoggerLevel.debug, `[object.listWithIterator] Page ${page} details: items=${res.items?.length}, hasMore=${hasMore}`);
                    this.log(LoggerLevel.trace, `[object.listWithIterator] Page ${page} data: ${JSON.stringify(res.items)}`);
                } catch (error) {
                    this.log(LoggerLevel.error, `[object.listWithIterator] Exception occurred: ${error}, offset=${offset}`);
                    allSuccess = false;
                    failed.push({
                        offset,
                        limit,
                        code: '1',
                        msg: error instanceof Error ? error.message : String(error)
                    });
                    // 继续尝试下一页
                    offset += limit;
                    page += 1;
                    
                    // 如果没有获取到 total，可能需要退出循环
                    if (total === 0) {
                        hasMore = false;
                    } else {
                        hasMore = offset < total;
                    }
                }
            }

            const resultCode = failed.length.toString();
            const resultMsg = failed.length === 0
                ? 'Success' 
                : `Completed with ${failed.length} failed page(s)`;

            this.log(LoggerLevel.info, `[object.listWithIterator] Completed: code=${resultCode}, total=${total}, fetched=${results.length}, failed=${failed.length}`);
            
            const result: any = {
                code: resultCode,
                msg: resultMsg,
                items: results,
                total
            };
            
            if (failed.length > 0) {
                result.failed = failed;
            }
            
            return result;
        },

        metadata: {
            /**
             * 获取指定对象下指定字段的元数据
             * @description 查询指定对象下的单个字段元数据
             * @param params 请求参数 { object_name, field_name }
             * @returns 接口返回结果
             */
            field: async (params: { object_name: string; field_name: string }): Promise<any> => {
                const { object_name, field_name } = params;
                await this.ensureTokenValid();
                const url = `/api/data/v1/namespaces/${this.namespace}/meta/objects/${object_name}/fields/${field_name}`;

                this.log(LoggerLevel.debug, `[object.metadata.field] Fetching field metadata: ${object_name}.${field_name}`);

                const res = await this.axiosInstance.get(url, {
                    headers: { Authorization: `${this.accessToken}` }
                });

                this.log(LoggerLevel.debug, `[object.metadata.field] Field metadata fetched: ${object_name}.${field_name}, code=${res.data.code}`);
                this.log(LoggerLevel.trace, `[object.metadata.field] Response: ${JSON.stringify(res.data)}`);
                return res.data;
            },

            /**
             * 获取指定对象的所有字段信息
             * @description 查询指定对象下的所有字段元数据
             * @param params 请求参数 { object_name }
             * @returns 接口返回结果
             */
            fields: async (params: { object_name: string }): Promise<any> => {
                const { object_name } = params;
                await this.ensureTokenValid();
                const url = `/api/data/v1/namespaces/${this.namespace}/meta/objects/${object_name}`;

                this.log(LoggerLevel.debug, `[object.metadata.fields] Fetching all fields metadata: ${object_name}`);

                const res = await this.axiosInstance.get(url, {
                    headers: { Authorization: `${this.accessToken}` }
                });

                this.log(LoggerLevel.debug, `[object.metadata.fields] All fields metadata fetched: ${object_name}, code=${res.data.code}`);
                this.log(LoggerLevel.trace, `[object.metadata.fields] Response: ${JSON.stringify(res.data)}`);
                return res.data;
            },

            /**
             * 导出数据对象元数据为 Markdown 文档
             * @description 将数据对象的字段信息导出为详细的 Markdown 文档，包含字段类型、配置、选项等完整信息
             * @param options 导出配置
             * @param options.object_names 可选，要导出的对象名称数组。如果不传，则导出所有对象
             * @returns Markdown 文档字符串
             * @example
             * ```typescript
             * // 导出所有对象
             * const markdown = await client.object.metadata.export2markdown();
             * 
             * // 只导出指定对象
             * const markdown = await client.object.metadata.export2markdown({
             *   object_names: ['object_store', 'object_order', '_user']
             * });
             * 
             * // 结合 listWithIterator 使用
             * const allObjects = await client.object.listWithIterator();
             * const objectNames = allObjects.items.map(obj => obj.apiName);
             * const markdown = await client.object.metadata.export2markdown({
             *   object_names: objectNames
             * });
             * 
             * // 保存到文件
             * fs.writeFileSync('objects_doc.md', markdown, 'utf-8');
             * ```
             */
            export2markdown: async (options?: { object_names?: string[] }): Promise<string> => {
                const objectNames = options?.object_names;

                this.log(LoggerLevel.info, `[object.metadata.export2markdown] Starting markdown export${objectNames && objectNames.length > 0 ? ` for ${objectNames.length} objects` : ' for all objects'}`);

                let items: any[] = [];

                if (objectNames && objectNames.length > 0) {
                    // 如果指定了对象名称，只获取这些对象
                    this.log(LoggerLevel.debug, `[object.metadata.export2markdown] Fetching specified objects: ${objectNames.join(', ')}`);
                    
                    // 先获取所有对象列表
                    const allObjects = await this.object.listWithIterator();
                    
                    // 过滤出指定的对象
                    items = allObjects.items.filter((obj: any) => objectNames.includes(obj.apiName));
                    
                    // 检查是否有不存在的对象
                    if (items.length < objectNames.length) {
                        const foundNames = items.map((obj: any) => obj.apiName);
                        const notFound = objectNames.filter(name => !foundNames.includes(name));
                        this.log(LoggerLevel.warn, `[object.metadata.export2markdown] Objects not found: ${notFound.join(', ')}`);
                    }
                    
                    this.log(LoggerLevel.debug, `[object.metadata.export2markdown] Found ${items.length}/${objectNames.length} matching objects`);
                    
                    if (items.length === 0) {
                        this.log(LoggerLevel.warn, `[object.metadata.export2markdown] No matching objects found`);
                        return '# 数据对象字段文档\n\n> 未找到匹配的对象\n';
                    }
                } else {
                    // 获取所有对象
                    this.log(LoggerLevel.debug, `[object.metadata.export2markdown] Fetching all objects`);
                    const allObjects = await this.object.listWithIterator();
                    items = allObjects.items || [];
                }

                this.log(LoggerLevel.debug, `[object.metadata.export2markdown] Fetched ${items.length} objects`);

                // 生成 Markdown 文档
                let markdown = '# 数据对象字段文档\n\n';
                markdown += `> 生成时间: ${dayjs().format('YYYY-MM-DD HH:mm:ss')}\n\n`;
                markdown += `> 对象总数: ${items.length}\n\n`;
                markdown += '---\n\n';

                // 目录
                markdown += '## 目录\n\n';
                items.forEach((obj: any, index: number) => {
                    const chineseName = obj.label?.zh_CN || obj.label?.en_US || obj.apiName;
                    markdown += `${index + 1}. [${chineseName} (${obj.apiName})](#${obj.apiName.replace(/_/g, '')})\n`;
                });
                markdown += '\n---\n\n';

                // 遍历每个对象
                for (const obj of items) {
                    const chineseName = obj.label?.zh_CN || obj.label?.en_US || obj.apiName;
                    const englishName = obj.label?.en_US || '';

                    markdown += `## ${chineseName} \`${obj.apiName}\`\n\n`;

                    if (englishName && englishName !== chineseName) {
                        markdown += `**英文名称:** ${englishName}\n\n`;
                    }

                    markdown += `**创建时间:** ${dayjs(obj.createdAt).format('YYYY-MM-DD HH:mm:ss')}\n\n`;
                    markdown += `**字段数量:** ${obj.fields?.length || 0}\n\n`;

                    // 字段表格
                    if (obj.fields && obj.fields.length > 0) {
                        // 对字段进行分类和排序
                        const systemFieldOrder = ['_name', '_createdBy', '_createdAt', '_updatedBy', '_updatedAt'];
                        const specialFieldTypes = ['formula', 'referenceField'];

                        let idField: any = null;
                        const normalFields: any[] = [];
                        const specialFields: any[] = [];
                        const systemFields: any[] = [];

                        obj.fields.forEach((field: any) => {
                            if (field.apiName === '_id') {
                                idField = field;
                            } else if (systemFieldOrder.includes(field.apiName)) {
                                systemFields.push(field);
                            } else if (specialFieldTypes.includes(field.type?.name)) {
                                specialFields.push(field);
                            } else {
                                normalFields.push(field);
                            }
                        });

                        // 对系统字段按指定顺序排序
                        systemFields.sort((a, b) => {
                            return systemFieldOrder.indexOf(a.apiName) - systemFieldOrder.indexOf(b.apiName);
                        });

                        // 组合所有字段：_id + 正常字段 + 特殊字段 + 系统字段
                        const sortedFields: any[] = [];
                        if (idField) sortedFields.push(idField);
                        sortedFields.push(...normalFields);
                        sortedFields.push(...specialFields);
                        sortedFields.push(...systemFields);

                        markdown += '### 字段列表\n\n';
                        markdown += '| 中文名称 | API名称 | 类型 | 必填 | 唯一 | 其他设置 |\n';
                        markdown += '|---------|---------|------|------|------|----------|\n';

                        for (const field of sortedFields) {
                            // 转义 Markdown 表格中的特殊字符
                            const escapeMarkdown = (text: string): string => {
                                return text.replace(/\|/g, '\\|').replace(/\n/g, ' ');
                            };

                            const label = escapeMarkdown(field.label?.zh_CN || field.label?.en_US || '-');
                            const apiName = field.apiName || '-';
                            const typeName = field.type?.name || '-';
                            const required = field.type?.settings?.required ? '✓' : '';
                            const unique = field.type?.settings?.unique ? '✓' : '';

                            // 构建其他设置信息
                            const otherSettings: string[] = [];
                            const settings = field.type?.settings || {};

                            // lookup 类型：标注关联的对象（外键）
                            if (field.type?.name === 'lookup' && settings.objectAPIName) {
                                otherSettings.push(`🔗 关联对象: \`${settings.objectAPIName}\``);
                            }

                            // referenceField 类型：引用字段
                            if (field.type?.name === 'referenceField') {
                                otherSettings.push(`⚙️ 系统自动维护，不需要写/更新`);
                                if (settings.guideFieldAPIName) {
                                    otherSettings.push(`📎 引用自: \`${settings.guideFieldAPIName}\``);
                                }
                                if (settings.fieldAPIName) {
                                    otherSettings.push(`📋 引用字段: \`${settings.fieldAPIName}\``);
                                }
                            }

                            // formula 类型：系统自动维护
                            if (field.type?.name === 'formula') {
                                otherSettings.push(`⚙️ 系统自动维护，不需要写/更新`);
                                if (settings.formula && Array.isArray(settings.formula)) {
                                    // 优先显示中文公式，否则显示第一个
                                    const zhFormula = settings.formula.find((f: any) => f.language_code === 2052);
                                    const formulaText = zhFormula?.text || settings.formula[0]?.text;
                                    if (formulaText) {
                                        // 转义公式中的特殊字符
                                        const escapedFormula = formulaText.replace(/\|/g, '\\|').replace(/\n/g, ' ');
                                        otherSettings.push(`公式: ${escapedFormula}`);
                                    }
                                }
                                if (settings.returnType) {
                                    otherSettings.push(`返回类型: ${settings.returnType}`);
                                }
                            }

                            // 根据不同类型展示不同的设置
                            if (settings.maxLength) {
                                otherSettings.push(`最大长度:${settings.maxLength}`);
                            }
                            if (settings.decimalPlacesNumber !== undefined) {
                                otherSettings.push(`小数位:${settings.decimalPlacesNumber}`);
                            }
                            if (settings.displayAsPercentage) {
                                otherSettings.push('百分比显示');
                            }
                            if (settings.multiline) {
                                otherSettings.push('多行');
                            }
                            if (settings.multiple) {
                                otherSettings.push('多选');
                            }
                            if (settings.hierarchy) {
                                otherSettings.push('层级');
                            }
                            if (settings.displayStyle && field.type?.name !== 'lookup') {
                                otherSettings.push(`显示样式:${settings.displayStyle}`);
                            }
                            if (settings.referenceObjectApiName) {
                                otherSettings.push(`关联:${settings.referenceObjectApiName}`);
                            }
                            if (settings.rollUpType) {
                                otherSettings.push(`汇总:${settings.rollUpType}`);
                            }

                            // 如果是 option 类型，获取选项列表
                            if (field.type?.name === 'option') {
                                // 优先使用已有的 optionList，避免额外 API 请求
                                const options = settings.optionList;
                                if (options && options.length > 0) {
                                    const optionTexts = options.map((opt: any) => {
                                        const zhLabel = opt.label?.find((l: any) => l.language_code === 2052)?.text || '-';
                                        return `${zhLabel}(\`${opt.apiName}\`)`;
                                    });
                                    otherSettings.push(`选项: ${optionTexts.join(', ')}`);
                                } else {
                                    // 如果没有 optionList，再尝试单独请求（但这可能很慢）
                                    try {
                                        this.log(LoggerLevel.debug, `[object.metadata.export2markdown] Fetching option details for ${obj.apiName}.${field.apiName}`);
                                        const optionsResult = await this.object.metadata.field({
                                            object_name: obj.apiName,
                                            field_name: field.apiName
                                        });

                                        const fetchedOptions = optionsResult?.data?.type?.settings?.optionList;
                                        if (fetchedOptions && fetchedOptions.length > 0) {
                                            const optionTexts = fetchedOptions.map((opt: any) => {
                                                const zhLabel = opt.label?.find((l: any) => l.language_code === 2052)?.text || '-';
                                                return `${zhLabel}(\`${opt.apiName}\`)`;
                                            });
                                            otherSettings.push(`选项: ${optionTexts.join(', ')}`);
                                        }
                                    } catch (error) {
                                        this.log(LoggerLevel.warn, `[object.metadata.export2markdown] Failed to fetch option field details for ${obj.apiName}.${field.apiName}:`, error);
                                    }
                                }
                            }

                            const otherSettingsStr = otherSettings.length > 0 ? otherSettings.join('<br>') : '-';

                            markdown += `| ${label} | \`${apiName}\` | ${typeName} | ${required} | ${unique} | ${otherSettingsStr} |\n`;
                        }

                        markdown += '\n';
                    }

                    markdown += '---\n\n';
                }

                this.log(LoggerLevel.info, `[object.metadata.export2markdown] Markdown export completed`);

                return markdown;
            }
        },

        search: {
            /**
             * 单条记录查询
             * @description 查询指定对象下的单条记录
             * @param params 请求参数
             * @returns 接口返回结果
             */
            record: async (params: { object_name: string; record_id: string; select: string[] }): Promise<any> => {
                const { object_name, record_id, select } = params;
                const url = `/v1/data/namespaces/${this.namespace}/objects/${object_name}/records/${record_id}`;

                this.log(LoggerLevel.info, `[object.search.record] Querying record: ${record_id}`);

                const res = await functionLimiter(async () => {
                    await this.ensureTokenValid();

                    const response = await this.axiosInstance.post(url, { select }, { headers: { Authorization: `${this.accessToken}` } });

                    this.log(LoggerLevel.debug, `[object.search.record] Record queried: ${object_name}.${record_id}, code=${response.data.code}`);
                    this.log(LoggerLevel.trace, `[object.search.record] Response: ${JSON.stringify(response.data)}`);

                    return response.data;
                });

                return res;
            },

            /**
             * 多条记录查询 - 最多传入 100 条
             * @description 查询指定对象下的多条记录
             * @param params 请求参数
             * @returns 接口返回结果
             */
            records: async (params: { object_name: string; data: any }): Promise<any> => {
                const { object_name, data } = params;
                await this.ensureTokenValid();

                const url = `/v1/data/namespaces/${this.namespace}/objects/${object_name}/records_query`;

                const res = await this.axiosInstance.post(url, data, {
                    headers: { Authorization: `${this.accessToken}` }
                });

                this.log(LoggerLevel.debug, `[object.search.records] Records queried: ${object_name}, code=${res.data.code}, total=${res.data?.data?.total || 'unknown'}`);
                this.log(LoggerLevel.trace, `[object.search.records] Response: ${JSON.stringify(res.data)}`);
                return res.data;
            },

            /**
             * 查询所有记录 - 支持超过 100 条数据，自动分页查询
             * @description 该方法会自动处理分页，直到没有更多数据为止
             * @param params 请求参数
             * @returns { total, items }
             */
            recordsWithIterator: async (params: { object_name: string; data: any }): Promise<{ total: number; items: any[] }> => {
                const { object_name, data } = params;

                let results: any[] = [];
                let nextPageToken: string | undefined = undefined;
                let total = 0;
                let page = 0;
                let totalPages = 0;
                let hasMore = true;

                const pageSize = data.page_size || 100;

                while (hasMore) {
                    const pageRes = await functionLimiter(async () => {
                        const mergedData: any = { ...data };
                        // 如果使用 page_token，第一页需要传空字符串
                        if (data.use_page_token) {
                            mergedData.page_token = nextPageToken || '';
                        } else if (nextPageToken) {
                            mergedData.page_token = nextPageToken;
                        }

                        const res = await this.object.search.records({
                            object_name,
                            data: mergedData
                        });

                        if (res.code !== '0') {
                            this.log(LoggerLevel.error, `[object.search.recordsWithIterator] Error querying records: code=${res.code}, msg=${res.msg}`);
                            throw new Error(res.msg || `Query failed with code ${res.code}`);
                        }

                        page += 1;

                        if (res.data && Array.isArray(res.data.items)) {
                            results = results.concat(res.data.items);
                        }

                        if (res.data && (res.data.total !== undefined && res.data.total !== null)) {
                            total = res.data.total;
                        }

                        if (page === 1) {
                            totalPages = Math.ceil(total / pageSize);
                            this.log(LoggerLevel.info, `[object.search.recordsWithIterator] Starting paginated query: ${object_name}, total=${total}, pages=${totalPages}`);
                        }

                        nextPageToken = res.data?.next_page_token;
                        
                        // 检查是否还有更多数据：next_page_token 存在且不为空字符串
                        hasMore = !!(nextPageToken && nextPageToken !== '' && nextPageToken !== 'null');

                        const padLength = totalPages.toString().length;
                        const pageStr = page.toString().padStart(padLength, '0');
                        const totalPagesStr = totalPages.toString().padStart(padLength, '0');

                        this.log(LoggerLevel.info, `[object.search.recordsWithIterator] Page completed: [${pageStr}/${totalPagesStr}]`);
                        this.log(LoggerLevel.debug, `[object.search.recordsWithIterator] Page ${page} details: items=${res.data?.items?.length}, nextToken=${nextPageToken || 'none'}, hasMore=${hasMore}`);
                        this.log(LoggerLevel.trace, `[object.search.recordsWithIterator] Page ${page} data: ${JSON.stringify(res.data?.items)}`);

                        return res;
                    });
                }

                return { total, items: results };
            },

            /**
             * 统计记录数量
             * @description 统计指定对象中的记录总数，支持按条件统计
             * @param params 请求参数 { object_name, data? }
             * @returns 接口返回结果 { code, total, msg }
             */
            count: async (params: { object_name: string; data?: any }): Promise<any> => {
                const { object_name, data } = params;

                // 默认查询参数：最小化数据传输，只获取总数
                const defaultData = {
                    offset: 0,
                    page_size: 1,
                    need_total_count: true,
                    use_page_token: true,
                    select: ['_id'],
                    query_deleted_record: false
                };

                // 合并用户传入的参数（用户参数优先）
                const queryData = data ? { ...defaultData, ...data } : defaultData;

                this.log(LoggerLevel.info, `[object.search.count] Counting records in: ${object_name}`);
                this.log(LoggerLevel.debug, `[object.search.count] Query data: ${JSON.stringify(queryData)}`);

                const res = await this.object.search.records({
                    object_name,
                    data: queryData
                });

                if (res.code !== '0') {
                    this.log(LoggerLevel.error, `[object.search.count] Error counting records: code=${res.code}, msg=${res.msg}`);
                    throw new Error(res.msg || `Count failed with code ${res.code}`);
                }

                const total = res.data?.total || 0;
                this.log(LoggerLevel.info, `[object.search.count] Total records in ${object_name}: ${total}`);

                // 返回格式：{ code, total, msg }
                return {
                    code: res.code,
                    total: total,
                    msg: res.msg
                };
            }
        },

        create: {
            /**
             * 单条记录创建
             * @description 创建单条记录到指定对象中
             * @param params 请求参数 { object_name, record }
             * @returns 接口返回结果
             */
            record: async (params: { object_name: string; record: any }): Promise<any> => {
                const { object_name, record } = params;
                const url = `/v1/data/namespaces/${this.namespace}/objects/${object_name}/records`;

                this.log(LoggerLevel.info, `[object.create.record] Creating record in: ${object_name}`);

                const res = await functionLimiter(async () => {
                    await this.ensureTokenValid();

                    const response = await this.axiosInstance.post(
                        url,
                        { record },
                        {
                            headers: { Authorization: `${this.accessToken}` }
                        }
                    );

                    this.log(LoggerLevel.info, `[object.create.record] Record created: ${object_name}`);
                    this.log(LoggerLevel.debug, `[object.create.record] Record created: ${object_name}, code=${response.data.code}`);
                    this.log(LoggerLevel.trace, `[object.create.record] Response: ${JSON.stringify(response.data)}`);

                    return response.data;
                });

                return res;
            },

            /**
             * 批量创建记录 - 最多传入 100 条
             * @description 创建多条记录到指定对象中
             * @param params 请求参数 { object_name, records }
             * @returns 接口返回结果
             */
            records: async (params: { object_name: string; records: any[] }): Promise<any> => {
                const { object_name, records } = params;
                await this.ensureTokenValid();

                const url = `/v1/data/namespaces/${this.namespace}/objects/${object_name}/records_batch`;

                const res = await this.axiosInstance.post(
                    url,
                    { records },
                    {
                        headers: { Authorization: `${this.accessToken}` }
                    }
                );

                this.log(LoggerLevel.info, `[object.create.records] Creating ${records.length} records in: ${object_name}`);
                this.log(LoggerLevel.debug, `[object.create.records] Records created: ${object_name}, code=${res.data.code}`);
                this.log(LoggerLevel.trace, `[object.create.records] Response: ${JSON.stringify(res.data)}`);
                return res.data;
            },

            /**
             * 分批创建所有记录 - 支持超过 100 条数据，自动拆分
             * @description 创建多条记录到指定对象中，超过 100 条数据会自动拆分为多次请求
             * @param params 请求参数 { object_name, records, limit }
             * @returns { total, success, failed, successCount, failedCount }
             */
            recordsWithIterator: async (params: { object_name: string; records: any[]; limit?: number }): Promise<{
                total: number;
                success: Array<{ _id: string; success: true }>;
                failed: Array<{ _id: string; success: false; error?: string }>;
                successCount: number;
                failedCount: number;
            }> => {
                const { object_name, records, limit = 100 } = params;

                // 参数校验
                if (!records || !Array.isArray(records)) {
                    this.log(LoggerLevel.error, '[object.create.recordsWithIterator] Invalid records parameter: must be a non-empty array');
                    throw new Error('参数 records 必须是一个数组');
                }
                
                if (records.length === 0) {
                    this.log(LoggerLevel.warn, '[object.create.recordsWithIterator] Empty records array provided, returning empty result');
                    return { total: 0, success: [], failed: [], successCount: 0, failedCount: 0 };
                }

                const chunkSize = limit;
                const chunks: any[][] = [];
                for (let i = 0; i < records.length; i += chunkSize) {
                    chunks.push(records.slice(i, i + chunkSize));
                }

                this.log(LoggerLevel.debug, `[object.create.recordsWithIterator] Chunking ${records.length} records into ${chunks.length} groups of ${chunkSize}`);

                const successItems: Array<{ _id: string; success: true }> = [];
                const failedItems: Array<{ _id: string; success: false; error?: string }> = [];

                for (const [index, chunk] of chunks.entries()) {
                    this.log(LoggerLevel.debug, `[object.create.recordsWithIterator] Processing chunk ${index + 1}/${chunks.length}: ${chunk.length} records`);

                    try {
                        const res = await functionLimiter(async () => {
                            return await this.object.create.records({
                                object_name,
                                records: chunk
                            });
                        });

                        if (res.code !== '0') {
                            this.log(LoggerLevel.error, `[object.create.recordsWithIterator] Chunk ${index + 1} failed: code=${res.code}, msg=${res.msg}`);
                            // 整个批次失败，将这批次的所有记录标记为失败
                            chunk.forEach((record: any) => {
                                failedItems.push({
                                    _id: record._id || 'unknown',
                                    success: false,
                                    error: res.msg || `Creation failed with code ${res.code}`
                                });
                            });
                            continue;
                        }

                        // 处理响应中的 items
                        if (res.data && Array.isArray(res.data.items)) {
                            res.data.items.forEach((item: any) => {
                                if (item.success !== false) {
                                    successItems.push(item);
                                } else {
                                    failedItems.push(item);
                                }
                            });
                        }

                        this.log(LoggerLevel.info, `[object.create.recordsWithIterator] Chunk ${index + 1} completed: ${object_name}, success=${res.data?.items?.filter((i: any) => i.success !== false).length}, failed=${res.data?.items?.filter((i: any) => i.success === false).length}`);
                        this.log(LoggerLevel.trace, `[object.create.recordsWithIterator] Chunk ${index + 1} response: ${JSON.stringify(res)}`);
                    } catch (error) {
                        this.log(LoggerLevel.error, `[object.create.recordsWithIterator] Chunk ${index + 1} threw error: ${error}`);
                        // 整个批次异常，将这批次的所有记录标记为失败
                        chunk.forEach((record: any) => {
                            failedItems.push({
                                _id: record._id || 'unknown',
                                success: false,
                                error: error instanceof Error ? error.message : String(error)
                            });
                        });
                    }
                }

                const result = {
                    total: records.length,
                    success: successItems,
                    failed: failedItems,
                    successCount: successItems.length,
                    failedCount: failedItems.length
                };

                this.log(LoggerLevel.info, `[object.create.recordsWithIterator] Create completed: total=${result.total}, success=${result.successCount}, failed=${result.failedCount}`);

                return result;
            }
        },

        update: {
            /**
             * 单条更新
             * @description 更新指定对象下的单条记录
             * @param params 请求参数
             * @returns 接口返回结果
             */
            record: async (params: { object_name: string; record_id: string; record: any }): Promise<any> => {
                const { object_name, record_id, record } = params;
                const url = `/v1/data/namespaces/${this.namespace}/objects/${object_name}/records/${record_id}`;

                this.log(LoggerLevel.info, `[object.update.record] Updating record: ${record_id}`);

                const res = await functionLimiter(async () => {
                    await this.ensureTokenValid();

                    const response = await this.axiosInstance.patch(url, { record }, { headers: { Authorization: `${this.accessToken}` } });

                    this.log(LoggerLevel.info, `[object.update.record] Record updated: ${object_name}.${record_id}`);
                    this.log(LoggerLevel.debug, `[object.update.record] Record updated: ${object_name}.${record_id}, code=${response.data.code}`);
                    this.log(LoggerLevel.trace, `[object.update.record] Response: ${JSON.stringify(response.data)}`);
                    return response.data;
                });

                return res;
            },

            /**
             * 多条更新 - 最多传入 100 条
             * @description 更新指定对象下的多条记录
             * @param params 请求参数
             * @returns 接口返回结果
             */
            records: async (params: { object_name: string; records: any[] }): Promise<any> => {
                const { object_name, records } = params;
                const url = `/v1/data/namespaces/${this.namespace}/objects/${object_name}/records_batch`;

                this.log(LoggerLevel.info, `[object.update.records] Updating ${records.length} records`);

                const response = await functionLimiter(async () => {
                    await this.ensureTokenValid();

                    const res = await this.axiosInstance.patch(url, { records }, { headers: { Authorization: `${this.accessToken}` } });

                    this.log(LoggerLevel.info, `[object.update.records] Records updated: ${object_name}`);
                    this.log(LoggerLevel.debug, `[object.update.records] Records updated: ${object_name}, code=${res.data.code}`);
                    this.log(LoggerLevel.trace, `[object.update.records] Response: ${JSON.stringify(res.data)}`);

                    return res.data;
                });

                return response;
            },

            /**
             * 批量更新 - 支持超过 100 条数据，自动拆分
             * @description 更新指定对象下的多条记录，超过 100 条数据会自动拆分为多次请求
             * @param params 请求参数，包含 object_name, records, limit
             * @returns { total, success, failed, successCount, failedCount }
             */
            recordsWithIterator: async (params: { object_name: string; records: any[]; limit?: number }): Promise<{
                total: number;
                success: Array<{ _id: string; success: true }>;
                failed: Array<{ _id: string; success: false; error?: string }>;
                successCount: number;
                failedCount: number;
            }> => {
                const { object_name, records, limit = 100 } = params;
                
                // 参数校验
                if (!records || !Array.isArray(records)) {
                    this.log(LoggerLevel.error, '[object.update.recordsWithIterator] Invalid records parameter: must be a non-empty array');
                    throw new Error('参数 records 必须是一个数组');
                }
                
                if (records.length === 0) {
                    this.log(LoggerLevel.warn, '[object.update.recordsWithIterator] Empty records array provided, returning empty result');
                    return { total: 0, success: [], failed: [], successCount: 0, failedCount: 0 };
                }

                const chunkSize = limit;
                const chunks: any[][] = [];
                for (let i = 0; i < records.length; i += chunkSize) {
                    chunks.push(records.slice(i, i + chunkSize));
                }

                this.log(LoggerLevel.debug, `[object.update.recordsWithIterator] Chunking ${records.length} records into ${chunks.length} groups of ${chunkSize}`);

                const successItems: Array<{ _id: string; success: true }> = [];
                const failedItems: Array<{ _id: string; success: false; error?: string }> = [];

                for (const [index, chunk] of chunks.entries()) {
                    this.log(LoggerLevel.debug, `[object.update.recordsWithIterator] Processing chunk ${index + 1}/${chunks.length}: ${chunk.length} records`);

                    try {
                        const res = await this.object.update.records({
                            object_name,
                            records: chunk
                        });

                        if (res.code !== '0') {
                            this.log(LoggerLevel.error, `[object.update.recordsWithIterator] Chunk ${index + 1} failed: code=${res.code}, msg=${res.msg}`);
                            // 整个批次失败，将这批次的所有记录标记为失败
                            chunk.forEach((record: any) => {
                                failedItems.push({
                                    _id: record._id || 'unknown',
                                    success: false,
                                    error: res.msg || `Update failed with code ${res.code}`
                                });
                            });
                            continue;
                        }

                        // 处理响应中的 items
                        if (res.data && Array.isArray(res.data.items)) {
                            res.data.items.forEach((item: any) => {
                                if (item.success) {
                                    successItems.push(item);
                                } else {
                                    failedItems.push(item);
                                }
                            });
                        }

                        this.log(LoggerLevel.debug, `[object.update.recordsWithIterator] Chunk ${index + 1} completed: ${object_name}, success=${res.data?.items?.filter((i: any) => i.success).length}, failed=${res.data?.items?.filter((i: any) => !i.success).length}`);
                        this.log(LoggerLevel.trace, `[object.update.recordsWithIterator] Chunk ${index + 1} response: ${JSON.stringify(res)}`);
                    } catch (error) {
                        this.log(LoggerLevel.error, `[object.update.recordsWithIterator] Chunk ${index + 1} threw error: ${error}`);
                        // 整个批次异常，将这批次的所有记录标记为失败
                        chunk.forEach((record: any) => {
                            failedItems.push({
                                _id: record._id || 'unknown',
                                success: false,
                                error: error instanceof Error ? error.message : String(error)
                            });
                        });
                    }
                }

                const result = {
                    total: records.length,
                    success: successItems,
                    failed: failedItems,
                    successCount: successItems.length,
                    failedCount: failedItems.length
                };

                this.log(LoggerLevel.info, `[object.update.recordsWithIterator] Update completed: total=${result.total}, success=${result.successCount}, failed=${result.failedCount}`);

                return result;
            }
        },

        delete: {
            /**
             * 单条删除
             * @description 删除指定对象下的单条记录
             * @param params 请求参数，包含 object_name 和 record_id
             * @returns 接口返回结果
             */
            record: async (params: { object_name: string; record_id: string }): Promise<any> => {
                const { object_name, record_id } = params;
                const url = `/v1/data/namespaces/${this.namespace}/objects/${object_name}/records/${record_id}`;

                this.log(LoggerLevel.info, `[object.delete.record] Deleting record: ${object_name}.${record_id}`);

                const res = await functionLimiter(async () => {
                    await this.ensureTokenValid();

                    const response = await this.axiosInstance.delete(url, {
                        headers: { Authorization: `${this.accessToken}` }
                    });

                    this.log(LoggerLevel.info, `[object.delete.record] Record deleted: ${object_name}.${record_id}`);
                    this.log(LoggerLevel.debug, `[object.delete.record] Record deleted: ${object_name}.${record_id}, code=${response.data.code}`);
                    this.log(LoggerLevel.trace, `[object.delete.record] Response: ${JSON.stringify(response.data)}`);
                    return response.data;
                });

                return res;
            },

            /**
             * 多条删除 - 最多传入 100 条
             * @description 删除指定对象下的多条记录
             * @param params 请求参数，包含 object_name 和 ids 数组
             * @returns 接口返回结果
             */
            records: async (params: { object_name: string; ids: string[] }): Promise<any> => {
                const { object_name, ids } = params;
                const url = `/v1/data/namespaces/${this.namespace}/objects/${object_name}/records_batch`;

                this.log(LoggerLevel.info, `[object.delete.records] Deleting ${ids.length} records from: ${object_name}`);

                const res = await functionLimiter(async () => {
                    await this.ensureTokenValid();

                    const response = await this.axiosInstance.delete(url, {
                        data: { ids },
                        headers: { Authorization: `${this.accessToken}`, 'Content-Type': 'application/json' }
                    });

                    this.log(LoggerLevel.info, `[object.delete.records] Records deleted: ${object_name}, count=${ids.length}`);
                    this.log(LoggerLevel.debug, `[object.delete.records] Records deleted: ${object_name}, count=${ids.length}, code=${response.data.code}`);
                    this.log(LoggerLevel.trace, `[object.delete.records] Response: ${JSON.stringify(response.data)}`);

                    return response.data;
                });

                return res;
            },

            /**
             * 批量删除
             * @description 删除指定对象下的多条记录，超过 100 条数据会自动拆分为多次请求
             * @param params 请求参数，包含 object_name, ids 数组 和 可选的 limit
             * @returns { total, success, failed, successCount, failedCount }
             */
            recordsWithIterator: async (params: { object_name: string; ids: string[]; limit?: number }): Promise<{
                total: number;
                success: Array<{ _id: string; success: true }>;
                failed: Array<{ _id: string; success: false; error?: string }>;
                successCount: number;
                failedCount: number;
            }> => {
                const { object_name, ids, limit = 100 } = params;
                
                // 参数校验
                if (!ids || !Array.isArray(ids)) {
                    this.log(LoggerLevel.error, '[object.delete.recordsWithIterator] Invalid ids parameter: must be a non-empty array');
                    throw new Error('参数 ids 必须是一个数组');
                }
                
                if (ids.length === 0) {
                    this.log(LoggerLevel.warn, '[object.delete.recordsWithIterator] Empty ids array provided, returning empty result');
                    return { total: 0, success: [], failed: [], successCount: 0, failedCount: 0 };
                }
                
                const url = `/v1/data/namespaces/${this.namespace}/objects/${object_name}/records_batch`;

                const chunkSize = limit;
                const chunks: string[][] = [];
                for (let i = 0; i < ids.length; i += chunkSize) {
                    chunks.push(ids.slice(i, i + chunkSize));
                }

                this.log(LoggerLevel.debug, `[object.delete.recordsWithIterator] Chunking ${ids.length} records into ${chunks.length} groups of ${chunkSize}`);

                const successItems: Array<{ _id: string; success: true }> = [];
                const failedItems: Array<{ _id: string; success: false; error?: string }> = [];

                for (const [index, chunk] of chunks.entries()) {
                    this.log(LoggerLevel.info, `[object.delete.recordsWithIterator] Processing chunk ${index + 1}/${chunks.length}: ${chunk.length} records`);

                    try {
                        const res = await this.object.delete.records({
                            object_name,
                            ids: chunk
                        });

                        if (res.code !== '0') {
                            this.log(LoggerLevel.error, `[object.delete.recordsWithIterator] Chunk ${index + 1} failed: code=${res.code}, msg=${res.msg}`);
                            // 整个批次失败，将这批次的所有 ID 标记为失败
                            chunk.forEach((id: string) => {
                                failedItems.push({
                                    _id: id,
                                    success: false,
                                    error: res.msg || `Delete failed with code ${res.code}`
                                });
                            });
                            continue;
                        }

                        // 处理响应中的 items
                        if (res.data && Array.isArray(res.data.items)) {
                            res.data.items.forEach((item: any) => {
                                if (item.success) {
                                    successItems.push(item);
                                } else {
                                    failedItems.push(item);
                                }
                            });
                        }

                        this.log(LoggerLevel.debug, `[object.delete.recordsWithIterator] Chunk ${index + 1} completed: ${object_name}, success=${res.data?.items?.filter((i: any) => i.success).length}, failed=${res.data?.items?.filter((i: any) => !i.success).length}`);
                    } catch (error) {
                        this.log(LoggerLevel.error, `[object.delete.recordsWithIterator] Chunk ${index + 1} threw error: ${error}`);
                        // 整个批次异常，将这批次的所有 ID 标记为失败
                        chunk.forEach((id: string) => {
                            failedItems.push({
                                _id: id,
                                success: false,
                                error: error instanceof Error ? error.message : String(error)
                            });
                        });
                    }
                }

                const result = {
                    total: ids.length,
                    success: successItems,
                    failed: failedItems,
                    successCount: successItems.length,
                    failedCount: failedItems.length
                };

                this.log(LoggerLevel.info, `[object.delete.recordsWithIterator] Delete completed: total=${result.total}, success=${result.successCount}, failed=${result.failedCount}`);

                return result;
            }
        }
    };

    /**
     * 部门 ID 交换模块
     */
    public department = {
        /**
         * 单个部门 ID 交换
         * @param params 请求参数
         * @returns 单个部门映射结果
         */
        exchange: async (params: { department_id_type: 'department_id' | 'external_department_id' | 'external_open_department_id'; department_id: string }): Promise<any> => {
            const { department_id_type, department_id } = params;
            // department_id_type 可选值：
            // - 'department_id' (如 "1758534140403815")
            // - 'external_department_id' (外部平台 department_id, 无固定格式)
            // - 'external_open_department_id' (以 'oc_' 开头的 open_department_id)

            const url = '/api/integration/v2/feishu/getDepartments';

            this.log(LoggerLevel.info, `[department.exchange] Exchanging department ID: ${department_id}`);

            const res = await functionLimiter(async () => {
                await this.ensureTokenValid();

                const response = await this.axiosInstance.post(
                    url,
                    {
                        department_id_type,
                        department_ids: [department_id]
                    },
                    {
                        headers: { Authorization: `${this.accessToken}` }
                    }
                );

                this.log(LoggerLevel.debug, `[department.exchange] Department ID exchanged: ${department_id}, code=${response.data.code}`);
                this.log(LoggerLevel.trace, `[department.exchange] Response: ${JSON.stringify(response.data)}`);

                if (response.data.code !== '0') {
                    this.log(LoggerLevel.error, `[department.exchange] Error exchanging department: code=${response.data.code}, msg=${response.data.msg}`);
                    throw new Error(response.data.msg || `Exchange failed with code ${response.data.code}`);
                }

                return response.data.data && response.data.data[0]; // 返回第一个元素
            });

            return res;
        },

        /**
         * 批量部门 ID 交换
         * @param params 请求参数
         * @returns 批量操作结果，包含成功和失败的详细信息
         */
        batchExchange: async (params: {
            department_id_type: 'department_id' | 'external_department_id' | 'external_open_department_id';
            department_ids: string[];
            retryOptions?: RetryOptions;
        }): Promise<BatchResult<any>> => {
            const { department_id_type, department_ids, retryOptions } = params;
            // department_id_type 可选值：
            // - 'department_id' (如 "1758534140403815")
            // - 'external_department_id' (外部平台 department_id, 无固定格式)
            // - 'external_open_department_id' (以 'oc_' 开头的 open_department_id)

            // 参数校验
            if (!department_ids || !Array.isArray(department_ids)) {
                this.log(LoggerLevel.error, '[department.batchExchange] Invalid department_ids parameter: must be a non-empty array');
                throw new Error('参数 department_ids 必须是一个数组');
            }

            if (department_ids.length === 0) {
                this.log(LoggerLevel.warn, '[department.batchExchange] Empty department_ids array provided, returning empty result');
                return { success: [], failed: [], successCount: 0, failedCount: 0, total: 0 };
            }

            const url = '/api/integration/v2/feishu/getDepartments';

            const chunkSize = 200; // 最大支持200个
            const chunks: string[][] = [];
            for (let i = 0; i < department_ids.length; i += chunkSize) {
                chunks.push(department_ids.slice(i, i + chunkSize));
            }

            this.log(LoggerLevel.info, `[department.batchExchange] Chunking ${department_ids.length} department IDs into ${chunks.length} groups of ${chunkSize}`);

            const successResults: any[] = [];
            const failedResults: Array<{ id: string; error: string }> = [];

            for (const [index, chunk] of chunks.entries()) {
                this.log(LoggerLevel.info, `[department.batchExchange] Processing chunk ${index + 1}/${chunks.length}: ${chunk.length} IDs`);

                try {
                    const res = await executeWithRetry(
                        async () => {
                            return await functionLimiter(async () => {
                                await this.ensureTokenValid();

                                const response = await this.axiosInstance.post(
                                    url,
                                    {
                                        department_id_type,
                                        department_ids: chunk
                                    },
                                    {
                                        headers: { Authorization: `${this.accessToken}` },
                                        timeout: 30000 // 30秒超时
                                    }
                                );

                                this.log(LoggerLevel.debug, `[department.batchExchange] Chunk ${index + 1} completed: code=${response.data.code}`);
                                this.log(LoggerLevel.trace, `[department.batchExchange] Chunk ${index + 1} response: ${JSON.stringify(response.data)}`);

                                if (response.data.code !== '0') {
                                    this.log(LoggerLevel.error, `[department.batchExchange] Error exchanging departments: code=${response.data.code}, msg=${response.data.msg}`);
                                    throw new Error(response.data.msg || `Exchange failed with code ${response.data.code}`);
                                }

                                return response.data.data || [];
                            });
                        },
                        retryOptions,
                        `[department.batchExchange] Chunk ${index + 1}/${chunks.length}`,
                        this.log.bind(this)
                    );

                    successResults.push(...res);
                    this.log(LoggerLevel.info, `[department.batchExchange] Chunk ${index + 1} succeeded: ${res.length} departments`);
                } catch (error) {
                    // 部分失败：记录失败的chunk
                    const errorMsg = error instanceof Error ? error.message : String(error);
                    this.log(LoggerLevel.error, `[department.batchExchange] Chunk ${index + 1} failed after retries: ${errorMsg}`);

                    chunk.forEach(id => {
                        failedResults.push({
                            id,
                            error: errorMsg
                        });
                    });
                }
            }

            const result: BatchResult<any> = {
                success: successResults,
                failed: failedResults,
                successCount: successResults.length,
                failedCount: failedResults.length,
                total: department_ids.length
            };

            this.log(LoggerLevel.info, `[department.batchExchange] Completed: total=${result.total}, success=${result.successCount}, failed=${result.failedCount}`);

            return result;
        }
    };

    /**
     * 用户 ID 交换模块
     */
    public user = {
        /**
         * 单个用户 ID 交换
         * @param params 请求参数
         * @returns 单个用户映射结果
         */
        exchange: async (params: { user_id_type: 'user_id' | 'external_user_id' | 'external_open_id'; user_id: string; feishu_app_id: string }): Promise<any> => {
            const { user_id_type, user_id, feishu_app_id } = params;
            // user_id_type 可选值：
            // - 'user_id' (如 "1758534140403815")
            // - 'external_user_id' (外部平台 user_id, 无固定格式)
            // - 'external_open_id' (以 'ou_' 开头的 open_id)

            const url = '/api/integration/v2/feishu/getUsers';

            this.log(LoggerLevel.info, `[user.exchange] Exchanging user ID: ${user_id}`);

            const res = await functionLimiter(async () => {
                await this.ensureTokenValid();

                const response = await this.axiosInstance.post(
                    url,
                    {
                        user_id_type,
                        feishu_app_id,
                        user_ids: [user_id]
                    },
                    {
                        headers: { Authorization: `${this.accessToken}` }
                    }
                );

                this.log(LoggerLevel.debug, `[user.exchange] User ID exchanged: ${user_id}, code=${response.data.code}`);
                this.log(LoggerLevel.trace, `[user.exchange] Response: ${JSON.stringify(response.data)}`);

                if (response.data.code !== '0') {
                    this.log(LoggerLevel.error, `[user.exchange] Error exchanging user: code=${response.data.code}, msg=${response.data.msg}`);
                    throw new Error(response.data.msg || `Exchange failed with code ${response.data.code}`);
                }

                return response.data.data && response.data.data[0]; // 返回第一个元素
            });

            return res;
        },

        /**
         * 批量用户 ID 交换
         * @param params 请求参数
         * @returns 批量操作结果，包含成功和失败的详细信息
         */
        batchExchange: async (params: {
            user_id_type: 'user_id' | 'external_user_id' | 'external_open_id';
            user_ids: string[];
            feishu_app_id: string;
            retryOptions?: RetryOptions;
        }): Promise<BatchResult<any>> => {
            const { user_id_type, user_ids, feishu_app_id, retryOptions } = params;
            // user_id_type 可选值：
            // - 'user_id' (如 "1758534140403815")
            // - 'external_user_id' (外部平台 user_id, 无固定格式)
            // - 'external_open_id' (以 'ou_' 开头的 open_id)

            // 参数校验
            if (!user_ids || !Array.isArray(user_ids)) {
                this.log(LoggerLevel.error, '[user.batchExchange] Invalid user_ids parameter: must be a non-empty array');
                throw new Error('参数 user_ids 必须是一个数组');
            }

            if (user_ids.length === 0) {
                this.log(LoggerLevel.warn, '[user.batchExchange] Empty user_ids array provided, returning empty result');
                return { success: [], failed: [], successCount: 0, failedCount: 0, total: 0 };
            }

            const url = '/api/integration/v2/feishu/getUsers';

            const chunkSize = 200; // 最大支持200个
            const chunks: string[][] = [];
            for (let i = 0; i < user_ids.length; i += chunkSize) {
                chunks.push(user_ids.slice(i, i + chunkSize));
            }

            this.log(LoggerLevel.info, `[user.batchExchange] Chunking ${user_ids.length} user IDs into ${chunks.length} groups of ${chunkSize}`);

            const successResults: any[] = [];
            const failedResults: Array<{ id: string; error: string }> = [];

            for (const [index, chunk] of chunks.entries()) {
                this.log(LoggerLevel.info, `[user.batchExchange] Processing chunk ${index + 1}/${chunks.length}: ${chunk.length} IDs`);

                try {
                    const res = await executeWithRetry(
                        async () => {
                            return await functionLimiter(async () => {
                                await this.ensureTokenValid();

                                const response = await this.axiosInstance.post(
                                    url,
                                    {
                                        user_id_type,
                                        feishu_app_id,
                                        user_ids: chunk
                                    },
                                    {
                                        headers: { Authorization: `${this.accessToken}` },
                                        timeout: 30000 // 30秒超时
                                    }
                                );

                                this.log(LoggerLevel.debug, `[user.batchExchange] Chunk ${index + 1} completed: code=${response.data.code}`);
                                this.log(LoggerLevel.trace, `[user.batchExchange] Chunk ${index + 1} response: ${JSON.stringify(response.data)}`);

                                if (response.data.code !== '0') {
                                    this.log(LoggerLevel.error, `[user.batchExchange] Error exchanging users: code=${response.data.code}, msg=${response.data.msg}`);
                                    throw new Error(response.data.msg || `Exchange failed with code ${response.data.code}`);
                                }

                                return response.data.data || [];
                            });
                        },
                        retryOptions,
                        `[user.batchExchange] Chunk ${index + 1}/${chunks.length}`,
                        this.log.bind(this)
                    );

                    successResults.push(...res);
                    this.log(LoggerLevel.info, `[user.batchExchange] Chunk ${index + 1} succeeded: ${res.length} users`);
                } catch (error) {
                    // 部分失败：记录失败的chunk
                    const errorMsg = error instanceof Error ? error.message : String(error);
                    this.log(LoggerLevel.error, `[user.batchExchange] Chunk ${index + 1} failed after retries: ${errorMsg}`);

                    chunk.forEach(id => {
                        failedResults.push({
                            id,
                            error: errorMsg
                        });
                    });
                }
            }

            const result: BatchResult<any> = {
                success: successResults,
                failed: failedResults,
                successCount: successResults.length,
                failedCount: failedResults.length,
                total: user_ids.length
            };

            this.log(LoggerLevel.info, `[user.batchExchange] Completed: total=${result.total}, success=${result.successCount}, failed=${result.failedCount}`);

            return result;
        }
    };

    /**
     * 云函数模块
     */
    public function = {
        /**
         * 调用云函数
         * @param params 请求参数 { name: string; params: any }
         * @returns 接口返回结果
         */
        invoke: async (params: { name: string; params: any }): Promise<any> => {
            const { name, params: functionParams } = params;
            await this.ensureTokenValid();

            const url = `/api/cloudfunction/v1/namespaces/${this.namespace}/invoke/${name}`;

            this.log(LoggerLevel.info, `[function.invoke] Invoking cloud function: ${name}`);

            const res = await this.axiosInstance.post(
                url,
                { params: functionParams },
                {
                    headers: {
                        Authorization: `${this.accessToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            this.log(LoggerLevel.debug, `[function.invoke] Cloud function invoked: ${name}, code=${res.data.code}`);
            this.log(LoggerLevel.trace, `[function.invoke] Response: ${JSON.stringify(res.data)}`);

            return res.data;
        }
    };

    /**
     * 页面模块
     */
    public page = {
        /**
         * 获取所有页面
         * @param params 请求参数 { limit: number (max 200), offset: number }
         * @returns 接口返回结果
         */
        list: async (params: { limit: number; offset: number }): Promise<any> => {
            const { limit, offset } = params;
            await this.ensureTokenValid();

            const url = `/api/builder/v1/namespaces/${this.namespace}/meta/pages`;

            this.log(LoggerLevel.info, `[page.list] Fetching pages list: offset=${offset}, limit=${limit}`);

            const res = await this.axiosInstance.post(
                url,
                { limit, offset },
                {
                    headers: {
                        Authorization: `${this.accessToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            this.log(LoggerLevel.debug, `[page.list] Pages list fetched: code=${res.data.code}`);
            this.log(LoggerLevel.trace, `[page.list] Response: ${JSON.stringify(res.data)}`);

            return res.data;
        },

        /**
         * 获取所有页面 - 支持自动分页，获取全部数据
         * @description 该方法会自动处理分页，直到获取所有页面数据
         * @param params 请求参数 { limit?: number }
         * @returns { total, items }
         */
        listWithIterator: async (params?: { limit?: number }): Promise<{ total: number; items: any[] }> => {
            const limit = params?.limit || 100;
            let results: any[] = [];
            let offset = 0;
            let total = 0;
            let page = 0;
            let totalPages = 0;

            do {
                const pageRes = await functionLimiter(async () => {
                    const res = await this.page.list({ limit, offset });

                    if (res.code !== '0') {
                        this.log(LoggerLevel.error, `[page.listWithIterator] Error fetching pages: code=${res.code}, msg=${res.msg}`);
                        throw new Error(res.msg || `Fetch failed with code ${res.code}`);
                    }

                    page += 1;

                    if (res.data && Array.isArray(res.data.items)) {
                        results = results.concat(res.data.items);
                    }

                    if (page === 1) {
                        total = res.data?.total || 0;
                        totalPages = Math.ceil(total / limit);
                        this.log(LoggerLevel.info, `[page.listWithIterator] Starting paginated query: total=${total}, pages=${totalPages}`);
                    }

                    offset += limit;

                    const padLength = totalPages.toString().length;
                    const pageStr = page.toString().padStart(padLength, '0');
                    const totalPagesStr = totalPages.toString().padStart(padLength, '0');

                    this.log(LoggerLevel.info, `[page.listWithIterator] Page completed: [${pageStr}/${totalPagesStr}]`);
                    this.log(LoggerLevel.debug, `[page.listWithIterator] Page ${page} details: items=${res.data?.items?.length}, offset=${offset}`);
                    this.log(LoggerLevel.trace, `[page.listWithIterator] Page ${page} data: ${JSON.stringify(res.data?.items)}`);

                    return res;
                });
            } while (results.length < total);

            return { total, items: results };
        },

        /**
         * 获取页面详情
         * @param params 请求参数 { page_id: string }
         * @returns 接口返回结果
         */
        detail: async (params: { page_id: string }): Promise<any> => {
            const { page_id } = params;
            await this.ensureTokenValid();

            const url = `/api/builder/v1/namespaces/${this.namespace}/meta/pages/${page_id}`;

            this.log(LoggerLevel.info, `[page.detail] Fetching page detail: ${page_id}`);

            const res = await this.axiosInstance.get(url, {
                headers: {
                    Authorization: `${this.accessToken}`
                }
            });

            this.log(LoggerLevel.debug, `[page.detail] Page detail fetched: ${page_id}, code=${res.data.code}`);
            this.log(LoggerLevel.trace, `[page.detail] Response: ${JSON.stringify(res.data)}`);

            return res.data;
        },

        /**
         * 获取页面访问地址
         * @param params 请求参数 { page_id: string, pageParams?: any, parentPageParams?: any, navId?: string, tabId?: string }
         * @returns 接口返回结果
         */
        url: async (params: { page_id: string; pageParams?: any; parentPageParams?: any; navId?: string; tabId?: string }): Promise<any> => {
            const { page_id, pageParams, parentPageParams, navId, tabId } = params;
            await this.ensureTokenValid();

            const url = `/api/builder/v1/namespaces/${this.namespace}/meta/pages/${page_id}/link`;

            this.log(LoggerLevel.info, `[page.url] Fetching page URL: ${page_id}`);

            const requestData: any = {};
            if (pageParams) requestData.pageParams = pageParams;
            if (parentPageParams) requestData.parentPageParams = parentPageParams;
            if (navId) requestData.navId = navId;
            if (tabId) requestData.tabId = tabId;

            const res = await this.axiosInstance.post(url, requestData, {
                headers: {
                    Authorization: `${this.accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            this.log(LoggerLevel.debug, `[page.url] Page URL fetched: ${page_id}, code=${res.data.code}`);
            this.log(LoggerLevel.trace, `[page.url] Response: ${JSON.stringify(res.data)}`);

            return res.data;
        }
    };

    /**
     * 附件模块
     */
    public attachment = {
        /**
         * 文件操作
         */
        file: {
            /**
             * 上传文件
             * @param params 请求参数 { file: any }
             * @returns 接口返回结果
             */
            upload: async (params: { file: any }): Promise<any> => {
                const { file } = params;
                await this.ensureTokenValid();

                const url = '/api/attachment/v1/files';

                this.log(LoggerLevel.info, '[attachment.file.upload] Uploading file');

                const FormData = require('form-data');
                const formData = new FormData();
                formData.append('file', file);

                const res = await this.axiosInstance.post(url, formData, {
                    headers: {
                        Authorization: `${this.accessToken}`,
                        ...formData.getHeaders()
                    }
                });

                this.log(LoggerLevel.debug, `[attachment.file.upload] File uploaded: code=${res.data.code}`);
                this.log(LoggerLevel.trace, `[attachment.file.upload] Response: ${JSON.stringify(res.data)}`);

                return res.data;
            },

            /**
             * 下载文件
             * @param params 请求参数 { file_id: string }
             * @returns 文件二进制流
             */
            download: async (params: { file_id: string }): Promise<any> => {
                const { file_id } = params;
                await this.ensureTokenValid();

                const url = `/api/attachment/v1/files/${file_id}`;

                this.log(LoggerLevel.info, `[attachment.file.download] Downloading file: ${file_id}`);

                const res = await this.axiosInstance.get(url, {
                    headers: {
                        Authorization: `${this.accessToken}`
                    },
                    responseType: 'arraybuffer'
                });

                this.log(LoggerLevel.debug, `[attachment.file.download] File downloaded: ${file_id}`);

                return res.data;
            },

            /**
             * 删除文件
             * @param params 请求参数 { file_id: string }
             * @returns 接口返回结果
             */
            delete: async (params: { file_id: string }): Promise<any> => {
                const { file_id } = params;
                await this.ensureTokenValid();

                const url = `/v1/files/${file_id}`;

                this.log(LoggerLevel.info, `[attachment.file.delete] Deleting file: ${file_id}`);

                const res = await this.axiosInstance.delete(url, {
                    headers: {
                        Authorization: `${this.accessToken}`
                    }
                });

                this.log(LoggerLevel.debug, `[attachment.file.delete] File deleted: ${file_id}, code=${res.data.code}`);
                this.log(LoggerLevel.trace, `[attachment.file.delete] Response: ${JSON.stringify(res.data)}`);

                return res.data;
            }
        },

        /**
         * 头像图片操作
         */
        avatar: {
            /**
             * 上传头像图片
             * @param params 请求参数 { image: any }
             * @returns 接口返回结果
             */
            upload: async (params: { image: any }): Promise<any> => {
                const { image } = params;
                await this.ensureTokenValid();

                const url = '/api/attachment/v1/images';

                this.log(LoggerLevel.info, '[attachment.avatar.upload] Uploading avatar image');

                const FormData = require('form-data');
                const formData = new FormData();
                formData.append('image', image);

                const res = await this.axiosInstance.post(url, formData, {
                    headers: {
                        Authorization: `${this.accessToken}`,
                        ...formData.getHeaders()
                    }
                });

                this.log(LoggerLevel.debug, `[attachment.avatar.upload] Avatar image uploaded: code=${res.data.code}`);
                this.log(LoggerLevel.trace, `[attachment.avatar.upload] Response: ${JSON.stringify(res.data)}`);

                return res.data;
            },

            /**
             * 下载头像图片
             * @param params 请求参数 { image_id: string }
             * @returns 图片二进制流
             */
            download: async (params: { image_id: string }): Promise<any> => {
                const { image_id } = params;
                await this.ensureTokenValid();

                const url = `/api/attachment/v1/images/${image_id}`;

                this.log(LoggerLevel.info, `[attachment.avatar.download] Downloading avatar image: ${image_id}`);

                const res = await this.axiosInstance.get(url, {
                    headers: {
                        Authorization: `${this.accessToken}`
                    },
                    responseType: 'arraybuffer'
                });

                this.log(LoggerLevel.debug, `[attachment.avatar.download] Avatar image downloaded: ${image_id}`);

                return res.data;
            }
        }
    };

    /**
     * 全局数据模块
     */
    public global = {
        /**
         * 全局选项
         */
        options: {
            /**
             * 查询全局选项详情
             * @param params 请求参数 { api_name: string }
             * @returns 接口返回结果
             */
            detail: async (params: { api_name: string }): Promise<any> => {
                const { api_name } = params;
                await this.ensureTokenValid();

                const url = `/api/data/v1/namespaces/${this.namespace}/globalOptions/${api_name}`;

                this.log(LoggerLevel.info, `[global.options.detail] Fetching global option detail: ${api_name}`);

                const res = await this.axiosInstance.get(url, {
                    headers: {
                        Authorization: `${this.accessToken}`
                    }
                });

                this.log(LoggerLevel.debug, `[global.options.detail] Global option detail fetched: ${api_name}, code=${res.data.code}`);
                this.log(LoggerLevel.trace, `[global.options.detail] Response: ${JSON.stringify(res.data)}`);

                return res.data;
            },

            /**
             * 查询全局选项列表
             * @param params 请求参数 { limit: number, offset: number, filter?: { quickQuery?: string } }
             * @returns 接口返回结果
             */
            list: async (params: { limit: number; offset: number; filter?: { quickQuery?: string } }): Promise<any> => {
                const { limit, offset, filter } = params;
                await this.ensureTokenValid();

                const url = `/api/data/v1/namespaces/${this.namespace}/globalOptions/list`;

                this.log(LoggerLevel.info, `[global.options.list] Fetching global options list: offset=${offset}, limit=${limit}`);

                const requestData: any = { limit, offset };
                if (filter) {
                    requestData.filter = filter;
                }

                const res = await this.axiosInstance.post(url, requestData, {
                    headers: {
                        Authorization: `${this.accessToken}`,
                        'Content-Type': 'application/json'
                    }
                });

                this.log(LoggerLevel.debug, `[global.options.list] Global options list fetched: code=${res.data.code}`);
                this.log(LoggerLevel.trace, `[global.options.list] Response: ${JSON.stringify(res.data)}`);

                return res.data;
            },

            /**
             * 查询所有全局选项 - 支持自动分页，获取全部数据
             * @description 该方法会自动处理分页，直到获取所有全局选项数据
             * @param params 请求参数 { limit?: number, filter?: { quickQuery?: string } }
             * @returns { total, items }
             */
            listWithIterator: async (params?: { limit?: number; filter?: { quickQuery?: string } }): Promise<{ total: number; items: any[] }> => {
                const limit = params?.limit || 100;
                const filter = params?.filter;
                let results: any[] = [];
                let offset = 0;
                let total = 0;
                let page = 0;
                let totalPages = 0;

                do {
                    const pageRes = await functionLimiter(async () => {
                        const requestParams: any = { limit, offset };
                        if (filter) {
                            requestParams.filter = filter;
                        }

                        const res = await this.global.options.list(requestParams);

                        if (res.code !== '0') {
                            this.log(LoggerLevel.error, `[global.options.listWithIterator] Error fetching global options: code=${res.code}, msg=${res.msg}`);
                            throw new Error(res.msg || `Fetch failed with code ${res.code}`);
                        }

                        page += 1;

                        if (res.data && Array.isArray(res.data.items)) {
                            results = results.concat(res.data.items);
                        }

                        if (page === 1) {
                            total = res.data?.total || 0;
                            totalPages = Math.ceil(total / limit);
                            this.log(LoggerLevel.info, `[global.options.listWithIterator] Starting paginated query: total=${total}, pages=${totalPages}`);
                        }

                        offset += limit;

                        const padLength = totalPages.toString().length;
                        const pageStr = page.toString().padStart(padLength, '0');
                        const totalPagesStr = totalPages.toString().padStart(padLength, '0');

                        this.log(LoggerLevel.info, `[global.options.listWithIterator] Page completed: [${pageStr}/${totalPagesStr}]`);
                        this.log(LoggerLevel.debug, `[global.options.listWithIterator] Page ${page} details: items=${res.data?.items?.length}, offset=${offset}`);
                        this.log(LoggerLevel.trace, `[global.options.listWithIterator] Page ${page} data: ${JSON.stringify(res.data?.items)}`);

                        return res;
                    });
                } while (results.length < total);

                return { total, items: results };
            }
        },

        /**
         * 环境变量
         */
        variables: {
            /**
             * 查询环境变量详情
             * @param params 请求参数 { api_name: string }
             * @returns 接口返回结果
             */
            detail: async (params: { api_name: string }): Promise<any> => {
                const { api_name } = params;
                await this.ensureTokenValid();

                const url = `/api/data/v1/namespaces/${this.namespace}/globalVariables/${api_name}`;

                this.log(LoggerLevel.info, `[global.variables.detail] Fetching global variable detail: ${api_name}`);

                const res = await this.axiosInstance.get(url, {
                    headers: {
                        Authorization: `${this.accessToken}`
                    }
                });

                this.log(LoggerLevel.debug, `[global.variables.detail] Global variable detail fetched: ${api_name}, code=${res.data.code}`);
                this.log(LoggerLevel.trace, `[global.variables.detail] Response: ${JSON.stringify(res.data)}`);

                return res.data;
            },

            /**
             * 查询环境变量列表
             * @param params 请求参数 { limit: number, offset: number, filter?: { quickQuery?: string } }
             * @returns 接口返回结果
             */
            list: async (params: { limit: number; offset: number; filter?: { quickQuery?: string } }): Promise<any> => {
                const { limit, offset, filter } = params;
                await this.ensureTokenValid();

                const url = `/api/data/v1/namespaces/${this.namespace}/globalVariables/list`;

                this.log(LoggerLevel.info, `[global.variables.list] Fetching global variables list: offset=${offset}, limit=${limit}`);

                const requestData: any = { limit, offset };
                if (filter) {
                    requestData.filter = filter;
                }

                const res = await this.axiosInstance.post(url, requestData, {
                    headers: {
                        Authorization: `${this.accessToken}`,
                        'Content-Type': 'application/json'
                    }
                });

                this.log(LoggerLevel.debug, `[global.variables.list] Global variables list fetched: code=${res.data.code}`);
                this.log(LoggerLevel.trace, `[global.variables.list] Response: ${JSON.stringify(res.data)}`);

                return res.data;
            },

            /**
             * 查询所有环境变量 - 支持自动分页，获取全部数据
             * @description 该方法会自动处理分页，直到获取所有环境变量数据
             * @param params 请求参数 { limit?: number, filter?: { quickQuery?: string } }
             * @returns { total, items }
             */
            listWithIterator: async (params?: { limit?: number; filter?: { quickQuery?: string } }): Promise<{ total: number; items: any[] }> => {
                const limit = params?.limit || 100;
                const filter = params?.filter;
                let results: any[] = [];
                let offset = 0;
                let total = 0;
                let page = 0;
                let totalPages = 0;

                do {
                    const pageRes = await functionLimiter(async () => {
                        const requestParams: any = { limit, offset };
                        if (filter) {
                            requestParams.filter = filter;
                        }

                        const res = await this.global.variables.list(requestParams);

                        if (res.code !== '0') {
                            this.log(LoggerLevel.error, `[global.variables.listWithIterator] Error fetching global variables: code=${res.code}, msg=${res.msg}`);
                            throw new Error(res.msg || `Fetch failed with code ${res.code}`);
                        }

                        page += 1;

                        if (res.data && Array.isArray(res.data.items)) {
                            results = results.concat(res.data.items);
                        }

                        if (page === 1) {
                            total = res.data?.total || 0;
                            totalPages = Math.ceil(total / limit);
                            this.log(LoggerLevel.info, `[global.variables.listWithIterator] Starting paginated query: total=${total}, pages=${totalPages}`);
                        }

                        offset += limit;

                        const padLength = totalPages.toString().length;
                        const pageStr = page.toString().padStart(padLength, '0');
                        const totalPagesStr = totalPages.toString().padStart(padLength, '0');

                        this.log(LoggerLevel.info, `[global.variables.listWithIterator] Page completed: [${pageStr}/${totalPagesStr}]`);
                        this.log(LoggerLevel.debug, `[global.variables.listWithIterator] Page ${page} details: items=${res.data?.items?.length}, offset=${offset}`);
                        this.log(LoggerLevel.trace, `[global.variables.listWithIterator] Page ${page} data: ${JSON.stringify(res.data?.items)}`);

                        return res;
                    });
                } while (results.length < total);

                return { total, items: results };
            }
        }
    };

    /**
     * 自动化流程模块
     */
    public automation = {
        /**
         * V1 版本
         */
        v1: {
            /**
             * 执行流程
             * @param params 请求参数 { flow_api_name: string, operator: { _id: number, email: string }, params: any }
             * @returns 接口返回结果
             */
            execute: async (params: { flow_api_name: string; operator: { _id: number; email: string }; params: any }): Promise<any> => {
                const { flow_api_name, operator, params: flowParams } = params;
                await this.ensureTokenValid();

                const url = `/api/flow/v1/namespaces/${this.namespace}/flows/${flow_api_name}/execute`;

                this.log(LoggerLevel.info, `[automation.v1.execute] Executing flow: ${flow_api_name}`);

                const res = await this.axiosInstance.post(
                    url,
                    {
                        operator,
                        params: flowParams
                    },
                    {
                        headers: {
                            Authorization: `${this.accessToken}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );

                this.log(LoggerLevel.debug, `[automation.v1.execute] Flow executed: ${flow_api_name}, code=${res.data.code}`);
                this.log(LoggerLevel.trace, `[automation.v1.execute] Response: ${JSON.stringify(res.data)}`);

                return res.data;
            }
        },

        /**
         * V2 版本
         */
        v2: {
            /**
             * 执行流程
             * @param params 请求参数 { flow_api_name: string, operator: { _id: number, email: string }, params: any, is_resubmit?: boolean, pre_instance_id?: string }
             * @returns 接口返回结果
             */
            execute: async (params: {
                flow_api_name: string;
                operator: { _id: number; email: string };
                params: any;
                is_resubmit?: boolean;
                pre_instance_id?: string;
            }): Promise<any> => {
                const { flow_api_name, operator, params: flowParams, is_resubmit, pre_instance_id } = params;
                await this.ensureTokenValid();

                const url = `/v2/namespaces/${this.namespace}/flows/${flow_api_name}/execute`;

                this.log(LoggerLevel.info, `[automation.v2.execute] Executing flow: ${flow_api_name}`);

                const requestData: any = {
                    operator,
                    params: flowParams
                };

                if (is_resubmit !== undefined) {
                    requestData.is_resubmit = is_resubmit;
                }
                if (pre_instance_id) {
                    requestData.pre_instance_id = pre_instance_id;
                }

                const res = await this.axiosInstance.post(url, requestData, {
                    headers: {
                        Authorization: `${this.accessToken}`,
                        'Content-Type': 'application/json'
                    }
                });

                this.log(LoggerLevel.debug, `[automation.v2.execute] Flow executed: ${flow_api_name}, code=${res.data.code}`);
                this.log(LoggerLevel.trace, `[automation.v2.execute] Response: ${JSON.stringify(res.data)}`);

                return res.data;
            }
        }
    };
}

export const apaas = {
    Client
};

export type { BatchResult, RetryOptions };
