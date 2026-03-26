# Design de Performance para Staging

## Contexto
O objetivo desta iniciativa e maximizar a performance do site em `staging`, com foco inicial na home publica e no inicio do fluxo de agendamento, sem degradar a percepcao premium da marca Gold Mustache.

O diagnostico inicial indica uma combinacao de gargalos:

- shell publico com custo global maior do que o necessario
- excesso de JavaScript e hidratacao na camada publica
- uso amplo de animacoes client-side, especialmente com `framer-motion`
- fetches publicos feitos no cliente que poderiam nascer resolvidos no servidor
- assets visuais pesados na home e em secoes secundarias

## Objetivos
- Melhorar velocidade percebida na home publica e no inicio do agendamento.
- Melhorar `LCP`, `INP`, `CLS` e `TTFB` em `staging`.
- Melhorar `Lighthouse mobile` como metrica de apoio, nao como unico criterio.
- Reduzir custo de bundle, hidratacao e trabalho de renderizacao no cliente.
- Reduzir custo de servidor e aumentar aproveitamento de cache nas rotas publicas.
- Preservar efeitos visuais que enriquecem a experiencia de forma positiva.

## Nao Objetivos
- Nao redesenhar a identidade visual da marca.
- Nao simplificar a home a ponto de empobrecer a experiencia premium.
- Nao tratar areas logadas como foco principal desta primeira iniciativa.
- Nao transformar este documento em plano de implementacao.

## Escopo Inicial
Este design cobre prioritariamente duas superficies publicas:

- `home publica`: dobra inicial, secoes abaixo da dobra, shell, hero, assets, embeds e blocos institucionais
- `inicio do agendamento`: entrada do fluxo, carregamento inicial, resolucao de dados publicos necessarios e primeira experiencia interativa do usuario

O fluxo de agendamento entra neste design apenas na sua camada inicial e publica. Etapas internas, regras operacionais e telas protegidas ficam fora deste primeiro recorte.

## Analise de Impacto em Regras e Principios
Esta direcao esta alinhada com as regras e principios do projeto:

- `KISS`: reduzir custo global e separar melhor a camada publica evita complexidade acidental.
- `YAGNI`: manter apenas interatividade e animacao onde ha retorno perceptivel.
- `SOLID`: separar shell publico, ilhas client e dados publicos melhora responsabilidades.
- `Clean Code`: o design favorece limites mais claros entre conteudo, infraestrutura e interacao.
- `Brand Book`: as mudancas visuais devem preservar a sensacao de tradicao, estilo e excelencia; o dourado continua como destaque pontual, nao como excesso visual.
- `TDD First`: qualquer implementacao derivada deste design devera entrar com testes antes das mudancas relevantes de comportamento.

Pontos de cautela:

- reduzir animacoes ou loader sem criterio pode enfraquecer a assinatura premium
- alterar cache e renderizacao sem criterio pode criar inconsistencias entre server render e client fetch
- otimizar apenas a home sem padrao reaproveitavel pode deixar o problema vivo em outras paginas publicas

## Direcao Escolhida
A direcao aprovada e hibrida:

- base estrutural para deixar a camada publica mais `server-first`
- ganhos rapidos e seguros na home, hero, assets, embeds e blocos abaixo da dobra
- manutencao apenas dos efeitos que realmente enriquecem a experiencia

## Arquitetura-Alvo
O site publico deve separar melhor experiencia premium de custo tecnico global.

Principios da arquitetura-alvo:

- conteudo publico e estavel tende a `server/static + cache`
- interacoes reais do usuario ficam em ilhas client pequenas e isoladas
- animacoes deixam de ser infraestrutura espalhada e passam a ser recurso pontual
- areas logadas continuam dinamicas, mas sem contaminar a home publica com o mesmo custo

Resultado esperado:

- melhor `LCP` na dobra inicial
- menor custo de hidratacao e melhor `INP`
- menor `TTFB` nas rotas publicas por reduzir dependencias dinamicas e aproveitar melhor cache
- maior estabilidade visual para proteger `CLS`
- melhor sustentabilidade de performance para novas secoes publicas

## Blocos de Mudanca
### 1. Shell publico leve
O shell da area publica deve carregar apenas o necessario para paginas publicas. A home nao deve pagar o custo inteiro do app por causa de providers, wrappers e componentes persistentes que sao mais relevantes em outras areas.

### 2. Home orientada a dobra
A home deve priorizar hero, navegacao e CTA principal. Secoes abaixo da dobra, como Instagram, mapa, video, galerias e blocos institucionais secundarios, devem ser tratadas como enriquecimento progressivo.

### 3. Dados publicos prontos no servidor
Servicos, conteudo institucional e blocos publicos previsiveis devem nascer resolvidos do servidor sempre que isso nao prejudicar frescor de dados de negocio.

No recorte do agendamento, isso significa que a entrada do fluxo deve receber o maximo possivel de contexto publico ja resolvido, reduzindo espera antes da primeira decisao do usuario.

### 4. Motion e midia como recurso premium
Animacoes, loader inicial, reveals repetidos e midia pesada devem ser mantidos apenas onde produzem ganho real de percepcao. O objetivo nao e remover movimento, e sim retirar o custo que nao retorna valor.

## Fluxo de Dados e Renderizacao
Modelo desejado:

- dados institucionais e estaveis chegam prontos do servidor com cache previsivel
- dados publicos mutaveis, mas nao criticos para a dobra, usam revalidacao e enriquecimento tardio
- interacoes do usuario permanecem client-side no menor perimetro possivel
- a entrada do agendamento usa a mesma logica: dados publicos essenciais resolvidos cedo, interatividade concentrada apenas nas escolhas do usuario

Consequencias esperadas:

- a home nasce visualmente pronta mais cedo
- blocos secundarios enriquecem a experiencia sem bloquear a thread principal
- loading states deixam de dominar a camada publica
- cache passa a fazer parte da experiencia, nao apenas da infraestrutura

Relacao entre metricas e alavancas:

- `LCP`: melhora com hero mais leve, menor custo inicial de JS e menor competicao entre dobra inicial e blocos secundarios
- `INP`: melhora com menos hidratacao global, menos motion repetido e menor trabalho na thread principal
- `CLS`: melhora com midia mais previsivel, reserva explicita de espaco, menos insercoes tardias e menos variacao estrutural apos a primeira pintura
- `TTFB`: melhora com menos dependencia dinamica no shell publico, menos leituras ou fetches desnecessarios na rota publica e melhor uso de cache/revalidacao

Risco principal desta camada:

- misturar `server render`, `client fetch` e revalidacao sem criterio pode gerar duplicidade de estados, instabilidade visual e dificuldade de depuracao

## Restricoes de Marca
Com base no `Brand_Book_Gold_Mustache.md`, este design deve preservar:

- linguagem premium, direta e profissional
- uso do dourado com parcimonia, como destaque e nao como excesso
- titulos marcantes com `Playfair Display`
- interface clara com `Geist Sans`
- sensacao de tradicao com conveniencia moderna

Aplicacao pratica desta restricao:

- manter efeitos de assinatura no hero e em poucos pontos de destaque
- simplificar ou remover efeitos repetidos de baixo retorno perceptivo
- priorizar estabilidade visual e clareza sobre exibicao excessiva de motion

## Riscos e Tratamento de Erros
### Falha graciosa
Instagram, mapa, video, analytics e blocos enriquecedores nao podem atrasar nem quebrar a entrega da pagina principal. Em caso de falha, a home deve continuar rapida, estavel e utilizavel.

### Terceiros e embeds
Blocos de terceiros nao devem ser tratados apenas como risco de falha, mas como parte do desenho de prioridade. Quando nao forem essenciais para a dobra, devem entrar de forma tardia, isolada e coerente com consentimento e prioridade visual.

### Protecao contra regressao sistemica
Os mesmos padroes de custo podem existir em outras paginas publicas. A solucao deve ser desenhada para virar padrao reutilizavel, e nao apenas ajuste localizado na landing page.

### Preservacao visual
Qualquer reducao de motion ou loader deve ser avaliada contra a percepcao premium, nao apenas contra score tecnico.

## Verificacao de Sucesso
Esta iniciativa so deve ser considerada bem-sucedida se houver evidencia em cinco frentes:

- melhora de velocidade percebida na home e no inicio do agendamento
- melhora de `Web Vitals` em `staging`
- melhora de `Lighthouse mobile` como evidencia complementar, nao como criterio isolado
- reducao de JavaScript, hidratacao e custo de renderizacao na camada publica
- ausencia de regressao funcional em navegacao, booking, auth, consentimento e conteudo institucional

Critério objetivo minimo:

- comparar sempre contra baseline capturado no proprio `staging` antes das mudancas
- exigir melhora mensuravel nas rotas priorizadas, e nao apenas impressao subjetiva
- esperar melhora material nas rotas priorizadas, nao apenas variacao marginal ou ruido de medicao
- tratar sucesso como combinacao de `velocidade percebida + Web Vitals`, com Lighthouse servindo de confirmacao laboratorial
- considerar a iniciativa incompleta se houver melhora na home, mas o inicio do agendamento continuar carregando com atrito perceptivel

## Principios de Medicao
Este design assume que a evidencia de performance deve combinar dois tipos de leitura:

- `lab`: medições repetiveis para comparar antes e depois nas mesmas condicoes
- `uso guiado`: verificacao da velocidade percebida em navegacao real nas rotas priorizadas

Para que a evidencia seja confiavel, a comparacao deve manter o mesmo contexto de teste, com mesmo ambiente, rota, condicao de rede e foco nas superficies priorizadas.

## Limites de Interpretacao de Staging
`Staging` deve ser tratado como ambiente de decisao relativa, nao como simulacao perfeita de producao.

Isso significa:

- usar `staging` para comparar antes e depois com coerencia
- evitar concluir que um numero isolado representa automaticamente o comportamento final em producao
- considerar diferencas de cache, volume de dados, configuracao e infraestrutura ao interpretar `TTFB` e resultados laboratoriais
- usar o comportamento de `staging` como sinal forte de tendencia, nao como verdade absoluta sem contexto

## Decisoes Fechadas neste Design
- E aceitavel alterar a experiencia visual desde que o resultado fique mais rapido e ainda mais positivo para o site.
- O foco deve ser amplo, mas com prioridade inicial em home publica e agendamento.
- O criterio mais importante e experiencia percebida combinada com `Web Vitals`.
- A direcao escolhida e uma abordagem hibrida: estrutural na base, conservadora no impacto visual.

## Proxima Etapa
Se este design permanecer aprovado, a proxima etapa sera escrever um plano de implementacao por frentes, com criterios de teste e validacao para cada grupo de mudancas.
