import { cpSync, mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

/** Copia os arquivos estáticos (HTML, imagens) de public/ para dist/. */
export function copyPublic() {
  mkdirSync('dist', { recursive: true });
  cpSync('public', 'dist', { recursive: true });
}

// Executa só quando chamado direto pelo terminal, não quando importado
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  copyPublic();
}