/** Ângulos de rotação do objeto, em radianos. */
export interface OrbitState {
  /** Rotação em torno do eixo y, controlada pelo arraste horizontal. */
  readonly yaw: number;
  /** Rotação em torno do eixo x, controlada pelo arraste vertical. */
  readonly pitch: number;
}

export interface OrbitControls {
  state(): OrbitState;
  reset(): void;
}

/** Radianos de rotação por pixel arrastado: 314 px equivalem a meia volta. */
const RADIANS_PER_PIXEL = 0.01;
/** Passo das setas do teclado: 5 graus. */
const KEY_STEP = Math.PI / 36;

/**
 * Liga o arraste no canvas à rotação do objeto. Usa Pointer Events, que
 * tratam mouse, toque e caneta com o mesmo código, e as setas do teclado
 * quando o canvas tem o foco.
 */
export function attachOrbitControls(canvas: HTMLCanvasElement, onChange: () => void): OrbitControls {
  let yaw = 0;
  let pitch = 0;
  let last: { x: number; y: number } | null = null;

  function rotateBy(deltaYaw: number, deltaPitch: number): void {
    yaw += deltaYaw;
    pitch += deltaPitch;
    onChange();
  }

  canvas.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    // A captura mantém os eventos chegando mesmo se o ponteiro sair do canvas
    canvas.setPointerCapture(event.pointerId);
    canvas.dataset.dragging = '';
    last = { x: event.clientX, y: event.clientY };
  });

  canvas.addEventListener('pointermove', (event) => {
    if (!last || !canvas.hasPointerCapture(event.pointerId)) return;
    const deltaX = event.clientX - last.x;
    const deltaY = event.clientY - last.y;
    last = { x: event.clientX, y: event.clientY };
    rotateBy(deltaX * RADIANS_PER_PIXEL, deltaY * RADIANS_PER_PIXEL);
  });

  const endDrag = (event: PointerEvent): void => {
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    delete canvas.dataset.dragging;
    last = null;
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  canvas.addEventListener('keydown', (event) => {
    const steps: Record<string, [number, number]> = {
      ArrowLeft: [-KEY_STEP, 0],
      ArrowRight: [KEY_STEP, 0],
      ArrowUp: [0, -KEY_STEP],
      ArrowDown: [0, KEY_STEP],
    };
    const step = steps[event.key];
    if (!step) return;
    event.preventDefault();
    rotateBy(step[0], step[1]);
  });

  return {
    state: () => ({ yaw, pitch }),
    reset: () => {
      yaw = 0;
      pitch = 0;
      onChange();
    },
  };
}