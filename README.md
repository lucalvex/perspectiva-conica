# Perspectiva cônica

Sistema de visualização projetivo baseado em perspectiva cônica, desenvolvido como trabalho de implementação da disciplina de Computação Gráfica do Departamento de Informática da Universidade Estadual de Maringá (UEM).

**Autor:** Lucas Alves de Lima

A aplicação recebe o ponto de vista C, três pontos que definem o plano de projeção, um ponto R0 sobre o plano e um objeto descrito por vértices e superfícies, e desenha a projeção perspectiva do objeto sobre o plano, ajustada à área de desenho pela transformação janela-viewport.

## Funcionalidades

- Entrada de dados por formulário, com validação e mensagens que indicam como corrigir cada problema.
- Projeção perspectiva calculada passo a passo, seguindo o enunciado: vetor normal, escalares d0, d1 e d, matriz perspectiva 4×4, matriz do objeto, coordenadas homogêneas e cartesianas.
- Transformação janela-viewport com escala uniforme e o objeto centralizado.
- Rotação do objeto arrastando o desenho com o mouse, com o dedo ou pelas setas do teclado.
- Exemplos prontos: a pirâmide da 2ª avaliação, a mesma pirâmide vista de perto, cubos com um e dois pontos de fuga e uma casa com três pontos de fuga.

## Requisitos

- [Node.js](https://nodejs.org/) 20 ou mais recente, que já inclui o npm.

Para conferir a versão instalada:

```
node --version
```

## Instalação

Na pasta do projeto, instale as dependências de desenvolvimento (TypeScript, esbuild e Tailwind CSS):

```
npm install
```

Isso só precisa ser feito uma vez, ou de novo quando o `package.json` mudar.

## Execução

### Modo de desenvolvimento

```
npm run dev
```

Abra <http://localhost:8000> no navegador. O TypeScript, o CSS e os arquivos de `public/` são recompilados automaticamente a cada alteração; basta recarregar a página. Use Ctrl+C no terminal para encerrar.

### Build de produção

```
npm run build
```

Verifica os tipos e gera a versão final na pasta `dist/`. Como os arquivos gerados não usam módulos ES, o `dist/index.html` também pode ser aberto diretamente no navegador, com duplo clique, sem servidor.

### Outros comandos

| Comando | O que faz |
|---|---|
| `npm run typecheck` | Só verifica os tipos do TypeScript, sem gerar arquivos |
| `npm run build:js` | Gera só o `dist/app.js` |
| `npm run build:css` | Gera só o `dist/styles.css` |

## Estrutura do projeto

```
├── public/               Arquivos estáticos copiados para dist/ (HTML e imagens)
├── src/
│   ├── core/             Matemática da projeção, sem dependência do navegador
│   │   ├── geometry.ts       Vetores: subtração, produto escalar e vetorial
│   │   ├── matrix.ts         Produto de matrizes
│   │   ├── projection.ts     Normal, d0/d1/d, matriz perspectiva, divisão por W′
│   │   ├── viewport.ts       Transformação janela-viewport
│   │   ├── transform.ts      Translação, rotação e composição de matrizes 4×4
│   │   ├── pipeline.ts       Executa as etapas na ordem do enunciado
│   │   └── types.ts          Tipos dos dados de entrada
│   ├── scene/            Exemplos e gerador de sólidos (extrusão)
│   ├── ui/               Formulário, componentes, desenho no canvas e rotação
│   ├── main.ts           Liga a interface ao pipeline
│   └── styles.css        Tema e componentes do Tailwind CSS
├── scripts/              Build, limpeza e servidor de desenvolvimento
├── .github/workflows/    Publicação automática no GitHub Pages
└── dist/                 Saída do build (gerada, fora do Git)
```

## Correspondência com o enunciado

| Etapa do enunciado | Função | Arquivo |
|---|---|---|
| Vetor normal N = (P1 − P2) × (P3 − P2) | `computePlaneNormal` | `src/core/projection.ts` |
| d0 = R0 · N, d1 = C · N, d = d0 − d1 | `computePlaneScalars` | `src/core/projection.ts` |
| Matriz perspectiva | `buildPerspectiveMatrix` | `src/core/projection.ts` |
| Matriz do objeto | `buildObjectMatrix` | `src/core/projection.ts` |
| P′ = M · V | `multiply` | `src/core/matrix.ts` |
| Coordenadas cartesianas (divisão por W′) | `toCartesian` | `src/core/projection.ts` |
| Janela-viewport com centralização | `computeWindow`, `buildViewportTransform` | `src/core/viewport.ts` |