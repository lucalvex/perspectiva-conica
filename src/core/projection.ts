import { EPSILON, Vec3, cross, dot, length, subtract, vec3 } from './geometry';
import { Matrix, getColumn } from './matrix';

/**
 * Erro para dados de entrada que tornam a projeção matematicamente
 * indefinida. A mensagem é exibida ao usuário, por isso fica em português.
 */
export class ProjectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProjectionError';
  }
}

/** Resultados intermediários do cálculo da normal, guardados para exibição. */
export interface PlaneNormalSteps {
  readonly p1MinusP2: Vec3;
  readonly p3MinusP2: Vec3;
  /** N = (P1 − P2) × (P3 − P2), sem normalizar, como no enunciado. */
  readonly normal: Vec3;
}

export interface PlaneScalars {
  /** d0 = R0 · N */
  readonly d0: number;
  /** d1 = C · N */
  readonly d1: number;
  /** d = d0 − d1 */
  readonly d: number;
}

/** Vetor normal ao plano a partir de três de seus pontos. */
export function computePlaneNormal(p1: Vec3, p2: Vec3, p3: Vec3): PlaneNormalSteps {
  const p1MinusP2 = subtract(p1, p2);
  const p3MinusP2 = subtract(p3, p2);
  const normal = cross(p1MinusP2, p3MinusP2);

  // |a × b| = |a|·|b|·sen(θ): se os pontos forem colineares, θ = 0 e a normal se anula.
  // A tolerância é relativa ao tamanho dos vetores, para funcionar em qualquer escala.
  const tolerance = EPSILON * Math.max(1, length(p1MinusP2) * length(p3MinusP2));
  if (length(normal) <= tolerance) {
    throw new ProjectionError(
      'P1, P2 e P3 são colineares ou coincidentes, por isso não definem um plano. Altere um dos três pontos.',
    );
  }

  return { p1MinusP2, p3MinusP2, normal };
}

/** Escalares d0, d1 e d do enunciado. */
export function computePlaneScalars(normal: Vec3, reference: Vec3, viewpoint: Vec3): PlaneScalars {
  const d0 = dot(reference, normal);
  const d1 = dot(viewpoint, normal);
  const d = d0 - d1;

  // d = N · (R0 − C): se for zero, C está sobre o plano e os raios projetantes
  // ficam contidos no próprio plano, então a perspectiva não existe.
  const tolerance = EPSILON * Math.max(1, Math.abs(d0), Math.abs(d1));
  if (Math.abs(d) <= tolerance) {
    throw new ProjectionError(
      'O ponto de vista C está sobre o plano de projeção (d = 0), então a perspectiva fica indefinida. Afaste C do plano.',
    );
  }

  return { d0, d1, d };
}

/**
 * Matriz perspectiva 4×4 do enunciado, para vetores-coluna [x y z 1]ᵀ:
 *
 *   | d + a·nx   a·ny       a·nz       −a·d0 |
 *   | b·nx       d + b·ny   b·nz       −b·d0 |
 *   | c·nx       c·ny       d + c·nz   −c·d0 |
 *   | nx         ny         nz         −d1   |
 */
export function buildPerspectiveMatrix(normal: Vec3, scalars: PlaneScalars, viewpoint: Vec3): number[][] {
  const { x: nx, y: ny, z: nz } = normal;
  const { x: a, y: b, z: c } = viewpoint;
  const { d0, d1, d } = scalars;

  return [
    [d + a * nx, a * ny, a * nz, -a * d0],
    [b * nx, d + b * ny, b * nz, -b * d0],
    [c * nx, c * ny, d + c * nz, -c * d0],
    [nx, ny, nz, -d1],
  ];
}

/**
 * Matriz do objeto: uma coluna homogênea [x y z 1]ᵀ por vértice.
 * Para NV vértices, a matriz é 4×NV.
 */
export function buildObjectMatrix(vertices: readonly Vec3[]): number[][] {
  return [
    vertices.map((vertex) => vertex.x),
    vertices.map((vertex) => vertex.y),
    vertices.map((vertex) => vertex.z),
    vertices.map(() => 1),
  ];
}

export interface ProjectedVertex {
  /** (X′, Y′, Z′, W′), uma coluna de P′ = M · V. */
  readonly homogeneous: readonly [number, number, number, number];
  /** (XC, YC, ZC) = (X′/W′, Y′/W′, Z′/W′) */
  readonly cartesian: Vec3;
  /**
   * Verdadeiro quando o vértice está do lado de C oposto ao plano.
   * Todo ponto do plano tem W′ = d, então o sinal de W′/d indica o lado.
   */
  readonly behindViewer: boolean;
}

/** Converte cada coluna de P′ de coordenadas homogêneas para cartesianas. */
export function toCartesian(homogeneous: Matrix, scalars: PlaneScalars): ProjectedVertex[] {
  const count = homogeneous[0].length;
  const tolerance = EPSILON * Math.max(1, Math.abs(scalars.d0), Math.abs(scalars.d1));
  const projected: ProjectedVertex[] = [];

  for (let index = 0; index < count; index++) {
    const [x, y, z, w] = getColumn(homogeneous, index);

    // W′ = 0: o raio projetante é paralelo ao plano e nunca o encontra.
    if (Math.abs(w) <= tolerance) {
      throw new ProjectionError(
        `V${index + 1} está no plano que passa por C paralelo ao de projeção (W′ = 0), então sua projeção vai para o infinito. Mova esse vértice ou o ponto de vista.`,
      );
    }

    projected.push({
      homogeneous: [x, y, z, w],
      cartesian: vec3(x / w, y / w, z / w),
      behindViewer: w / scalars.d < 0,
    });
  }

  return projected;
}