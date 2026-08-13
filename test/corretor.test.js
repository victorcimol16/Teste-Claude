/**
 * Testes do motor de correção. Execute com: npm test
 */

'use strict';

const assert = require('assert');
const { corrigir } = require('../assets/js/corretor.js');
const { TEMAS } = require('../assets/js/temas.js');

const temaEvasao = TEMAS.find((t) => /abandono escolar/i.test(t.titulo));
const temaViolencia = TEMAS.find((t) => /violência contra a mulher/i.test(t.titulo));

let passou = 0;
let falhou = 0;

function teste(nome, fn) {
  try {
    fn();
    passou++;
    console.log('  ✓ ' + nome);
  } catch (err) {
    falhou++;
    console.error('  ✗ ' + nome + '\n      ' + err.message);
  }
}

// ---------------------------------------------------------------------------

const REDACAO_BOA = `A Constituição Federal de 1988 estabelece a educação como um direito de todos e dever do Estado. No entanto, a evasão escolar no ensino médio brasileiro revela o distanciamento entre o texto legal e a realidade das salas de aula. Diante disso, é necessário compreender que a permanência do estudante depende tanto de condições materiais quanto do sentido que a escola assume em sua trajetória.

Em primeiro lugar, a necessidade de trabalhar precocemente afasta o jovem da sala de aula. De acordo com dados do IBGE, parcela expressiva dos adolescentes que abandonam os estudos o faz para complementar a renda familiar. Nesse sentido, a escola passa a competir com uma urgência econômica que ela não é capaz de resolver sozinha, o que torna a decisão de sair uma escolha imposta pela sobrevivência.

Ademais, o currículo distante da realidade juvenil aprofunda esse quadro. Segundo Paulo Freire, em "Pedagogia do Oprimido", a educação só liberta quando dialoga com o mundo do educando. Entretanto, quando o conteúdo escolar se apresenta como um conjunto de informações desconexas da vida do estudante, a permanência perde sentido. Tal cenário explica por que políticas de mera obrigatoriedade não bastam para reter o aluno.

Portanto, é imprescindível que o Ministério da Educação, em parceria com as secretarias estaduais, amplie os programas de bolsa-permanência, por meio da destinação de recursos do Fundo Nacional de Desenvolvimento da Educação, a fim de que o estudante de baixa renda possa permanecer na escola sem abrir mão do sustento familiar. Além disso, cabe às escolas reformular seus projetos pedagógicos com a participação dos próprios alunos, de modo que o currículo dialogue com seus contextos.`;

const REDACAO_INFORMAL = `A gente sabe que a evasão escolar é um problema muito sério pra sociedade. Eu acho que os alunos abandonam a escola porque não tem coisas legais lá.

Tipo assim, a galera prefere trabalhar do que estudar. Há muitos anos atrás isso já acontecia e ninguém fez nada. Houveram muitos casos de alunos que sairam da escola pra trabalhar.

Então na minha opinião o governo tem que fazer alguma coisa pra resolver isso ai.`;

const REDACAO_SEM_PROPOSTA = `A educação é um direito garantido pela Constituição Federal de 1988. Entretanto, o abandono escolar no ensino médio revela a distância entre a lei e a prática. É necessário analisar as causas desse fenômeno na sociedade brasileira.

Em primeiro lugar, a necessidade de trabalho precoce afeta o estudante. Segundo o IBGE, muitos adolescentes deixam a escola para ajudar no sustento da casa. Nesse sentido, o abandono escolar é fruto de uma urgência econômica que ultrapassa os muros da instituição de ensino.

Ademais, o currículo pouco atrativo agrava o quadro do abandono escolar. Conforme Paulo Freire, a educação precisa dialogar com a realidade do aluno. Todavia, isso raramente acontece nas escolas públicas brasileiras, o que reduz o sentido de permanecer estudando.

Portanto, o abandono escolar segue sendo um grande desafio para o país e merece atenção de toda a sociedade brasileira nos próximos anos.`;

// ---------------------------------------------------------------------------

console.log('\nMotor de correção ENEM\n');

teste('redação bem estruturada obtém nota alta', () => {
  const r = corrigir(REDACAO_BOA, temaEvasao);
  assert.ok(r.notaTotal >= 700, `esperado >= 700, obtido ${r.notaTotal}`);
  assert.strictEqual(r.competencias.length, 5);
});

teste('notas de competência são múltiplos de 40 entre 0 e 200', () => {
  const r = corrigir(REDACAO_BOA, temaEvasao);
  r.competencias.forEach((c) => {
    assert.ok(c.nota % 40 === 0, `C${c.numero} = ${c.nota} não é múltiplo de 40`);
    assert.ok(c.nota >= 0 && c.nota <= 200, `C${c.numero} fora do intervalo`);
  });
  assert.strictEqual(r.notaTotal, r.competencias.reduce((s, c) => s + c.nota, 0));
});

teste('proposta de intervenção completa pontua alto na C5', () => {
  const r = corrigir(REDACAO_BOA, temaEvasao);
  const c5 = r.competencias[4];
  assert.ok(c5.nota >= 160, `C5 esperada >= 160, obtida ${c5.nota}`);
});

teste('conclusão sem proposta derruba a C5', () => {
  const r = corrigir(REDACAO_SEM_PROPOSTA, temaEvasao);
  const c5 = r.competencias[4];
  assert.ok(c5.nota <= 80, `C5 esperada <= 80, obtida ${c5.nota}`);
});

teste('texto informal derruba a C1 e sinaliza os desvios', () => {
  const r = corrigir(REDACAO_INFORMAL, temaEvasao);
  const c1 = r.competencias[0];
  assert.ok(c1.nota <= 80, `C1 esperada <= 80, obtida ${c1.nota}`);
  assert.ok(c1.problemas.length >= 4, 'esperava vários desvios apontados');
  const tipos = c1.problemas.map((p) => p.tipo);
  assert.ok(tipos.includes('Marca de oralidade'), 'esperava detectar marca de oralidade');
});

teste('texto muito curto é anulado', () => {
  const r = corrigir('A educação é importante para todos.', temaEvasao);
  assert.ok(r.anulada, 'esperava anulação por texto insuficiente');
  assert.strictEqual(r.notaTotal, 0);
});

teste('texto vazio é anulado sem lançar exceção', () => {
  const r = corrigir('', temaEvasao);
  assert.ok(r.anulada);
  assert.strictEqual(r.notaTotal, 0);
});

teste('fuga ao tema zera a redação inteira', () => {
  // Redação boa, mas corrigida contra um tema completamente diferente.
  const r = corrigir(REDACAO_BOA, temaViolencia);
  assert.strictEqual(r.notaTotal, 0, `esperado 0 por fuga ao tema, obtido ${r.notaTotal}`);
  assert.ok(r.avisos.some((a) => /fuga ao tema/i.test(a)));
});

teste('estatísticas são coerentes com o texto', () => {
  const r = corrigir(REDACAO_BOA, temaEvasao);
  assert.strictEqual(r.estatisticas.paragrafos, 4);
  assert.ok(r.estatisticas.palavras > 200, 'contagem de palavras muito baixa');
  assert.ok(r.estatisticas.linhasEstimadas >= 20 && r.estatisticas.linhasEstimadas <= 32,
    `linhas estimadas fora do esperado: ${r.estatisticas.linhasEstimadas}`);
});

teste('marcações apontam para posições válidas do texto', () => {
  const r = corrigir(REDACAO_INFORMAL, temaEvasao);
  assert.ok(r.marcacoes.length > 0, 'esperava marcações no texto');
  r.marcacoes.forEach((m) => {
    assert.ok(m.inicio >= 0 && m.fim <= REDACAO_INFORMAL.length && m.inicio < m.fim,
      `marcação inválida: ${JSON.stringify(m)}`);
  });
});

teste('proposta que fere direitos humanos zera a C5', () => {
  const texto = REDACAO_BOA.replace(
    'Portanto, é imprescindível',
    'Portanto, defende-se a pena de morte para os responsáveis, e é imprescindível'
  );
  const r = corrigir(texto, temaEvasao);
  assert.strictEqual(r.competencias[4].nota, 0);
});

// ---------------------------------------------------------------------------

console.log(`\n${passou} passaram, ${falhou} falharam\n`);
process.exit(falhou > 0 ? 1 : 0);
