# Deadlock widget

O card de rank do Deadlock abre um modal sob demanda na Home.

## Dados usados

- Histórico: `/v1/players/{accountId}/match-history`
- Heróis: `/v1/assets/heroes`
- Metadata: `/v1/matches/{matchId}/metadata`
- `hero_card_critical`: retrato encaixado dentro do badge médio da partida
- `hero_card_gloat`: render do herói mais jogado
- `average_badge_team0` / `average_badge_team1`: badge médio da equipe do jogador
- `net_worth`: almas finais
- `icon_souls.svg`: ícone oficial de almas

A busca por voicelines foi removida desta versão.
