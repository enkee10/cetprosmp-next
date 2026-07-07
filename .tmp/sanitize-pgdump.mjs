import { readFileSync, writeFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';

const [, , input, output] = process.argv;

if (!input || !output) {
  console.error('Usage: node .tmp/sanitize-pgdump.mjs <input.sql.gz> <output.sql>');
  process.exit(1);
}

const text = gunzipSync(readFileSync(input)).toString('utf8');
const sanitized = text
  .split(/\r?\n/)
  .filter((line) => !/^\\(?:un)?restrict\b/.test(line))
  .join('\n');

writeFileSync(output, sanitized, 'utf8');
console.log(`sql_bytes=${Buffer.byteLength(sanitized)}`);
