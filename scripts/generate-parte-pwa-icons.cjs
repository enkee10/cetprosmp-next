const fs = require('node:fs');
const path = require('node:path');
const sharp = require('../functions/node_modules/sharp');

(async () => {
  const root = path.resolve(__dirname, '..');
  const output = path.join(root, 'public/parte-diario/icons');
  fs.mkdirSync(output, { recursive: true });
  for (const size of [192, 512]) {
    const logoSize = Math.round(size * 0.68);
    const logo = await sharp(path.join(root, 'public/logo-smp.svg'), { density: 300 })
      .resize(logoSize, logoSize, { fit: 'contain', background: '#ffffff' }).png().toBuffer();
    await sharp({ create: { width: size, height: size, channels: 3, background: '#ffffff' } })
      .composite([{ input: logo, gravity: 'centre' }]).png()
      .toFile(path.join(output, `icon-${size}.png`));
  }
  console.log('Iconos de Parte Diario generados: 192x192 y 512x512.');
})().catch(error => { console.error(error.message); process.exitCode = 1; });
