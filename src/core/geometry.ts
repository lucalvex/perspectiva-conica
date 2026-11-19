/**
 * Álgebra vetorial básica usada no pipeline de projeção.
 * Todas as coordenadas estão no sistema global de coordenadas (WCS).
 */

export interface Vec3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/** Ponto ou vetor 2D: coordenadas no plano de projeção ou no dispositivo. */
export interface Vec2 {
  readonly x: number;
  readonly y: number;
}

/** Tolerância relativa usada nas verificações de geometria degenerada. */
export const EPSILON = 1e-9;

export function vec3(x: number, y: number, z: number): Vec3 {
  return { x, y, z };
}

/** Vetor que sai de b e chega em a. */
export function subtract(a: Vec3, b: Vec3): Vec3 {
  return vec3(a.x - b.x, a.y - b.y, a.z - b.z);
}

/** Produto escalar a · b. */
export function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

/**
 * Produto vetorial a × b, escrito exatamente como no enunciado,
 * com a = P1 − P2 e b = P3 − P2:
 *   nx =   (Y1Y2 · Z3Z2 − Y3Y2 · Z1Z2)
 *   ny = − (X1X2 · Z3Z2 − X3X2 · Z1Z2)
 *   nz =   (X1X2 · Y3Y2 − X3X2 · Y1Y2)
 */
export function cross(a: Vec3, b: Vec3): Vec3 {
  return vec3(
    a.y * b.z - b.y * a.z,
    -(a.x * b.z - b.x * a.z),
    a.x * b.y - b.x * a.y,
  );
}

/** Módulo (comprimento) do vetor. */
export function length(a: Vec3): number {
  return Math.hypot(a.x, a.y, a.z);
}