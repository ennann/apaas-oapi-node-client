import fs from 'fs';
import path from 'path';

const repoRoot = path.resolve(__dirname, '..');
const skillsRoot = path.join(repoRoot, 'skills');
const readme = fs.readFileSync(path.join(repoRoot, 'README.md'), 'utf8');
const userManual = fs.readFileSync(path.join(repoRoot, 'UserManual.md'), 'utf8');
const publicDocs = [readme, userManual];

type SkillMetadata = {
    name: string;
    description: string;
    frontmatterKeys: string[];
    body: string;
};

function parseSkillMarkdown(skillDir: string): SkillMetadata {
    const skillPath = path.join(skillsRoot, skillDir, 'SKILL.md');
    const text = fs.readFileSync(skillPath, 'utf8');
    const match = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!match) {
        throw new Error(`${skillDir} missing YAML frontmatter`);
    }

    const frontmatter = match[1].split('\n').filter(Boolean);
    const data = new Map<string, string>();
    for (const line of frontmatter) {
        const separator = line.indexOf(':');
        if (separator === -1) {
            throw new Error(`${skillDir} invalid frontmatter line: ${line}`);
        }
        const key = line.slice(0, separator).trim();
        const value = line.slice(separator + 1).trim().replace(/^"(.*)"$/, '$1');
        data.set(key, value);
    }

    return {
        name: data.get('name') || '',
        description: data.get('description') || '',
        frontmatterKeys: Array.from(data.keys()),
        body: match[2]
    };
}

function parseOpenAiYaml(skillDir: string) {
    const yamlPath = path.join(skillsRoot, skillDir, 'agents', 'openai.yaml');
    const text = fs.readFileSync(yamlPath, 'utf8');
    return {
        displayName: text.match(/display_name:\s*"([^"]+)"/)?.[1] || '',
        shortDescription: text.match(/short_description:\s*"([^"]+)"/)?.[1] || '',
        defaultPrompt: text.match(/default_prompt:\s*"([^"]+)"/)?.[1] || ''
    };
}

describe('bundled aPaaS skills', () => {
    const skillDirs = fs.readdirSync(skillsRoot, { withFileTypes: true })
        .filter(entry => entry.isDirectory() && entry.name.startsWith('apaas-'))
        .map(entry => entry.name)
        .sort();

    it('keeps skill folders, frontmatter, and UI metadata aligned', () => {
        expect(skillDirs.length).toBeGreaterThan(0);

        for (const skillDir of skillDirs) {
            const metadata = parseSkillMarkdown(skillDir);
            const openAi = parseOpenAiYaml(skillDir);

            expect(metadata.name).toBe(skillDir);
            expect(metadata.frontmatterKeys.sort()).toEqual(['description', 'name']);
            expect(metadata.description.length).toBeGreaterThan(80);
            expect(metadata.body).not.toMatch(/TODO|\[TODO/);
            expect(metadata.body.split('\n').length).toBeLessThanOrEqual(500);
            expect(openAi.displayName).toContain('aPaaS');
            expect(openAi.shortDescription.length).toBeGreaterThanOrEqual(25);
            expect(openAi.shortDescription.length).toBeLessThanOrEqual(64);
            expect(openAi.defaultPrompt).toContain(`$${skillDir}`);
            for (const doc of publicDocs) {
                expect(doc).toContain(`\`${skillDir}\``);
            }
        }
    });

    it('keeps removed legacy skill names out of public docs and bundled skills', () => {
        expect(skillDirs).not.toContain('apaas-schema');
        expect(skillDirs).not.toContain('apaas-exchange-attachment');

        for (const doc of publicDocs) {
            expect(doc).not.toContain('`apaas-schema`');
            expect(doc).not.toContain('`apaas-exchange-attachment`');
        }
    });

    it('links every bundled reference from its owning SKILL.md', () => {
        for (const skillDir of skillDirs) {
            const metadata = parseSkillMarkdown(skillDir);
            const referencesDir = path.join(skillsRoot, skillDir, 'references');
            if (!fs.existsSync(referencesDir)) {
                continue;
            }

            const references = fs.readdirSync(referencesDir)
                .filter(file => file.endsWith('.md'))
                .sort();

            for (const reference of references) {
                expect(metadata.body).toContain(`references/${reference}`);
            }
        }
    });
});
