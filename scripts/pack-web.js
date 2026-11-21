// Pack the Expo web export into one self-contained HTML page for the Artifact viewer.
const fs = require('fs');
const path = require('path');
const [webDir, outFile] = process.argv.slice(2);

const index = fs.readFileSync(path.join(webDir, 'index.html'), 'utf8');
const scripts = [...index.matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]);
if (scripts.length !== 1) throw new Error('expected a single bundle, got ' + scripts.length);
let js = fs.readFileSync(path.join(webDir, scripts[0]), 'utf8');

const mime = { '.ttf': 'font/ttf', '.png': 'image/png', '.otf': 'font/otf', '.woff2': 'font/woff2' };
let inlined = 0, bytes = 0;
js = js.replace(/"(\/assets\/[^"]+)"/g, (whole, p) => {
  const file = path.join(webDir, p);
  if (!fs.existsSync(file)) return whole;
  const data = fs.readFileSync(file);
  inlined++; bytes += data.length;
  return JSON.stringify(`data:${mime[path.extname(p)] || 'application/octet-stream'};base64,${data.toString('base64')}`);
});
const leftovers = js.match(/"\/assets\/[^"]+"/g) || [];
// A literal "</script" inside the bundle would end the inline <script> early.
js = js.replace(/<\/script/gi, '<\\/script');

const html = `<title>운동 기록</title>
<style>
  :root { --app-bg: #F4F6FB; color-scheme: light; }
  html, body { height: 100%; box-sizing: border-box; }
  body { overflow: hidden; background: var(--app-bg); }
  #root { display: flex; height: 100%; flex: 1; }
</style>
<div id="root"></div>
<script>
  // Expo Router reads the page path; start the app at its home route.
  try { if (location.pathname !== '/') history.replaceState(history.state, '', '/' + location.hash); } catch (e) {}
</script>
<script>
${js}
</script>
`;
fs.writeFileSync(outFile, html);
console.log(JSON.stringify({ inlined, assetKB: Math.round(bytes / 1024), leftovers: leftovers.length, outKB: Math.round(html.length / 1024) }));
