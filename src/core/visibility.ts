import { Vec3, dot, subtract, vec3 } from './geometry';

/**
 * Normal de uma superfície pelo método de Newell. Para vértices em sentido
 * anti-horário vistos de fora (regra da mão direita), aponta para fora do
 * objeto. Ao contrário de um único produto vetorial, continua correta mesmo
 * quando os três primeiros vértices são colineares.
 */
export function surfaceNormal(vertices: readonly Vec3[], surface: readonly number[]): Vec3 {
  let nx = 0;
  let ny = 0;
  let nz = 0;
  for (let i = 0; i < surface.length; i++) {
    const current = vertices[surface[i]];
    const next = vertices[surface[(i + 1) % surface.length]];
    nx += (current.y - next.y) * (current.z + next.z);
    ny += (current.z - next.z) * (current.x + next.x);
    nz += (current.x - next.x) * (current.y + next.y);
  }
  return vec3(nx, ny, nz);
}

/** Centroide (média dos vértices) de uma superfície. */
function centroid(vertices: readonly Vec3[], surface: readonly number[]): Vec3 {
  let x = 0;
  let y = 0;
  let z = 0;
  for (const index of surface) {
    x += vertices[index].x;
    y += vertices[index].y;
    z += vertices[index].z;
  }
  const count = surface.length;
  return vec3(x / count, y / count, z / count);
}

/**
 * Uma superfície está voltada para o observador quando a sua normal externa
 * aponta para C: normal · (C − ponto da face) > 0.
 */
export function isFrontFacing(vertices: readonly Vec3[], surface: readonly number[], viewpoint: Vec3): boolean {
  const normal = surfaceNormal(vertices, surface);
  return dot(normal, subtract(viewpoint, centroid(vertices, surface))) > 0;
}