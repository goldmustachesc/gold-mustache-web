# IDENTIDADE VISUAL v1.2 - DESIGN SYSTEM SPEC

## BRIZOLLA STUDIO

**ENGENHARIA ELEGANTE. SISTEMAS ROBUSTOS. PRAGMATISMO DIGITAL.**

### ESTE DOCUMENTO É O KERNEL DA NOSSA MARCA.

Aqui você encontrará a sintaxe visual da Brizolla Studio traduzida em código, cor e tipografia. Diferente de agências tradicionais, nós não apenas "desenhamos"; nós construímos. Este guia serve como a documentação base para garantir consistência entre o modo Dark (Engenharia) e Light (Produto).

---

## 01. O QUE É ISSO?

### DEBRIEFING & PROPÓSITO

A Brizolla Studio nasce com o propósito de elevar a engenharia de software ao status de arte funcional. O nome carrega a força da execução técnica aliada à sofisticação visual. Não somos apenas um SaaS; somos os criadores de SaaS.

Enquanto o mercado foca em "dashboards bonitos", nós focamos na Engenharia Robusta. A Brizolla é o ponto de encontro entre a solidez de um backend bem arquitetado e a eficiência de um frontend responsivo.

### PILARES DA MARCA

- **EXCELÊNCIA TÉCNICA:** Código limpo não é diferencial, é obrigação.
- **PRAGMATISMO:** "Sem dor de cabeça". Soluções que funcionam e escalam.
- **SOFISTICAÇÃO INDUSTRIAL:** Uma estética que inspira confiança e potência.

---

## 02. QUEM SOMOS?

### ARQUÉTIPOS DA MARCA

#### O ARQUITETO
Representa a estrutura, a lógica e a segurança. O Arquiteto planeja sistemas que não caem. Na Brizolla, ele se manifesta através de grids precisos, tipografia técnica e layouts organizados.

> "A beleza nasce da ordem e da funcionalidade."

#### O CONSTRUTOR
Representa a execução e a energia bruta da criação. O Construtor tira o projeto do papel e o torna realidade física/digital. Ele traz o pragmatismo e a força (o acento Laranja Industrial).

> "Ideias são baratas. A execução vale milhões."

---

## 03. TIPOGRAFIA

### A VOZ DO SISTEMA
A escolha tipográfica reflete a dualidade da Brizolla: legibilidade humana e precisão de máquina.

#### SANS SERIF (Principal)
- **Família:** Geist Sans / Noto Sans / Inter
- **Uso:** Títulos, textos corridos e UI. Geométrica, moderna e altamente legível.
- **Pesos:**
  - **Bold (700):** Títulos e CTAs.
  - **Medium (500):** Subtítulos e ênfases.
  - **Regular (400):** Corpo de texto.

#### MONOSPACED (Técnica)
- **Família:** Geist Mono / JetBrains Mono / Fira Code
- **Uso:** Destacar dados técnicos, datas, números de versão, IDs e snippets de código. Reforça a identidade "Developer First".

```javascript
function buildFuture() { return true; }
```

---

## 04. CORES

### SISTEMA DUAL: DAY & NIGHT
A Brizolla Studio opera em dois modos. O Dark Mode é nosso habitat natural (foco, codificação, imersão). O Light Mode é nossa interface com o mundo corporativo (documentação, clareza).

#### A. DARK MODE (Principal)
- **Background:** `Deep Navy #0F1219` (Base absoluta)
- **Surface:** `Slate Dark #1A1E29` (Painéis, cards)
- **Border:** `Slate Grey #2D3748` (Divisores sutis)
- **Text Primary:** `#F8FAFC`
- **Text Secondary:** `#94A3B8`

#### B. LIGHT MODE (Secundário)
- **Background:** `Pure White #FFFFFF`
- **Surface:** `Slate 50 #F8FAFC`
- **Border:** `Slate 200 #E2E8F0`
- **Text Primary:** `#0F172A`
- **Text Secondary:** `#64748B`

#### C. ACCENT (Identidade)
- **Industrial Orange:** `#F97316` (Primary Action, Brand)
- **Orange Dimmed:** `#EA580C` (Hover, Active)

---

## 05. DESIGN TOKENS & SYSTEM (NOVO)

Especificações técnicas para garantir a consistência da engenharia visual.

### 5.1. PALETA SEMÂNTICA (STATUS)
Cores funcionais devem ser claras, acessíveis e seguir o padrão de terminais/logs.

- **SUCCESS (Verde Terminal):** `#22C55E`
  - *Uso:* Builds aprovados, testes 100%, status online, criação bem-sucedida.
- **ERROR (Vermelho Crítico):** `#EF4444`
  - *Uso:* Falhas de build, exceções fatais, destruição de recursos, alertas de downtime.
- **WARNING (Amarelo Alerta):** `#EAB308`
  - *Uso:* Depreciação, alta latência, ações irreversíveis (confirmação).
- **INFO (Azul Sistema):** `#3B82F6`
  - *Uso:* Links, estados de carregamento, notas informativas.

### 5.2. GEOMETRIA & BORDERS
Visual industrial, preciso e "afiado". Evitamos o visual "gummy" ou infantil.

- **Border Radius:**
  - `sm: 2px` (Tags, inputs pequenos, botões compactos)
  - `md: 4px` (Botões padrão, cards, inputs)
  - `none: 0px` (Paineis laterais, barras de ferramentas - visual "docked")
  - *Nota:* Evitar radius > 6px, exceto em modais muito grandes ou avatares (full rounded).

- **Borders:**
  - Espessura padrão: `1px` sólida.
  - Usamos bordas para separar conteúdo, preferencialmente a sombras (estilo Flat/Technical).

### 5.3. ESPAÇAMENTO (GRID 4px)
Ritmo vertical e horizontal baseado em múltiplos de 4.

- `xs: 4px`
- `sm: 8px`
- `md: 16px`
- `lg: 24px`
- `xl: 32px`
- `xxl: 64px` (Seções principais)

### 5.4. ICONOGRAFIA
- **Estilo:** Stroke (Linha), 1.5px ou 2px de espessura.
- **Bibliotecas sugeridas:** Lucide Icons, Phosphor Icons.
- **Característica:** Geométricos, sóbrios, sem preenchimento (exceto estados ativos específicos).

### 5.5. UX WRITING (TOM DE VOZ)
Fale como o sistema fala com o engenheiro. Direto, sem rodeios.

| Contexto | **Evitar (Genérico/Infantil)** | **Usar (Brizolla Studio)** |
| :--- | :--- | :--- |
| **Erro** | "Oops! Algo deu errado :(" | "Erro 502: Falha no Gateway." |
| **Sucesso** | "Oba! Tudo pronto!" | "Deploy concluído com sucesso. (230ms)" |
| **Botão** | "Clique aqui para salvar" | "Salvar Alterações" ou "Commit" |
| **Vazio** | "Nada por aqui ainda..." | "Nenhum projeto encontrado. Inicialize um novo repositório." |

---

## 06. SÍMBOLO

### LÓGICA DE CONSTRUÇÃO
O logotipo da Brizolla Studio deve evocar a ideia de código e estrutura. Sugerimos o uso de caracteres de sintaxe de programação com a energia do acento laranja.

#### `{ B }` - O BLOCO DE CÓDIGO
As chaves representam escopo, proteção e a estrutura de um sistema bem feito.

#### `>_` - O TERMINAL
Representa a execução direta. Onde o trabalho real acontece, sem distrações.

---

## 07. APLICAÇÕES

### UI EM CONTEXTO

#### 1. IDE / Dashboard (Dark Mode)

```bash
~/projects/brizolla-core

[SUCCESS] Build finished in 1.2s
[WARN]    Deprecation warning: utils.ts line 45
[ERROR]   0 errors found.

> Ready to deploy.
```

#### 2. Relatório Executivo (Light Mode)

**Visão Geral da Infraestrutura**

A nova arquitetura aumentou a resiliência do sistema. O uso de padrões industriais garante estabilidade mesmo sob alta carga.

> **Reliability:** 99.99%

---

© 2024 Brizolla Studio -- Engineered for Performance.
