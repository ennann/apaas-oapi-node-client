#!/usr/bin/env node

const fs = require("fs");
const os = require("os");
const path = require("path");

const packageRoot = path.resolve(__dirname, "..");
const skillsRoot = path.join(packageRoot, "skills");

function usage() {
    console.log(`Usage:
  npx apaas-oapi-client install-skills [--target <dir>] [--dry-run]

Commands:
  install-skills    Install bundled aPaaS Codex skills.

Options:
  --target <dir>    Skill install directory. Defaults to $CODEX_HOME/skills or ~/.codex/skills.
  --dry-run         Print planned copies without writing files.
  -h, --help        Show this help.`);
}

function parseArgs(argv) {
    const args = {
        command: argv[0],
        target: process.env.CODEX_HOME
            ? path.join(process.env.CODEX_HOME, "skills")
            : path.join(os.homedir(), ".codex", "skills"),
        dryRun: false
    };

    if (args.command === "-h" || args.command === "--help") {
        args.command = "help";
        return args;
    }

    for (let i = 1; i < argv.length; i += 1) {
        const arg = argv[i];

        if (arg === "--dry-run") {
            args.dryRun = true;
            continue;
        }

        if (arg === "--target") {
            const target = argv[i + 1];
            if (!target) {
                throw new Error("--target requires a directory");
            }
            args.target = path.resolve(target);
            i += 1;
            continue;
        }

        if (arg === "-h" || arg === "--help") {
            args.command = "help";
            continue;
        }

        throw new Error(`Unknown option: ${arg}`);
    }

    return args;
}

function listBundledSkills() {
    if (!fs.existsSync(skillsRoot)) {
        throw new Error(`Bundled skills directory not found: ${skillsRoot}`);
    }

    return fs.readdirSync(skillsRoot, { withFileTypes: true })
        .filter(entry => entry.isDirectory() && entry.name.startsWith("apaas-"))
        .map(entry => entry.name)
        .sort();
}

function installSkills(args) {
    const skillNames = listBundledSkills();

    if (skillNames.length === 0) {
        throw new Error(`No bundled apaas-* skills found in ${skillsRoot}`);
    }

    console.log(`Installing ${skillNames.length} aPaaS skill(s) to ${args.target}`);

    if (!args.dryRun) {
        fs.mkdirSync(args.target, { recursive: true });
    }

    for (const skillName of skillNames) {
        const source = path.join(skillsRoot, skillName);
        const target = path.join(args.target, skillName);
        console.log(`${args.dryRun ? "Would copy" : "Copying"} ${skillName}`);

        if (!args.dryRun) {
            fs.cpSync(source, target, {
                recursive: true,
                force: true,
                errorOnExist: false
            });
        }
    }

    console.log(args.dryRun ? "Dry run complete." : "Done. Restart or refresh Codex to load the skills.");
}

function main() {
    const args = parseArgs(process.argv.slice(2));

    if (!args.command || args.command === "help") {
        usage();
        return;
    }

    if (args.command !== "install-skills") {
        throw new Error(`Unknown command: ${args.command}`);
    }

    installSkills(args);
}

try {
    main();
} catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    console.error("");
    usage();
    process.exitCode = 1;
}
