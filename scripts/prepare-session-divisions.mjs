import fs from 'node:fs';
import { normalize } from './silabus-model.mjs';

// The preview was matched to the original Excel and checked against career/unit scope.
const argument = (name, fallback) => {
  const index = process.argv.indexOf(name);
  return index < 0 ? fallback : process.argv[index + 1];
};
const preview = JSON.parse(fs.readFileSync(argument('--preview', 'tmp/session-split-plan.json'), 'utf8'));
const plan = preview.filter(row => !/^viable\b/i.test(row.parts[1])).map(row => {
  let topic = 0;
  const contents = [], additions = [];
  for (const item of row.contenidos) {
    const value = normalize(item.texto), first = normalize(row.parts[0]), second = normalize(row.parts[1]);
    let target = 0, texto = item.texto, reason;
    if (value === second) { target = 1; reason = 'Coincide con la segunda actividad'; }
    else if (value === first) { target = 0; reason = 'Coincide con la primera actividad'; }
    else if (first.includes('fortalezas')) {
      if (/^tema 2\b/.test(value)) topic = 1;
      target = topic; reason = target ? 'Oportunidades de negocio e innovación' : 'Fortalezas y emprendimiento';
    } else if (first.includes('lean canvas')) {
      if (/^tema 4\b/.test(value)) topic = 1;
      target = /cliente|problema/.test(value) ? 0 : topic;
      reason = target ? 'Propuesta de valor y solución' : 'Modelo de negocio, clientes y problemas';
    } else if (first.includes('costo beneficio')) {
      if (/^tema 6\b/.test(value)) topic = 1;
      target = topic; reason = target ? 'Métricas y ventajas competitivas' : 'Costos, precios y financiamiento';
    } else if (second.includes('estrategias de social media')) {
      if (/^tema 8\b/.test(value)) topic = 1;
      target = topic; reason = target ? 'Publicidad digital y redes sociales' : 'Promoción y relaciones con clientes';
    } else if (second.includes('derechos laborales') && first.includes('fan page')) {
      target = /derechos|deberes laborales/.test(value) ? 1 : 0;
      reason = target ? 'Derechos laborales' : 'Comercio digital y Facebook';
    } else if (second.includes('elevator pitch')) {
      const match = item.texto.match(/^(.*?)\s*,?\s*(El Elevator Pitch[\s\S]*)$/i);
      if (match && normalize(match[1]).includes('promocion')) {
        texto = match[1].replace(/,\s*$/, '').trim();
        additions.push({ texto: match[2].trim(), target: 1, reason: 'Elevator Pitch y Demo Pitch', originalId: item.id });
        target = 0; reason = 'Promoción por medios tradicionales';
      } else { target = /elevator|demo pitch/.test(value) ? 1 : 0; reason = target ? 'Elevator Pitch' : 'Promoción y clientes'; }
    } else if (first.includes('social media') && second.includes('fan page')) {
      target = /facebook|fan page|derechos|deberes/.test(value) ? 1 : 0; reason = target ? 'Facebook y derechos laborales' : 'Social Media';
    } else throw new Error(`Contenido sin clasificación revisada: ${row.id}/${item.id}`);
    contents.push({ ...item, texto, target, reason });
  }
  for (const target of [0, 1]) if (![...contents, ...additions].some(item => item.target === target)) throw new Error(`Sesión sin contenido: ${row.id}/${target}`);
  return { ...row, contents, additions };
});
fs.writeFileSync(argument('--output', 'tmp/session-divisions-reviewed.json'), JSON.stringify(plan, null, 2));
console.log(JSON.stringify({ candidates: plan.length, originalSixHours: plan.filter(row => row.horas === 6).length, originalThreeHours: plan.filter(row => row.horas === 3).map(row => row.id), continuationLinesExcluded: preview.length - plan.length }));
