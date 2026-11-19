import type { Vec2, Vec3 } from './geometry';
import { multiply } from './matrix';
import {
  PlaneScalars,
  ProjectedVertex,
  buildObjectMatrix,
  buildPerspectiveMatrix,
  computePlaneNormal,
  computePlaneScalars,
  toCartesian,
} from './projection';
import type { SceneInput } from './types';
import { isFrontFacing } from './visibility';

/** Resultado de cada etapa, guardado para desenho e exibição. */
export interface PipelineResult {
  readonly p1MinusP2: Vec3;
  readonly p3MinusP2: Vec3;
  readonly normal: Vec3;
  readonly scalars: PlaneScalars;
  readonly perspectiveMatrix: number[][];
  readonly objectMatrix: number[][];
  readonly homogeneousMatrix: number[][];
  readonly projected: readonly ProjectedVertex[];
  readonly planeCoordinates: readonly Vec2[];
  /** Para cada superfície, se ela está voltada para o observador. */
  readonly frontFacing: readonly boolean[];
}

/**
 * Executa as etapas da projeção perspectiva na ordem do enunciado.
 * Lança ProjectionError quando os dados tornam a projeção indefinida.
 */
export function runPipeline(scene: SceneInput): PipelineResult {
  const [p1, p2, p3] = scene.planePoints;

  const { p1MinusP2, p3MinusP2, normal } = computePlaneNormal(p1, p2, p3);
  const scalars = computePlaneScalars(normal, scene.planeReference, scene.viewpoint);
  const perspectiveMatrix = buildPerspectiveMatrix(normal, scalars, scene.viewpoint);
  const objectMatrix = buildObjectMatrix(scene.object.vertices);
  const homogeneousMatrix = multiply(perspectiveMatrix, objectMatrix);
  const projected = toCartesian(homogeneousMatrix, scalars);

  // Coordenadas no plano, como no enunciado: XP = XC e YP = YC
  const planeCoordinates = projected.map((vertex) => ({
    x: vertex.cartesian.x,
    y: vertex.cartesian.y,
  }));

  // A visibilidade é decidida no espaço 3D, com os vértices originais e C
  const frontFacing = scene.object.surfaces.map((surface) =>
    isFrontFacing(scene.object.vertices, surface, scene.viewpoint),
  );

  return {
    p1MinusP2,
    p3MinusP2,
    normal,
    scalars,
    perspectiveMatrix,
    objectMatrix,
    homogeneousMatrix,
    projected,
    planeCoordinates,
    frontFacing,
  };
}