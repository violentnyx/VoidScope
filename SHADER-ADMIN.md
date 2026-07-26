# Shader Lab no Admin

Acesse `/admin` e abra **Aparência e Shader**.

O editor aceita:

```ts
const shaderConfig: ShaderLabConfig = {
  layers: [],
  timeline: { duration: 8, loop: true, tracks: [] },
};
```

Também aceita somente o objeto `{ layers: ..., timeline: ... }`.
O conteúdo é processado como JSON5 e nunca executado como JavaScript.
As configurações são persistidas em `data/theme-settings.json`.

O modo `auto` segue: ShaderLab/WebGPU -> vídeo -> CSS.
