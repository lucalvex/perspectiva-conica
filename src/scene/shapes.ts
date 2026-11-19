import { Vec3, vec3 } from '../core/geometry';
import { boundingBoxCenter, orbitRotation, transformPoints } from '../core/transform';

/** Vértices e superfícies de um objeto, no formato do formulário (índices a partir de 1). */
export interface Shape {
  readonly vertices: readonly Vec3[];
  readonly surfaces: readonly (readonly number[])[];
}

/**
 * Prisma obtido ao "puxar" um polígono ao longo de um vetor (extrusão).
 *
 * O perfil deve estar em sentido anti-horário quando visto do lado oposto
 * ao deslocamento, ou seja, com a normal apontando para −offset: ele vira a
 * face de trás. A cópia deslocada vira a face da frente, e cada aresta do
 * perfil gera uma face lateral. Todas as faces saem pela regra da mão direita,
 * com a normal apontando para fora.
 */
export function extrude(profile: readonly Vec3[], offset: Vec3): Shape {
  const count = profile.length;
  const moved = profile.map((point) => vec3(point.x + offset.x, point.y + offset.y, point.z + offset.z));

  // Numeração a partir de 1: perfil = 1..n, cópia deslocada = n+1..2n
  const back = profile.map((_, index) => index + 1);
  const front = moved.map((_, index) => count + index + 1).reverse();
  const sides = profile.map((_, index) => {
    const next = (index + 1) % count;
    return [index + 1, count + index + 1, count + next + 1, next + 1];
  });

  return { vertices: [...profile, ...moved], surfaces: [back, front, ...sides] };
}

/** Cubo de aresta size com o canto mínimo em origin. */
export function cube(origin: Vec3, size: number): Shape {
  const { x, y, z } = origin;
  // Quadrado no plano z = origin.z, anti-horário visto de −z
  const square = [vec3(x, y, z), vec3(x, y + size, z), vec3(x + size, y + size, z), vec3(x + size, y, z)];
  return extrude(square, vec3(0, 0, size));
}

/** Casa: parede retangular com telhado de duas águas, ao longo do eixo z. */
export function house(width: number, wallHeight: number, roofHeight: number, depth: number): Shape {
  // Fachada (pentágono) no plano z = 0, anti-horário visto de −z
  const facade = [
    vec3(0, 0, 0),
    vec3(0, wallHeight, 0),
    vec3(width / 2, wallHeight + roofHeight, 0),
    vec3(width, wallHeight, 0),
    vec3(width, 0, 0),
  ];
  return extrude(facade, vec3(0, 0, depth));
}

/** Arredonda para 3 casas, para os campos do formulário não exibirem dízimas. */
function round(value: number): number {
  const rounded = Math.round(value * 1000) / 1000;
  return rounded === 0 ? 0 : rounded;
}

/**
 * Gira o objeto em torno do próprio centro, com as mesmas matrizes da
 * rotação por arraste. Rotação não altera a ordem dos vértices, então as
 * superfícies continuam valendo pela regra da mão direita.
 */
export function rotated(shape: Shape, yawDegrees: number, pitchDegrees: number): Shape {
  const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;
  const rotation = orbitRotation(boundingBoxCenter(shape.vertices), toRadians(yawDegrees), toRadians(pitchDegrees));
  const vertices = transformPoints(rotation, shape.vertices).map((point) => vec3(round(point.x), round(point.y), round(point.z)));
  return { vertices, surfaces: shape.surfaces };
}