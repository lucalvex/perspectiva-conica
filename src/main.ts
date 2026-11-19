import type { Vec2 } from './core/geometry';
import { runPipeline } from './core/pipeline';
import { ProjectionError } from './core/projection';
import { boundingBoxCenter, enclosingCubeCorners, orbitRotation, transformPoints } from './core/transform';
import type { SceneInput } from './core/types';
import { Viewport, Window2D, applyViewport, buildViewportTransform, computeWindow } from './core/viewport';
import { PRESETS } from './scene/presets';
import { drawScene, prepareCanvas } from './ui/canvas';
import { errorList } from './ui/components';
import { createSceneForm } from './ui/form';
import { attachOrbitControls } from './ui/orbit';

/** Margem, em pixels CSS, entre a borda do canvas e a viewport. */
const VIEWPORT_MARGIN = 30;

function byId<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing element #${id}`);
  return element as T;
}

const canvas = byId<HTMLCanvasElement>('view');
const status = byId<HTMLElement>('status');
const rotationInfo = byId<HTMLElement>('rotation-info');
const resetRotationButton = byId<HTMLButtonElement>('reset-rotation');
const presetSelect = byId<HTMLSelectElement>('preset');
const loadPresetButton = byId<HTMLButtonElement>('load-preset');
const form = createSceneForm();

for (const preset of PRESETS) {
  presetSelect.add(new Option(preset.label, preset.id));
}

/** Converte radianos em graus inteiros no intervalo (−180, 180]. */
function toDegrees(angle: number): number {
  const degrees = Math.round((angle * 180) / Math.PI) % 360;
  const wrapped = degrees > 180 ? degrees - 360 : degrees <= -180 ? degrees + 360 : degrees;
  return wrapped === 0 ? 0 : wrapped;
}

/**
 * Janela que contém o objeto em qualquer rotação: a projeção do cubo que
 * envolve todas as posições possíveis. Mantém escala e centro estáveis
 * enquanto o objeto gira. Retorna null se algum canto não tiver projeção
 * válida (atrás do observador ou no plano de fuga).
 */
function stableWindow(scene: SceneInput): Window2D | null {
  const vertices = scene.object.vertices;
  const corners = enclosingCubeCorners(vertices, boundingBoxCenter(vertices));
  try {
    const result = runPipeline({ ...scene, object: { vertices: corners, surfaces: [] } });
    if (result.projected.some((vertex) => vertex.behindViewer)) return null;
    return computeWindow(result.planeCoordinates);
  } catch (error) {
    if (error instanceof ProjectionError) return null;
    throw error;
  }
}

/** Lê o formulário, aplica a rotação, roda o pipeline e redesenha. */
function update(): void {
  const surface = prepareCanvas(canvas);
  const viewport: Viewport = {
    uMin: VIEWPORT_MARGIN,
    uMax: surface.width - VIEWPORT_MARGIN,
    vMin: VIEWPORT_MARGIN,
    vMax: surface.height - VIEWPORT_MARGIN,
  };

  const { yaw, pitch } = orbit.state();
  const rotated = toDegrees(yaw) !== 0 || toDegrees(pitch) !== 0;
  rotationInfo.textContent = rotated
    ? `Rotação: ${toDegrees(yaw)}° em torno de y, ${toDegrees(pitch)}° em torno de x`
    : 'Posição original. Arraste o desenho ou use as setas do teclado para girar o objeto.';
  resetRotationButton.disabled = !rotated;

  const reading = form.read();
  if (!reading.scene) {
    drawScene(surface, viewport, null);
    status.replaceChildren(errorList(reading.errors));
    return;
  }

  // Na posição original o objeto vai direto ao pipeline, exatamente como no enunciado
  const original = reading.scene;
  const scene: SceneInput = rotated
    ? {
        ...original,
        object: {
          ...original.object,
          vertices: transformPoints(
            orbitRotation(boundingBoxCenter(original.object.vertices), yaw, pitch),
            original.object.vertices,
          ),
        },
      }
    : original;

  try {
    const result = runPipeline(scene);
    const planeCoordinates: readonly Vec2[] = result.planeCoordinates;
    const window2D = (rotated ? stableWindow(original) : null) ?? computeWindow(planeCoordinates);
    const transform = buildViewportTransform(window2D, viewport);
    const devicePoints = applyViewport(transform, planeCoordinates);

    drawScene(surface, viewport, {
      devicePoints,
      surfaces: scene.object.surfaces,
      frontFacing: result.frontFacing,
      hideBackFaces: reading.hideBackFaces,
      showLabels: reading.showLabels,
    });
    status.replaceChildren();
  } catch (error) {
    // Erros de dados viram mensagem na tela; erros de programação continuam estourando
    if (!(error instanceof ProjectionError)) throw error;
    drawScene(surface, viewport, null);
    status.replaceChildren(errorList([error.message]));
  }
}

/** Agrupa várias alterações seguidas num único redesenho, no próximo quadro da tela. */
let scheduled = false;
function scheduleUpdate(): void {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => {
    scheduled = false;
    update();
  });
}

const orbit = attachOrbitControls(canvas, scheduleUpdate);

form.onChange(scheduleUpdate);

// Redesenha sempre que o quadro muda de tamanho: janela redimensionada,
// mensagens de erro aparecendo embaixo dele ou zoom do navegador
new ResizeObserver(scheduleUpdate).observe(byId<HTMLElement>('canvas-frame'));
resetRotationButton.addEventListener('click', () => orbit.reset());
loadPresetButton.addEventListener('click', () => {
  const preset = PRESETS.find((candidate) => candidate.id === presetSelect.value);
  if (preset) {
    orbit.reset();
    form.load(preset);
  }
});

form.load(PRESETS[0]);