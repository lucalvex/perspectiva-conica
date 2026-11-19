import { Vec3, length, subtract, vec3 } from './geometry';
import { Matrix, multiply } from './matrix';
import { buildObjectMatrix } from './projection';

/** Matriz 4×4 de translação: soma offset a cada ponto. */
export function translationMatrix(offset: Vec3): number[][] {
  return [
    [1, 0, 0, offset.x],
    [0, 1, 0, offset.y],
    [0, 0, 1, offset.z],
    [0, 0, 0, 1],
  ];
}

/** Rotação de angle radianos em torno do eixo x (regra da mão direita). */
export function rotationXMatrix(angle: number): number[][] {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return [
    [1, 0, 0, 0],
    [0, cos, -sin, 0],
    [0, sin, cos, 0],
    [0, 0, 0, 1],
  ];
}

/** Rotação de angle radianos em torno do eixo y (regra da mão direita). */
export function rotationYMatrix(angle: number): number[][] {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return [
    [cos, 0, sin, 0],
    [0, 1, 0, 0],
    [-sin, 0, cos, 0],
    [0, 0, 0, 1],
  ];
}

/**
 * Compõe as matrizes na ordem escrita: compose(A, B, C) = A · B · C.
 * Aplicada a um ponto, a última matriz age primeiro.
 */
export function compose(...matrices: Matrix[]): number[][] {
  return matrices.reduce<number[][]>(
    (product, matrix) => multiply(product, matrix),
    [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]],
  );
}

/** Aplica uma matriz 4×4 a todos os pontos de uma vez, como na matriz do objeto. */
export function transformPoints(matrix: Matrix, points: readonly Vec3[]): Vec3[] {
  const transformed = multiply(matrix, buildObjectMatrix(points));
  return points.map((_, column) => vec3(transformed[0][column], transformed[1][column], transformed[2][column]));
}

/** Centro do retângulo envolvente (caixa alinhada aos eixos) dos pontos. */
export function boundingBoxCenter(points: readonly Vec3[]): Vec3 {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const zs = points.map((point) => point.z);
  return vec3(
    (Math.min(...xs) + Math.max(...xs)) / 2,
    (Math.min(...ys) + Math.max(...ys)) / 2,
    (Math.min(...zs) + Math.max(...zs)) / 2,
  );
}

/**
 * Rotação do objeto em torno do próprio centro:
 *   M = T(centro) · Rx(pitch) · Ry(yaw) · T(−centro)
 * Lida da direita para a esquerda: leva o centro à origem, gira em y,
 * gira em x e devolve o objeto ao lugar.
 */
export function orbitRotation(center: Vec3, yaw: number, pitch: number): number[][] {
  return compose(
    translationMatrix(center),
    rotationXMatrix(pitch),
    rotationYMatrix(yaw),
    translationMatrix(vec3(-center.x, -center.y, -center.z)),
  );
}

/**
 * Os 8 cantos de um cubo centrado em center que contém o objeto em qualquer
 * rotação: o raio é a maior distância de um vértice ao centro, e toda
 * rotação em torno do centro mantém os vértices dentro dessa esfera.
 */
export function enclosingCubeCorners(points: readonly Vec3[], center: Vec3): Vec3[] {
  const radius = Math.max(...points.map((point) => length(subtract(point, center))));
  const corners: Vec3[] = [];
  for (const dx of [-radius, radius]) {
    for (const dy of [-radius, radius]) {
      for (const dz of [-radius, radius]) {
        corners.push(vec3(center.x + dx, center.y + dy, center.z + dz));
      }
    }
  }
  return corners;
}