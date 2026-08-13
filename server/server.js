/**
 * Servidor opcional do Corretor de Redação ENEM.
 *
 * Faz duas coisas:
 *   1. Serve os arquivos estáticos do site (o site também funciona sem ele).
 *   2. Expõe /api/corrigir, que envia a redação para a API da Anthropic e
 *      devolve uma correção pelas 5 competências em JSON validado por schema.
 *
 * A chave da API fica apenas no servidor — nunca é enviada ao navegador.
 *
 * Uso:
 *   npm install
 *   export ANTHROPIC_API_KEY=...      # opcional; sem ela, só a análise local roda
 *   npm start                          # http://localhost:3000
 */

'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORTA = Number(process.env.PORT) || 3000;
const RAIZ = path.resolve(__dirname, '..');
const MODELO = process.env.ANTHROPIC_MODEL || 'claude-opus-5';
const LIMITE_CARACTERES = 20000;

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2'
};

// ---------------------------------------------------------------------------
// Cliente Anthropic (carregado sob demanda — o site roda sem ele)
// ---------------------------------------------------------------------------

let clienteAnthropic;
let sdkIndisponivel = false;

function obterCliente() {
  if (clienteAnthropic || sdkIndisponivel) return clienteAnthropic;
  try {
    const Anthropic = require('@anthropic-ai/sdk');
    clienteAnthropic = new Anthropic();
  } catch (e) {
    sdkIndisponivel = true;
    console.warn('[aviso] @anthropic-ai/sdk não instalado. Rode "npm install" para habilitar a correção por IA.');
  }
  return clienteAnthropic;
}

function iaConfigurada() {
  return Boolean(process.env.ANTHROPIC_API_KEY) && Boolean(obterCliente());
}

// ---------------------------------------------------------------------------
// Prompt e schema da correção
// ---------------------------------------------------------------------------

const SISTEMA = `Você é um corretor experiente de redações do ENEM, treinado na matriz de referência oficial do Inep.

Avalie a redação nas cinco competências, atribuindo a cada uma um dos níveis 0, 40, 80, 120, 160 ou 200 pontos:

C1 — Domínio da modalidade escrita formal da língua portuguesa.
C2 — Compreender a proposta e aplicar conceitos de várias áreas de conhecimento, dentro do tipo textual dissertativo-argumentativo.
C3 — Selecionar, relacionar, organizar e interpretar informações em defesa de um ponto de vista.
C4 — Demonstrar conhecimento dos mecanismos linguísticos necessários para a construção da argumentação.
C5 — Elaborar proposta de intervenção para o problema abordado, respeitando os direitos humanos.

Regras de correção que você deve aplicar:
- Fuga completa ao tema, não atendimento ao tipo textual dissertativo-argumentativo ou texto com até 7 linhas zeram a redação inteira.
- Proposta de intervenção que fira os direitos humanos zera a Competência 5.
- Na C5, verifique explicitamente os cinco elementos: agente, ação, meio/modo, efeito/finalidade e detalhamento de um deles.
- Seja rigoroso e calibrado: não atribua 200 por gentileza. Reserve o nível 5 para desempenho realmente excelente.

Para cada competência, liste o que já funciona e o que precisa ser corrigido. Em cada problema, cite o trecho exato da redação a que se refere (campo "trecho"), copiado literalmente do texto do candidato — nunca invente um trecho. Se o problema for estrutural e não couber em um trecho, deixe "trecho" como string vazia.

Escreva todos os comentários em português brasileiro, de forma direta e específica, dirigida ao estudante. Evite elogios genéricos e evite jargão sem explicação.`;

const SCHEMA = {
  type: 'object',
  properties: {
    notaTotal: { type: 'integer' },
    comentarioGeral: { type: 'string' },
    avisos: { type: 'array', items: { type: 'string' } },
    competencias: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          numero: { type: 'integer', enum: [1, 2, 3, 4, 5] },
          titulo: { type: 'string' },
          descricao: { type: 'string' },
          nota: { type: 'integer', enum: [0, 40, 80, 120, 160, 200] },
          positivos: { type: 'array', items: { type: 'string' } },
          problemas: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                tipo: { type: 'string' },
                mensagem: { type: 'string' },
                trecho: { type: 'string' }
              },
              required: ['tipo', 'mensagem', 'trecho'],
              additionalProperties: false
            }
          }
        },
        required: ['numero', 'titulo', 'descricao', 'nota', 'positivos', 'problemas'],
        additionalProperties: false
      }
    }
  },
  required: ['notaTotal', 'comentarioGeral', 'avisos', 'competencias'],
  additionalProperties: false
};

async function corrigirComIa(texto, tema) {
  const client = obterCliente();
  if (!client) throw new Error('SDK da Anthropic não instalado.');

  const entrada = [
    tema ? `Tema da proposta: ${tema}` : 'Tema da proposta: não informado pelo estudante.',
    '',
    'Redação do candidato (entre as marcas):',
    '<redacao>',
    texto,
    '</redacao>',
    '',
    'Corrija a redação acima seguindo a matriz do ENEM.'
  ].join('\n');

  const resposta = await client.messages.create({
    model: MODELO,
    max_tokens: 16000,
    system: [{ type: 'text', text: SISTEMA, cache_control: { type: 'ephemeral' } }],
    output_config: {
      effort: 'high',
      format: { type: 'json_schema', schema: SCHEMA }
    },
    messages: [{ role: 'user', content: entrada }]
  });

  if (resposta.stop_reason === 'refusal') {
    throw new Error('A solicitação foi recusada pelos filtros de segurança do modelo.');
  }

  const bloco = resposta.content.find((b) => b.type === 'text');
  if (!bloco) throw new Error('Resposta do modelo sem conteúdo textual.');

  const dados = JSON.parse(bloco.text);

  // Recalcula o total a partir das competências: a soma é a fonte da verdade.
  if (Array.isArray(dados.competencias)) {
    dados.notaTotal = dados.competencias.reduce((s, c) => s + (Number(c.nota) || 0), 0);
  }
  dados.origem = 'ia';
  dados.modelo = MODELO;
  return dados;
}

// ---------------------------------------------------------------------------
// HTTP
// ---------------------------------------------------------------------------

function responderJson(res, status, corpo) {
  const dados = JSON.stringify(corpo);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(dados)
  });
  res.end(dados);
}

function lerCorpo(req, limiteBytes = 200 * 1024) {
  return new Promise((resolve, reject) => {
    let total = 0;
    const partes = [];
    req.on('data', (chunk) => {
      total += chunk.length;
      if (total > limiteBytes) {
        reject(new Error('Corpo da requisição muito grande.'));
        req.destroy();
        return;
      }
      partes.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(partes).toString('utf8')));
    req.on('error', reject);
  });
}

function servirEstatico(req, res, caminhoUrl) {
  const relativo = caminhoUrl === '/' ? 'index.html' : decodeURIComponent(caminhoUrl).replace(/^\/+/, '');
  const destino = path.resolve(RAIZ, relativo);

  // Impede traversal para fora da raiz do projeto.
  if (destino !== RAIZ && !destino.startsWith(RAIZ + path.sep)) {
    res.writeHead(403).end('Acesso negado');
    return;
  }

  fs.stat(destino, (erro, info) => {
    if (erro || !info.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Arquivo não encontrado');
      return;
    }
    res.writeHead(200, {
      'Content-Type': TIPOS[path.extname(destino).toLowerCase()] || 'application/octet-stream',
      'Content-Length': info.size,
      'Cache-Control': 'no-cache'
    });
    fs.createReadStream(destino).pipe(res);
  });
}

const servidor = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (url.pathname === '/api/status') {
    responderJson(res, 200, { disponivel: iaConfigurada(), modelo: iaConfigurada() ? MODELO : null });
    return;
  }

  if (url.pathname === '/api/corrigir') {
    if (req.method !== 'POST') {
      responderJson(res, 405, { erro: 'Use POST.' });
      return;
    }
    if (!iaConfigurada()) {
      responderJson(res, 503, { erro: 'Correção por IA não configurada neste servidor.' });
      return;
    }
    try {
      const corpo = JSON.parse(await lerCorpo(req));
      const texto = String(corpo.texto || '').trim();
      if (!texto) {
        responderJson(res, 400, { erro: 'Campo "texto" vazio.' });
        return;
      }
      if (texto.length > LIMITE_CARACTERES) {
        responderJson(res, 400, { erro: `Redação muito longa (limite de ${LIMITE_CARACTERES} caracteres).` });
        return;
      }
      const resultado = await corrigirComIa(texto, String(corpo.tema || '').slice(0, 300));
      responderJson(res, 200, resultado);
    } catch (err) {
      console.error('[erro] /api/corrigir:', err.message);
      responderJson(res, 500, { erro: err.message || 'Falha ao corrigir.' });
    }
    return;
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    responderJson(res, 405, { erro: 'Método não permitido.' });
    return;
  }

  servirEstatico(req, res, url.pathname);
});

servidor.listen(PORTA, () => {
  console.log(`\n  Corretor de Redação ENEM`);
  console.log(`  → http://localhost:${PORTA}`);
  console.log(`  → Correção por IA: ${iaConfigurada() ? `ativa (${MODELO})` : 'inativa (defina ANTHROPIC_API_KEY)'}\n`);
});
