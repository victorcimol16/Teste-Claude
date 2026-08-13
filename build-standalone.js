/**
 * Gera uma versão de arquivo único do site em dist/index.html, com o CSS e o
 * JavaScript embutidos. Serve para abrir o corretor offline, com um duplo
 * clique, sem servidor e sem a pasta assets/.
 *
 * Uso: npm run build
 */

'use strict';

const fs = require('fs');
const path = require('path');

const RAIZ = __dirname;
const SAIDA = path.join(RAIZ, 'dist');

function ler(relativo) {
  return fs.readFileSync(path.join(RAIZ, relativo), 'utf8');
}

let html = ler('index.html');

// Embute a folha de estilo.
html = html.replace(
  /[ \t]*<link rel="stylesheet" href="([^"]+)">\n?/g,
  (_, href) => `  <style>\n${ler(href)}\n  </style>\n`
);

// Embute os scripts, na mesma ordem em que aparecem no documento.
html = html.replace(
  /[ \t]*<script src="([^"]+)"><\/script>\n?/g,
  (_, src) => `<script>\n${ler(src)}\n</script>\n`
);

// Sem servidor não há /api/status: evita o erro de rede no console.
html = html.replace(
  "const resp = await fetch('/api/status', { method: 'GET' });",
  "if (location.protocol === 'file:') throw new Error('sem servidor');\n      const resp = await fetch('/api/status', { method: 'GET' });"
);

fs.mkdirSync(SAIDA, { recursive: true });
const destino = path.join(SAIDA, 'index.html');
fs.writeFileSync(destino, html);

const kb = (fs.statSync(destino).size / 1024).toFixed(1);
console.log(`dist/index.html gerado (${kb} KB) — abra com um duplo clique.`);
