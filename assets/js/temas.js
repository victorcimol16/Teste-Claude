/**
 * Banco de temas de redação do ENEM (edições anteriores) e propostas extras.
 * Cada tema traz palavras-chave usadas pelo motor de correção para avaliar
 * a Competência 2 (aderência ao tema) e repertórios sugeridos.
 */

const TEMAS = [
  {
    ano: 2024,
    titulo: 'Desafios para a valorização da herança africana no Brasil',
    palavrasChave: ['herança', 'africana', 'áfrica', 'afro', 'negro', 'negra', 'cultura', 'ancestralidade', 'racismo', 'valorização', 'identidade', 'escravidão'],
    repertorios: [
      'Lei 10.639/2003 — obrigatoriedade do ensino de história e cultura afro-brasileira',
      'Abdias do Nascimento e o conceito de "genocídio do negro brasileiro"',
      'Art. 215 da Constituição Federal — proteção às manifestações culturais afro-brasileiras'
    ]
  },
  {
    ano: 2023,
    titulo: 'Desafios para o enfrentamento da invisibilidade do trabalho de cuidado realizado pela mulher no Brasil',
    palavrasChave: ['cuidado', 'mulher', 'mulheres', 'invisibilidade', 'trabalho', 'doméstico', 'gênero', 'feminino', 'desigualdade', 'jornada', 'maternidade'],
    repertorios: [
      'Simone de Beauvoir, "O Segundo Sexo" — a mulher como o "outro"',
      'IBGE: mulheres dedicam quase o dobro de horas ao trabalho doméstico',
      'Convenção 156 da OIT — trabalhadores com responsabilidades familiares'
    ]
  },
  {
    ano: 2022,
    titulo: 'Desafios para a valorização de comunidades e povos tradicionais no Brasil',
    palavrasChave: ['comunidades', 'povos', 'tradicionais', 'indígena', 'indígenas', 'quilombola', 'ribeirinho', 'território', 'cultura', 'valorização', 'ancestral'],
    repertorios: [
      'Convenção 169 da OIT sobre povos indígenas e tribais',
      'Ailton Krenak, "Ideias para adiar o fim do mundo"',
      'Art. 231 da Constituição — direitos originários sobre as terras que ocupam'
    ]
  },
  {
    ano: 2021,
    titulo: 'Invisibilidade e registro civil: garantia de acesso à cidadania no Brasil',
    palavrasChave: ['registro', 'civil', 'invisibilidade', 'cidadania', 'documento', 'certidão', 'nascimento', 'direitos', 'identidade', 'estado'],
    repertorios: [
      'Hannah Arendt — "o direito a ter direitos"',
      'Declaração Universal dos Direitos Humanos, Art. 6º',
      'IBGE: sub-registro civil de nascimento no Brasil'
    ]
  },
  {
    ano: 2020,
    titulo: 'O estigma associado às doenças mentais na sociedade brasileira',
    palavrasChave: ['estigma', 'doenças', 'mentais', 'saúde', 'mental', 'preconceito', 'psiquiátrico', 'depressão', 'tratamento', 'sociedade', 'transtorno'],
    repertorios: [
      'Michel Foucault, "História da Loucura"',
      'Lei 10.216/2001 — Reforma Psiquiátrica brasileira',
      'OMS: depressão como principal causa de incapacidade no mundo'
    ]
  },
  {
    ano: 2019,
    titulo: 'Democratização do acesso ao cinema no Brasil',
    palavrasChave: ['cinema', 'democratização', 'acesso', 'cultura', 'filme', 'sala', 'audiovisual', 'lazer', 'entretenimento', 'ingresso'],
    repertorios: [
      'Art. 215 da Constituição — acesso às fontes da cultura nacional',
      'Ancine: concentração de salas de cinema em capitais',
      'Pierre Bourdieu e o conceito de capital cultural'
    ]
  },
  {
    ano: 2018,
    titulo: 'Manipulação do comportamento do usuário pelo controle de dados na internet',
    palavrasChave: ['dados', 'internet', 'manipulação', 'comportamento', 'usuário', 'privacidade', 'algoritmo', 'rede', 'digital', 'informação', 'tecnologia'],
    repertorios: [
      'Zygmunt Bauman e a "modernidade líquida"',
      'Caso Cambridge Analytica (2018)',
      'LGPD — Lei Geral de Proteção de Dados (Lei 13.709/2018)'
    ]
  },
  {
    ano: 2017,
    titulo: 'Desafios para a formação educacional de surdos no Brasil',
    palavrasChave: ['surdos', 'surdo', 'libras', 'educação', 'inclusão', 'formação', 'escola', 'acessibilidade', 'deficiência', 'ensino', 'intérprete'],
    repertorios: [
      'Lei 10.436/2002 — reconhecimento da Libras como meio legal de comunicação',
      'Lei Brasileira de Inclusão (Lei 13.146/2015)',
      'Declaração de Salamanca (1994)'
    ]
  },
  {
    ano: 2016,
    titulo: 'Caminhos para combater a intolerância religiosa no Brasil',
    palavrasChave: ['intolerância', 'religiosa', 'religião', 'fé', 'crença', 'laico', 'liberdade', 'preconceito', 'culto', 'diversidade'],
    repertorios: [
      'Art. 5º, VI da Constituição — inviolabilidade da liberdade de consciência e crença',
      'Lei 7.716/1989 — crimes de preconceito de religião',
      'Voltaire e o "Tratado sobre a Tolerância"'
    ]
  },
  {
    ano: 2015,
    titulo: 'A persistência da violência contra a mulher na sociedade brasileira',
    palavrasChave: ['violência', 'mulher', 'mulheres', 'feminicídio', 'agressão', 'gênero', 'machismo', 'doméstica', 'denúncia', 'patriarcado'],
    repertorios: [
      'Lei Maria da Penha (Lei 11.340/2006)',
      'Lei do Feminicídio (Lei 13.104/2015)',
      'Atlas da Violência (Ipea) — taxas de homicídio de mulheres'
    ]
  },
  {
    ano: 2014,
    titulo: 'Publicidade infantil em questão no Brasil',
    palavrasChave: ['publicidade', 'infantil', 'criança', 'crianças', 'consumo', 'propaganda', 'consumismo', 'anúncio', 'mercado', 'infância'],
    repertorios: [
      'Resolução 163/2014 do Conanda — abusividade da publicidade infantil',
      'Estatuto da Criança e do Adolescente (Lei 8.069/1990)',
      'Documentário "Criança, a alma do negócio"'
    ]
  },
  {
    ano: 2013,
    titulo: 'Efeitos da implantação da Lei Seca no Brasil',
    palavrasChave: ['lei', 'seca', 'álcool', 'trânsito', 'direção', 'acidente', 'motorista', 'bebida', 'fiscalização', 'volante'],
    repertorios: [
      'Lei 11.705/2008 — Lei Seca',
      'Dados do DPVAT sobre redução de acidentes',
      'OMS: álcool como fator de risco em mortes no trânsito'
    ]
  },
  {
    ano: null,
    titulo: 'Os impactos da inteligência artificial no mercado de trabalho brasileiro',
    palavrasChave: ['inteligência', 'artificial', 'tecnologia', 'trabalho', 'emprego', 'automação', 'algoritmo', 'qualificação', 'máquina', 'profissional', 'digital'],
    repertorios: [
      'Klaus Schwab e a "Quarta Revolução Industrial"',
      'Relatório "Future of Jobs" do Fórum Econômico Mundial',
      'Art. 6º da Constituição — o trabalho como direito social'
    ]
  },
  {
    ano: null,
    titulo: 'Desafios para o combate à desinformação no ambiente digital brasileiro',
    palavrasChave: ['desinformação', 'fake', 'news', 'notícia', 'digital', 'internet', 'informação', 'checagem', 'rede', 'verdade', 'mídia'],
    repertorios: [
      'Hannah Arendt sobre a mentira na política',
      'Marco Civil da Internet (Lei 12.965/2014)',
      'Agências de checagem: Lupa, Aos Fatos, Comprova'
    ]
  },
  {
    ano: null,
    titulo: 'Caminhos para enfrentar a crise hídrica nas grandes cidades brasileiras',
    palavrasChave: ['água', 'hídrica', 'crise', 'recurso', 'saneamento', 'escassez', 'abastecimento', 'consumo', 'ambiental', 'cidade', 'desperdício'],
    repertorios: [
      'Lei 9.433/1997 — Política Nacional de Recursos Hídricos',
      'ODS 6 da ONU — água potável e saneamento',
      'Crise hídrica de 2014-2015 no Sistema Cantareira'
    ]
  },
  {
    ano: null,
    titulo: 'O desafio da mobilidade urbana sustentável no Brasil',
    palavrasChave: ['mobilidade', 'urbana', 'transporte', 'trânsito', 'público', 'cidade', 'ônibus', 'bicicleta', 'deslocamento', 'sustentável', 'engarrafamento'],
    repertorios: [
      'Lei 12.587/2012 — Política Nacional de Mobilidade Urbana',
      'Jaime Lerner e o urbanismo de Curitiba',
      'Estatuto da Cidade (Lei 10.257/2001)'
    ]
  },
  {
    ano: null,
    titulo: 'Caminhos para reduzir o abandono escolar no ensino médio brasileiro',
    palavrasChave: ['abandono', 'evasão', 'escolar', 'escola', 'ensino', 'médio', 'aluno', 'estudante', 'educação', 'permanência', 'jovem'],
    repertorios: [
      'Paulo Freire, "Pedagogia do Oprimido"',
      'Art. 205 da Constituição — a educação como direito de todos',
      'Plano Nacional de Educação (Lei 13.005/2014)'
    ]
  },
  {
    ano: null,
    titulo: 'O envelhecimento populacional e os desafios do cuidado ao idoso no Brasil',
    palavrasChave: ['idoso', 'idosos', 'envelhecimento', 'velhice', 'população', 'cuidado', 'saúde', 'previdência', 'longevidade', 'família'],
    repertorios: [
      'Estatuto do Idoso (Lei 10.741/2003)',
      'Projeções do IBGE sobre a pirâmide etária brasileira',
      'Norberto Bobbio, "O Tempo da Memória"'
    ]
  }
];

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TEMAS };
}
