# Autolayout Frontend

Interface web em React para **usar** APIs a partir de uma especificação Swagger/OpenAPI — não é documentação.

## Funcionalidades

- Carrega `swagger.json` de qualquer URL (com proxy local opcional para CORS)
- Sidebar com endpoints agrupados por tag/controller (accordion)
- Formulários gerados a partir do schema (path, query, header, body)
- Try it out: envia requisições reais e exibe resposta
- Autenticação: Bearer, Basic, API Key (header ou query)

## Desenvolvimento

```bash
npm install
npm run dev
```

URL padrão da spec: `https://localhost:447/swagger/v1/swagger.json`

O proxy Vite (`/swagger-proxy`) encaminha para `https://localhost:447` quando a opção "Usar proxy local" está ativa.

## Estrutura

```
src/
  components/
    form/          # Formulários gerados do schema
    request/       # Setup da requisição e autenticação
    response/      # Painel de resposta
    sidebar/       # Accordion de tags e loader da spec
    layout/        # Shell da aplicação
  context/         # OpenAPI e Auth
  hooks/           # Estado do formulário por endpoint
  services/        # Carregar spec e executar requests
  utils/openapi/   # Parser, refs, URL builder
  types/           # Tipos TypeScript
  pages/           # Página principal
```

## Visual

Segue o padrão Safeguard/Gameout: tema escuro, violeta como cor de destaque, componentes `react-base-components`.
