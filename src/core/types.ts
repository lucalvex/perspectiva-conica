import type { Vec3 } from './geometry';

export interface SceneObject {
  readonly vertices: readonly Vec3[];
  /** Índices dos vértices de cada superfície, começando em 0, pela regra da mão direita. */
  readonly surfaces: readonly (readonly number[])[];
}

/** Todos os dados de entrada do enunciado, já validados. */
export interface SceneInput {
  /** Ponto de vista C = (a, b, c). */
  readonly viewpoint: Vec3;
  /** Três pontos distintos e não colineares que definem o plano. */
  readonly planePoints: readonly [Vec3, Vec3, Vec3];
  /** R0, um ponto sobre o plano de projeção. */
  readonly planeReference: Vec3;
  readonly object: SceneObject;
}