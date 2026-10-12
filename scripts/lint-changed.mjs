#!/usr/bin/env node
// Incremental lint: runs ESLint on files changed since a base ref and reports only problems on
// lines that were added or modified. Existing issues elsewhere in a touched file don't fail CI,
// so the codebase can adopt the rules gradually.
//
// Usage: node scripts/lint-changed.mjs [baseRef]   (default: origin/master, or $LINT_BASE)
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { ESLint } from 'eslint';

const base = process.argv[2] || process.env.LINT_BASE || 'origin/master';
const LINTED = /^(server\/(src|tests)|client\/(src|tests))\/.*\.(ts|vue)$/;

const git = (...args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const mergeBase = git('merge-base', base, 'HEAD').trim();

/** Map of file -> Set of changed line numbers (new side), from a zero-context diff. */
function changedLines() {
    const diff = git('diff', '--unified=0', '--no-color', '--diff-filter=ACMR', mergeBase, '--', '*.ts', '*.vue');
    const result = new Map();
    let file = null;
    for (const line of diff.split('\n')) {
        if (line.startsWith('+++ ')) {
            const name = line.slice(4).replace(/^b\//, '');
            file = LINTED.test(name) && existsSync(name) ? name : null;
            if (file && !result.has(file)) result.set(file, new Set());
            continue;
        }
        const hunk = file && line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/);
        if (hunk) {
            const start = Number(hunk[1]);
            const count = hunk[2] === undefined ? 1 : Number(hunk[2]);
            for (let i = 0; i < count; i++) result.get(file).add(start + i);
        }
    }
    return result;
}

const changed = changedLines();
const files = [...changed.keys()];
if (files.length === 0) {
    console.log(`No lintable changes since ${base}.`);
    process.exit(0);
}

console.log(`Linting changed lines in ${files.length} file(s) since ${base}...`);
const eslint = new ESLint();
const results = await eslint.lintFiles(files);

let errors = 0;
let warnings = 0;
for (const result of results) {
    const rel = path.relative(process.cwd(), result.filePath).split(path.sep).join('/');
    const lines = changed.get(rel) ?? new Set();
    // Fatal parse errors (line 0) always count; otherwise only changed lines
    const messages = result.messages.filter(m => m.fatal || lines.has(m.line));
    if (messages.length === 0) continue;
    console.log(`\n${rel}`);
    for (const m of messages) {
        const level = m.severity === 2 ? 'error' : 'warning';
        if (m.severity === 2) errors++; else warnings++;
        console.log(`  ${m.line}:${m.column}  ${level}  ${m.message}  ${m.ruleId ?? ''}`);
    }
}

console.log(`\n${errors} error(s), ${warnings} warning(s) on changed lines.`);
process.exit(errors > 0 ? 1 : 0);
