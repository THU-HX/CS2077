// CS2077.html is the editable master. Export its standalone runtime without a bundler.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const args = process.argv.slice(2);
if (args.length && !(args.length === 1 && args[0] === '--check')) {
  throw new Error('Usage: node scripts/sync-source.mjs [--check]');
}
const check = args[0] === '--check';
const canonical = (await readFile(join(root, 'CS2077.html'), 'utf8')).replace(/\r\n/g, '\n');
const outputs = new Map();
function capture(text, pattern, label) {
  const result = pattern.exec(text);
  if (!result) throw new Error('Missing extraction point: ' + label);
  return result;
}
const css = capture(canonical, /<style>([\s\S]*?)<\/style>/, 'game styles');
const script = capture(canonical, /<script>\n([\s\S]*?)\n<\/script>/, 'game script');
const license = capture(canonical, /<!--\nThree\.js ([\d.]+)\n(The MIT License[\s\S]*?)\n\nOriginal Counter-Strike/, 'Three.js version and license');
const engine = capture(script[1], /^([\s\S]*?)\n\s*;\n(?=\/\* GoldSrc BSP)/, 'end of Three.js bundle');
const vendor = 'vendor/three-' + license[1];
outputs.set(vendor + '/three.min.js', engine[1].trimEnd() + '\n');
outputs.set(vendor + '/LICENSE', license[2] + '\n');

let game = script[1].slice(engine[0].length);
let styles = css[1].trim() + '\n';
const images = {
  GEAR_PAINT_IMAGE: 'gear-paint.jpg', EDITION_PAINT_IMAGE: 'gun-paint.jpg',
  EDITION_GROUND_IMAGE: 'ground.jpg', HE_BLAST_ATLAS: 'blast.webp'
};
for (const [id, file] of Object.entries(images)) {
  const declaration = capture(game, new RegExp('^const ' + id + '\\s*=\\s*(["\'])data:image/[^;]+;base64,([A-Za-z0-9+/=]+)\\1;', 'm'), id);
  outputs.set('src/assets/' + file, Buffer.from(declaration[2], 'base64'));
  game = game.replace(declaration[0], () => "const " + id + "='./assets/" + file + "';");
}
for (const [property, file] of [['operator', 'operator.webp'], ['combat-medals', 'combat-medals.webp']]) {
  const propertyURL = capture(styles, new RegExp('(--' + property + ':url\\(")data:image/webp;base64,([A-Za-z0-9+/=]+)("\\))'), property);
  outputs.set('src/assets/' + file, Buffer.from(propertyURL[2], 'base64'));
  styles = styles.replace(propertyURL[0], () => propertyURL[1] + './assets/' + file + propertyURL[3]);
}

// These five declarations are pure data. Load them before the unchanged game logic.
const packs = [];
for (const key of ['MAPS_GZ', 'MODELS_GZ', 'AUDIO', 'HUD', 'UI']) {
  const declaration = capture(game, new RegExp('^const ASSET_' + key + ' = .*;$', 'm'), key);
  packs.push(declaration[0]);
  game = game.replace(declaration[0], '');
}
outputs.set('src/embedded-assets.js', packs.join('\n') + '\n');
outputs.set('src/game.js', game.trimEnd() + '\n');
outputs.set('src/ui.css', styles);
const scripts = ['../' + vendor + '/three.min.js', './embedded-assets.js', './game.js'];
outputs.set('src/index.html', canonical
  .replace(css[0], '<link rel="stylesheet" href="./ui.css">')
  .replace(script[0], () => scripts.map(url => '<script src="' + url + '"></script>').join('\n')));

const stale = [];
for (const [name, content] of outputs) {
  const target = join(root, name);
  if (check) {
    try {
      const disk = await readFile(target);
      const equal = Buffer.isBuffer(content) ? disk.equals(content) : disk.toString('utf8').replace(/\r\n/g, '\n') === content;
      if (!equal) stale.push(name);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      stale.push(name);
    }
  } else {
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, content);
  }
}
if (stale.length) throw new Error('Out of sync with CS2077.html: ' + stale.join(', '));
console.log((check ? 'Verified ' : 'Exported ') + outputs.size + ' files from CS2077.html.');
