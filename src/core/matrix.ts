/**
 * Matriz densa armazenada por linhas: matrix[linha][coluna].
 * O readonly impede que alguma função altere uma matriz recebida.
 */
export type Matrix = readonly (readonly number[])[];

/**
 * Produto matricial left × right.
 * Se left é m×n, right precisa ser n×p, e o resultado é m×p.
 */
export function multiply(left: Matrix, right: Matrix): number[][] {
  const inner = right.length;
  const columns = inner > 0 ? right[0].length : 0;

  for (const row of left) {
    if (row.length !== inner) {
      throw new Error(
        `Cannot multiply: left operand has ${row.length} columns but right operand has ${inner} rows`,
      );
    }
  }

  return left.map((row) => {
    const output = new Array<number>(columns).fill(0);
    for (let column = 0; column < columns; column++) {
      // Elemento (i, j) = linha i de left · coluna j de right
      let sum = 0;
      for (let k = 0; k < inner; k++) {
        sum += row[k] * right[k][column];
      }
      output[column] = sum;
    }
    return output;
  });
}

/** Extrai a coluna de índice dado como um vetor de números. */
export function getColumn(matrix: Matrix, index: number): number[] {
  return matrix.map((row) => row[index]);
}