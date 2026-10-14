import { deflateRawSync, inflateRawSync } from 'node:zlib';
import path from 'node:path';

export type AvanzaCellValue = string | number;
type ZipEntry = { name: string; central: Buffer; offset: number; size: number; unpacked: number; method: number; flags: number; end: number };
const MAX_PART = 16 * 1024 * 1024;

function crc32(bytes: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/** Preserve original compressed ZIP records; change only requested XML parts. */
class OriginalZip {
  private entries: ZipEntry[] = [];
  private centralOffset: number;
  private centralTail: Buffer;
  private eocd: Buffer;
  constructor(private bytes: Buffer) {
    let end = -1;
    for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
      if (bytes.readUInt32LE(i) === 0x06054b50 && i + 22 + bytes.readUInt16LE(i + 20) === bytes.length) { end = i; break; }
    }
    if (end < 0) throw new Error('La plantilla no es un ZIP válido.');
    this.eocd = Buffer.from(bytes.subarray(end));
    const count = bytes.readUInt16LE(end + 10);
    this.centralOffset = bytes.readUInt32LE(end + 16);
    const centralSize = bytes.readUInt32LE(end + 12);
    if (bytes.readUInt16LE(end + 4) || bytes.readUInt16LE(end + 6) || count !== bytes.readUInt16LE(end + 8) || count === 65535 || this.centralOffset + centralSize !== end) throw new Error('Formato ZIP no compatible con las plantillas AVANZA.');
    let cursor = this.centralOffset;
    for (let i = 0; i < count; i++) {
      if (cursor + 46 > end || bytes.readUInt32LE(cursor) !== 0x02014b50) throw new Error('Directorio ZIP inválido.');
      const length = 46 + bytes.readUInt16LE(cursor + 28) + bytes.readUInt16LE(cursor + 30) + bytes.readUInt16LE(cursor + 32);
      if (cursor + length > end) throw new Error('Entrada ZIP incompleta.');
      const central = Buffer.from(bytes.subarray(cursor, cursor + length));
      const entry: ZipEntry = { name: central.subarray(46, 46 + central.readUInt16LE(28)).toString('utf8'), central, offset: central.readUInt32LE(42), size: central.readUInt32LE(20), unpacked: central.readUInt32LE(24), method: central.readUInt16LE(10), flags: central.readUInt16LE(8), end: 0 };
      if (this.entries.some(e => e.name === entry.name) || entry.offset >= this.centralOffset || entry.flags & 1 || entry.size === 0xffffffff || entry.unpacked > MAX_PART || ![0, 8].includes(entry.method)) throw new Error('Entrada ZIP no compatible.');
      this.entries.push(entry); cursor += length;
    }
    this.centralTail = bytes.subarray(cursor, end);
    const physical = [...this.entries].sort((a, b) => a.offset - b.offset);
    physical.forEach((e, index) => {
      e.end = physical[index + 1]?.offset ?? this.centralOffset;
      if (e.offset + 30 > e.end || bytes.readUInt32LE(e.offset) !== 0x04034b50) throw new Error('Registro ZIP inválido.');
      const head = 30 + bytes.readUInt16LE(e.offset + 26) + bytes.readUInt16LE(e.offset + 28);
      if (e.offset + head + e.size > e.end) throw new Error('Contenido ZIP incompleto.');
    });
  }
  read(name: string): Buffer {
    const e = this.entries.find(e => e.name === name);
    if (!e) throw new Error(`Falta ${name} en la plantilla.`);
    const start = e.offset + 30 + this.bytes.readUInt16LE(e.offset + 26) + this.bytes.readUInt16LE(e.offset + 28);
    const compressed = this.bytes.subarray(start, start + e.size);
    const data = e.method === 8 ? inflateRawSync(compressed, { maxOutputLength: MAX_PART }) : compressed;
    if (data.length !== e.unpacked || crc32(data) !== e.central.readUInt32LE(16)) throw new Error('Contenido ZIP dañado.');
    return data;
  }
  replace(parts: Map<string, Buffer>): Buffer {
    for (const name of parts.keys()) if (!this.entries.some(e => e.name === name)) throw new Error('No se permite agregar componentes a la plantilla.');
    const physical = [...this.entries].sort((a, b) => a.offset - b.offset);
    const pieces: Buffer[] = [this.bytes.subarray(0, physical[0].offset)];
    const centrals = new Map<string, Buffer>();
    let offset = pieces[0].length;
    for (const e of physical) {
      const central = Buffer.from(e.central);
      central.writeUInt32LE(offset, 42);
      let record = this.bytes.subarray(e.offset, e.end);
      const data = parts.get(e.name);
      if (data) {
        if (data.length > MAX_PART) throw new Error('La hoja supera el límite de tamaño.');
        const headLength = 30 + this.bytes.readUInt16LE(e.offset + 26) + this.bytes.readUInt16LE(e.offset + 28);
        const header = Buffer.from(record.subarray(0, headLength));
        const tail = Buffer.from(record.subarray(headLength + e.size));
        const compressed = e.method === 8 ? deflateRawSync(data) : data;
        const crc = crc32(data);
        if (e.flags & 8) {
          const base = tail.length >= 4 && tail.readUInt32LE(0) === 0x08074b50 ? 4 : 0;
          if (tail.length < base + 12) throw new Error('Descriptor ZIP incompleto.');
          tail.writeUInt32LE(crc, base); tail.writeUInt32LE(compressed.length, base + 4); tail.writeUInt32LE(data.length, base + 8);
          if (header.readUInt32LE(14)) header.writeUInt32LE(crc, 14);
          if (header.readUInt32LE(18)) header.writeUInt32LE(compressed.length, 18);
          if (header.readUInt32LE(22)) header.writeUInt32LE(data.length, 22);
        } else {
          header.writeUInt32LE(crc, 14); header.writeUInt32LE(compressed.length, 18); header.writeUInt32LE(data.length, 22);
        }
        central.writeUInt32LE(crc, 16); central.writeUInt32LE(compressed.length, 20); central.writeUInt32LE(data.length, 24);
        record = Buffer.concat([header, compressed, tail]);
      }
      pieces.push(record); offset += record.length; centrals.set(e.name, central);
    }
    const directory = Buffer.concat([...this.entries.map(e => centrals.get(e.name)!), this.centralTail]);
    const end = Buffer.from(this.eocd); end.writeUInt32LE(directory.length, 12); end.writeUInt32LE(offset, 16);
    return Buffer.concat([...pieces, directory, end]);
  }
}

function unescapeXml(text: string): string {
  return text.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_all, code: string) => {
    if (code[0] === '#') return String.fromCodePoint(code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : Number(code.slice(1)));
    return ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" } as Record<string, string>)[code];
  });
}
function escapeXml(text: string): string {
  if (/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(text)) throw new Error('Un dato contiene caracteres no válidos para Excel.');
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}
function attributes(text: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const m of text.matchAll(/([\w:.-]+)\s*=\s*(["'])(.*?)\2/g)) result[m[1]] = unescapeXml(m[3]);
  return result;
}

export function inspectAvanzaTemplate(original: Buffer): { periodo: string; codigoModular: string; carrera: string; plan: string; modulos: string[] } {
  const zip = new OriginalZip(original);
  const sharedXml = zip.read('xl/sharedStrings.xml').toString('utf8');
  const strings = [...sharedXml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)].map(m => [...m[1].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map(t => unescapeXml(t[1])).join(''));
  const workbook = zip.read('xl/workbook.xml').toString('utf8');
  const rels = [...zip.read('xl/_rels/workbook.xml.rels').toString('utf8').matchAll(/<Relationship\b([^>]*?)\/?\s*>/g)].map(m => attributes(m[1]));
  const cells = (name: string): Map<string, string> => {
    const sheet = [...workbook.matchAll(/<sheet\b([^>]*?)\/?\s*>/g)].map(m => attributes(m[1])).find(s => s.name === name);
    const relation = rels.find(r => r.Id === sheet?.['r:id']);
    if (!relation || relation.TargetMode === 'External') throw new Error(`Falta la hoja ${name}.`);
    const target = relation.Target.startsWith('/') ? relation.Target.slice(1) : path.posix.normalize('xl/' + relation.Target);
    if (!target.startsWith('xl/worksheets/')) throw new Error('Ruta de hoja no válida.');
    const result = new Map<string, string>();
    for (const match of zip.read(target).toString('utf8').matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = attributes(match[1]); const contents = match[2] || '';
      const value = contents.match(/<v>([\s\S]*?)<\/v>/)?.[1];
      if (attrs.t === 's' && value !== undefined) result.set(attrs.r, strings[Number(value)] ?? '');
      else if (attrs.t === 'inlineStr') result.set(attrs.r, [...contents.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map(m => unescapeXml(m[1])).join(''));
      else if (value !== undefined) result.set(attrs.r, unescapeXml(value));
    }
    return result;
  };
  const data = cells('DATA'), modules = cells('MODULO_UNIDAD');
  return { periodo: data.get('D4') || '', codigoModular: data.get('F4') || '', carrera: data.get('F16') || '', plan: data.get('K16') || '', modulos: [...modules].filter(([ref, value]) => /^B\d+$/.test(ref) && ref !== 'B1' && value).map(([, value]) => value) };
}

export function fillAvanzaTemplate(original: Buffer, rows: AvanzaCellValue[][]): Buffer {
  const zip = new OriginalZip(original);
  const workbook = zip.read('xl/workbook.xml').toString('utf8');
  const sheet = [...workbook.matchAll(/<sheet\b([^>]*?)\/?\s*>/g)].map(m => attributes(m[1])).find(s => s.name === 'PLANTILLA');
  if (!sheet) throw new Error('Falta la hoja PLANTILLA.');
  const relationships = zip.read('xl/_rels/workbook.xml.rels').toString('utf8');
  const relation = [...relationships.matchAll(/<Relationship\b([^>]*?)\/?\s*>/g)].map(m => attributes(m[1])).find(r => r.Id === sheet['r:id']);
  if (!relation || relation.TargetMode === 'External') throw new Error('La hoja PLANTILLA no tiene una relación válida.');
  const sheetPath = relation.Target.startsWith('/') ? relation.Target.slice(1) : path.posix.normalize('xl/' + relation.Target);
  if (!sheetPath.startsWith('xl/worksheets/')) throw new Error('Ruta de hoja no válida.');
  const xml = zip.read(sheetPath).toString('utf8');
  const sharedXml = zip.read('xl/sharedStrings.xml').toString('utf8');
  const strings = [...sharedXml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)].map(m => [...m[1].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map(t => unescapeXml(t[1])).join(''));
  const index = new Map<string, number>(); strings.forEach((s, i) => { if (!index.has(s)) index.set(s, i); });
  const append: string[] = [];
  const changes = new Map<string, AvanzaCellValue>();
  const originalCount = Number(attributes(sharedXml.match(/<sst\b([^>]*)>/)?.[1] || '').count);
  if (!Number.isInteger(originalCount) || !sharedXml.includes('</sst>')) throw new Error('Tabla de textos no válida.');
  rows.forEach((row, position) => {
    if (row.length !== 17) throw new Error('Cada inscripción debe tener las 17 columnas de la plantilla.');
    row.forEach((value, column) => {
      if (typeof value === 'number' && !Number.isFinite(value)) throw new Error('Valor numérico no válido.');
      if (value !== '') changes.set(String.fromCharCode(65 + column) + (position + 2), value);
    });
  });
  let stringRefs = 0;
  const populated = xml.replace(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g, (whole: string, attrText: string, contents: string | undefined) => {
    const attr = attributes(attrText); const value = changes.get(attr.r);
    if (value === undefined) return whole;
    if (contents?.trim()) throw new Error(`La celda ${attr.r} ya contiene datos; usa una plantilla vacía.`);
    changes.delete(attr.r);
    const kept = attrText.replace(/\s+t\s*=\s*(["']).*?\1/g, '').trimEnd();
    if (typeof value === 'number') return `<c${kept}><v>${value}</v></c>`;
    let stringIndex = index.get(value);
    if (stringIndex === undefined) {
      stringIndex = strings.length + append.length; index.set(value, stringIndex);
      append.push(`<si><t xml:space="preserve">${escapeXml(value)}</t></si>`);
    }
    stringRefs++;
    return `<c${kept} t="s"><v>${stringIndex}</v></c>`;
  });
  if (changes.size) throw new Error('Las inscripciones exceden las filas disponibles en la plantilla.');
  const updatedStrings = sharedXml.replace(/<sst\b([^>]*)>/, (all: string) => all.replace(/\bcount="\d+"/, `count="${originalCount + stringRefs}"`).replace(/\buniqueCount="\d+"/, `uniqueCount="${strings.length + append.length}"`)).replace('</sst>', append.join('') + '</sst>');
  return zip.replace(new Map([[sheetPath, Buffer.from(populated, 'utf8')], ['xl/sharedStrings.xml', Buffer.from(updatedStrings, 'utf8')]]));
}
