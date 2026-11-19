import * as esbuild from 'esbuild';
import { spawn } from 'node:child_process';
import { createReadStream, existsSync, readFileSync, statSync, watch } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { dirname, extname, join, normalize, resolve, sep } from 'node:path';
import { copyPublic } from './copy-public.mjs';

const PORT = 8000;
const ROOT = resolve('dist');
const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

/** Executa fn só depois que as chamadas param por ms milissegundos. */
function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

// ---------------------------------------------------------------------------
// Avisos para o navegador (Server-Sent Events): cada página aberta mantém uma
// conexão com /__dev e recebe "reload", "css" ou "build-error".
// ---------------------------------------------------------------------------
const clients = new Set();
let lastBuildError = null;

function sendEvent(response, event, data = '') {
  response.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

function broadcast(event, data = '') {
  for (const response of clients) sendEvent(response, event, data);
}

/**
 * Script injetado no app.js somente no modo dev: recarrega a página a cada
 * compilação, troca o CSS sem recarregar e mostra erros de compilação na tela.
 */
const DEV_CLIENT = `(() => {
  const source = new EventSource('/__dev');
  source.addEventListener('reload', () => location.reload());
  source.addEventListener('css', () => {
    const link = document.querySelector('link[rel="stylesheet"]');
    if (link) link.href = 'styles.css?t=' + Date.now();
  });
  source.addEventListener('build-error', (event) => {
    const message = JSON.parse(event.data);
    console.error(message);
    let box = document.getElementById('dev-build-error');
    if (!box) {
      box = document.createElement('pre');
      box.id = 'dev-build-error';
      box.style.cssText = 'position:fixed;left:1rem;right:1rem;bottom:1rem;z-index:9999;max-height:50vh;overflow:auto;margin:0;padding:1rem;background:#2b1513;color:#ffd7d2;font:13px/1.5 monospace;white-space:pre-wrap;border-left:4px solid #f08b82';
      document.body.append(box);
    }
    box.textContent = 'Erro de compilação. A página continua com a última versão que compilou.\\n\\n' + message;
  });
})();`;

// ---------------------------------------------------------------------------
// 1. Servidor HTTP da pasta dist/. Abre a porta antes de tudo: se ela estiver
//    ocupada, nada mais é iniciado. O cabeçalho Cache-Control: no-store proíbe
//    o navegador de guardar arquivos, então cada recarga busca a versão nova.
// ---------------------------------------------------------------------------
const server = createServer((request, response) => {
  const url = new URL(request.url ?? '/', 'http://localhost');

  if (url.pathname === '/__dev') {
    response.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-store',
      Connection: 'keep-alive',
    });
    response.write('\n');
    clients.add(response);
    // Uma página aberta enquanto a compilação está quebrada vê o erro na hora
    if (lastBuildError) sendEvent(response, 'build-error', lastBuildError);
    request.on('close', () => clients.delete(response));
    return;
  }

  let path = decodeURIComponent(url.pathname);
  if (path.endsWith('/')) path += 'index.html';
  const file = normalize(join(ROOT, path));

  // Impede pedidos como /../package.json de sair da pasta dist/
  const insideRoot = file === ROOT || file.startsWith(ROOT + sep);
  if (!insideRoot || !existsSync(file) || !statSync(file).isFile()) {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Arquivo não encontrado');
    return;
  }

  response.writeHead(200, {
    'Content-Type': CONTENT_TYPES[extname(file)] ?? 'application/octet-stream',
    'Cache-Control': 'no-store',
  });
  createReadStream(file).pipe(response);
});

try {
  await new Promise((resolveListen, rejectListen) => {
    server.once('error', rejectListen);
    server.listen(PORT, resolveListen);
  });
} catch (error) {
  if (error.code === 'EADDRINUSE') {
    console.error(
      `\nA porta ${PORT} já está em uso, provavelmente por outro "npm run dev" aberto em outro terminal.` +
        '\nEsse servidor antigo continua entregando a versão antiga da página.' +
        '\nFeche-o com Ctrl+C no terminal dele e rode "npm run dev" de novo.\n',
    );
    process.exit(1);
  }
  throw error;
}

// ---------------------------------------------------------------------------
// 2. Arquivos estáticos: copia agora e de novo a cada alteração em public/.
//    Editores costumam salvar com um arquivo temporário seguido de renomeação,
//    o que gera vários eventos seguidos; o debounce espera a pasta assentar
//    e uma falha pontual vira aviso em vez de derrubar o servidor.
// ---------------------------------------------------------------------------
copyPublic();
watch(
  'public',
  { recursive: true },
  debounce(() => {
    try {
      copyPublic();
      broadcast('reload');
    } catch (error) {
      console.warn(`Não foi possível copiar public/: ${error.message}`);
    }
  }, 100),
);

// ---------------------------------------------------------------------------
// 3. CSS: o Tailwind recompila styles.css; quando o arquivo muda, as páginas
//    trocam só a folha de estilos, sem perder o que foi digitado.
//    O Tailwind roda direto pelo Node, sem shell intermediário, para que
//    encerrá-lo encerre de fato o processo. --watch=always mantém o modo de
//    observação mesmo quando a entrada padrão do terminal é fechada.
// ---------------------------------------------------------------------------
const require = createRequire(import.meta.url);
const tailwindPackage = require.resolve('@tailwindcss/cli/package.json');
const tailwindBin = JSON.parse(readFileSync(tailwindPackage, 'utf8')).bin.tailwindcss;
const tailwind = spawn(
  process.execPath,
  [join(dirname(tailwindPackage), tailwindBin), '-i', 'src/styles.css', '-o', 'dist/styles.css', '--watch=always'],
  { stdio: 'inherit' },
);
watch(
  'dist',
  debounce((_event, fileName) => {
    if (fileName === 'styles.css') broadcast('css');
  }, 100),
);

// ---------------------------------------------------------------------------
// 4. JavaScript: o esbuild recompila a cada alteração. Ao terminar, avisa as
//    páginas para recarregar, ou envia o erro para aparecer na tela.
// ---------------------------------------------------------------------------
const notifyPages = {
  name: 'notify-pages',
  setup(build) {
    build.onEnd(async (result) => {
      if (result.errors.length > 0) {
        const messages = await esbuild.formatMessages(result.errors, { kind: 'error', color: false });
        lastBuildError = messages.join('\n');
        broadcast('build-error', lastBuildError);
      } else {
        lastBuildError = null;
        broadcast('reload');
      }
    });
  },
};

const context = await esbuild.context({
  entryPoints: ['src/main.ts'],
  bundle: true,
  sourcemap: true,
  outfile: 'dist/app.js',
  banner: { js: DEV_CLIENT },
  plugins: [notifyPages],
  logLevel: 'info',
});
await context.watch();

console.log(`\nAbra http://localhost:${PORT} no navegador. Ctrl+C para encerrar.\n`);

// Encerra tudo junto: servidor, Tailwind e esbuild
async function shutdown() {
  tailwind.kill();
  for (const response of clients) response.end();
  server.close();
  await context.dispose();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);