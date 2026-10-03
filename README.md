# FVF Hórus , Painel (frontend)

Painel web da empresa, espelhando o que já existe no backend
(`../backend`). Cobre: login (JWT), listar/cadastrar motoristas,
vincular/revogar dispositivo, ver registros de jornada e verificar
integridade da cadeia, lançar tratamento de ponto.

Não inclui (fica para depois): cadastro de empresa/usuários pelo painel
(hoje só existe via `prisma db seed` no backend), paginação, filtros,
gráficos/relatórios , o objetivo aqui foi cobrir 1:1 o que o backend já
expõe, não mais que isso.

## Rodar localmente

```bash
npm install
cp .env.example .env   # ajuste VITE_API_URL se a API não estiver em localhost:3000
npm run dev
```

Abre em `http://localhost:5173`. Precisa do backend (`../backend`) rodando
e, no backend, ter rodado `npx prisma db seed` (cria o admin de teste).

## Estrutura

- `src/api/` , um arquivo por controller do backend (`auth`, `motoristas`,
  `dispositivos`, `registros`, `tratamentos`), tipos em `types.ts`,
  cliente axios com refresh automático de token em `client.ts`.
- `src/context/AuthContext.tsx` , estado de sessão (usuário logado,
  restaura sessão via refresh token ao abrir o app).
- `src/pages/` , `LoginPage`, `MotoristasListPage`, `MotoristaDetailPage`
  (dispositivo + integridade + registros + tratamentos, tudo numa tela).
