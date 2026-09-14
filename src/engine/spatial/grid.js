/**
 * SPATIAL GRID
 *
 * Rappresentazione interna del campo.
 *
 * Non è la grafica del campo.
 * Phaser potrà avere un campo molto più dettagliato.
 *
 * La griglia serve al Match Engine per valutare:
 *
 * - spazio
 * - pressione
 * - presenza giocatori
 * - controllo territoriale
 * - densità
 */

export const GRID_COLUMNS = 12;
export const GRID_ROWS = 8;

export const FIELD_WIDTH = 1;
export const FIELD_HEIGHT = 1;

/**
 * Crea una cella vuota.
 */
export function createGridCell(row, column) {
  return {
    row,
    column,

    x:
      (column + 0.5) /
      GRID_COLUMNS,

    y:
      (row + 0.5) /
      GRID_ROWS,

    homeInfluence: 0,
    awayInfluence: 0,

    homePlayers: [],
    awayPlayers: [],

    pressureHome: 0,
    pressureAway: 0,

    freeSpace: 1,
  };
}

/**
 * Crea l'intera griglia.
 */
export function createSpatialGrid() {
  const cells = [];

  for (let row = 0; row < GRID_ROWS; row += 1) {
    for (
      let column = 0;
      column < GRID_COLUMNS;
      column += 1
    ) {
      cells.push(
        createGridCell(row, column)
      );
    }
  }

  return {
    columns: GRID_COLUMNS,
    rows: GRID_ROWS,
    cells,
  };
}

/**
 * Limita un valore tra min e max.
 */
function clamp(value, min, max) {
  return Math.max(
    min,
    Math.min(max, value)
  );
}

/**
 * Converte coordinate normalizzate
 * nella cella corrispondente.
 *
 * x = 0 → sinistra
 * x = 1 → destra
 *
 * y = 0 → alto
 * y = 1 → basso
 */
export function getCellIndex(x, y) {
  const safeX = clamp(x, 0, 0.999999);
  const safeY = clamp(y, 0, 0.999999);

  const column = Math.floor(
    safeX * GRID_COLUMNS
  );

  const row = Math.floor(
    safeY * GRID_ROWS
  );

  return (
    row * GRID_COLUMNS +
    column
  );
}

/**
 * Restituisce una cella.
 */
export function getCell(grid, x, y) {
  const index = getCellIndex(x, y);

  return grid.cells[index];
}

/**
 * Distanza normalizzata.
 */
export function distance(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;

  return Math.sqrt(
    dx * dx +
    dy * dy
  );
}

/**
 * Calcola l'influenza di un giocatore su una cella.
 *
 * Per ora usiamo una funzione semplice.
 *
 * In futuro potremo considerare:
 * - velocità
 * - orientamento
 * - ruolo
 * - pressing
 * - abilità difensive
 * - linea tattica
 * - campo visivo.
 */
function calculateInfluence(
  player,
  cell
) {
  const d = distance(
    player.position,
    cell
  );

  const influence =
    1 / (1 + d * 12);

  return clamp(
    influence,
    0,
    1
  );
}

/**
 * Reset della griglia.
 */
export function resetSpatialGrid(grid) {
  for (const cell of grid.cells) {
    cell.homeInfluence = 0;
    cell.awayInfluence = 0;

    cell.homePlayers = [];
    cell.awayPlayers = [];

    cell.pressureHome = 0;
    cell.pressureAway = 0;

    cell.freeSpace = 1;
  }

  return grid;
}

/**
 * Aggiorna la griglia usando i giocatori.
 *
 * Per ora accetta direttamente due array.
 */
export function updateSpatialGrid(
  grid,
  homePlayers,
  awayPlayers
) {
  resetSpatialGrid(grid);

  for (const player of homePlayers) {
    if (
      !player ||
      !player.position
    ) {
      continue;
    }

    const playerCellIndex =
      getCellIndex(
        player.position.x,
        player.position.y
      );

    grid.cells[
      playerCellIndex
    ].homePlayers.push(
      player.id
    );

    for (const cell of grid.cells) {
      const influence =
        calculateInfluence(
          player,
          cell
        );

      cell.homeInfluence +=
        influence;
    }
  }

  for (const player of awayPlayers) {
    if (
      !player ||
      !player.position
    ) {
      continue;
    }

    const playerCellIndex =
      getCellIndex(
        player.position.x,
        player.position.y
      );

    grid.cells[
      playerCellIndex
    ].awayPlayers.push(
      player.id
    );

    for (const cell of grid.cells) {
      const influence =
        calculateInfluence(
          player,
          cell
        );

      cell.awayInfluence +=
        influence;
    }
  }

  for (const cell of grid.cells) {
    cell.homeInfluence =
      clamp(
        cell.homeInfluence,
        0,
        1
      );

    cell.awayInfluence =
      clamp(
        cell.awayInfluence,
        0,
        1
      );

    cell.pressureHome =
      cell.awayInfluence;

    cell.pressureAway =
      cell.homeInfluence;

    const totalInfluence =
      cell.homeInfluence +
      cell.awayInfluence;

    cell.freeSpace =
      clamp(
        1 - totalInfluence,
        0,
        1
      );
  }

  return grid;
}
