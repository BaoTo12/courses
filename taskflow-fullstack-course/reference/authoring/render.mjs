// Usage: node render.mjs <template> <srcRoot> <out>
// Replaces {{file:relative/path:lang}} with a fenced code block of that file's current content.
// Paths are relative to <srcRoot>, except paths starting with "@reference/", which are relative to the
// reference/ folder (for snapshots that don't depend on which srcRoot is rendered).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const referenceDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const [template, srcRoot, out] = process.argv.slice(2);
const text = readFileSync(template, 'utf8').replace(/\{\{file:([^:}]+):(\w+)\}\}/g, (_, path, lang) => {
  const file = path.startsWith('@reference/') ? join(referenceDir, path.slice('@reference/'.length)) : join(srcRoot, path);
  const content = readFileSync(file, 'utf8').replace(/\s+$/, '');
  return '```' + lang + '\n' + content + '\n```';
});
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, text);
console.log(`wrote ${out}`);
