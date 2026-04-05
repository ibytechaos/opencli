/**
 * Regression tests for package exports.
 *
 * Ensures adapter files use @jackwener/opencli/... package imports
 * (not fragile relative paths) and that all declared exports resolve
 * to real files. Prevents regressions like #788 / #791.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CLIS_DIR = path.join(ROOT, 'clis');

/** Recursively collect .ts files in a directory, optionally excluding test files. */
function collectTsFiles(dir: string, opts?: { excludeTests?: boolean }): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectTsFiles(full, opts));
    } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
      if (opts?.excludeTests && entry.name.endsWith('.test.ts')) continue;
      results.push(full);
    }
  }
  return results;
}

/** Forbidden relative import patterns that should have been replaced.
 * Uses (?:\.\./)+ to catch any depth of ../ traversal.
 * Covers: import/export from, vi.mock(), vi.importActual(). */
const FORBIDDEN_PATTERNS = [
  /(?:from|mock|importActual)\s*\(?['"](?:\.\.\/)+src\//,
  /(?:from|mock|importActual)\s*\(?['"](?:\.\.\/)+browser\//,
  /(?:from|mock|importActual)\s*\(?['"](?:\.\.\/)+download\//,
  /(?:from|mock|importActual)\s*\(?['"](?:\.\.\/)+pipeline\//,
];

describe('adapter imports use package exports', () => {
  const adapterFiles = collectTsFiles(CLIS_DIR);

  it('found adapter files to check', () => {
    expect(adapterFiles.length).toBeGreaterThan(100);
  });

  it('no adapter uses relative imports to src/, browser/, download/, or pipeline/', () => {
    const violations: string[] = [];
    for (const file of adapterFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      for (const pattern of FORBIDDEN_PATTERNS) {
        if (pattern.test(content)) {
          const rel = path.relative(ROOT, file);
          const match = content.match(pattern)?.[0];
          violations.push(`${rel}: ${match}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });
});

describe('adapters do not import third-party packages directly', () => {
  const pkgJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf-8'));
  const deps = Object.keys(pkgJson.dependencies ?? {});
  // Build a pattern that matches: from 'chalk' / from "turndown" etc.
  // Excludes node: builtins and relative/package imports.
  const depPattern = new RegExp(
    `(?:from|mock|importActual)\\s*\\(?['"](?:${deps.map(d => d.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})['"]`,
  );

  // Only check non-test adapter files (test files run inside the package tree)
  const nonTestFiles = collectTsFiles(CLIS_DIR, { excludeTests: true });

  it('found non-test adapter files to check', () => {
    expect(nonTestFiles.length).toBeGreaterThan(100);
  });

  it('no adapter directly imports opencli runtime dependencies', () => {
    const violations: string[] = [];
    for (const file of nonTestFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      if (depPattern.test(content)) {
        const rel = path.relative(ROOT, file);
        const match = content.match(depPattern)?.[0];
        violations.push(`${rel}: ${match}`);
      }
    }
    expect(violations).toEqual([]);
  });
});

describe('package.json exports resolve to real files', () => {
  const pkgJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf-8'));
  const exports = pkgJson.exports as Record<string, string>;

  it('has exports defined', () => {
    expect(Object.keys(exports).length).toBeGreaterThan(5);
  });

  for (const [exportPath, target] of Object.entries(exports)) {
    it(`export "${exportPath}" → ${target} has a source file`, () => {
      // Export targets point to dist/ (compiled). Verify the source .ts exists.
      // dist/src/foo.js → src/foo.ts
      const sourcePath = target
        .replace(/^\.\/dist\//, './')
        .replace(/\.js$/, '.ts');
      const fullPath = path.join(ROOT, sourcePath);
      expect(fs.existsSync(fullPath), `Missing source: ${sourcePath}`).toBe(true);
    });
  }
});
