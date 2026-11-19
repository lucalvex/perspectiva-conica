import { rmSync } from 'node:fs';

// Apaga a pasta de saída para o build começar do zero
rmSync('dist', { recursive: true, force: true });