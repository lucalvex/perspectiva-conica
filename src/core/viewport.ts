import { EPSILON, Vec2 } from './geometry';
import { Matrix } from './matrix';

/** Janela: retângulo envolvente do desenho em coordenadas do plano (XP, YP). */
export interface Window2D {
  readonly xMin: number;
  readonly xMax: number;
  readonly yMin: number;
  readonly yMax: number;
}

/** Viewport: retângulo de destino no dispositivo (u cresce para a direita, v para baixo). */
export interface Viewport {
  readonly uMin: number;
  readonly uMax: number;
  readonly vMin: number;
  readonly vMax: number;
}

/**
 * Casos do enunciado, comparando as razões de aspecto (largura / altura):
 * - windowWider  (Rw > Rv): a largura limita a escala; centraliza na vertical.
 * - windowTaller (Rw < Rv): a altura limita a escala; centraliza na horizontal.
 * - sameAspect   (Rw = Rv): a janela preenche a viewport exatamente.
 */
export type AspectCase = 'windowWider' | 'windowTaller' | 'sameAspect';

export interface ViewportTransform {
  readonly window: Window2D;
  readonly viewport: Viewport;
  readonly windowAspect: number;
  readonly viewportAspect: number;
  readonly aspectCase: AspectCase;
  /** Escala uniforme, em pixels por unidade do plano. */
  readonly scaleFactor: number;
  /** Matriz homogênea 3×3 que leva [XP YP 1]ᵀ em [u v 1]ᵀ. */
  readonly matrix: Matrix;
}

/**
 * Retângulo envolvente dos pontos. Se a largura ou a altura for nula
 * (um único ponto, ou um objeto visto de perfil), o retângulo é alargado
 * para que a escala continue finita.
 */
export function computeWindow(points: readonly Vec2[]): Window2D {
  if (points.length === 0) {
    throw new Error('Cannot compute a window without points');
  }

  let xMin = Infinity;
  let xMax = -Infinity;
  let yMin = Infinity;
  let yMax = -Infinity;
  for (const point of points) {
    xMin = Math.min(xMin, point.x);
    xMax = Math.max(xMax, point.x);
    yMin = Math.min(yMin, point.y);
    yMax = Math.max(yMax, point.y);
  }

  const width = xMax - xMin;
  const height = yMax - yMin;
  const span = Math.max(width, height, 1);
  if (width <= EPSILON * span) {
    const half = height > EPSILON * span ? height / 2 : 0.5;
    xMin -= half;
    xMax += half;
  }
  if (height <= EPSILON * span) {
    const half = width > EPSILON * span ? width / 2 : 0.5;
    yMin -= half;
    yMax += half;
  }

  return { xMin, xMax, yMin, yMax };
}

/**
 * Transformação janela-viewport com escala uniforme (preserva as proporções
 * do objeto) e desenho centralizado na viewport. O eixo v é invertido porque,
 * no dispositivo, ele cresce para baixo.
 */
export function buildViewportTransform(window: Window2D, viewport: Viewport): ViewportTransform {
  const windowWidth = window.xMax - window.xMin;
  const windowHeight = window.yMax - window.yMin;
  const viewportWidth = viewport.uMax - viewport.uMin;
  const viewportHeight = viewport.vMax - viewport.vMin;

  const windowAspect = windowWidth / windowHeight;
  const viewportAspect = viewportWidth / viewportHeight;

  let aspectCase: AspectCase;
  if (Math.abs(windowAspect - viewportAspect) <= EPSILON * viewportAspect) {
    aspectCase = 'sameAspect';
  } else if (windowAspect > viewportAspect) {
    aspectCase = 'windowWider';
  } else {
    aspectCase = 'windowTaller';
  }

  // O lado que limita a escala é o que chega primeiro à borda da viewport
  const scaleFactor = aspectCase === 'windowWider'
    ? viewportWidth / windowWidth
    : viewportHeight / windowHeight;

  // O centro da janela vai para o centro da viewport
  const windowCentreX = (window.xMin + window.xMax) / 2;
  const windowCentreY = (window.yMin + window.yMax) / 2;
  const viewportCentreU = (viewport.uMin + viewport.uMax) / 2;
  const viewportCentreV = (viewport.vMin + viewport.vMax) / 2;

  const matrix: Matrix = [
    [scaleFactor, 0, viewportCentreU - scaleFactor * windowCentreX],
    [0, -scaleFactor, viewportCentreV + scaleFactor * windowCentreY],
    [0, 0, 1],
  ];

  return { window, viewport, windowAspect, viewportAspect, aspectCase, scaleFactor, matrix };
}

/** Aplica a matriz janela-viewport a cada ponto: [u v 1]ᵀ = T · [XP YP 1]ᵀ. */
export function applyViewport(transform: ViewportTransform, points: readonly Vec2[]): Vec2[] {
  const [[sx, , tx], [, sy, ty]] = transform.matrix;
  return points.map((point) => ({ x: sx * point.x + tx, y: sy * point.y + ty }));
}