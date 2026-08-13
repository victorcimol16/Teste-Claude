/**
 * Motor de correção heurística de redações do ENEM.
 *
 * Avalia as 5 competências da matriz de referência (0 a 200 pontos cada,
 * em níveis de 40 em 40) e devolve um relatório explicável: cada nota vem
 * acompanhada dos pontos positivos identificados e dos problemas concretos,
 * com o trecho do texto que os originou.
 *
 * Importante: é uma análise automática por heurísticas linguísticas. Serve
 * para treino e diagnóstico, não substitui a avaliação de um corretor humano.
 */

(function (global) {
  'use strict';

  // ---------------------------------------------------------------------------
  // Listas de apoio
  // ---------------------------------------------------------------------------

  const STOPWORDS = new Set([
    'a', 'o', 'as', 'os', 'um', 'uma', 'uns', 'umas', 'de', 'do', 'da', 'dos', 'das',
    'em', 'no', 'na', 'nos', 'nas', 'por', 'pelo', 'pela', 'pelos', 'pelas', 'para',
    'com', 'sem', 'sob', 'sobre', 'entre', 'ate', 'apos', 'e', 'ou', 'que', 'se',
    'ao', 'aos', 'a', 'as', 'nao', 'sim', 'mais', 'menos', 'muito', 'muita', 'muitos',
    'muitas', 'ser', 'sao', 'foi', 'era', 'eram', 'esta', 'estao', 'ha', 'tem', 'tem',
    'seu', 'sua', 'seus', 'suas', 'este', 'esta', 'esse', 'essa', 'isso', 'aquilo',
    'como', 'quando', 'onde', 'qual', 'quais', 'ja', 'tambem', 'ainda', 'assim',
    'pois', 'porque', 'mas', 'porem', 'entao', 'foram', 'sendo', 'ter', 'todo',
    'toda', 'todos', 'todas', 'outro', 'outra', 'outros', 'outras', 'lhe', 'lhes'
  ]);

  const CONECTIVOS = {
    adicao: ['ademais', 'alem disso', 'outrossim', 'somado a isso', 'em adicao', 'igualmente', 'do mesmo modo', 'nao obstante isso', 'ainda mais'],
    oposicao: ['entretanto', 'todavia', 'contudo', 'no entanto', 'porem', 'em contrapartida', 'por outro lado', 'apesar disso', 'nao obstante', 'conquanto', 'embora'],
    causa: ['porquanto', 'visto que', 'uma vez que', 'haja vista', 'ja que', 'dado que', 'em razao de', 'em virtude de', 'devido a', 'por conta de'],
    conclusao: ['portanto', 'logo', 'por conseguinte', 'destarte', 'dessa forma', 'desse modo', 'assim sendo', 'em suma', 'diante disso', 'por isso', 'sendo assim'],
    explicacao: ['isto e', 'ou seja', 'a saber', 'em outras palavras', 'vale ressaltar', 'cabe destacar', 'nesse sentido', 'nesse contexto', 'nessa perspectiva', 'sob essa otica', 'com efeito'],
    tempo: ['primeiramente', 'em primeiro lugar', 'em segundo lugar', 'posteriormente', 'por fim', 'finalmente', 'atualmente', 'hodiernamente', 'outrora', 'concomitantemente'],
    comparacao: ['analogamente', 'assim como', 'da mesma forma', 'tal qual', 'similarmente', 'semelhantemente'],
    finalidade: ['a fim de', 'com o intuito de', 'com o objetivo de', 'com a finalidade de', 'para que', 'de modo que', 'de forma que']
  };

  const TODOS_CONECTIVOS = Object.values(CONECTIVOS).flat();

  const AGENTES = [
    'ministerio', 'governo', 'estado', 'poder publico', 'poder legislativo', 'poder executivo',
    'poder judiciario', 'congresso nacional', 'senado', 'camara dos deputados', 'prefeitura',
    'prefeituras', 'secretaria', 'secretarias', 'escola', 'escolas', 'universidade', 'universidades',
    'midia', 'imprensa', 'ong', 'ongs', 'organizacoes nao governamentais', 'sociedade civil',
    'familia', 'familias', 'empresas', 'iniciativa privada', 'onu', 'unesco', 'ibge',
    'sistema unico de saude', 'sus', 'inep', 'mec', 'ministerio da educacao', 'ministerio da saude',
    'ministerio da cidadania', 'ministerio da justica', 'municipios', 'estados', 'uniao'
  ];

  const VERBOS_ACAO = [
    'promover', 'criar', 'implementar', 'implantar', 'desenvolver', 'ampliar', 'garantir',
    'fiscalizar', 'investir', 'capacitar', 'incentivar', 'divulgar', 'elaborar', 'instituir',
    'estabelecer', 'organizar', 'realizar', 'oferecer', 'destinar', 'reformular', 'construir',
    'viabilizar', 'articular', 'estimular', 'conscientizar', 'aprimorar', 'expandir', 'financiar'
  ];

  const MEIOS = [
    'por meio de', 'por intermedio de', 'atraves de', 'mediante', 'com o auxilio de',
    'com o apoio de', 'via', 'valendo-se de', 'utilizando', 'a partir de', 'por via de',
    'em parceria com', 'em conjunto com'
  ];

  const FINALIDADES = [
    'a fim de', 'para que', 'com o objetivo de', 'com o intuito de', 'com a finalidade de',
    'de modo a', 'de forma a', 'visando', 'no intuito de', 'objetivando', 'para garantir',
    'para assegurar', 'para reduzir', 'para combater', 'para promover', 'para que se'
  ];

  const DETALHAMENTOS = [
    'tais como', 'como por exemplo', 'por exemplo', 'isto e', 'ou seja', 'a saber',
    'que consistem', 'que consiste', 'os quais', 'as quais', 'o qual', 'a qual',
    'em que sejam', 'nas quais', 'nos quais'
  ];

  const MARCAS_REPERTORIO = [
    { re: /\bconstitui[çc][ãa]o\b/i, nome: 'Constituição Federal' },
    { re: /\blei\s+(n[ºo°]\s*)?\d[\d.\/-]*/i, nome: 'referência a lei específica' },
    { re: /\bartigo\s+\d+|\bart\.\s*\d+/i, nome: 'artigo de legislação' },
    { re: /\b(onu|unesco|unicef|oms|oit|ipea|ibge|inep|fgv|datafolha|banco mundial)\b/i, nome: 'dado ou instituição de referência' },
    { re: /\bsegundo\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ][\wáéíóúâêôãõç]+/, nome: 'citação com fonte ("segundo …")' },
    { re: /\bde acordo com\s+[a-záéíóúâêôãõç]/i, nome: 'citação com fonte ("de acordo com …")' },
    { re: /\b\d+([.,]\d+)?\s*%/, nome: 'dado estatístico (percentual)' },
    { re: /\b(filos[óo]fo|soci[óo]logo|escritor|autor|pensador|historiador|economista)\b/i, nome: 'menção a autoridade intelectual' },
    { re: /\b(plat[ãa]o|arist[óo]teles|kant|hegel|marx|freud|foucault|bauman|arendt|bourdieu|durkheim|weber|rousseau|hobbes|locke|maquiavel|freire|darcy ribeiro|s[ée]rgio buarque|gilberto freyre|milton santos|djamila|beauvoir|krenak|abdias)\b/i, nome: 'repertório filosófico/sociológico' },
    { re: /\bdeclara[çc][ãa]o universal dos direitos humanos\b/i, nome: 'Declaração Universal dos Direitos Humanos' },
    { re: /\bestatuto d[oa]\s+\w+/i, nome: 'estatuto legal' },
    { re: /\bods\s*\d*|\bagenda 2030\b/i, nome: 'Objetivos de Desenvolvimento Sustentável' },
    { re: /\b(filme|document[áa]rio|obra|livro|romance|s[ée]rie)\s+["“'][^"”']{2,60}["”']/i, nome: 'obra cultural citada' }
  ];

  // Regras da Competência 1 — domínio da norma padrão.
  // peso: 2 = desvio grave, 1 = desvio médio, 0.5 = inadequação leve.
  const REGRAS_NORMA = [
    { re: /\ba\s+gente\b/gi, peso: 1.5, tipo: 'Marca de oralidade', msg: 'Substitua "a gente" por "nós" ou por uma construção impessoal.' },
    { re: /\b(pra|pro|pras|pros)\b/gi, peso: 1.5, tipo: 'Marca de oralidade', msg: 'Use "para", "para o", "para a" na escrita formal.' },
    { re: /\b(n[ée]|t[áa]|v[ée]|ok|tipo assim|meio que|sei l[áa])\b/gi, peso: 2, tipo: 'Marca de oralidade', msg: 'Expressão coloquial: não cabe na modalidade escrita formal.' },
    { re: /\b(galera|cara|pessoal|mano|coisa|coisas|neg[óo]cio|bagun[çc]a)\b/gi, peso: 1, tipo: 'Vocabulário informal ou vago', msg: 'Troque por um termo preciso e formal.' },
    { re: /\b(eu|meu|minha|meus|minhas|comigo|mim)\b/gi, peso: 1, tipo: 'Uso de 1ª pessoa do singular', msg: 'A dissertação argumentativa pede impessoalidade: prefira 3ª pessoa ou 1ª do plural.' },
    { re: /\bh[áa]\s+\w+\s+atr[áa]s\b/gi, peso: 2, tipo: 'Redundância', msg: '"Há … atrás" é redundante. Use apenas "há" ou apenas "atrás".' },
    { re: /\bpara\s+mim\s+(fazer|ver|dizer|falar|ajudar|entender|resolver|estudar|come[çc]ar|poder)\b/gi, peso: 2, tipo: 'Pronome oblíquo', msg: 'Antes de verbo no infinitivo, use "para eu" e não "para mim".' },
    { re: /\b(situa[çc][ãa]o|caso|momento|contexto|[ée]poca|sociedade|maneira|forma|per[íi]odo)\s+onde\b/gi, peso: 1.5, tipo: 'Uso indevido de "onde"', msg: '"Onde" indica lugar físico. Use "em que" / "na qual".' },
    { re: /\b[àÀ]\s+partir\b/g, peso: 2, tipo: 'Crase indevida', msg: 'A expressão correta é "a partir de", sem crase.' },
    { re: /\bhouveram\b/gi, peso: 2, tipo: 'Concordância verbal', msg: 'O verbo "haver" no sentido de existir é impessoal: use "houve".' },
    { re: /\bfazem\s+\d+\s+(anos|meses|dias|s[ée]culos)\b/gi, peso: 2, tipo: 'Concordância verbal', msg: '"Fazer" indicando tempo é impessoal: use "faz".' },
    { re: /\bhaviam\s+(muitos|muitas|v[áa]rios|v[áa]rias|pessoas|casos|problemas)\b/gi, peso: 2, tipo: 'Concordância verbal', msg: '"Haver" no sentido de existir não vai para o plural: use "havia".' },
    { re: /\ba\s+n[íi]vel\s+de\b/gi, peso: 1.5, tipo: 'Regência', msg: 'A forma consagrada é "em nível de" (ou reescreva a frase).' },
    { re: /\b(concerteza|derrepente|atrav[ée]z|excess[ãa]o|previl[ée]gio|menas|mim\s+fazer|agente\s+(deve|precisa|tem))\b/gi, peso: 2, tipo: 'Grafia incorreta', msg: 'Grafia fora do padrão. Revise a palavra.' },
    { re: /\bafim\s+de\b/gi, peso: 2, tipo: 'Grafia incorreta', msg: 'Finalidade escreve-se "a fim de"; "afim" significa semelhante.' },
    { re: /\bmas\s+(uma vez|um)\b/gi, peso: 1.5, tipo: 'Confusão "mas"/"mais"', msg: 'Verifique: aqui provavelmente cabe "mais" (quantidade).' },
    { re: /(^|[.!?]\s+)Mais\s+/g, peso: 1.5, tipo: 'Confusão "mas"/"mais"', msg: 'Iniciando oposição, o correto é "Mas".' },
    { re: /(^|[.!?]\s+)Porque\s+/g, peso: 1, tipo: 'Uso de "porque"', msg: 'Iniciando período, verifique se cabe "Por que" (separado).' },
    { re: /\s+[,.;:!?]/g, peso: 0.5, tipo: 'Pontuação', msg: 'Não use espaço antes do sinal de pontuação.' },
    { re: /[!?]{2,}|\.{4,}/g, peso: 1, tipo: 'Pontuação', msg: 'Evite pontuação expressiva repetida em texto dissertativo.' },
    { re: /[.!?]\s+[a-záéíóúâêôãõç]/g, peso: 1, tipo: 'Maiúscula', msg: 'Todo período deve começar com letra maiúscula.' },
    { re: /\bmuito\s+muito\b|\bque\s+que\b|\bde\s+de\b|\bpara\s+para\b/gi, peso: 1, tipo: 'Repetição', msg: 'Palavra duplicada — provável erro de digitação.' },
    { re: /\b(todo mundo|um monte de|bastante gente|cada vez mais gente)\b/gi, peso: 1, tipo: 'Vocabulário informal', msg: 'Prefira "toda a população", "grande parcela", "número expressivo de pessoas".' }
  ];

  // ---------------------------------------------------------------------------
  // Utilidades
  // ---------------------------------------------------------------------------

  function normalizar(texto) {
    return texto
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  function radical(palavra) {
    return normalizar(palavra).replace(/[^a-z]/g, '').slice(0, 6);
  }

  function contarPalavras(texto) {
    const m = texto.trim().match(/[\wÀ-ÿ'-]+/g);
    return m ? m.length : 0;
  }

  function listarPalavras(texto) {
    return (texto.match(/[\wÀ-ÿ'-]+/g) || []).map((p) => normalizar(p));
  }

  function dividirParagrafos(texto) {
    return texto
      .split(/\n\s*\n|\n/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
  }

  function dividirPeriodos(texto) {
    return texto
      .split(/(?<=[.!?])\s+/)
      .map((p) => p.trim())
      .filter((p) => p.length > 3);
  }

  /** Estimativa de linhas na folha oficial (30 linhas, ~68 caracteres por linha). */
  function estimarLinhas(paragrafos) {
    const CHARS_POR_LINHA = 68;
    return paragrafos.reduce((total, p) => total + Math.max(1, Math.ceil(p.length / CHARS_POR_LINHA)), 0);
  }

  function nivelPara(nota) {
    return Math.round(nota / 40);
  }

  /**
   * As notas do ENEM são atribuídas em níveis de 40 em 40. Descontos parciais
   * arredondam para baixo — arredondar para cima anularia a penalidade.
   */
  function limitarNota(nota) {
    const clamped = Math.max(0, Math.min(200, nota));
    return Math.floor(clamped / 40) * 40;
  }

  function ocorrenciasDe(textoNormalizado, lista) {
    const achados = [];
    lista.forEach((item) => {
      const alvo = normalizar(item);
      const re = new RegExp('(^|[^a-z])' + alvo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '([^a-z]|$)', 'g');
      if (re.test(textoNormalizado)) achados.push(item);
    });
    return achados;
  }

  function trechoAoRedor(texto, indice, tamanho) {
    const inicio = Math.max(0, indice - 30);
    const fim = Math.min(texto.length, indice + tamanho + 30);
    return (inicio > 0 ? '…' : '') + texto.slice(inicio, fim).replace(/\s+/g, ' ').trim() + (fim < texto.length ? '…' : '');
  }

  // ---------------------------------------------------------------------------
  // Competência 1 — Domínio da modalidade escrita formal
  // ---------------------------------------------------------------------------

  function avaliarCompetencia1(texto, ctx) {
    const problemas = [];
    const positivos = [];
    const marcacoes = [];
    let penalidade = 0;

    REGRAS_NORMA.forEach((regra) => {
      const re = new RegExp(regra.re.source, regra.re.flags.includes('g') ? regra.re.flags : regra.re.flags + 'g');
      let match;
      let ocorrencias = 0;
      while ((match = re.exec(texto)) !== null) {
        if (match[0].length === 0) { re.lastIndex++; continue; }
        ocorrencias++;
        if (ocorrencias <= 3) {
          problemas.push({
            tipo: regra.tipo,
            mensagem: regra.msg,
            trecho: trechoAoRedor(texto, match.index, match[0].length)
          });
          marcacoes.push({ inicio: match.index, fim: match.index + match[0].length, tipo: 'norma', mensagem: regra.tipo + ': ' + regra.msg });
        }
        if (ocorrencias > 12) break;
      }
      penalidade += Math.min(ocorrencias, 6) * regra.peso;
    });

    // Períodos excessivamente longos comprometem a clareza sintática.
    ctx.periodos.forEach((p) => {
      const n = contarPalavras(p);
      if (n > 55) {
        penalidade += 1;
        problemas.push({
          tipo: 'Período muito longo',
          mensagem: `Este período tem ${n} palavras. Períodos acima de ~40 palavras costumam gerar falhas de pontuação e concordância — divida-o.`,
          trecho: p.slice(0, 120) + (p.length > 120 ? '…' : '')
        });
      }
    });

    // Parágrafo sem pontuação final.
    ctx.paragrafos.forEach((p, i) => {
      if (!/[.!?]$/.test(p)) {
        penalidade += 1;
        problemas.push({
          tipo: 'Pontuação',
          mensagem: `O parágrafo ${i + 1} não termina com ponto final.`,
          trecho: '…' + p.slice(-60)
        });
      }
    });

    let nota;
    if (penalidade === 0) nota = 200;
    else if (penalidade <= 1.5) nota = 160;
    else if (penalidade <= 4) nota = 120;
    else if (penalidade <= 8) nota = 80;
    else if (penalidade <= 14) nota = 40;
    else nota = 0;

    if (nota >= 160) positivos.push('Texto com domínio consistente da norma padrão: poucos ou nenhum desvio relevante.');
    if (ctx.periodos.length > 0 && ctx.mediaPalavrasPeriodo >= 12 && ctx.mediaPalavrasPeriodo <= 30) {
      positivos.push('Períodos de extensão equilibrada (média de ' + Math.round(ctx.mediaPalavrasPeriodo) + ' palavras), o que favorece a clareza.');
    }
    if (!/\b(eu|meu|minha)\b/i.test(texto)) {
      positivos.push('Impessoalidade preservada: não há uso de 1ª pessoa do singular.');
    }

    return {
      numero: 1,
      titulo: 'Domínio da modalidade escrita formal',
      descricao: 'Demonstrar domínio da modalidade escrita formal da língua portuguesa.',
      nota: limitarNota(nota),
      positivos,
      problemas,
      marcacoes
    };
  }

  // ---------------------------------------------------------------------------
  // Competência 2 — Compreensão da proposta e repertório
  // ---------------------------------------------------------------------------

  function avaliarCompetencia2(texto, ctx, tema) {
    const problemas = [];
    const positivos = [];
    const textoNorm = ctx.textoNormalizado;

    // 1. Aderência ao tema por sobreposição de radicais.
    const chaves = (tema && tema.palavrasChave) ? tema.palavrasChave : [];
    const radicaisTexto = new Set(ctx.palavras.map(radical).filter((r) => r.length >= 4));
    const encontradas = chaves.filter((c) => radicaisTexto.has(radical(c)));
    const aderencia = chaves.length ? encontradas.length / chaves.length : 0.5;

    // 2. Repertório sociocultural legitimado.
    const repertorios = [];
    MARCAS_REPERTORIO.forEach((m) => {
      if (m.re.test(texto)) repertorios.push(m.nome);
    });

    // 3. Tipo textual: marcas de narração/relato descaracterizam a dissertação.
    const marcasNarrativas = /\bera uma vez\b|\bum dia\b|\bcerta vez\b|—\s*[A-Z]|\bmeu amigo\b|\bquando eu\b/i.test(texto);
    const temTese = ctx.introducao && /\b(deve|devem|precisa|necessario|necessária|necessario|urge|cabe|e preciso|é preciso|constitui|configura|revela|evidencia|demonstra|torna-se|faz-se)\b/i.test(normalizar(ctx.introducao));

    let nota;
    if (aderencia < 0.1 && chaves.length) {
      nota = 0;
      problemas.push({
        tipo: 'Fuga ao tema',
        mensagem: 'O texto praticamente não dialoga com as palavras-chave da proposta. Fuga ao tema zera toda a redação no ENEM.',
        trecho: ctx.introducao ? ctx.introducao.slice(0, 120) : ''
      });
    } else if (aderencia < 0.18) {
      nota = 40;
      problemas.push({
        tipo: 'Tangenciamento',
        mensagem: 'O texto trata do assunto geral, mas não do recorte exato da proposta. Retome os termos centrais do tema em todos os parágrafos.',
        trecho: ''
      });
    } else if (aderencia < 0.28 || repertorios.length === 0) {
      nota = repertorios.length === 0 ? 100 : 120;
    } else if (repertorios.length === 1) {
      nota = 160;
    } else {
      nota = 200;
    }

    if (repertorios.length === 0) {
      problemas.push({
        tipo: 'Ausência de repertório',
        mensagem: 'Não foi identificado repertório sociocultural legitimado (lei, dado, autor, obra, instituição). Sem ele, a Competência 2 dificilmente passa de 120.',
        trecho: ''
      });
    } else if (repertorios.length === 1) {
      problemas.push({
        tipo: 'Repertório pouco diversificado',
        mensagem: 'Apenas um tipo de repertório foi identificado. O nível 5 exige repertório produtivo em pelo menos dois argumentos.',
        trecho: ''
      });
    }

    if (marcasNarrativas) {
      nota = Math.min(nota, 120);
      problemas.push({
        tipo: 'Tipo textual',
        mensagem: 'Há marcas de narração/relato pessoal. O ENEM exige texto dissertativo-argumentativo em prosa.',
        trecho: ''
      });
    }

    if (!temTese) {
      nota = Math.min(nota, 160);
      problemas.push({
        tipo: 'Tese pouco explícita',
        mensagem: 'A introdução não apresenta uma tese claramente formulada. Feche o primeiro parágrafo com o seu posicionamento.',
        trecho: ctx.introducao ? ctx.introducao.slice(-120) : ''
      });
    } else {
      positivos.push('A introdução apresenta um posicionamento explícito (tese).');
    }

    if (encontradas.length) {
      positivos.push('Termos centrais do tema presentes no texto: ' + encontradas.slice(0, 6).join(', ') + '.');
    }
    if (repertorios.length >= 2) {
      positivos.push('Repertório sociocultural identificado: ' + [...new Set(repertorios)].slice(0, 4).join('; ') + '.');
    }

    return {
      numero: 2,
      titulo: 'Compreensão da proposta e repertório',
      descricao: 'Compreender a proposta e aplicar conceitos de várias áreas de conhecimento, dentro do tipo textual dissertativo-argumentativo.',
      nota: limitarNota(nota),
      positivos,
      problemas,
      marcacoes: [],
      meta: { aderencia, repertorios: [...new Set(repertorios)] }
    };
  }

  // ---------------------------------------------------------------------------
  // Competência 3 — Projeto de texto e argumentação
  // ---------------------------------------------------------------------------

  function avaliarCompetencia3(texto, ctx, tema) {
    const problemas = [];
    const positivos = [];
    const n = ctx.paragrafos.length;
    let nota = 200;

    if (n < 3) {
      nota = 40;
      problemas.push({
        tipo: 'Estrutura incompleta',
        mensagem: `O texto tem apenas ${n} parágrafo(s). A estrutura esperada é introdução + 2 desenvolvimentos + conclusão.`,
        trecho: ''
      });
    } else if (n === 3) {
      nota = 120;
      problemas.push({
        tipo: 'Estrutura enxuta',
        mensagem: 'Com 3 parágrafos, normalmente há apenas um argumento desenvolvido. Dois parágrafos de desenvolvimento sustentam melhor a tese.',
        trecho: ''
      });
    } else if (n > 6) {
      nota = 160;
      problemas.push({
        tipo: 'Fragmentação',
        mensagem: `${n} parágrafos costumam fragmentar o projeto de texto. Concentre cada ideia central em um parágrafo.`,
        trecho: ''
      });
    } else {
      positivos.push(`Estrutura adequada: ${n} parágrafos, compatível com o projeto de texto dissertativo-argumentativo.`);
    }

    // Comprovação nos parágrafos de desenvolvimento.
    const desenvolvimentos = ctx.paragrafos.slice(1, Math.max(1, n - 1));
    const marcaComprovacao = /\b(segundo|de acordo com|conforme|dados|pesquisa|estudo|censo|relat[óo]rio|lei|artigo|constitui[çc][ãa]o|\d+\s*%|estat[íi]stica|instituto)\b/i;
    let semComprovacao = 0;
    desenvolvimentos.forEach((p, i) => {
      if (!marcaComprovacao.test(p)) {
        semComprovacao++;
        problemas.push({
          tipo: 'Argumento sem comprovação',
          mensagem: `O parágrafo de desenvolvimento ${i + 1} apresenta a ideia, mas não a comprova com dado, lei, citação ou exemplo verificável.`,
          trecho: p.slice(0, 110) + '…'
        });
      }
      if (contarPalavras(p) < 45) {
        problemas.push({
          tipo: 'Desenvolvimento raso',
          mensagem: `O parágrafo de desenvolvimento ${i + 1} tem apenas ${contarPalavras(p)} palavras — pouco para apresentar argumento, comprovação e fechamento.`,
          trecho: p.slice(0, 110) + '…'
        });
        nota -= 20;
      }
    });
    if (semComprovacao > 0) nota -= 40 * Math.min(semComprovacao, 2);
    if (semComprovacao === 0 && desenvolvimentos.length >= 2) {
      positivos.push('Todos os parágrafos de desenvolvimento apresentam elemento de comprovação.');
    }

    // Progressão temática: as palavras-chave do tema devem reaparecer ao longo do texto.
    if (tema && tema.palavrasChave && tema.palavrasChave.length) {
      const radChaves = tema.palavrasChave.map(radical);
      const paragrafosComTema = ctx.paragrafos.filter((p) => {
        const rads = listarPalavras(p).map(radical);
        return radChaves.some((rc) => rads.includes(rc));
      }).length;
      if (paragrafosComTema < Math.ceil(n * 0.6)) {
        nota -= 40;
        problemas.push({
          tipo: 'Progressão temática frágil',
          mensagem: `O tema é retomado em apenas ${paragrafosComTema} de ${n} parágrafos. Cada parágrafo deve amarrar-se explicitamente ao recorte da proposta.`,
          trecho: ''
        });
      } else {
        positivos.push('O tema é retomado ao longo dos parágrafos, garantindo progressão e unidade.');
      }
    }

    // Equilíbrio entre parágrafos.
    if (n >= 3) {
      const tamanhos = ctx.paragrafos.map(contarPalavras);
      const maior = Math.max(...tamanhos);
      const menor = Math.min(...tamanhos);
      if (maior > menor * 4) {
        nota -= 20;
        problemas.push({
          tipo: 'Desequilíbrio entre parágrafos',
          mensagem: `O maior parágrafo tem ${maior} palavras e o menor, ${menor}. Distribua melhor as ideias.`,
          trecho: ''
        });
      }
    }

    // Conclusão deve retomar a discussão, e não apenas propor.
    if (ctx.conclusao && contarPalavras(ctx.conclusao) < 40) {
      nota -= 20;
      problemas.push({
        tipo: 'Conclusão curta',
        mensagem: 'A conclusão está muito breve para retomar a tese e ainda detalhar a proposta de intervenção.',
        trecho: ctx.conclusao.slice(0, 110)
      });
    }

    return {
      numero: 3,
      titulo: 'Seleção e organização de argumentos',
      descricao: 'Selecionar, relacionar, organizar e interpretar informações em defesa de um ponto de vista.',
      nota: limitarNota(nota),
      positivos,
      problemas,
      marcacoes: []
    };
  }

  // ---------------------------------------------------------------------------
  // Competência 4 — Mecanismos de coesão
  // ---------------------------------------------------------------------------

  function avaliarCompetencia4(texto, ctx) {
    const problemas = [];
    const positivos = [];
    const textoNorm = ctx.textoNormalizado;

    const usados = ocorrenciasDe(textoNorm, TODOS_CONECTIVOS);
    const categoriasUsadas = Object.keys(CONECTIVOS).filter((cat) =>
      CONECTIVOS[cat].some((c) => usados.includes(c))
    );

    let nota;
    if (usados.length >= 6 && categoriasUsadas.length >= 4) nota = 200;
    else if (usados.length >= 4 && categoriasUsadas.length >= 3) nota = 160;
    else if (usados.length >= 3) nota = 120;
    else if (usados.length >= 1) nota = 80;
    else nota = 40;

    if (usados.length) {
      positivos.push(`Conectivos empregados (${usados.length}): ${usados.slice(0, 8).join(', ')}.`);
    } else {
      problemas.push({
        tipo: 'Ausência de conectivos',
        mensagem: 'Não foram identificados operadores argumentativos. Sem eles, a articulação entre as partes fica a cargo do leitor.',
        trecho: ''
      });
    }
    if (categoriasUsadas.length < 3) {
      problemas.push({
        tipo: 'Repertório coesivo limitado',
        mensagem: `Foram usadas ${categoriasUsadas.length} categoria(s) de conectivo. Diversifique: adição, oposição, causa, conclusão e explicação.`,
        trecho: ''
      });
    }

    // Início de parágrafo sem elemento de articulação.
    ctx.paragrafos.forEach((p, i) => {
      if (i === 0) return;
      const inicio = normalizar(p).slice(0, 45);
      const temConector = TODOS_CONECTIVOS.some((c) => inicio.startsWith(normalizar(c)));
      if (!temConector) {
        nota -= 20;
        problemas.push({
          tipo: 'Parágrafo sem articulação',
          mensagem: `O parágrafo ${i + 1} começa sem conectivo. Inicie com um operador que marque a relação com o parágrafo anterior.`,
          trecho: p.slice(0, 70) + '…'
        });
      }
    });

    // Repetição excessiva de um mesmo conectivo.
    const contagemConectivos = {};
    usados.forEach((c) => {
      const re = new RegExp(normalizar(c).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      contagemConectivos[c] = (textoNorm.match(re) || []).length;
    });
    Object.entries(contagemConectivos).forEach(([c, qtd]) => {
      if (qtd >= 3) {
        nota -= 20;
        problemas.push({
          tipo: 'Conectivo repetido',
          mensagem: `"${c}" aparece ${qtd} vezes. Varie os operadores para não empobrecer a coesão.`,
          trecho: ''
        });
      }
    });

    // Repetição lexical excessiva (coesão referencial fraca).
    const freq = {};
    ctx.palavras.forEach((p) => {
      if (p.length < 5 || STOPWORDS.has(p)) return;
      freq[p] = (freq[p] || 0) + 1;
    });
    const repetidas = Object.entries(freq)
      .filter(([, q]) => q >= 5)
      .sort((a, b) => b[1] - a[1]);
    if (repetidas.length) {
      nota -= 20;
      problemas.push({
        tipo: 'Repetição lexical',
        mensagem: 'Palavras muito repetidas: ' + repetidas.slice(0, 4).map(([p, q]) => `"${p}" (${q}×)`).join(', ') +
          '. Use sinônimos, pronomes ou expressões nominais para retomar.',
        trecho: ''
      });
    }

    // Referenciação por pronomes e expressões retomadoras.
    const referenciadores = /\b(esse|essa|esses|essas|isso|tal|tais|o qual|a qual|os quais|as quais|cujo|cuja|este|esta|aquele|aquela|nesse|nessa|neste|nesta|desse|dessa|deste|desta|tal cen[áa]rio|tal problem[áa]tica|esse quadro|esse contexto)\b/gi;
    const qtdRef = (texto.match(referenciadores) || []).length;
    if (qtdRef >= 3) {
      positivos.push('Boa referenciação: o texto retoma ideias anteriores com pronomes e expressões nominais.');
    } else {
      nota -= 20;
      problemas.push({
        tipo: 'Referenciação escassa',
        mensagem: 'Poucos elementos de retomada ("tal cenário", "essa problemática", "o qual"). Eles evitam repetição e amarram o texto.',
        trecho: ''
      });
    }

    return {
      numero: 4,
      titulo: 'Mecanismos linguísticos de coesão',
      descricao: 'Demonstrar conhecimento dos mecanismos linguísticos necessários para a construção da argumentação.',
      nota: limitarNota(nota),
      positivos,
      problemas,
      marcacoes: []
    };
  }

  // ---------------------------------------------------------------------------
  // Competência 5 — Proposta de intervenção
  // ---------------------------------------------------------------------------

  function avaliarCompetencia5(texto, ctx) {
    const problemas = [];
    const positivos = [];
    const conclusao = ctx.conclusao || '';
    const conclusaoNorm = normalizar(conclusao);

    if (!conclusao || contarPalavras(conclusao) < 15) {
      return {
        numero: 5,
        titulo: 'Proposta de intervenção',
        descricao: 'Elaborar proposta de intervenção para o problema abordado, respeitando os direitos humanos.',
        nota: 0,
        positivos: [],
        problemas: [{
          tipo: 'Sem proposta de intervenção',
          mensagem: 'Não foi identificado um parágrafo de conclusão com proposta de intervenção. Essa competência vale 200 pontos.',
          trecho: ''
        }],
        marcacoes: []
      };
    }

    const agentes = ocorrenciasDe(conclusaoNorm, AGENTES);
    // Reconhece o verbo em suas formas conjugadas ("ampliar" → amplie, amplia, ampliando…).
    const acoes = VERBOS_ACAO.filter((v) => {
      const rad = v.replace(/(ar|er|ir)$/, '');
      return new RegExp('\\b' + rad + '(ar|er|ir|e|em|a|am|ou|ando|endo|indo|ada|ado|acao)?\\b', 'i')
        .test(conclusaoNorm);
    });
    const meios = ocorrenciasDe(conclusaoNorm, MEIOS);
    const finalidades = ocorrenciasDe(conclusaoNorm, FINALIDADES);
    const detalhes = ocorrenciasDe(conclusaoNorm, DETALHAMENTOS);

    const elementos = {
      agente: agentes.length > 0,
      acao: acoes.length > 0,
      meio: meios.length > 0,
      efeito: finalidades.length > 0,
      detalhamento: detalhes.length > 0 && contarPalavras(conclusao) >= 45
    };

    const presentes = Object.values(elementos).filter(Boolean).length;
    let nota = presentes * 40;

    const rotulos = {
      agente: 'Agente (quem executa)',
      acao: 'Ação (o que será feito)',
      meio: 'Meio/modo (como será feito)',
      efeito: 'Efeito/finalidade (para quê)',
      detalhamento: 'Detalhamento (explicação de um dos elementos)'
    };

    Object.entries(elementos).forEach(([chave, presente]) => {
      if (presente) {
        const exemplos = { agente: agentes, acao: acoes, meio: meios, efeito: finalidades, detalhamento: detalhes }[chave];
        positivos.push(`${rotulos[chave]}: identificado — "${exemplos.slice(0, 2).join('", "')}".`);
      } else {
        const dicas = {
          agente: 'Nomeie um agente concreto: Ministério da Educação, escolas, mídia, ONGs, poder público municipal.',
          acao: 'Use um verbo de ação claro: promover, implementar, fiscalizar, ampliar, capacitar.',
          meio: 'Explicite o meio: "por meio de", "mediante", "através de campanhas em…".',
          efeito: 'Declare a finalidade: "a fim de", "com o objetivo de", "para que".',
          detalhamento: 'Detalhe um dos elementos: explique como a ação funcionaria, com que recursos, para qual público.'
        };
        problemas.push({
          tipo: 'Elemento ausente na proposta',
          mensagem: `${rotulos[chave]} não identificado. ${dicas[chave]}`,
          trecho: ''
        });
      }
    });

    // Violação de direitos humanos zera a competência 5.
    const violacoes = /\b(pena de morte|tortura|justi[çc]amento|linchamento|esteriliza[çc][ãa]o for[çc]ada|expulsar do pa[íi]s|extermin|prender todos|castigo f[íi]sico)\b/i;
    if (violacoes.test(texto)) {
      nota = 0;
      problemas.push({
        tipo: 'Desrespeito aos direitos humanos',
        mensagem: 'A proposta contém elemento que fere os direitos humanos — isso zera a Competência 5 no ENEM.',
        trecho: ''
      });
    }

    return {
      numero: 5,
      titulo: 'Proposta de intervenção',
      descricao: 'Elaborar proposta de intervenção para o problema abordado, respeitando os direitos humanos.',
      nota: limitarNota(nota),
      positivos,
      problemas,
      marcacoes: [],
      meta: { elementos }
    };
  }

  // ---------------------------------------------------------------------------
  // Orquestração
  // ---------------------------------------------------------------------------

  function corrigir(texto, tema) {
    const limpo = (texto || '').replace(/\r\n/g, '\n').trim();
    const paragrafos = dividirParagrafos(limpo);
    const periodos = dividirPeriodos(limpo);
    const palavras = listarPalavras(limpo);
    const linhas = estimarLinhas(paragrafos);

    const ctx = {
      paragrafos,
      periodos,
      palavras,
      textoNormalizado: normalizar(limpo),
      introducao: paragrafos[0] || '',
      conclusao: paragrafos.length > 1 ? paragrafos[paragrafos.length - 1] : '',
      mediaPalavrasPeriodo: periodos.length ? palavras.length / periodos.length : 0
    };

    const estatisticas = {
      caracteres: limpo.length,
      palavras: palavras.length,
      paragrafos: paragrafos.length,
      periodos: periodos.length,
      linhasEstimadas: linhas,
      mediaPalavrasPorPeriodo: Math.round(ctx.mediaPalavrasPeriodo * 10) / 10
    };

    // Situações de anulação previstas no manual do participante.
    const avisos = [];
    let anulada = null;
    if (palavras.length === 0) {
      anulada = { motivo: 'Texto em branco.' };
    } else if (linhas < 8) {
      anulada = { motivo: `Texto insuficiente: cerca de ${linhas} linha(s). Redações com até 7 linhas recebem nota zero.` };
    }
    if (linhas > 30) {
      avisos.push(`O texto ocupa aproximadamente ${linhas} linhas — a folha oficial tem 30. O excedente não é corrigido.`);
    }
    if (linhas >= 8 && linhas < 20) {
      avisos.push(`Cerca de ${linhas} linhas. Redações nota 1000 costumam ocupar de 25 a 30 linhas.`);
    }

    if (anulada) {
      return {
        estatisticas,
        anulada,
        avisos,
        competencias: [1, 2, 3, 4, 5].map((numero) => ({
          numero,
          titulo: ['', 'Domínio da modalidade escrita formal', 'Compreensão da proposta e repertório',
            'Seleção e organização de argumentos', 'Mecanismos linguísticos de coesão', 'Proposta de intervenção'][numero],
          nota: 0,
          positivos: [],
          problemas: [{ tipo: 'Redação anulada', mensagem: anulada.motivo, trecho: '' }],
          marcacoes: []
        })),
        notaTotal: 0,
        marcacoes: []
      };
    }

    const competencias = [
      avaliarCompetencia1(limpo, ctx),
      avaliarCompetencia2(limpo, ctx, tema),
      avaliarCompetencia3(limpo, ctx, tema),
      avaliarCompetencia4(limpo, ctx),
      avaliarCompetencia5(limpo, ctx)
    ];

    // Fuga ao tema zera a redação inteira.
    if (competencias[1].nota === 0 && competencias[1].problemas.some((p) => p.tipo === 'Fuga ao tema')) {
      competencias.forEach((c) => { c.nota = 0; });
      avisos.push('Fuga ao tema detectada: no ENEM, isso zera a redação inteira.');
    }

    const notaTotal = competencias.reduce((s, c) => s + c.nota, 0);
    const marcacoes = competencias.flatMap((c) => c.marcacoes || []);

    return { estatisticas, anulada: null, avisos, competencias, notaTotal, marcacoes };
  }

  const API = { corrigir, normalizar, dividirParagrafos, contarPalavras, estimarLinhas, CONECTIVOS };

  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  global.CorretorENEM = API;
})(typeof window !== 'undefined' ? window : globalThis);
