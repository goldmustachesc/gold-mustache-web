# Gold Mustache - Barbearia Website MVP

Website profissional para a Barbearia Gold Mustache, localizada em Itapema, Santa Catarina.

## Tecnologias

- **Frontend**: Next.js 15, React 18, TypeScript
- **UI Components**: shadcn/ui + Tailwind CSS
- **Integração Social**: Instagram Basic Display API
- **Sistema de Agendamento**: Inbarber App (integração via redirect)

## Funcionalidades

- 🏪 Catálogo de serviços e preços
- 📸 Feed automático do Instagram (@goldmustachebarbearia)
- 🛍️ Vitrine de produtos (@_goldlab)
- 📅 Agendamento via Inbarber App
- 📱 Design responsivo
- ⚡ Performance otimizada
- 🎨 Sistema de design consistente

## Desenvolvimento

```bash
# Instalar dependências
pnpm install

# Configurar variáveis de ambiente
cp .env.example .env.local
# Preencha os valores em .env.local (veja comentários no arquivo)

# Executar em modo desenvolvimento
pnpm dev

# Build para produção
pnpm build
```

Acesse [http://localhost:3001](http://localhost:3001) para ver o resultado.

## Estrutura do Projeto

```
├── app/                 # App Router (Next.js 13+)
├── components/          # Componentes React
│   ├── ui/             # Componentes shadcn/ui
│   └── custom/         # Componentes específicos
├── lib/                # Utilitários e configurações
├── public/             # Assets estáticos
└── styles/             # Estilos globais
```

## Agendamento

O sistema de agendamento utiliza o **Inbarber App** já estabelecido:
- Link: https://chat.inbarberapp.com/?id=6c060e9d-672d-4f39-bbc4-fac594f4cc28
- Integração via redirect (preserva fluxo existente)
- Tracking de conversão implementado

## Administração (horários e ausências)

- **Horário global da barbearia** e **fechamentos por data** (ADMIN)
- **Ausências por barbeiro** (cada barbeiro)

Guia: veja [`docs/admin-horarios-e-ausencias.md`](./docs/admin-horarios-e-ausencias.md).

## Instagram Integration

- **@goldmustachebarbearia**: Trabalhos e ambiente da barbearia
- **@_goldlab**: Produtos para venda

### Sincronização Automática

O site sincroniza automaticamente os últimos 10 posts do Instagram 1x por dia (7h BRT) usando a Instagram Graph API.

**Configuração necessária:**

1. Criar app no Meta for Developers
2. Obter Access Token de longa duração (60 dias)
3. Configurar variáveis de ambiente na Vercel:
   - `INSTAGRAM_ACCESS_TOKEN`
   - `INSTAGRAM_USER_ID`
   - `CRON_SECRET`

**Guia completo:** Veja [INSTAGRAM_SETUP.md](./INSTAGRAM_SETUP.md) para instruções passo a passo.

**Funcionamento:**
- Vercel Cron Job sincroniza posts diariamente
- Cache local em `public/data/instagram-cache.json`
- Fallback automático para posts mockados se houver erro
- Zero custo (API gratuita + Vercel Cron free tier)
