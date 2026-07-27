# Planka em `blanka.nyxaim.space`

Esta pasta contém o pacote prebuild fornecido pelo proprietário e a implantação
isolada usada na mesma EC2 do VoidScope.

## Arquitetura

- Caddy público: `blanka.nyxaim.space` → `127.0.0.1:3002`
- Planka: container sem porta pública
- PostgreSQL 16: rede interna do Compose, sem porta pública
- Dados persistentes: volumes Docker
- Segredos: `/var/lib/planka/secrets` no servidor, nunca no Git

## Variáveis configuradas

As variáveis não secretas ficam em `compose.yaml`:

- `BASE_URL=https://blanka.nyxaim.space`
- `DEFAULT_ADMIN_EMAIL=admin@nyxaim.space`
- `DEFAULT_ADMIN_NAME=Nyx`
- `DEFAULT_ADMIN_USERNAME=nyxai`
- `DEFAULT_LANGUAGE=pt-BR`
- `TRUST_PROXY=true`

Os valores de `DATABASE_PASSWORD`, `SECRET_KEY` e
`DEFAULT_ADMIN_PASSWORD` são gerados no primeiro deploy em
`/var/lib/planka/secrets`. Eles não são substituídos em deploys posteriores.

## Deploy no servidor

No checkout do VoidScope:

```sh
sudo bash deploy/planka/deploy-server.sh
```

O script instala Docker/Compose se necessário, gera os segredos, constrói o
pacote, sobe os serviços, valida a saúde local, valida o Caddy antes de
recarregá-lo e exibe a senha inicial.

## Operação

```sh
cd /home/ubuntu/voidscope-source/deploy/planka
sudo docker compose ps
sudo docker compose logs --tail=100 planka
sudo docker compose pull postgres
sudo docker compose up -d --build
```

Altere a senha inicial no próprio Planka após o primeiro acesso.
