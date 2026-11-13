# Odisseia Completo — configuração de produção

## Estado atual

`dist/index.html` é uma aplicação exclusivamente mobile. No primeiro acesso, ela solicita apenas nome e moto; essas duas informações são persistidas no navegador para que o painel seja reaberto sem login, e nenhum registro fictício é criado.

## Variáveis necessárias

```env
MAPS_PROVIDER=google|mapbox
MAPS_API_KEY=...
R2_ENDPOINT=...
R2_BUCKET=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
```

Segredos devem ficar somente no ambiente do servidor. Nunca devem ser embutidos no HTML ou enviados ao navegador.

## Evoluções futuras, fora do fluxo atual

- Perfil, motocicletas, abastecimentos, manutenções, lembretes, viagens, paradas, despesas, favoritos, diário e preferências vinculados ao `user_id`.
- Papel administrativo para criação e edição de eventos.
- Consulta do radar com filtros e coordenadas persistidas.
- Upload privado de fotos, com validação de tipo e tamanho.
- Geração de PDF/XLSX no servidor.
- Migrações versionadas, isolamento por usuário, logs e testes de autorização.

## Regras de segurança

Toda leitura e escrita privada deve derivar o usuário da sessão no servidor; nunca confiar em um `user_id` enviado pelo cliente. Webhooks, uploads, exportações e rotas administrativas devem validar autenticação, autorização e entrada antes de executar.
