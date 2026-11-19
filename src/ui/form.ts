import { Vec3, vec3 } from '../core/geometry';
import type { SceneInput } from '../core/types';
import type { Preset, ReferenceChoice } from '../scene/presets';
import {
  AXES,
  Axis,
  coordinateRow,
  labeledNumberField,
  setRowName,
  surfaceRow,
  toInputValue,
} from './components';

export interface FormReading {
  /** Nulo quando algum campo é inválido; os motivos ficam em errors. */
  readonly scene: SceneInput | null;
  readonly hideBackFaces: boolean;
  readonly showLabels: boolean;
  readonly errors: readonly string[];
}

export interface SceneForm {
  read(): FormReading;
  load(preset: Preset): void;
  onChange(listener: () => void): void;
}

function byId<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing element #${id}`);
  return element as T;
}

/** Aceita vírgula decimal e o sinal de menos tipográfico (−). */
export function parseDecimal(raw: string): number | null {
  const normalized = raw.trim().replace(/\u2212/g, '-').replace(',', '.');
  if (!/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(normalized)) return null;
  return Number(normalized);
}

function markInvalid(input: HTMLInputElement, invalid: boolean): void {
  if (invalid) input.setAttribute('aria-invalid', 'true');
  else input.removeAttribute('aria-invalid');
}

export function createSceneForm(): SceneForm {
  const root = byId<HTMLElement>('inputs');
  const vertexBody = byId<HTMLTableSectionElement>('vertex-rows');
  const surfaceBody = byId<HTMLTableSectionElement>('surface-rows');
  const vertexCount = byId<HTMLElement>('vertex-count');
  const surfaceCount = byId<HTMLElement>('surface-count');
  const referenceChoice = byId<HTMLSelectElement>('reference-choice');
  const hideBackFaces = byId<HTMLInputElement>('hide-back-faces');
  const showLabels = byId<HTMLInputElement>('show-labels');

  // Campos fixos, montados com os mesmos componentes das linhas dinâmicas
  byId<HTMLElement>('viewpoint-fields').append(
    labeledNumberField('c-x', 'a (x)'),
    labeledNumberField('c-y', 'b (y)'),
    labeledNumberField('c-z', 'c (z)'),
  );
  byId<HTMLElement>('plane-rows').append(
    coordinateRow({ name: 'P1', idPrefix: 'p1' }),
    coordinateRow({ name: 'P2', idPrefix: 'p2' }),
    coordinateRow({ name: 'P3', idPrefix: 'p3' }),
  );
  byId<HTMLElement>('reference-rows').append(coordinateRow({ name: 'R0', idPrefix: 'r0' }));

  const listeners: Array<() => void> = [];
  const notify = (): void => listeners.forEach((listener) => listener());

  const tripleInput = (prefix: string, axis: Axis): HTMLInputElement => byId<HTMLInputElement>(`${prefix}-${axis}`);

  function writeTriple(prefix: string, value: Vec3): void {
    for (const axis of AXES) tripleInput(prefix, axis).value = toInputValue(value[axis]);
  }

  function readTriple(prefix: string, name: string, axisNames: readonly string[], errors: string[]): Vec3 | null {
    const values: number[] = [];
    AXES.forEach((axis, position) => {
      const input = tripleInput(prefix, axis);
      const value = parseDecimal(input.value);
      markInvalid(input, value === null);
      if (value === null) errors.push(`${name}: preencha ${axisNames[position]} com um número.`);
      else values.push(value);
    });
    return values.length === 3 ? vec3(values[0], values[1], values[2]) : null;
  }

  /** Copia o P escolhido para R0 e trava os campos de R0, exceto em "Outro ponto". */
  function syncReference(): void {
    const choice = referenceChoice.value as ReferenceChoice;
    for (const axis of AXES) {
      const target = tripleInput('r0', axis);
      target.readOnly = choice !== 'custom';
      if (choice !== 'custom') target.value = tripleInput(choice, axis).value;
    }
  }

  /** Atualiza os nomes V1, V2…, S1, S2… e as contagens NV e NS depois de incluir ou remover linhas. */
  function renumber(): void {
    Array.from(vertexBody.rows).forEach((row, index) => setRowName(row, `V${index + 1}`));
    Array.from(surfaceBody.rows).forEach((row, index) => setRowName(row, `S${index + 1}`));
    vertexCount.textContent = `NV = ${vertexBody.rows.length}`;
    surfaceCount.textContent = `NS = ${surfaceBody.rows.length}`;
  }

  function addVertexRow(values: Vec3 = vec3(0, 0, 0)): void {
    vertexBody.append(coordinateRow({ name: `V${vertexBody.rows.length + 1}`, values, removeKind: 'vertex' }));
  }

  function addSurfaceRow(vertices: readonly number[] = []): void {
    surfaceBody.append(surfaceRow(`S${surfaceBody.rows.length + 1}`, vertices));
  }

  function readVertices(errors: string[]): Vec3[] | null {
    if (vertexBody.rows.length === 0) {
      errors.push('Adicione ao menos um vértice ao objeto.');
      return null;
    }

    const vertices: Vec3[] = [];
    let valid = true;
    Array.from(vertexBody.rows).forEach((row, index) => {
      const values = Array.from(row.querySelectorAll<HTMLInputElement>('input')).map((input) => {
        const value = parseDecimal(input.value);
        markInvalid(input, value === null);
        return value;
      });
      if (values.some((value) => value === null)) {
        errors.push(`V${index + 1}: preencha X, Y e Z com números.`);
        valid = false;
      } else {
        vertices.push(vec3(values[0] as number, values[1] as number, values[2] as number));
      }
    });
    return valid ? vertices : null;
  }

  /** Lê o VS de cada superfície, valida e converte para índices começando em 0. */
  function readSurfaces(vertexTotal: number, errors: string[]): number[][] {
    const surfaces: number[][] = [];
    Array.from(surfaceBody.rows).forEach((row, index) => {
      const name = `S${index + 1}`;
      const input = row.querySelector('input') as HTMLInputElement;
      const nvpsCell = row.querySelector('.nvps') as HTMLElement;
      const tokens = input.value.split(/[\s,;]+/).filter((token) => token !== '');
      nvpsCell.textContent = String(tokens.length);

      const problems: string[] = [];
      const indices: number[] = [];
      for (const token of tokens) {
        const value = Number(token);
        if (!Number.isInteger(value)) problems.push(`“${token}” não é o número de um vértice`);
        else if (value < 1 || value > vertexTotal) problems.push(`o vértice ${value} não existe (NV = ${vertexTotal})`);
        else indices.push(value - 1);
      }
      if (problems.length === 0 && tokens.length < 3) {
        problems.push('uma superfície precisa de ao menos 3 vértices');
      }
      if (problems.length === 0 && new Set(indices).size !== indices.length) {
        problems.push('há vértices repetidos');
      }

      markInvalid(input, problems.length > 0);
      if (problems.length > 0) errors.push(`${name}: ${problems.join('; ')}.`);
      else surfaces.push(indices);
    });
    return surfaces;
  }

  function read(): FormReading {
    const errors: string[] = [];
    syncReference();

    const viewpoint = readTriple('c', 'Ponto de vista C', ['a', 'b', 'c'], errors);
    const p1 = readTriple('p1', 'P1', ['X', 'Y', 'Z'], errors);
    const p2 = readTriple('p2', 'P2', ['X', 'Y', 'Z'], errors);
    const p3 = readTriple('p3', 'P3', ['X', 'Y', 'Z'], errors);
    const reference = readTriple('r0', 'R0', ['X', 'Y', 'Z'], errors);
    const vertices = readVertices(errors);
    const surfaces = vertices ? readSurfaces(vertices.length, errors) : [];

    const scene: SceneInput | null =
      errors.length === 0 && viewpoint && p1 && p2 && p3 && reference && vertices
        ? {
            viewpoint,
            planePoints: [p1, p2, p3],
            planeReference: reference,
            object: { vertices, surfaces },
          }
        : null;

    return { scene, hideBackFaces: hideBackFaces.checked, showLabels: showLabels.checked, errors };
  }

  function load(preset: Preset): void {
    writeTriple('c', preset.viewpoint);
    writeTriple('p1', preset.planePoints[0]);
    writeTriple('p2', preset.planePoints[1]);
    writeTriple('p3', preset.planePoints[2]);
    referenceChoice.value = preset.reference;
    if (preset.customReference) writeTriple('r0', preset.customReference);

    vertexBody.replaceChildren();
    preset.vertices.forEach((vertex) => addVertexRow(vertex));
    surfaceBody.replaceChildren();
    preset.surfaces.forEach((surface) => addSurfaceRow(surface));

    renumber();
    syncReference();
    notify();
  }

  // Um único ouvinte no contêiner atende todos os campos, inclusive as linhas criadas depois
  root.addEventListener('input', notify);
  root.addEventListener('change', notify);
  root.addEventListener('click', (event) => {
    const button = (event.target as HTMLElement).closest('button');
    if (!button) return;

    if (button.dataset.remove) {
      button.closest('tr')?.remove();
      renumber();
      notify();
    } else if (button.id === 'add-vertex') {
      addVertexRow();
      renumber();
      vertexBody.rows[vertexBody.rows.length - 1].querySelector('input')?.focus();
      notify();
    } else if (button.id === 'add-surface') {
      addSurfaceRow();
      renumber();
      surfaceBody.rows[surfaceBody.rows.length - 1].querySelector('input')?.focus();
      notify();
    }
  });

  return {
    read,
    load,
    onChange: (listener) => listeners.push(listener),
  };
}