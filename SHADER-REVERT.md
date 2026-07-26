# Estado do Shader

O sistema visual ativo voltou a usar diretamente `src/components/shader-background.tsx`, com a composição hard-coded e o renderer low-level original.

A estrutura experimental de temas e a seção de administração foram mantidas no projeto, mas não participam da renderização ativa. Isso evita que configurações persistidas substituam ou ignorem o shader atual.
