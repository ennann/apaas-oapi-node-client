import { apaas } from '../src/index';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
    try {
        // 初始化客户端
        const client = new apaas.Client({
            clientId: 'your_client_id',
            clientSecret: 'your_client_secret',
            namespace: 'your_namespace'
        });

        await client.init();
        client.setLoggerLevel('3');

        console.log('📝 正在导出数据对象文档...\n');

        // 方式一：导出所有对象（推荐）
        console.log('✨ 导出所有对象...');
        const allMarkdown = await client.object.metadata.export2markdown();
        
        const outputPath1 = path.join(__dirname, 'all_objects.md');
        fs.writeFileSync(outputPath1, allMarkdown, 'utf-8');
        console.log(`✅ 所有对象文档已导出: ${path.basename(outputPath1)}`);
        console.log(`📊 文档大小: ${(allMarkdown.length / 1024).toFixed(2)} KB\n`);

        // 方式二：只导出指定的对象
        console.log('✨ 导出指定对象...');
        const specificMarkdown = await client.object.metadata.export2markdown({
            object_names: ['object_store', 'object_order', '_user']
        });
        
        const outputPath2 = path.join(__dirname, 'specific_objects.md');
        fs.writeFileSync(outputPath2, specificMarkdown, 'utf-8');
        console.log(`✅ 指定对象文档已导出: ${path.basename(outputPath2)}`);
        console.log(`📊 文档大小: ${(specificMarkdown.length / 1024).toFixed(2)} KB\n`);

        // 方式三：结合 listWithIterator 使用（灵活筛选）
        console.log('✨ 使用 listWithIterator 筛选后导出...');
        const allObjects = await client.object.listWithIterator();
        
        // 例如：只导出自定义对象（非系统对象）
        const customObjects = allObjects.items
            .filter((obj: any) => !obj.apiName.startsWith('_'))
            .map((obj: any) => obj.apiName);
        
        console.log(`📋 找到 ${customObjects.length} 个自定义对象`);
        
        const customMarkdown = await client.object.metadata.export2markdown({
            object_names: customObjects
        });
        
        const outputPath3 = path.join(__dirname, 'custom_objects.md');
        fs.writeFileSync(outputPath3, customMarkdown, 'utf-8');
        console.log(`✅ 自定义对象文档已导出: ${path.basename(outputPath3)}`);
        console.log(`📊 文档大小: ${(customMarkdown.length / 1024).toFixed(2)} KB\n`);

        console.log('🎉 所有导出任务完成！');
    } catch (error) {
        console.error('❌ 导出失败:', error);
    }
}

main();
