import type { Vec3 } from '../core/geometry';

/** Eixos na ordem em que aparecem nas tabelas. */
export const AXES = ['x', 'y', 'z'] as const;
export type Axis = (typeof AXES)[number];

interface ElementOptions {
  readonly className?: string;
  readonly text?: string;
  readonly attributes?: Readonly<Record<string, string>>;
  readonly children?: readonly (Node | string)[];
}

/**
 * Cria um elemento HTML já configurado. É a base de todos os componentes:
 * evita repetir createElement + className + setAttribute em cada lugar.
 */
export function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  options: ElementOptions = {},
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (options.className) node.className = options.className;
  if (options.text !== undefined) node.textContent = options.text;
  for (const [name, value] of Object.entries(options.attributes ?? {})) {
    node.setAttribute(name, value);
  }
  if (options.children) node.append(...options.children);
  return node;
}

/** Mostra números nos campos com vírgula decimal, sem arredondar. */
export function toInputValue(value: number): string {
  return String(value).replace('.', ',');
}

interface NumberInputOptions {
  readonly id?: string;
  readonly axis?: Axis;
  readonly value?: number;
  readonly ariaLabel?: string;
}

/** Campo numérico: aceita vírgula decimal e alinha os números à direita. */
export function numberInput(options: NumberInputOptions = {}): HTMLInputElement {
  const input = element('input', {
    className: 'field-input text-right',
    attributes: { inputmode: 'decimal', autocomplete: 'off', spellcheck: 'false' },
  });
  if (options.id) input.id = options.id;
  if (options.axis) input.dataset.axis = options.axis;
  if (options.value !== undefined) input.value = toInputValue(options.value);
  if (options.ariaLabel) input.setAttribute('aria-label', options.ariaLabel);
  return input;
}

/** Campo numérico com o rótulo visível em cima, usado no ponto de vista C. */
export function labeledNumberField(id: string, labelText: string): HTMLLabelElement {
  return element('label', {
    className: 'field-label grid gap-0.5',
    children: [labelText, numberInput({ id })],
  });
}

export type RemoveKind = 'vertex' | 'surface';

/** Botão × que remove a linha da tabela onde está. */
export function removeButton(kind: RemoveKind): HTMLButtonElement {
  return element('button', {
    className: 'btn-remove',
    text: '×',
    attributes: { type: 'button', 'data-remove': kind },
  });
}

/**
 * Dá nome a uma linha de tabela (V1, P2, S3…) e atualiza os rótulos de
 * acessibilidade dos campos e do botão. Usado ao criar a linha e ao
 * renumerar depois de uma remoção, para os dois casos nunca divergirem.
 */
export function setRowName(row: HTMLTableRowElement, name: string): void {
  row.cells[0].textContent = name;
  row.querySelectorAll<HTMLInputElement>('input').forEach((input) => {
    const axis = input.dataset.axis;
    input.setAttribute('aria-label', axis ? `${axis.toUpperCase()} de ${name}` : `Vértices de ${name}`);
  });
  row.querySelector('button')?.setAttribute('aria-label', `Remover ${name}`);
}

interface CoordinateRowOptions {
  /** Nome exibido na primeira coluna (P1, R0, V1…). */
  readonly name: string;
  /** Prefixo dos ids dos campos (p1 gera p1-x, p1-y, p1-z). Omitido nas linhas de vértice. */
  readonly idPrefix?: string;
  readonly values?: Vec3;
  /** Quando informado, a linha ganha um botão de remover. */
  readonly removeKind?: RemoveKind;
}

/**
 * Linha de tabela com três campos X, Y e Z. Serve aos pontos do plano,
 * a R0 e a cada vértice do objeto.
 */
export function coordinateRow(options: CoordinateRowOptions): HTMLTableRowElement {
  const cells: HTMLTableCellElement[] = [element('th', { attributes: { scope: 'row' } })];

  for (const axis of AXES) {
    const input = numberInput({
      id: options.idPrefix ? `${options.idPrefix}-${axis}` : undefined,
      axis,
      value: options.values?.[axis],
    });
    cells.push(element('td', { children: [input] }));
  }

  if (options.removeKind) {
    cells.push(element('td', { className: 'w-8', children: [removeButton(options.removeKind)] }));
  }

  const row = element('tr', { children: cells });
  setRowName(row, options.name);
  return row;
}

/** Linha de superfície: lista de vértices (VS), contagem (NVPS) e botão de remover. */
export function surfaceRow(name: string, vertices: readonly number[] = []): HTMLTableRowElement {
  const input = element('input', {
    className: 'field-input',
    attributes: { inputmode: 'numeric', autocomplete: 'off', spellcheck: 'false', placeholder: '1 2 3' },
  });
  input.value = vertices.join(' ');

  const row = element('tr', {
    children: [
      element('th', { attributes: { scope: 'row' } }),
      element('td', { children: [input] }),
      element('td', { className: 'nvps w-11 text-center tabular-nums text-ink-soft' }),
      element('td', { className: 'w-8', children: [removeButton('surface')] }),
    ],
  });
  setRowName(row, name);
  return row;
}

/** Lista de mensagens de erro. textContent impede que o texto digitado vire HTML. */
export function errorList(messages: readonly string[]): HTMLUListElement {
  return element('ul', {
    className: 'list-disc border-l-4 border-danger bg-danger-soft py-2.5 pr-3.5 pl-8 text-danger',
    children: messages.map((message) => element('li', { text: message })),
  });
}