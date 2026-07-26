# Nyx_aim — site (redesign)

Next.js (App Router) + Tailwind v4 + shader de fundo via `@basementstudio/shader-lab`.

## Rodando localmente

```bash
npm install
npm run dev
```

Abre em http://localhost:3000

## Estrutura

```
src/
  app/
    layout.tsx        # fontes, shader de fundo, nav, footer
    page.tsx           # Home
    projects/page.tsx
    equipment/page.tsx
    contact-me/page.tsx
  components/          # um componente por bloco visual (hero, twitch card,
                        # widgets placeholder, nav, rows...)
  content/
    types.ts            # shape de todo o conteudo do site
    site-content.ts      # ⚠️ EDITE ESTE ARQUIVO pra trocar qualquer texto
  lib/
    get-content.ts       # unico ponto de leitura de conteudo — e onde o
                         # futuro painel Admin entra (troca a fonte dos
                         # dados sem mexer em nenhuma pagina/componente)
```

## Trocar textos

Todo texto editavel (nome, bio, titulos, labels de botao, itens de
Projects/Equipment/Contact, etc.) fica em `src/content/site-content.ts`.
Edita esse arquivo, roda `npm run dev` de novo (ou o build) e pronto —
nenhum componente precisa mudar.

## Widgets com dados reais

Todos os quatro widgets abaixo ja buscam dados de verdade (sem mock).
Cada um tem uma rota de API server-side em `src/app/api/**` que guarda as
chaves/segredos no servidor — o browser nunca ve essas chaves.

1. **Copie `.env.example` pra `.env.local`** e preenche as chaves (ver
   comentarios em cada variavel). `.env.local` ja esta no `.gitignore`.
2. **Preenche os identificadores publicos** direto no painel `/admin`
   (secao "Integrações"): login da Twitch, usuario do Last.fm,
   Steam Account ID (Deadlock) e BattleTag (Overwatch). Isso fica salvo
   em `data/content-overrides.json` e sobrescreve os valores padrao de
   `site-content.ts` — nao precisa editar codigo nem redeployar pra
   trocar esses valores. IDs de canal do YouTube ainda ficam so em
   `site-content.ts` (`latestVideo.channelIds`).

| Widget | Fonte de dados | Onde configurar |
| --- | --- | --- |
| Twitch ao vivo | Helix API (`streams`), token via client-credentials | `TWITCH_CLIENT_ID` / `TWITCH_CLIENT_SECRET` + `twitchLive.channelLogin` |
| Ultimo video | Feed RSS publico do YouTube (sem API key) | `latestVideo.channelIds` (IDs `UC...`, um por canal) |
| Ouvindo agora | Spotify Web API (progresso em tempo real) + Last.fm como fallback | `SPOTIFY_CLIENT_ID/SECRET/REFRESH_TOKEN` + `LASTFM_API_KEY` + `nowPlayingWidget.lastfmUsername` |
| Ranks | deadlock-api.com (Deadlock) + overfast-api.tekrop.fr (Overwatch), com fallback manual | `ranksWidget.games[].steamAccountId` (Deadlock) / `battleTag` (Overwatch) — sem chave de API |

### Detalhes por widget

- **Twitch**: `TwitchLiveCard` faz polling em `/api/twitch/status` a cada
  60s. Ao vivo → "{nome} está **Ao vivo**" (verde, com bolinha piscando)
  + `Titulo da stream // Jogo`, com o thumbnail ao vivo na caixa acima do
  nome. Offline → a caixa busca (uma vez, em `/api/twitch/vod`) o VOD mais
  recente do canal e mostra o player embutido da Twitch, comecando em um
  ponto aleatorio entre 20% e 60% da duracao do VOD. Sem VOD disponivel
  (ou se a chamada falhar), mostra so o texto de status ("Offline no
  momento").
- **Ultimo video**: busca o RSS de cada canal em `latestVideo.channelIds`,
  pega o video mais recente entre todos, e usa o **nome do canal que veio
  do proprio feed do YouTube** (`feed.author.name`) no eyebrow
  "Ultimo video // {canal}" — nao precisa cadastrar o nome do canal na mao.
- **Now Playing**: tenta a Spotify Web API primeiro (`/api/spotify/now-playing`,
  poll a cada 10s) — precisa de `SPOTIFY_CLIENT_ID/SECRET/REFRESH_TOKEN`
  no `.env.local` (o refresh token e gerado uma vez via Authorization
  Code Flow, com os scopes `user-read-currently-playing` +
  `user-read-playback-state`). Quando tem uma musica tocando, mostra
  capa, nome, artista e uma **barra de progresso em tempo real**
  (interpolada a cada segundo no cliente, resincronizada a cada poll).
  Se a Spotify nao tiver nada tocando (ou nao estiver configurada), cai
  pro fallback da Last.fm Scrobble API 2.0 (precisa de `LASTFM_API_KEY`
  + `nowPlayingWidget.lastfmUsername`, editavel no admin), mostrando
  "Tocando agora" ou "Ultima musica ouvida" — mas sem barra de progresso,
  ja que a Last.fm nao devolve mais esse dado.
- **Ranks**: cada jogo em `ranksWidget.games` tem um `source`:
  - `"deadlock-api"` busca em https://deadlock-api.com (endpoint
    `/v1/players/{account_id}/mmr-history`, sem chave). Preenche
    `steamAccountId` com o SteamID64 (numero longo do perfil Steam) ou o
    SteamID3/account_id.
  - `"overfast-api"` busca em https://overfast-api.tekrop.fr (endpoint
    `/players/{battletag}/summary`, sem chave). Preenche `battleTag`
    exatamente como aparece no jogo (ex: `"Nyx#1234"`) e opcionalmente
    `overwatchRole` (`"tank" | "damage" | "support"`, padrao `"damage"`).
  - `"manual"` nunca busca nada.

  Se a API escolhida nao responder (conta privada, API fora do ar, sem
  partidas o suficiente, etc.), cai automaticamente pro **fallback
  manual** (`manualFallback.rankName` / `rankImageSrc` em
  `site-content.ts`, editado a mao sempre que o rank mudar).

## Rotas antigas -> novas

O site antigo (Amplify, HTML puro) usava `/Home`, `/Projects`,
`/Equipment`, `/Contact-Me`. As rotas novas sao `/`, `/projects`,
`/equipment`, `/contact-me`. Se tiver links externos apontando pras
rotas antigas, adicionar redirects no `next.config.ts` antes de trocar
o dominio de producao.

## Admin (fora do escopo por enquanto)

`src/lib/get-content.ts` ja foi desenhado pra isso: hoje `getContent()`
retorna o objeto estatico de `site-content.ts`; quando o dashboard do
Admin existir, essa funcao passa a buscar de uma API/DB e todo o resto
do site continua igual.

## Edição inline de Equipamentos e Projetos

Quando uma sessão administrativa válida está ativa:

- `/equipment` exibe o botão **Editar equipamentos**, com criação e exclusão de categorias e itens.
- `/projects` permite criar, editar, excluir, publicar/privar e reordenar projetos.
- Cada projeto possui uma página própria em `/projects/[slug]` e conteúdo escrito em Markdown.
- Projetos privados retornam 404 para visitantes e continuam acessíveis ao administrador.

Os dados são persistidos em:

- `data/equipment.json`
- `data/projects.json`

Esses arquivos, assim como os demais dados administrativos, exigem disco persistente no ambiente de produção.

## Motor de tema e plano de fundo

O tema padrão está em `src/themes/nyx-base/` e é registrado em `src/themes/registry.ts`.
A configuração do fundo aceita `auto`, `shader`, `video` ou `css`.

No modo `auto`, a ordem é:

1. ShaderLab low-level via WebGPU;
2. vídeo em `public/video/shader-background-fallback.mp4`;
3. gradiente CSS estático.

O shader é desativado automaticamente quando `prefers-reduced-motion` ou economia de dados estiverem ativos, conforme as opções do tema.
