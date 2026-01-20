# IDENTIDADE VISUAL v1.0 - GOLD MUSTACHE BARBEARIA

## GOLD MUSTACHE

**TRADIÇÃO E ESTILO MASCULINO. DESDE 2018.**

### ESTE DOCUMENTO É O GUIA DA NOSSA MARCA.

Aqui você encontrará a identidade visual da Gold Mustache traduzida em cor, tipografia e tom de voz. Uma barbearia tradicional que une a nostalgia do corte clássico com a modernidade do degradê. Este guia garante consistência entre todos os pontos de contato da marca.

---

## 01. O QUE É ISSO?

### PROPÓSITO & ESSÊNCIA

A Gold Mustache nasceu em 2018 com o propósito de resgatar a experiência autêntica da barbearia masculina. Mais do que um simples corte, oferecemos um momento de cuidado pessoal, onde tradição e estilo se encontram.

Em Itapema-SC, nos tornamos referência em cortes clássicos e modernos, barba completa e o icônico degradê navalhado. O bigode dourado não é apenas um símbolo — é a promessa de excelência.

### PILARES DA MARCA

- **TRADIÇÃO:** Respeito às raízes da barbearia clássica.
- **ESTILO:** Cortes que expressam personalidade e atitude.
- **EXCELÊNCIA:** Cada detalhe importa, do atendimento ao acabamento.

---

## 02. QUEM SOMOS?

### ARQUÉTIPOS DA MARCA

#### O BARBEIRO CLÁSSICO
Representa a tradição, o cuidado e a maestria do ofício. O Barbeiro Clássico carrega o conhecimento transmitido de geração em geração. Na Gold Mustache, ele se manifesta através do ambiente acolhedor, da atenção aos detalhes e do respeito ao tempo do cliente.

> "Um bom corte começa com uma boa conversa."

#### O CAVALHEIRO MODERNO
Representa o homem contemporâneo que valoriza autocuidado sem abrir mão da praticidade. Ele busca estilo, mas precisa de eficiência. O Cavalheiro Moderno traz a necessidade de agendamento online, atendimento ágil e comunicação direta.

> "Tradição com a conveniência que o dia a dia exige."

---

## 03. TIPOGRAFIA

### A VOZ VISUAL DA MARCA

A escolha tipográfica reflete a dualidade da Gold Mustache: elegância clássica e clareza moderna.

#### PLAYFAIR DISPLAY (Destaque)
- **Família:** Playfair Display
- **Uso:** Títulos principais, logo, elementos de destaque premium. Serifada, elegante, evoca tradição e sofisticação.
- **Pesos:**
  - **Bold (700):** Títulos hero e destaques principais.
  - **SemiBold (600):** Subtítulos de seção.

#### GEIST SANS (Interface)
- **Família:** Geist Sans / Inter
- **Uso:** Textos corridos, botões, navegação e interface do sistema. Limpa, legível e moderna.
- **Pesos:**
  - **Bold (700):** CTAs e botões.
  - **Medium (500):** Labels e navegação.
  - **Regular (400):** Corpo de texto.

#### GEIST MONO (Dados)
- **Família:** Geist Mono
- **Uso:** Horários, preços, códigos de agendamento e dados técnicos.

```
Agendamento: #GM-2024-0123
Horário: 14:30 | Duração: 45min
```

---

## 04. CORES

### SISTEMA DUAL: LIGHT & DARK

A Gold Mustache opera em dois modos. O Light Mode transmite a elegância clássica do ambiente físico. O Dark Mode traz sofisticação para a experiência digital noturna.

#### A. LIGHT MODE (Principal)

| Elemento | Cor | Código |
|----------|-----|--------|
| **Background** | Off-white quente | `oklch(0.98 0.01 85)` |
| **Foreground** | Marrom escuro rico | `oklch(0.15 0.02 85)` |
| **Card** | Branco suave | `oklch(0.99 0.005 85)` |
| **Border** | Bege sutil | `oklch(0.88 0.01 85)` |
| **Muted** | Cinza quente | `oklch(0.94 0.008 85)` |
| **Muted Text** | Cinza médio | `oklch(0.45 0.01 85)` |

#### B. DARK MODE (Secundário)

| Elemento | Cor | Código |
|----------|-----|--------|
| **Background** | Zinc 950 | `oklch(0.0857 0.0049 256.8)` |
| **Foreground** | Zinc 100 | `oklch(0.9235 0.0031 256.8)` |
| **Card** | Zinc 900 | `oklch(0.1335 0.0044 256.8)` |
| **Border** | Zinc 700 | `oklch(0.2525 0.0066 256.8)` |
| **Muted** | Zinc 800 | `oklch(0.1832 0.0045 256.8)` |
| **Muted Text** | Zinc 400 | `oklch(0.6226 0.0112 256.8)` |

#### C. COR PRIMÁRIA: OURO (Identidade)

| Variante | Uso | Código |
|----------|-----|--------|
| **Gold** | CTAs, destaques, ícones | `oklch(0.65 0.15 85)` |
| **Gold Bright** | Dark mode primary | `oklch(0.75 0.18 85)` |
| **Gold Light** | Hover, accents sutis | `oklch(0.75 0.12 85)` |
| **Gold Dark** | Texto sobre gold | `oklch(0.55 0.15 85)` |

> **Nota:** O dourado é usado com parcimônia. Ele destaca, não domina.

---

## 05. DESIGN TOKENS & SYSTEM

Especificações técnicas para garantir consistência visual em toda a plataforma.

### 5.1. PALETA SEMÂNTICA (STATUS)

| Status | Cor | Código | Uso |
|--------|-----|--------|-----|
| **Sucesso** | Verde | `#22C55E` | Agendamento confirmado, pagamento OK |
| **Erro** | Vermelho | `oklch(0.577 0.245 27.325)` | Falha, cancelamento, erro de validação |
| **Alerta** | Âmbar | `#EAB308` | Horário quase lotado, lembrete |
| **Info** | Azul | `#3B82F6` | Links, informações gerais |

### 5.2. GEOMETRIA & BORDERS

Visual premium e sofisticado. Cantos arredondados moderados para sensação acolhedora.

| Token | Valor | Uso |
|-------|-------|-----|
| **radius-sm** | `6px` | Inputs, badges |
| **radius-md** | `8px` | Botões, cards pequenos |
| **radius-lg** | `10px` | Cards principais |
| **radius-xl** | `14px` | Modais, dialogs |

- **Borders:** Espessura padrão `1px` sólida.
- **Estilo:** Preferir bordas a sombras para separação de conteúdo.

### 5.3. ESPAÇAMENTO (GRID 4px)

Ritmo visual consistente baseado em múltiplos de 4.

| Token | Valor | Uso |
|-------|-------|-----|
| **xs** | `4px` | Espaço interno mínimo |
| **sm** | `8px` | Entre elementos relacionados |
| **md** | `16px` | Padding de cards, gaps |
| **lg** | `24px` | Entre seções menores |
| **xl** | `32px` | Entre seções principais |
| **2xl** | `64px` | Hero sections, divisões maiores |

### 5.4. ICONOGRAFIA

| Aspecto | Especificação |
|---------|---------------|
| **Estilo** | Stroke (linha), 1.5px de espessura |
| **Biblioteca** | Lucide Icons |
| **Característica** | Geométricos, limpos, sem preenchimento |

### 5.5. SOMBRAS

| Token | Valor | Uso |
|-------|-------|-----|
| **sm** | `0 1px 2px rgba(0,0,0,0.05)` | Botões hover |
| **md** | `0 4px 6px rgba(0,0,0,0.1)` | Cards |
| **lg** | `0 10px 15px rgba(0,0,0,0.15)` | Modais, dropdowns |

---

## 06. TOM DE VOZ (UX WRITING)

A comunicação da Gold Mustache é direta, calorosa e profissional. Evite linguagem excessivamente formal ou gírias juvenis.

| Contexto | Evitar | Usar |
|----------|--------|------|
| **Confirmação** | "Oba! Seu agendamento foi feito!" | "Agendamento confirmado para 14:30." |
| **Erro** | "Oops! Algo deu errado :(" | "Não foi possível agendar. Tente outro horário." |
| **Lembrete** | "Ei! Não esqueça do seu corte!" | "Lembrete: seu horário é amanhã às 14:30." |
| **Vazio** | "Nada por aqui ainda..." | "Você ainda não tem agendamentos." |
| **CTA** | "Clique aqui para agendar" | "Agendar horário" |
| **Saudação** | "E aí, beleza?" | "Bem-vindo de volta, João." |

### Princípios de Escrita

1. **Seja direto:** Vá ao ponto sem rodeios.
2. **Seja humano:** Caloroso, mas profissional.
3. **Seja útil:** Toda mensagem deve ter propósito claro.
4. **Seja consistente:** Mesma voz em todos os canais.

---

## 07. SÍMBOLO & LOGO

### ELEMENTOS DO LOGO

#### O BIGODE DOURADO
O bigode é o símbolo central da marca. Representa tradição, masculinidade e o cuidado artesanal da barbearia clássica.

- **Cor:** Dourado (`oklch(0.65 0.15 85)`)
- **Uso:** Ícone standalone, favicon, avatar

#### TIPOGRAFIA DO LOGO
- **"Gold Mustache"** em Playfair Display Bold
- **"Barbearia"** em Geist Sans Medium (opcional, para versão completa)

### ÁREA DE PROTEÇÃO

Manter espaço mínimo equivalente à altura do "M" de Mustache ao redor do logo.

### VERSÕES

| Versão | Uso |
|--------|-----|
| **Completa** | Header, materiais institucionais |
| **Símbolo** | Favicon, avatares, ícone app |
| **Monocromática** | Fundos complexos, impressão P&B |

---

## 08. APLICAÇÕES

### UI EM CONTEXTO

#### Card de Serviço (Light Mode)

```
┌─────────────────────────────────────┐
│  ╭──────╮                           │
│  │ 💈   │  Corte + Barba           │
│  ╰──────╯                           │
│                                     │
│  O combo mais pedido da casa.       │
│  Corte degradê + barba completa     │
│  com navalha.                       │
│                                     │
│  ┌─────────┐  45min    R$ 100,00   │
│  │ Agendar │                        │
│  └─────────┘                        │
└─────────────────────────────────────┘
```

#### Confirmação de Agendamento

```
┌─────────────────────────────────────┐
│           ✓ Confirmado              │
│                                     │
│  Corte + Barba                      │
│  com Vitor                          │
│                                     │
│  📅  Terça, 23 de Janeiro           │
│  🕐  14:30 - 15:15                  │
│                                     │
│  Gold Mustache Barbearia            │
│  R. 115, 79 - Centro, Itapema       │
│                                     │
│  ┌───────────────────────────────┐  │
│  │   Adicionar ao Calendário     │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

#### Mensagem de Lembrete (WhatsApp)

```
Gold Mustache 🥇

Olá, João!

Lembrete do seu horário amanhã:
📍 Corte + Barba com Vitor
🕐 14:30

Endereço: R. 115, 79 - Centro, Itapema

Até lá! 💈
```

---

## 09. O QUE NÃO FAZER

### Cores

- ❌ Usar dourado em fundos extensos (cansa a vista)
- ❌ Combinar dourado com cores vibrantes (vermelho, verde limão)
- ❌ Usar gradientes no dourado (mantê-lo sólido)

### Tipografia

- ❌ Usar Playfair para textos longos (apenas títulos)
- ❌ Usar fontes decorativas ou script
- ❌ Texto em CAPS LOCK extenso

### Tom de Voz

- ❌ Usar emojis em excesso
- ❌ Linguagem muito informal ("e aí, mano")
- ❌ Linguagem excessivamente corporativa
- ❌ Mensagens genéricas sem contexto

### Logo

- ❌ Distorcer proporções
- ❌ Adicionar efeitos (sombra, brilho, 3D)
- ❌ Colocar sobre fundos que competem

---

## 10. REFERÊNCIAS TÉCNICAS

### Arquivos de Configuração

| Arquivo | Descrição |
|---------|-----------|
| `src/config/barbershop.ts` | Dados centralizados da barbearia |
| `src/app/globals.css` | Design tokens CSS (cores, radius) |
| `tailwind.config.ts` | Configuração Tailwind estendida |

### CSS Variables (Root)

```css
:root {
  --radius: 0.625rem;
  --primary: oklch(0.65 0.15 85);
  --primary-foreground: oklch(0.12 0.02 85);
  --background: oklch(0.98 0.01 85);
  --foreground: oklch(0.15 0.02 85);
}

.dark {
  --primary: oklch(0.75 0.18 85);
  --primary-foreground: oklch(0.0857 0.0049 256.8);
  --background: oklch(0.0857 0.0049 256.8);
  --foreground: oklch(0.9235 0.0031 256.8);
}
```

---

© 2018-2026 Gold Mustache Barbearia — Tradição e Estilo Masculino.

**Itapema, SC** | R. 115, 79 - Centro | @goldmustachebarbearia
