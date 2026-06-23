// scripts/gql-to-mermaid.cjs
// Convierte un schema.gql de Firebase Data Connect / GraphQL a un diagrama Mermaid ER.
// Uso:
//   node scripts/gql-to-mermaid.cjs
//   node scripts/gql-to-mermaid.cjs dataconnect/schema.gql docs/schema-diagram.md
//   node scripts/gql-to-mermaid.cjs --watch

const fs = process.getBuiltinModule("fs");
const path = process.getBuiltinModule("path");

const args = process.argv.slice(2);
const isWatchMode = args.includes("--watch");

const cleanArgs = args.filter((arg) => arg !== "--watch");

const possibleInputs = [
  cleanArgs[0],
  "dataconnect/schema.gql",
  "dataconnect/schema/schema.gql",
].filter(Boolean);

const inputPath = possibleInputs.find((file) => fs.existsSync(file));

const outputPath = cleanArgs[1] || "docs/schema-diagram.md";

function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
}

function removeGraphqlComments(text) {
  return text
    .split("\n")
    .map((line) => {
      const index = line.indexOf("#");
      return index >= 0 ? line.slice(0, index) : line;
    })
    .join("\n");
}

function normalizeType(rawType) {
  return rawType.replace(/[!\[\]]/g, "").trim();
}

function isListType(rawType) {
  return rawType.includes("[");
}

function toEntityName(name) {
  return name
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .replace(/[^a-zA-Z0-9_]/g, "_")
    .toUpperCase();
}

function cleanFieldType(rawType) {
  return normalizeType(rawType).replace(/[^a-zA-Z0-9_]/g, "_");
}

function extractTypes(schemaText) {
  const cleanSchema = removeGraphqlComments(schemaText);

  const typeRegex = /type\s+(\w+)(?:\s+[^{]+)?\s*\{([\s\S]*?)\}/g;

  const types = [];
  let match;

  while ((match = typeRegex.exec(cleanSchema)) !== null) {
    const typeName = match[1];
    const body = match[2];

    if (["Query", "Mutation", "Subscription"].includes(typeName)) {
      continue;
    }

    const fields = [];

    for (const rawLine of body.split("\n")) {
      const line = rawLine.trim();

      if (!line || line.startsWith("@")) continue;

      const fieldMatch = line.match(/^(\w+)\s*:\s*([!\[\]\w]+)/);

      if (!fieldMatch) continue;

      const fieldName = fieldMatch[1];
      const rawType = fieldMatch[2];
      const baseType = normalizeType(rawType);

      fields.push({
        name: fieldName,
        rawType,
        baseType,
        isList: isListType(rawType),
      });
    }

    types.push({
      name: typeName,
      fields,
    });
  }

  return types;
}

function buildRelationships(types) {
  const typeNames = new Set(types.map((t) => t.name));

  const relationshipsByPair = new Map();

  for (const type of types) {
    for (const field of type.fields) {
      if (!typeNames.has(field.baseType)) continue;

      const currentType = type.name;
      const referencedType = field.baseType;

      const pairKey = [currentType, referencedType].sort().join("__");

      if (!relationshipsByPair.has(pairKey)) {
        relationshipsByPair.set(pairKey, []);
      }

      relationshipsByPair.get(pairKey).push({
        fromType: currentType,
        toType: referencedType,
        fieldName: field.name,
        isList: field.isList,
      });
    }
  }

  const finalRelationships = [];

  for (const [, relations] of relationshipsByPair.entries()) {
    if (relations.length === 1) {
      const rel = relations[0];

      if (rel.isList) {
        finalRelationships.push({
          parent: rel.fromType,
          child: rel.toType,
          label: rel.fieldName,
        });
      } else {
        finalRelationships.push({
          parent: rel.toType,
          child: rel.fromType,
          label: rel.fieldName,
        });
      }

      continue;
    }

    // Caso común:
    // Carrera.modulos: [Modulo!]
    // Modulo.carrera: Carrera!
    // Se queda con la relación basada en la lista, porque expresa mejor 1 a muchos.
    const listRelation = relations.find((rel) => rel.isList);

    if (listRelation) {
      finalRelationships.push({
        parent: listRelation.fromType,
        child: listRelation.toType,
        label: listRelation.fieldName,
      });

      continue;
    }

    // Si no hay listas, usa una sola relación.
    const rel = relations[0];

    finalRelationships.push({
      parent: rel.toType,
      child: rel.fromType,
      label: rel.fieldName,
    });
  }

  return finalRelationships;
}

function generateMermaidInit() {
  return `%%{
  init: {
    "theme": "base",
    "themeVariables": {
      "fontFamily": "Segoe UI Light, Calibri Light, Segoe UI, Arial, sans-serif",
      "fontSize": "10px",
      "darkMode": false,
      "background": "#ffffff",
      "mainBkg": "#ffffff",
      "secondBkg": "#ffffff",
      "tertiaryColor": "#ffffff",
      "primaryColor": "#ffffff",
      "secondaryColor": "#ffffff",
      "primaryTextColor": "#111827",
      "secondaryTextColor": "#111827",
      "tertiaryTextColor": "#111827",
      "textColor": "#111827",
      "primaryBorderColor": "#AAAAAA",
      "lineColor": "#FFFF00",
      "entityBkg": "#ffffff",
      "entityBorder": "#AAAAAA",
      "attributeBackgroundColorOdd": "#ffffff",
      "attributeBackgroundColorEven": "#ffffff",
      "relationshipLabelBackground": "#ffffff",
      "relationshipLabelColor": "#111827"
    },
    "er": {
      "layoutDirection": "LR",
      "minEntityWidth": 65,
      "minEntityHeight": 40,
      "entityPadding": 2
    },
    "themeCSS": "svg, .mermaid, .er { background: #ffffff !important; } .er.entityBox, .er.attributeBoxOdd, .er.attributeBoxEven, .er .entityBox, .er .attributeBoxOdd, .er .attributeBoxEven, .entityBox, .attributeBoxOdd, .attributeBoxEven { fill: #ffffff !important; stroke: #AAAAAA !important; stroke-width: 0.7px; } .er.entityLabel, .er.relationshipLabel, .er.attributeLabel, .er.attributeLabelOdd, .er.attributeLabelEven, .er .entityLabel, .er .relationshipLabel, .er .attributeLabel, .er .attributeLabelOdd, .er .attributeLabelEven, .entityLabel, .relationshipLabel, .attributeLabel, .attributeLabelOdd, .attributeLabelEven, text { fill: #111827 !important; color: #111827 !important; font-weight: 100 !important; } .er.relationshipLine, .er .relationshipLine, .relationshipLine { stroke: #FFFF00 !important; stroke-width: 0.7px; }"
  }
}%%`;
}

function generateMermaid(types) {
  const typeNames = new Set(types.map((t) => t.name));
  const relationships = buildRelationships(types);

  const lines = [];

  // Configuración visual del diagrama.
  lines.push(generateMermaidInit());
  lines.push("");
  lines.push("erDiagram");
  lines.push("    direction LR");
  lines.push("");

  for (const type of types) {
    const entityName = toEntityName(type.name);

    lines.push(`    ${entityName} {`);

    const scalarFields = type.fields.filter((field) => {
      return !typeNames.has(field.baseType);
    });

    if (scalarFields.length === 0) {
      lines.push("        string _sin_campos_escalares");
    }

    for (const field of scalarFields) {
      const mermaidType = cleanFieldType(field.baseType);
      const fieldName = field.name.replace(/[^a-zA-Z0-9_]/g, "_");

      let suffix = "";

      if (fieldName.toLowerCase() === "id") {
        suffix = " PK";
      }

      if (
        fieldName.toLowerCase().endsWith("id") &&
        fieldName.toLowerCase() !== "id"
      ) {
        suffix = " FK";
      }

      lines.push(`        ${mermaidType} ${fieldName}${suffix}`);
    }

    lines.push("    }");
    lines.push("");
  }

  if (relationships.length > 0) {
    const uniqueLines = new Set();

    for (const rel of relationships) {
      const parentEntity = toEntityName(rel.parent);
      const childEntity = toEntityName(rel.child);
      const label = rel.label || "tiene";

      uniqueLines.add(`    ${parentEntity} ||--o{ ${childEntity} : ${label}`);
    }

    lines.push(...Array.from(uniqueLines));
  } else {
    lines.push("    %% No se detectaron relaciones entre tipos.");
  }

  return lines.join("\n");
}

function generateFile() {
  if (!inputPath) {
    console.error("❌ No se encontró schema.gql.");
    console.error("Rutas buscadas:");
    for (const file of possibleInputs) {
      console.error(`- ${file}`);
    }
    process.exit(1);
  }

  const schemaText = fs.readFileSync(inputPath, "utf8");
  const types = extractTypes(schemaText);
  const mermaid = generateMermaid(types);

  const markdown = `\`\`\`mermaid
${mermaid}
\`\`\`
`;

  ensureDir(outputPath);
  fs.writeFileSync(outputPath, markdown, "utf8");

  console.log(`✅ Diagrama generado: ${outputPath}`);
  console.log(`📄 Archivo leído: ${inputPath}`);
  console.log(`📦 Tipos detectados: ${types.length}`);
  console.log(`🔗 Relaciones generadas: ${buildRelationships(types).length}`);
}

generateFile();

if (isWatchMode) {
  console.log("👀 Modo observación activo. Esperando cambios...");

  fs.watchFile(inputPath, { interval: 1000 }, () => {
    try {
      generateFile();
    } catch (error) {
      console.error("❌ Error regenerando diagrama:");
      console.error(error.message);
    }
  });
}
