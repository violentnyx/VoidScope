import { MaintenanceShaderBackground } from "@/components/maintenance-shader";

/**
 * Mostrada no lugar do conteúdo normal de uma página quando ela está
 * marcada como "Staging" no painel Admin. Usa um shader dedicado (com
 * o texto "EM CONSTRUÇÃO :(" já embutido nele) em vez do
 * <ShaderBackground /> normal — assim fica visualmente óbvio que a
 * página está fora do ar, não só um texto discreto por cima do mesmo
 * fundo de sempre.
 */
export function MaintenanceScreen() {
  return (
    <>
      <MaintenanceShaderBackground />
      {/* Só pra leitor de tela — o "EM CONSTRUÇÃO :(" visual já está no shader. */}
      <p className="sr-only">Esta página está em manutenção no momento.</p>
    </>
  );
}
