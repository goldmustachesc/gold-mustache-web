# Checklist de Monitoracao de Staging
## Quando usar

Use este checklist nas horas seguintes a mudancas relevantes em `staging`, especialmente apos:

- upgrade de dependencias ou framework
- ajustes de auth, RBAC ou booking
- mudancas de infra, CI ou seguranca

## Janela recomendada

- primeiras 4 a 8 horas apos o deploy em `staging`
- checagem a cada 30 a 60 minutos

## Probes rapidos

Verificar se a home continua respondendo:

```bash
curl -sS -o /dev/null -w 'home=%{http_code}\n' https://www.staging.goldmustachebarbearia.com.br/pt-BR
```

Verificar as APIs publicas mais sensiveis:

```bash
curl -sS -o /dev/null -w 'services=%{http_code}\n' https://www.staging.goldmustachebarbearia.com.br/api/services
curl -sS -o /dev/null -w 'barbers=%{http_code}\n' https://www.staging.goldmustachebarbearia.com.br/api/barbers
```

## Smoke curto no browser

Validar pelo menos uma vez durante a janela de observacao:

1. abrir a home e confirmar que carrega sem tela em branco
2. fazer login
3. abrir o dashboard
4. iniciar o fluxo de agendamento
5. abrir `admin/barbeiros`

## Gatilhos de alerta

Tratar como regressao real se ocorrer qualquer um destes:

- `5xx` na home ou nas APIs publicas
- loop de login ou logout quebrado
- lista de servicos vazia sem motivo esperado
- barbeiros nao carregam
- agendamento nao cria ou nao cancela
- painel `BARBER` ou `ADMIN` nao abre

## Acao recomendada

Se algum gatilho disparar:

1. congelar novas mudancas na branch `staging`
2. reproduzir o erro uma segunda vez para descartar flake
3. coletar logs do provider e respostas HTTP afetadas
4. corrigir antes de promover qualquer coisa para `main`

## Estado de referencia

Na rodada de 22 de abril de 2026, `staging` estava saudavel com:

- home `200`
- `/api/services` `200`
- `/api/barbers` `200`
- smoke autenticado validado em `CLIENT`, `BARBER` e `ADMIN`
- nenhum residuo de dados de smoke no banco
