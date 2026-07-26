# Git, CDN e deploy

## O que fica público

Somente código e arquivos de `public/` entram no repositório. `.env.local`,
credenciais administrativas e os arquivos JSON persistentes de `data/` são
ignorados. O servidor deve manter esses arquivos fora do ciclo de atualização.

## Configuração local

1. Crie um repositório público no GitHub.
2. Copie `deploy.config.example.json` para `deploy.config.local.json`.
3. Preencha o remote, usuário/repositório do GitHub, endereço SSH, diretório da
   aplicação no servidor e nome do serviço systemd.
4. Adicione o remote:

   `git remote add origin https://github.com/USUARIO/REPOSITORIO.git`

## CDN

Arquivos dentro de `public/` podem ser acessados pelo jsDelivr:

`https://cdn.jsdelivr.net/gh/USUARIO/REPOSITORIO@COMMIT/public/caminho/arquivo.png`

Use o hash do commit impresso pelo comando de deploy para ter URLs imutáveis e
evitar cache antigo.

## Preparação única do servidor

Clone o repositório no `appPath`, crie `.env.local`, restaure a pasta `data/`,
instale o Node.js e configure um serviço systemd com o nome informado em
`serviceName`. O usuário SSH precisa poder reiniciar somente esse serviço.

## Deploy diário

`npm run deploy -- "descrição da atualização"`

O comando executa o build local, cria o commit quando houver mudanças, envia ao
GitHub, conecta por SSH e faz atualização fast-forward, `npm ci`, novo build e
reinício do serviço.
