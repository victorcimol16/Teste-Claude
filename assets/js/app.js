/**
 * Camada de aplicação: liga a interface ao motor de correção.
 */

(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const CHAVE_HISTORICO = 'corretor-enem:historico';
  const CHAVE_TEMA = 'corretor-enem:aparencia';
  const CHAVE_RASCUNHO = 'corretor-enem:rascunho';

  let temaAtual = null;
  let ultimoResultado = null;
  let iaDisponivel = false;

  const PALAVRAS_IGNORADAS = new Set([
    'para', 'como', 'sobre', 'entre', 'pelos', 'pelas', 'desafios', 'caminhos',
    'brasil', 'brasileira', 'brasileiro', 'sociedade', 'questao', 'questão',
    'enfrentamento', 'combate', 'combater', 'reduzir', 'promover', 'nacional',
    'contexto', 'atual', 'seus', 'suas', 'dos', 'das', 'nos', 'nas', 'uma', 'que'
  ]);

  // ---------------------------------------------------------------------------
  // Temas
  // ---------------------------------------------------------------------------

  function montarSeletorTemas() {
    const sel = $('seletorTema');
    sel.innerHTML = '';

    const grupoEnem = document.createElement('optgroup');
    grupoEnem.label = 'Temas de edições anteriores do ENEM';
    const grupoExtra = document.createElement('optgroup');
    grupoExtra.label = 'Propostas de treino';

    TEMAS.forEach((t, i) => {
      const opt = document.createElement('option');
      opt.value = String(i);
      opt.textContent = (t.ano ? `ENEM ${t.ano} — ` : '') + t.titulo;
      (t.ano ? grupoEnem : grupoExtra).appendChild(opt);
    });

    sel.appendChild(grupoEnem);
    sel.appendChild(grupoExtra);

    const optCustom = document.createElement('option');
    optCustom.value = 'custom';
    optCustom.textContent = '✏️ Escrever meu próprio tema…';
    sel.appendChild(optCustom);
  }

  function extrairPalavrasChave(enunciado) {
    return CorretorENEM.normalizar(enunciado)
      .split(/[^a-z]+/)
      .filter((p) => p.length >= 4 && !PALAVRAS_IGNORADAS.has(p))
      .slice(0, 12);
  }

  function aplicarTema() {
    const valor = $('seletorTema').value;
    const custom = valor === 'custom';
    $('campoTemaCustom').hidden = !custom;

    if (custom) {
      const enunciado = $('temaCustom').value.trim();
      temaAtual = {
        ano: null,
        titulo: enunciado || 'Tema personalizado (digite o enunciado acima)',
        palavrasChave: enunciado ? extrairPalavrasChave(enunciado) : [],
        repertorios: []
      };
    } else {
      temaAtual = TEMAS[Number(valor)] || TEMAS[0];
    }

    $('propostaEnunciado').textContent =
      (temaAtual.ano ? `ENEM ${temaAtual.ano} — ` : 'Proposta: ') + temaAtual.titulo;

    const box = $('repertoriosBox');
    const lista = $('listaRepertorios');
    lista.innerHTML = '';
    if (temaAtual.repertorios && temaAtual.repertorios.length) {
      box.hidden = false;
      temaAtual.repertorios.forEach((r) => {
        const li = document.createElement('li');
        li.textContent = r;
        lista.appendChild(li);
      });
    } else {
      box.hidden = true;
    }
  }

  // ---------------------------------------------------------------------------
  // Métricas ao vivo
  // ---------------------------------------------------------------------------

  function atualizarMetricas() {
    const texto = $('redacao').value;
    const paragrafos = CorretorENEM.dividirParagrafos(texto);
    const palavras = CorretorENEM.contarPalavras(texto);
    const linhas = CorretorENEM.estimarLinhas(paragrafos);
    const periodos = (texto.match(/[^.!?]+[.!?]/g) || []).length;

    $('mPalavras').textContent = palavras;
    $('mLinhas').textContent = linhas;
    $('mParagrafos').textContent = paragrafos.length;
    $('mPeriodos').textContent = periodos;

    const barra = $('barraLinhas');
    barra.style.width = Math.min(100, (linhas / 30) * 100) + '%';
    barra.classList.toggle('excedido', linhas > 30);

    try { localStorage.setItem(CHAVE_RASCUNHO, texto); } catch (e) { /* modo privado */ }
  }

  // ---------------------------------------------------------------------------
  // Renderização do resultado
  // ---------------------------------------------------------------------------

  function comentarioDaNota(nota) {
    if (nota === 0) return { rotulo: 'Redação zerada', texto: 'Verifique os avisos abaixo: há uma ocorrência que anula a redação.' };
    if (nota < 400) return { rotulo: 'Precisa de reestruturação', texto: 'A base do texto ainda não está formada. Comece pela estrutura: introdução com tese, dois desenvolvimentos e conclusão com proposta.' };
    if (nota < 600) return { rotulo: 'Em construção', texto: 'A estrutura existe, mas os argumentos e a coesão precisam de reforço. Veja as competências com menor pontuação.' };
    if (nota < 750) return { rotulo: 'Bom desempenho', texto: 'Texto sólido. Os ganhos agora vêm do repertório produtivo e do detalhamento da proposta de intervenção.' };
    if (nota < 900) return { rotulo: 'Muito bom', texto: 'Redação competitiva. Refine os pontos apontados para chegar ao nível 5 em todas as competências.' };
    return { rotulo: 'Excelente', texto: 'Desempenho próximo do nível máximo em todas as competências.' };
  }

  function criarItem(classe, titulo, mensagem, trecho) {
    const li = document.createElement('li');
    li.className = classe;
    const corpo = document.createElement('div');
    corpo.className = 'item-corpo';
    const t = document.createElement('strong');
    t.textContent = titulo;
    corpo.appendChild(t);
    corpo.appendChild(document.createTextNode(mensagem));
    if (trecho) {
      const tr = document.createElement('em');
      tr.className = 'item-trecho';
      tr.textContent = '"' + trecho + '"';
      corpo.appendChild(tr);
    }
    li.appendChild(corpo);
    return li;
  }

  function renderizarCompetencias(competencias) {
    const alvo = $('competencias');
    alvo.innerHTML = '';

    competencias.forEach((c) => {
      const nivel = Math.round(c.nota / 40);
      const card = document.createElement('article');
      card.className = 'comp';

      const cabecalho = document.createElement('div');
      cabecalho.className = 'comp-cabecalho';
      cabecalho.innerHTML = `
        <div>
          <h3 class="comp-titulo"><span>Competência ${c.numero}</span> — ${c.titulo}</h3>
          <p class="comp-descricao">${c.descricao || ''}</p>
        </div>
        <div class="comp-nota">
          <strong>${c.nota}</strong>
          <span>de 200 · nível ${nivel}</span>
        </div>`;
      card.appendChild(cabecalho);

      const barra = document.createElement('div');
      barra.className = 'comp-barra';
      const fill = document.createElement('div');
      fill.className = 'nivel-' + nivel;
      fill.style.width = (c.nota / 200) * 100 + '%';
      barra.appendChild(fill);
      card.appendChild(barra);

      if (c.positivos && c.positivos.length) {
        const h = document.createElement('p');
        h.className = 'subtitulo';
        h.textContent = 'O que está funcionando';
        card.appendChild(h);
        const ul = document.createElement('ul');
        ul.className = 'lista-itens';
        c.positivos.forEach((p) => ul.appendChild(criarItem('item-ok', '', p, '')));
        card.appendChild(ul);
      }

      if (c.problemas && c.problemas.length) {
        const h = document.createElement('p');
        h.className = 'subtitulo';
        h.textContent = 'O que corrigir';
        card.appendChild(h);
        const ul = document.createElement('ul');
        ul.className = 'lista-itens';
        c.problemas.slice(0, 8).forEach((p) => {
          ul.appendChild(criarItem('item-erro', p.tipo ? p.tipo + ': ' : '', p.mensagem, p.trecho));
        });
        card.appendChild(ul);
        if (c.problemas.length > 8) {
          const extra = document.createElement('p');
          extra.className = 'ajuda';
          extra.style.margin = '.6rem 0 0';
          extra.textContent = `+ ${c.problemas.length - 8} outra(s) ocorrência(s) do mesmo tipo.`;
          card.appendChild(extra);
        }
      }

      alvo.appendChild(card);
    });
  }

  function renderizarTextoMarcado(texto, marcacoes) {
    const alvo = $('textoMarcado');
    alvo.innerHTML = '';

    const ordenadas = [...(marcacoes || [])].sort((a, b) => a.inicio - b.inicio);
    let cursor = 0;

    ordenadas.forEach((m) => {
      if (m.inicio < cursor) return; // evita sobreposição
      alvo.appendChild(document.createTextNode(texto.slice(cursor, m.inicio)));
      const span = document.createElement('span');
      span.className = 'marca-erro';
      span.title = m.mensagem;
      span.textContent = texto.slice(m.inicio, m.fim);
      alvo.appendChild(span);
      cursor = m.fim;
    });

    alvo.appendChild(document.createTextNode(texto.slice(cursor)));
  }

  function renderizarResultado(resultado, texto) {
    ultimoResultado = { resultado, texto, tema: temaAtual ? temaAtual.titulo : '', data: Date.now() };

    $('notaTotal').textContent = resultado.notaTotal;
    $('notaAnel').style.setProperty('--pct', (resultado.notaTotal / 1000) * 100);

    const c = comentarioDaNota(resultado.notaTotal);
    $('notaRotulo').textContent = c.rotulo;
    $('notaComentario').textContent = resultado.comentarioGeral || c.texto;

    const avisos = $('avisos');
    avisos.innerHTML = '';
    (resultado.avisos || []).forEach((a) => {
      const div = document.createElement('div');
      div.className = 'aviso';
      div.textContent = '⚠️ ' + a;
      avisos.appendChild(div);
    });
    if (resultado.anulada) {
      const div = document.createElement('div');
      div.className = 'aviso';
      div.textContent = '⛔ ' + resultado.anulada.motivo;
      avisos.appendChild(div);
    }

    renderizarCompetencias(resultado.competencias);
    renderizarTextoMarcado(texto, resultado.marcacoes);

    $('resultado').hidden = false;
    $('resultado').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ---------------------------------------------------------------------------
  // Ações
  // ---------------------------------------------------------------------------

  function corrigirLocal() {
    const texto = $('redacao').value;
    if (!texto.trim()) {
      alert('Escreva ou cole a redação antes de corrigir.');
      return;
    }
    const resultado = CorretorENEM.corrigir(texto, temaAtual);
    renderizarResultado(resultado, texto);
  }

  async function verificarIa() {
    try {
      const resp = await fetch('/api/status', { method: 'GET' });
      if (!resp.ok) throw new Error('indisponível');
      const dados = await resp.json();
      iaDisponivel = !!dados.disponivel;
    } catch (e) {
      iaDisponivel = false;
    }
    const badge = $('statusIa');
    badge.textContent = iaDisponivel ? 'IA disponível' : 'IA off — análise local';
    badge.classList.toggle('badge-on', iaDisponivel);
    badge.classList.toggle('badge-off', !iaDisponivel);
    $('btnCorrigirIa').hidden = !iaDisponivel;
  }

  async function corrigirComIa() {
    const texto = $('redacao').value;
    if (!texto.trim()) {
      alert('Escreva ou cole a redação antes de corrigir.');
      return;
    }
    const btn = $('btnCorrigirIa');
    const rotulo = btn.textContent;
    btn.disabled = true;
    btn.textContent = '✨ Corrigindo…';

    try {
      const resp = await fetch('/api/corrigir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto, tema: temaAtual ? temaAtual.titulo : '' })
      });
      if (!resp.ok) {
        const erro = await resp.json().catch(() => ({}));
        throw new Error(erro.erro || 'Falha na correção por IA.');
      }
      const dados = await resp.json();
      // Mantém as estatísticas e marcações do motor local, que a IA não produz.
      const local = CorretorENEM.corrigir(texto, temaAtual);
      renderizarResultado({
        ...dados,
        estatisticas: local.estatisticas,
        marcacoes: local.marcacoes,
        avisos: [...(local.avisos || []), ...(dados.avisos || [])]
      }, texto);
    } catch (err) {
      alert('Não foi possível corrigir com IA: ' + err.message + '\nUsando a análise local.');
      corrigirLocal();
    } finally {
      btn.disabled = false;
      btn.textContent = rotulo;
    }
  }

  // ---------------------------------------------------------------------------
  // Histórico
  // ---------------------------------------------------------------------------

  function lerHistorico() {
    try { return JSON.parse(localStorage.getItem(CHAVE_HISTORICO) || '[]'); }
    catch (e) { return []; }
  }

  function gravarHistorico(lista) {
    try { localStorage.setItem(CHAVE_HISTORICO, JSON.stringify(lista.slice(0, 30))); }
    catch (e) { /* armazenamento indisponível */ }
  }

  function salvarNoHistorico() {
    if (!ultimoResultado) return;
    const lista = lerHistorico();
    lista.unshift({
      data: ultimoResultado.data,
      tema: ultimoResultado.tema,
      nota: ultimoResultado.resultado.notaTotal,
      notas: ultimoResultado.resultado.competencias.map((c) => c.nota),
      texto: ultimoResultado.texto
    });
    gravarHistorico(lista);
    renderizarHistorico();
  }

  function renderizarHistorico() {
    const lista = lerHistorico();
    const secao = $('secaoHistorico');
    const alvo = $('listaHistorico');
    alvo.innerHTML = '';
    secao.hidden = lista.length === 0;

    lista.forEach((item, i) => {
      const div = document.createElement('div');
      div.className = 'hist-item';

      const info = document.createElement('div');
      const data = new Date(item.data).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
      info.innerHTML = `<b>${item.nota}</b> pontos · ${data}
        <div class="hist-tema">${item.tema || 'sem tema'} · ${item.notas.join(' / ')}</div>`;
      div.appendChild(info);

      const acoes = document.createElement('div');
      acoes.className = 'hist-acoes';

      const abrir = document.createElement('button');
      abrir.className = 'btn btn-secundario';
      abrir.textContent = 'Reabrir';
      abrir.onclick = () => {
        $('redacao').value = item.texto;
        atualizarMetricas();
        corrigirLocal();
      };

      const remover = document.createElement('button');
      remover.className = 'btn btn-fantasma';
      remover.textContent = '✕';
      remover.title = 'Remover do histórico';
      remover.onclick = () => {
        const atual = lerHistorico();
        atual.splice(i, 1);
        gravarHistorico(atual);
        renderizarHistorico();
      };

      acoes.appendChild(abrir);
      acoes.appendChild(remover);
      div.appendChild(acoes);
      alvo.appendChild(div);
    });
  }

  // ---------------------------------------------------------------------------
  // Exemplo
  // ---------------------------------------------------------------------------

  const EXEMPLO = `A Constituição Federal de 1988 estabelece a educação como um direito de todos e dever do Estado. No entanto, a evasão escolar no ensino médio brasileiro revela o distanciamento entre o texto legal e a realidade das salas de aula. Diante disso, é necessário compreender que a permanência do estudante depende tanto de condições materiais quanto do sentido que a escola assume em sua trajetória.

Em primeiro lugar, a necessidade de trabalhar precocemente afasta o jovem da sala de aula. De acordo com dados do IBGE, parcela expressiva dos adolescentes que abandonam os estudos o faz para complementar a renda familiar. Nesse sentido, a escola passa a competir com uma urgência econômica que ela não é capaz de resolver sozinha, o que torna a decisão de sair uma escolha imposta pela sobrevivência, e não pelo desinteresse.

Ademais, o currículo distante da realidade juvenil aprofunda esse quadro. Segundo Paulo Freire, em "Pedagogia do Oprimido", a educação só liberta quando dialoga com o mundo do educando. Entretanto, quando o conteúdo escolar se apresenta como um conjunto de informações desconexas da vida do estudante, a permanência perde sentido. Tal cenário explica por que políticas de mera obrigatoriedade não bastam para reter o aluno.

Portanto, é imprescindível que o Ministério da Educação, em parceria com as secretarias estaduais, amplie os programas de bolsa-permanência, por meio da destinação de recursos do Fundo Nacional de Desenvolvimento da Educação, a fim de que o estudante de baixa renda possa permanecer na escola sem abrir mão do sustento familiar. Além disso, cabe às escolas reformular seus projetos pedagógicos com a participação dos próprios alunos, de modo que o currículo dialogue com seus contextos e a permanência deixe de ser um sacrifício para tornar-se uma escolha.`;

  // ---------------------------------------------------------------------------
  // Aparência
  // ---------------------------------------------------------------------------

  function alternarAparencia() {
    const atual = document.documentElement.getAttribute('data-tema');
    const novo = atual === 'escuro' ? 'claro' : 'escuro';
    document.documentElement.setAttribute('data-tema', novo);
    $('btnTema').textContent = novo === 'escuro' ? '☀️' : '🌙';
    try { localStorage.setItem(CHAVE_TEMA, novo); } catch (e) { /* ignora */ }
  }

  function restaurarAparencia() {
    let salvo = null;
    try { salvo = localStorage.getItem(CHAVE_TEMA); } catch (e) { /* ignora */ }
    const preferido = salvo || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'escuro' : 'claro');
    document.documentElement.setAttribute('data-tema', preferido);
    $('btnTema').textContent = preferido === 'escuro' ? '☀️' : '🌙';
  }

  // ---------------------------------------------------------------------------
  // Inicialização
  // ---------------------------------------------------------------------------

  function iniciar() {
    restaurarAparencia();
    montarSeletorTemas();

    // Começa em um tema aleatório para variar o treino.
    $('seletorTema').selectedIndex = Math.floor(Math.random() * TEMAS.length);
    aplicarTema();

    try {
      const rascunho = localStorage.getItem(CHAVE_RASCUNHO);
      if (rascunho) $('redacao').value = rascunho;
    } catch (e) { /* ignora */ }

    atualizarMetricas();
    renderizarHistorico();
    verificarIa();

    $('seletorTema').addEventListener('change', aplicarTema);
    $('temaCustom').addEventListener('input', aplicarTema);
    $('redacao').addEventListener('input', atualizarMetricas);
    $('btnCorrigir').addEventListener('click', corrigirLocal);
    $('btnCorrigirIa').addEventListener('click', corrigirComIa);
    $('btnTema').addEventListener('click', alternarAparencia);
    $('btnSalvar').addEventListener('click', salvarNoHistorico);
    $('btnImprimir').addEventListener('click', () => window.print());

    $('btnSortear').addEventListener('click', () => {
      const sel = $('seletorTema');
      let novo;
      do { novo = Math.floor(Math.random() * TEMAS.length); }
      while (String(novo) === sel.value && TEMAS.length > 1);
      sel.value = String(novo);
      aplicarTema();
    });

    $('btnExemplo').addEventListener('click', () => {
      const idx = TEMAS.findIndex((t) => /abandono escolar/i.test(t.titulo));
      if (idx >= 0) { $('seletorTema').value = String(idx); aplicarTema(); }
      $('redacao').value = EXEMPLO;
      atualizarMetricas();
      corrigirLocal();
    });

    $('btnLimpar').addEventListener('click', () => {
      if (!$('redacao').value.trim() || confirm('Apagar o texto atual?')) {
        $('redacao').value = '';
        atualizarMetricas();
        $('resultado').hidden = true;
      }
    });

    $('btnLimparHistorico').addEventListener('click', () => {
      if (confirm('Apagar todo o histórico salvo neste navegador?')) {
        gravarHistorico([]);
        renderizarHistorico();
      }
    });

    // Ctrl/Cmd + Enter corrige.
    $('redacao').addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') corrigirLocal();
    });
  }

  document.addEventListener('DOMContentLoaded', iniciar);
})();
