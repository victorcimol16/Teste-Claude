# Corretor de Redação ENEM

Site para treino e diagnóstico de redações do ENEM. Avalia o texto pelas **5 competências** da matriz de referência do Inep, atribuindo de 0 a 200 pontos a cada uma (em níveis de 40 em 40) e uma nota final de 0 a 1000.

Cada nota vem acompanhada do **porquê**: o que já funciona no texto e o que precisa ser corrigido, com o trecho exato que originou cada apontamento.

## Como usar

O site é estático — basta abrir o arquivo:

```bash
open index.html          # macOS
xdg-open index.html      # Linux
```

Para uma versão de arquivo único, que abre offline com um duplo clique e não depende da pasta `assets/`:

```bash
npm run build            # gera dist/index.html
```

Ou servir localmente (habilita também a correção por IA):

```bash
npm install
npm start                # http://localhost:3000
```

## O que a ferramenta faz

**Proposta.** Banco com 12 temas de edições anteriores do ENEM (2013–2024) e 6 propostas de treino, com repertórios sugeridos para cada um. É possível sortear um tema ou escrever o seu próprio enunciado — nesse caso as palavras-chave são extraídas automaticamente.

**Escrita.** Editor com contagem ao vivo de palavras, parágrafos, períodos e **linhas estimadas na folha oficial** (30 linhas), com aviso quando o texto fica curto demais ou excede o espaço. O rascunho é salvo no navegador.

**Correção.** Análise das 5 competências:

| Competência | O que é verificado |
|---|---|
| **C1** — Modalidade escrita formal | Marcas de oralidade, concordância, crase, grafia, pontuação, uso de 1ª pessoa, períodos longos demais |
| **C2** — Proposta e repertório | Aderência ao tema (detecta fuga e tangenciamento), repertório sociocultural legitimado (leis, dados, autores, obras, instituições), presença de tese, tipo textual |
| **C3** — Organização de argumentos | Estrutura em parágrafos, comprovação de cada argumento, progressão temática, equilíbrio entre parágrafos |
| **C4** — Coesão | Quantidade e variedade de conectivos, articulação no início de cada parágrafo, repetição lexical, referenciação |
| **C5** — Proposta de intervenção | Os cinco elementos: agente, ação, meio/modo, efeito/finalidade e detalhamento |

Também aplica as regras que **anulam a redação**: texto de até 7 linhas, fuga ao tema, e proposta que fira os direitos humanos (esta zera apenas a C5).

**Resultado.** Nota final, cartão por competência com nível e apontamentos, texto com os desvios destacados (passe o cursor para ver o motivo), histórico local das correções e exportação para PDF via impressão.

## Correção por IA (opcional)

Além da análise local, o servidor pode enviar a redação para a API da Anthropic e devolver uma correção mais fina, feita por um modelo com instruções da matriz do ENEM.

```bash
npm install
export ANTHROPIC_API_KEY=sua-chave
npm start
```

Com a chave configurada, o botão **✨ Corrigir com IA** aparece na interface. A chave fica somente no servidor — nunca é enviada ao navegador. Sem chave, o site continua funcionando normalmente com a análise local.

O modelo padrão é `claude-opus-5`; pode ser trocado com a variável `ANTHROPIC_MODEL`. A resposta é validada contra um JSON Schema, então a nota de cada competência sempre cai em um dos níveis oficiais.

## Estrutura

```
index.html                 página principal
assets/css/style.css       estilos (tema claro e escuro)
assets/js/temas.js         banco de temas e repertórios
assets/js/corretor.js      motor de correção das 5 competências
assets/js/app.js           interface, histórico e chamadas à API
server/server.js           servidor estático + /api/corrigir
build-standalone.js        gera a versão de arquivo único em dist/
test/corretor.test.js      testes do motor
```

## Testes

```bash
npm test
```

Cobrem a calibragem das notas, as regras de anulação, a detecção dos elementos da proposta de intervenção e a validade das marcações no texto.

## Limitações

O motor local usa heurísticas linguísticas — expressões regulares, listas de conectivos e agentes, sobreposição de palavras-chave. Ele identifica bem desvios objetivos (oralidade, concordância, ausência de conectivo, elementos faltantes na proposta), mas **não interpreta o conteúdo dos argumentos**: não julga se um argumento é convincente, se um dado citado é verdadeiro ou se o repertório é realmente pertinente ao tema. A correção por IA cobre parte dessa lacuna.

Em ambos os casos, o resultado é um diagnóstico orientativo para estudo e não reproduz a avaliação oficial do Inep.

## Licença

MIT.
