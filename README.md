# FVF Hórus , Painel (frontend)

Painel web da empresa e do super admin (React + Vite + TypeScript), em cima da API do `../backend`.
Cobre: login com MFA, motoristas e ajudantes (dispositivo, integridade, registros, tratamentos, ajustes),
alertas de jornada, folgas e DSR, banco de horas (razão), indicadores e dashboard, regras sindicais,
feriados, empresas e usuários, fiscalização (AFD, AEJ, espelho REP-P, dossiê), documentos de carga,
privacidade (LGPD), retenção, auditoria e a área do super admin.

## Rodar localmente

```bash
npm install
cp .env.example .env   # ajuste VITE_API_URL se a API não estiver em localhost:3000
npm run dev
```

Abre em `http://localhost:5173`. Precisa do backend (`../backend`) rodando e com o seed aplicado.

## Verificar

```bash
npx tsc --noEmit   # tipos
npm run build      # build de produção (tsc -b + vite build)
```

Ainda não há testes automáticos do painel (pendência registrada na auditoria, N202).

## Estrutura

- `src/api/` , um arquivo por assunto do backend, tipos em `types.ts`, clientes axios com refresh de token
  (`client.ts` para o painel de grupo, `superAdminClient.ts` para o super admin).
- `src/context/` , sessão do usuário e do super admin.
- `src/pages/` , uma página por tela; `src/components/` , componentes compartilhados (diálogos, gates
  de política e CPF, tour guiado, tabelas e popups); `src/utils/` , máscaras, rótulos em português,
  exportação de planilha (`exportarPlanilhaXlsx`) e download de arquivo (`baixarArquivo`).

## Regras de tela

- Nada de `window.alert/confirm/prompt`: usar `useConfirm`, `usePrompt` e o toast.
- Enums do backend aparecem em português por `utils/rotulos`, nunca crus.
- Download de arquivo sempre por `utils/baixarArquivo`.
- Textos jurídicos fixos só com revisão do advogado.
