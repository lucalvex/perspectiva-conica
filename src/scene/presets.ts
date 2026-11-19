import { Vec3, vec3 } from '../core/geometry';
import { Shape, cube, house, rotated } from './shapes';

export type ReferenceChoice = 'p1' | 'p2' | 'p3' | 'custom';

/** Exemplo pronto para carregar no formulário. */
export interface Preset extends Shape {
  readonly id: string;
  readonly label: string;
  readonly viewpoint: Vec3;
  readonly planePoints: readonly [Vec3, Vec3, Vec3];
  readonly reference: ReferenceChoice;
  readonly customReference?: Vec3;
}

/**
 * Plano z = 0, usado em todos os exemplos.
 *
 * A posição de C equilibra dois efeitos opostos:
 * - quanto mais perto da reta perpendicular ao plano que passa pelo centro
 *   do objeto, menos a projeção estica (anamorfose);
 * - uma face só aparece quando C está do lado de fora do plano dela
 *   (normal · (C − ponto da face) > 0), então C precisa sair da "faixa"
 *   das faces que se quer mostrar.
 * Uma obliquidade de 15° a 20°, com C a cerca de 2,5 vezes o tamanho do
 * objeto, mostra três faces sem deformação perceptível.
 */
const PLANE_Z0: readonly [Vec3, Vec3, Vec3] = [vec3(0, 0, 0), vec3(1, 0, 0), vec3(0, 1, 0)];

/** Pirâmide da 2ª avaliação (N = 8) projetada no plano z = 0. */
const assessmentPyramid: Preset = {
  id: 'assessment-pyramid',
  label: 'Pirâmide da 2ª avaliação',
  viewpoint: vec3(250, 100, 2004),
  planePoints: PLANE_Z0,
  reference: 'p1',
  vertices: [vec3(1, 1, 1), vec3(9, 1, 1), vec3(9, 1, 9), vec3(1, 1, 9), vec3(5, 9, 5)],
  surfaces: [
    [1, 2, 3, 4],
    [4, 3, 5],
    [3, 2, 5],
    [2, 1, 5],
    [1, 4, 5],
  ],
};

/** O mesmo objeto com C perto: a convergência da perspectiva fica evidente. */
const closePyramid: Preset = {
  ...assessmentPyramid,
  id: 'close-pyramid',
  label: 'Pirâmide vista de perto',
  viewpoint: vec3(7, 14, 40),
};

/**
 * Cubo de frente para o plano: as arestas de profundidade convergem para um
 * ponto de fuga. C acima e à direita do cubo (x > 2, y > 2) mostra o topo e
 * a face direita além da frente.
 */
const onePointCube: Preset = {
  id: 'one-point-cube',
  label: 'Cubo com um ponto de fuga',
  viewpoint: vec3(4.5, 4.5, 22),
  planePoints: PLANE_Z0,
  reference: 'p1',
  ...cube(vec3(-2, -2, 2), 4),
};

/**
 * Cubo girado 45° em torno do eixo vertical: as arestas horizontais convergem
 * para dois pontos de fuga. C acima do topo (y > 2) mostra a face de cima; as
 * arestas verticais continuam paralelas ao plano, então não há terceiro ponto.
 */
const twoPointCube: Preset = {
  id: 'two-point-cube',
  label: 'Cubo com dois pontos de fuga',
  viewpoint: vec3(0.5, 5.5, 22),
  planePoints: PLANE_Z0,
  reference: 'p1',
  ...rotated(cube(vec3(-2, -2, 2), 4), 45, 0),
};

/** Casa girada nos dois eixos: nenhuma aresta fica paralela ao plano, e há três pontos de fuga. */
const tiltedHouse: Preset = {
  id: 'house',
  label: 'Casa com telhado',
  viewpoint: vec3(3, 5, 38),
  planePoints: PLANE_Z0,
  reference: 'p1',
  ...rotated(house(6, 4, 3, 8), 35, 22),
};

export const PRESETS: readonly Preset[] = [
  assessmentPyramid,
  closePyramid,
  onePointCube,
  twoPointCube,
  tiltedHouse,
];