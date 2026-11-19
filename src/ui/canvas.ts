import type { Vec2 } from '../core/geometry';
import type { Viewport } from '../core/viewport';

/** Contexto pronto para desenhar, com o tamanho em pixels CSS. */
export interface CanvasSurface {
  readonly context: CanvasRenderingContext2D;
  readonly width: number;
  readonly height: number;
}

/** Tudo o que é preciso para desenhar o objeto já projetado. */
export interface SceneDrawing {
  /** Vértices em coordenadas do dispositivo (u, v). */
  readonly devicePoints: readonly Vec2[];
  /** Índices dos vértices de cada superfície, começando em 0. */
  readonly surfaces: readonly (readonly number[])[];
  /** Para cada superfície, se ela está voltada para o observador. */
  readonly frontFacing: readonly boolean[];
  /** Esconde as faces de trás em vez de tracejá-las. */
  readonly hideBackFaces: boolean;
  readonly showLabels: boolean;
}

const PAPER = '#fbfcfa';
const INK = '#22292d';
const HIDDEN = '#9aa5a8';
const FACE_FILL = 'rgba(28, 90, 156, 0.07)';
const FRAME = '#9aa5a8';
const LABEL_FONT = '12px sans-serif';

/**
 * Ajusta a resolução interna do canvas à densidade de pixels da tela.
 *
 * O tamanho na página (CSS) e a resolução interna (atributos width/height)
 * são independentes. Numa tela com devicePixelRatio = 2, um canvas de
 * 600×400 pixels internos seria esticado para 1200×800 pixels físicos e
 * ficaria borrado. Aqui a resolução interna acompanha a física, e a escala
 * do contexto permite continuar desenhando em pixels CSS.
 */
export function prepareCanvas(canvas: HTMLCanvasElement): CanvasSurface {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const ratio = window.devicePixelRatio || 1;

  const pixelWidth = Math.max(1, Math.round(width * ratio));
  const pixelHeight = Math.max(1, Math.round(height * ratio));
  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
  }

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Canvas 2D context is not available');
  }

  // setTransform substitui a escala anterior em vez de acumular sobre ela
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  return { context, width, height };
}

/** Descreve o contorno fechado de uma superfície, sem pintar. */
function tracePolygon(context: CanvasRenderingContext2D, points: readonly Vec2[], surface: readonly number[]): void {
  context.beginPath();
  surface.forEach((index, position) => {
    const point = points[index];
    if (position === 0) {
      context.moveTo(point.x, point.y);
    } else {
      context.lineTo(point.x, point.y);
    }
  });
  // Liga o último vértice de volta ao primeiro
  context.closePath();
}

/**
 * Um vértice é visível quando pertence a alguma face voltada para o
 * observador. Vértices fora de qualquer superfície também contam como
 * visíveis, porque não há face que os esconda.
 */
function findVisibleVertices(drawing: SceneDrawing): boolean[] {
  const visible = drawing.devicePoints.map(() => false);
  const used = drawing.devicePoints.map(() => false);
  drawing.surfaces.forEach((face, index) => {
    for (const vertex of face) {
      used[vertex] = true;
      if (drawing.frontFacing[index]) visible[vertex] = true;
    }
  });
  return visible.map((isVisible, vertex) => isVisible || !used[vertex]);
}

/**
 * Pontos e nomes V1, V2, … dos vértices. Os ocultos ficam em cinza, ou não
 * aparecem quando as faces de trás estão escondidas. Os nomes são afastados
 * do centro do desenho para não ficarem sobre as arestas.
 */
function drawVertices(context: CanvasRenderingContext2D, drawing: SceneDrawing): void {
  const points = drawing.devicePoints;
  const visible = findVisibleVertices(drawing);

  const sum = points.reduce((total, point) => ({ x: total.x + point.x, y: total.y + point.y }), { x: 0, y: 0 });
  const centreX = sum.x / points.length;
  const centreY = sum.y / points.length;

  context.font = LABEL_FONT;
  context.textAlign = 'center';
  context.textBaseline = 'middle';

  points.forEach((point, index) => {
    if (!visible[index] && drawing.hideBackFaces) return;
    const colour = visible[index] ? INK : HIDDEN;

    context.fillStyle = colour;
    context.beginPath();
    context.arc(point.x, point.y, 2.75, 0, Math.PI * 2);
    context.fill();

    if (!drawing.showLabels) return;
    const dx = point.x - centreX;
    const dy = point.y - centreY;
    const distance = Math.hypot(dx, dy) || 1;
    const offset = 14;
    context.fillText(`V${index + 1}`, point.x + (dx / distance) * offset, point.y + (dy / distance) * offset);
  });
}

/**
 * Desenha a folha: fundo, moldura da viewport e, se houver dados válidos,
 * superfícies, vértices e nomes.
 *
 * As faces de trás vêm primeiro, tracejadas (convenção de arestas ocultas do
 * desenho técnico); as da frente vêm depois, preenchidas e com traço
 * contínuo. Assim, uma aresta compartilhada por uma face da frente e uma de
 * trás termina contínua, porque é visível.
 */
export function drawScene(surface: CanvasSurface, viewport: Viewport, drawing: SceneDrawing | null): void {
  const { context, width, height } = surface;

  context.clearRect(0, 0, width, height);
  context.fillStyle = PAPER;
  context.fillRect(0, 0, width, height);

  // Moldura tracejada da viewport
  context.save();
  context.strokeStyle = FRAME;
  context.lineWidth = 1;
  context.setLineDash([2, 4]);
  context.strokeRect(viewport.uMin, viewport.vMin, viewport.uMax - viewport.uMin, viewport.vMax - viewport.vMin);
  context.restore();

  if (!drawing) return;
  const points = drawing.devicePoints;
  context.lineJoin = 'round';
  context.lineCap = 'round';

  // Faces de trás: tracejadas e mais claras
  if (!drawing.hideBackFaces) {
    context.save();
    context.strokeStyle = HIDDEN;
    context.lineWidth = 1;
    context.setLineDash([6, 5]);
    drawing.surfaces.forEach((face, index) => {
      if (drawing.frontFacing[index]) return;
      tracePolygon(context, points, face);
      context.stroke();
    });
    context.restore();
  }

  // Faces da frente: preenchimento suave e traço contínuo
  context.strokeStyle = INK;
  context.fillStyle = FACE_FILL;
  context.lineWidth = 1.75;
  drawing.surfaces.forEach((face, index) => {
    if (!drawing.frontFacing[index]) return;
    tracePolygon(context, points, face);
    context.fill();
    context.stroke();
  });

  drawVertices(context, drawing);
}