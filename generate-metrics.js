#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class ProjectMetrics {
    constructor(rootDir) {
        this.rootDir = rootDir;
        this.metrics = {
            fileTypes: {},
            categories: {
                source: { files: [], lines: 0, bytes: 0 },
                styles: { files: [], lines: 0, bytes: 0 },
                markup: { files: [], lines: 0, bytes: 0 },
                documentation: { files: [], lines: 0, bytes: 0 },
                config: { files: [], lines: 0, bytes: 0 },
                data: { files: [], lines: 0, bytes: 0 }
            },
            largest: {
                byLines: [],
                byBytes: []
            },
            totals: {
                files: 0,
                lines: 0,
                bytes: 0,
                codeLines: 0,
                commentLines: 0,
                blankLines: 0
            }
        };

        this.ignorePatterns = [
            'node_modules',
            '.git',
            '.venv',
            'venv',
            '__pycache__',
            'dist',
            'build',
            'coverage',
            '.pytest_cache',
            '.mypy_cache',
            '.DS_Store',
            'package-lock.json',
            'yarn.lock',
            'pnpm-lock.yaml',
            '.pyc',
            '.pyo',
            '.so',
            '.dylib',
            '.dll',
            '.exe',
            '.obj',
            '.o',
            '.a',
            '.lib',
            '.bin',
            '.class',
            '.cache',
            'generate-metrics.js',
            'PROJECT_METRICS.md'
        ];

        this.categoryMapping = {
            '.js': 'source',
            '.ts': 'source',
            '.jsx': 'source',
            '.tsx': 'source',
            '.mjs': 'source',
            '.css': 'styles',
            '.scss': 'styles',
            '.sass': 'styles',
            '.less': 'styles',
            '.html': 'markup',
            '.htm': 'markup',
            '.xml': 'markup',
            '.svg': 'markup',
            '.md': 'documentation',
            '.txt': 'documentation',
            '.json': 'config',
            '.yml': 'config',
            '.yaml': 'config',
            '.toml': 'config',
            '.ini': 'config',
            '.csv': 'data',
            '.jsonl': 'data'
        };
    }

    shouldIgnore(filePath) {
        return this.ignorePatterns.some(pattern => filePath.includes(pattern));
    }

    analyzeFile(filePath) {
        const stats = fs.statSync(filePath);
        if (!stats.isFile()) return null;

        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');
        const ext = path.extname(filePath).toLowerCase();

        // Count different line types
        let codeLines = 0;
        let commentLines = 0;
        let blankLines = 0;

        const isJsFile = ['.js', '.ts', '.jsx', '.tsx', '.mjs'].includes(ext);
        const isCssFile = ['.css', '.scss', '.sass', '.less'].includes(ext);
        const isHtmlFile = ['.html', '.htm', '.xml'].includes(ext);

        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed === '') {
                blankLines++;
            } else if (
                (isJsFile && (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*'))) ||
                (isCssFile && (trimmed.startsWith('/*') || trimmed.startsWith('*'))) ||
                (isHtmlFile && (trimmed.startsWith('<!--') || trimmed.startsWith('-->')))
            ) {
                commentLines++;
            } else {
                codeLines++;
            }
        }

        return {
            path: path.relative(this.rootDir, filePath),
            ext,
            lines: lines.length,
            bytes: stats.size,
            codeLines,
            commentLines,
            blankLines
        };
    }

    scanDirectory(dir) {
        const entries = fs.readdirSync(dir, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);

            if (this.shouldIgnore(fullPath)) continue;

            if (entry.isDirectory()) {
                this.scanDirectory(fullPath);
            } else if (entry.isFile()) {
                const fileMetrics = this.analyzeFile(fullPath);
                if (!fileMetrics) continue;

                const { ext, lines, bytes, codeLines, commentLines, blankLines } = fileMetrics;

                // Track by file type
                if (!this.metrics.fileTypes[ext]) {
                    this.metrics.fileTypes[ext] = { count: 0, lines: 0, bytes: 0 };
                }
                this.metrics.fileTypes[ext].count++;
                this.metrics.fileTypes[ext].lines += lines;
                this.metrics.fileTypes[ext].bytes += bytes;

                // Track by category
                const category = this.categoryMapping[ext] || 'config';
                if (this.metrics.categories[category]) {
                    this.metrics.categories[category].files.push(fileMetrics.path);
                    this.metrics.categories[category].lines += lines;
                    this.metrics.categories[category].bytes += bytes;
                }

                // Track largest files
                this.metrics.largest.byLines.push({ path: fileMetrics.path, value: lines });
                this.metrics.largest.byBytes.push({ path: fileMetrics.path, value: bytes });

                // Update totals
                this.metrics.totals.files++;
                this.metrics.totals.lines += lines;
                this.metrics.totals.bytes += bytes;
                this.metrics.totals.codeLines += codeLines;
                this.metrics.totals.commentLines += commentLines;
                this.metrics.totals.blankLines += blankLines;
            }
        }
    }

    analyze() {
        this.scanDirectory(this.rootDir);

        // Sort largest files
        this.metrics.largest.byLines.sort((a, b) => b.value - a.value);
        this.metrics.largest.byBytes.sort((a, b) => b.value - a.value);

        // Keep only top 10
        this.metrics.largest.byLines = this.metrics.largest.byLines.slice(0, 10);
        this.metrics.largest.byBytes = this.metrics.largest.byBytes.slice(0, 10);

        return this.metrics;
    }

    formatBytes(bytes) {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    generateMarkdown() {
        const m = this.metrics;
        const now = new Date().toISOString().split('T')[0];

        let md = `# Project Metrics\n\n`;
        md += `**Generated:** ${now}\n\n`;
        md += `## Overview\n\n`;
        md += `| Metric | Value |\n`;
        md += `|--------|-------|\n`;
        md += `| Total Files | ${m.totals.files.toLocaleString()} |\n`;
        md += `| Total Lines | ${m.totals.lines.toLocaleString()} |\n`;
        md += `| Code Lines | ${m.totals.codeLines.toLocaleString()} |\n`;
        md += `| Comment Lines | ${m.totals.commentLines.toLocaleString()} |\n`;
        md += `| Blank Lines | ${m.totals.blankLines.toLocaleString()} |\n`;
        md += `| Total Size | ${this.formatBytes(m.totals.bytes)} |\n`;
        md += `| Avg Lines/File | ${Math.round(m.totals.lines / m.totals.files)} |\n`;
        md += `| Avg Size/File | ${this.formatBytes(Math.round(m.totals.bytes / m.totals.files))} |\n`;

        const commentRatio = ((m.totals.commentLines / m.totals.codeLines) * 100).toFixed(1);
        md += `| Comment Ratio | ${commentRatio}% |\n\n`;

        md += `## File Types\n\n`;
        md += `| Extension | Files | Lines | Size |\n`;
        md += `|-----------|-------|-------|------|\n`;

        const sortedTypes = Object.entries(m.fileTypes)
            .sort((a, b) => b[1].lines - a[1].lines);

        for (const [ext, data] of sortedTypes) {
            md += `| ${ext || '(none)'} | ${data.count} | ${data.lines.toLocaleString()} | ${this.formatBytes(data.bytes)} |\n`;
        }

        md += `\n## Categories\n\n`;
        for (const [category, data] of Object.entries(m.categories)) {
            if (data.files.length === 0) continue;

            md += `### ${category.charAt(0).toUpperCase() + category.slice(1)}\n\n`;
            md += `- **Files:** ${data.files.length}\n`;
            md += `- **Lines:** ${data.lines.toLocaleString()}\n`;
            md += `- **Size:** ${this.formatBytes(data.bytes)}\n\n`;
        }

        md += `## Largest Files\n\n`;
        md += `### By Lines\n\n`;
        md += `| Rank | File | Lines |\n`;
        md += `|------|------|-------|\n`;
        for (let i = 0; i < m.largest.byLines.length; i++) {
            const { path, value } = m.largest.byLines[i];
            md += `| ${i + 1} | [${path}](${path}) | ${value.toLocaleString()} |\n`;
        }

        md += `\n### By Size\n\n`;
        md += `| Rank | File | Size |\n`;
        md += `|------|------|------|\n`;
        for (let i = 0; i < m.largest.byBytes.length; i++) {
            const { path, value } = m.largest.byBytes[i];
            md += `| ${i + 1} | [${path}](${path}) | ${this.formatBytes(value)} |\n`;
        }

        md += `\n## Project Structure\n\n`;
        md += `<pre>\n`;
        md += this.generateTree(this.rootDir, '', new Set());
        md += `</pre>\n`;

        return md;
    }

    generateTree(dir, prefix, visited) {
        if (visited.has(dir)) return '';
        visited.add(dir);

        let tree = '';
        const entries = fs.readdirSync(dir, { withFileTypes: true })
            .filter(e => !this.shouldIgnore(path.join(dir, e.name)))
            .sort((a, b) => {
                if (a.isDirectory() && !b.isDirectory()) return -1;
                if (!a.isDirectory() && b.isDirectory()) return 1;
                return a.name.localeCompare(b.name);
            });

        for (let i = 0; i < entries.length; i++) {
            const entry = entries[i];
            const isLast = i === entries.length - 1;
            const fullPath = path.join(dir, entry.name);
            const relativePath = path.relative(this.rootDir, fullPath);

            tree += prefix + (isLast ? '└── ' : '├── ');

            if (entry.isDirectory()) {
                tree += `**${entry.name}/**\n`;
                const newPrefix = prefix + (isLast ? '    ' : '│   ');
                tree += this.generateTree(fullPath, newPrefix, visited);
            } else {
                const stats = fs.statSync(fullPath);
                tree += `[${entry.name}](${relativePath}) _(${this.formatBytes(stats.size)})_\n`;
            }
        }

        return tree;
    }
}

// Main execution
const rootDir = process.cwd();
const metrics = new ProjectMetrics(rootDir);

console.log('Analyzing project...');
metrics.analyze();

console.log('Generating markdown...');
const markdown = metrics.generateMarkdown();

const outputPath = path.join(rootDir, 'PROJECT_METRICS.md');
fs.writeFileSync(outputPath, markdown);

console.log(`✓ Metrics written to ${outputPath}`);
console.log(`\nSummary:`);
console.log(`  Files: ${metrics.metrics.totals.files.toLocaleString()}`);
console.log(`  Lines: ${metrics.metrics.totals.lines.toLocaleString()}`);
console.log(`  Size: ${metrics.formatBytes(metrics.metrics.totals.bytes)}`);
