import { readFileSync, writeFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';

const [, , input, output] = process.argv;

if (!input || !output) {
  console.error('Usage: node .tmp/pgdump-copy-to-inserts.mjs <input.sql.gz> <output.sql>');
  process.exit(1);
}

const quoteValue = (value) => {
  if (value === '\\N') return 'NULL';
  const unescaped = value.replace(/\\([\\bfnrtv])/g, (_match, code) => {
    switch (code) {
      case '\\':
        return '\\';
      case 'b':
        return '\b';
      case 'f':
        return '\f';
      case 'n':
        return '\n';
      case 'r':
        return '\r';
      case 't':
        return '\t';
      case 'v':
        return '\v';
      default:
        return code;
    }
  });
  return `'${unescaped.replace(/'/g, "''")}'`;
};

const text = gunzipSync(readFileSync(input)).toString('utf8');
const lines = text
  .split(/\r?\n/)
  .filter((line) => !/^\\(?:un)?restrict\b/.test(line))
  .filter((line) => !/\bcloudsqlsuperuser\b/.test(line))
  .filter((line) => !/\bfirebase(?:reader|writer)_/.test(line));

const outputLines = [];
let i = 0;

while (i < lines.length) {
  const line = lines[i];
  const copyMatch = /^COPY\s+(.+?)\s+\((.+)\)\s+FROM\s+stdin;$/i.exec(line);
  if (!copyMatch) {
    outputLines.push(line);
    i += 1;
    continue;
  }

  const table = copyMatch[1];
  const columns = copyMatch[2];
  const rows = [];
  i += 1;

  while (i < lines.length && lines[i] !== '\\.') {
    const values = lines[i].split('\t').map(quoteValue).join(', ');
    rows.push(`(${values})`);
    i += 1;
  }

  if (rows.length > 0) {
    const chunkSize = 100;
    for (let start = 0; start < rows.length; start += chunkSize) {
      outputLines.push(`INSERT INTO ${table} (${columns}) VALUES`);
      outputLines.push(`${rows.slice(start, start + chunkSize).join(',\n')};`);
    }
  }

  i += 1;
}

writeFileSync(output, outputLines.join('\n'), 'utf8');
console.log(`sql_bytes=${Buffer.byteLength(outputLines.join('\n'))}`);
