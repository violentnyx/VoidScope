import type { SiteContent } from "./types";

/**
 * All editable site copy lives here, organized by page/section.
 *
 * This is the ONLY file that should need editing to change text before
 * the Admin panel exists. When the Admin panel ships, this object gets
 * replaced by a fetch inside `getContent()` (src/lib/get-content.ts) —
 * components never import this file directly, so nothing else changes.
 */
export const siteContent: SiteContent = {
  brand: {
    name: "Nyx_aim",
    logoAlt: "Logo Nyx_aim",
    logoSrc: null,
  },

  nav: [
    { label: "Home", href: "/" },
    { label: "Projects", href: "/projects" },
    { label: "Equipment", href: "/equipment" },
    { label: "Gallery", href: "/gallery" },
    { label: "Contact Me", href: "/contact-me" },
  ],

  home: {
    identity: {
      avatarSrc: null,
      avatarAlt: "Foto de perfil de Nyx_aim",
      name: "Nyx_aim",
      tag: "Filmmaker",
      bio: "Filmmaker. Links, redes e canais.",
    },

    twitchLive: {
      enabled: true,
      // Login da Twitch em minusculo (o mesmo que aparece na URL twitch.tv/<login>).
      channelLogin: "nyx_aim",
      displayName: "Nyx",
      ctaLabel: "Assistir na Twitch",
      url: "https://twitch.tv/Nyx_aim",
    },

    latestVideo: {
      enabled: true,
      // IDs de canal do YouTube (formato "UC..."), um por canal que faz upload.
      // Pega em qualquer video do canal -> Compartilhar -> Incorporar -> o ID
      // aparece na URL, ou em https://www.youtube.com/@handle -> "Sobre" -> copiar ID do canal.
      channelIds: [],
    },

    nowPlayingWidget: {
      enabled: true,
      eyebrow: "Ouvindo agora",
      // Usuario do Last.fm (o Last.fm precisa estar conectado ao Spotify/YT Music
      // com scrobbling ativado pra isso funcionar).
      lastfmUsername: "",
    },

    ranksWidget: {
      enabled: true,
      eyebrow: "Ranks",
      games: [
        {
          game: "Deadlock",
          source: "deadlock-api",
          // SteamID64 (o numero longo do seu perfil Steam) ou SteamID3/account_id.
          steamAccountId: "",
          manualFallback: { rankName: "—", rankImageSrc: null },
        },
        {
          game: "Overwatch",
          source: "overfast-api",
          // BattleTag exatamente como aparece no jogo, ex: "Nyx#1234".
          battleTag: "",
          // Qual role mostrar: "tank" | "damage" | "support".
          overwatchRole: "damage",
          manualFallback: { rankName: "—", rankImageSrc: null },
        },
      ],
    },

    // Desativado por enquanto (pouco conteudo ainda) — a estrutura fica
    // pronta pra reativar assim que fizer sentido, so trocar enabled.
    youtube: {
      enabled: false,
      heading: "YouTube",
      items: [
        { title: "Canal Principal", desc: "Videos longos e elaborados, em ingles", frequency: "mensal", href: "#" },
        { title: "Arquivo de VODs", desc: "Partidas competitivas gravadas", frequency: "frequente", href: "#" },
        { title: "Variedade", desc: "Conteudo solto, EN/PT", frequency: "semi-frequente", href: "#" },
      ],
    },

    tiktok: {
      enabled: false,
      heading: "TikTok",
      items: [
        { title: "Projetos Cinematograficos", desc: "Pratica de edicao, videomaking e trilha", frequency: "mensal", href: "#" },
        { title: "Clipes de Live", desc: "Melhores momentos", frequency: "frequente", href: "#" },
        { title: "Aleatorios", desc: "Sem tema fixo", frequency: "semi-frequente", href: "#" },
      ],
    },

    otherSocials: {
      enabled: true,
      heading: "Outras redes",
      items: [
        { title: "Twitter / X", href: "#" },
        { title: "Instagram", href: "#" },
      ],
    },
  },

  projects: {
    lead: "Trabalhos autorais e colaboracoes.",
    sections: [
      {
        items: [
          { title: "Nome do projeto", desc: "Curta · Direcao/Edicao", meta: "2025", href: "#" },
          { title: "Nome do projeto", desc: "Clipe musical · Edicao", meta: "2025", href: "#" },
          { title: "Nome do projeto", desc: "Documentario · Roteiro/Edicao", meta: "2024", href: "#" },
        ],
      },
    ],
  },

  equipment: {
    lead: "O que eu uso pra filmar, editar e transmitir.",
    sections: [
      {
        heading: "Camera",
        items: [
          { title: "Corpo da camera", meta: "modelo" },
          { title: "Lente principal", meta: "distancia focal / abertura" },
          { title: "Estabilizador", meta: "modelo" },
        ],
      },
      {
        heading: "PC",
        items: [
          { title: "Processador", meta: "modelo" },
          { title: "Placa de video", meta: "modelo" },
          { title: "Memoria", meta: "quantidade" },
          { title: "Monitor", meta: "modelo" },
        ],
      },
      {
        heading: "Perifericos",
        items: [
          { title: "Microfone", meta: "modelo" },
          { title: "Teclado", meta: "modelo" },
          { title: "Mouse", meta: "modelo" },
          { title: "Interface de audio", meta: "modelo" },
        ],
      },
    ],
  },

  contact: {
    lead: "Pra projetos autorais, freelas de edicao, colaboracoes e parcerias.",
    email: "seu-email@exemplo.com",
    emailCtaLabel: "Enviar e-mail",
    otherContacts: [
      { title: "LinkedIn", href: "#" },
      { title: "Portfolio completo", href: "#" },
    ],
  },
};
