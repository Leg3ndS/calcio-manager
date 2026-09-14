/**
 * SPATIAL GRID
 *
 * Campo diviso in 12 x 8 celle.
 *
 * Serve al Match Engine per conoscere:
 *
 * - presenza dei giocatori
 * - spazio libero
 * - pressione
 * - controllo territoriale
 *
 * Coordinate:
 *
 * x = 0 -> porta sinistra
 * x = 1 -> porta destra
 *
 * y = 0 -> fascia alta
 * y = 1 -> fascia bassa
 */

export const GRID_COLUMNS = 12;
export const GRID_ROWS = 8;

export const FIELD_WIDTH = 1;
export const FIELD_HEIGHT = 1;


function clamp(value, min, max) {
  return Math.max(
    min,
    Math.min(max, value)
  );
}


function getCellIndex(column, row) {
  return row * GRID_COLUMNS + column;
}


export function positionToCell(position) {
  const x = clamp(
    position?.x ?? 0.5,
    0,
    0.999999
  );

  const y = clamp(
    position?.y ?? 0.5,
    0,
    0.999999
  );

  const column = Math.floor(
    x * GRID_COLUMNS
  );

  const row = Math.floor(
    y * GRID_ROWS
  );

  return {
    column,
    row,
    index: getCellIndex(
      column,
      row
    ),
  };
}


export function createSpatialGrid() {
  const cells = [];

  for (
    let row = 0;
    row < GRID_ROWS;
    row += 1
  ) {
    for (
      let column = 0;
      column < GRID_COLUMNS;
      column += 1
    ) {
      cells.push({
        column,
        row,
        index: getCellIndex(
          column,
          row
        ),

        homePlayers: [],
        awayPlayers: [],

        homeInfluence: 0,
        awayInfluence: 0,

        pressure: 0,

        freeSpace: 1,

        ballDistance: 1,
      });
    }
  }

  return {
    columns: GRID_COLUMNS,
    rows: GRID_ROWS,

    cells,

    ballCell: null,

    totalHomeInfluence: 0,
    totalAwayInfluence: 0,
  };
}


function addPlayerToCell(
  grid,
  player,
  side
) {
  const cellPosition =
    positionToCell(
      player.position
    );

  const cell =
    grid.cells[
      cellPosition.index
    ];

  if (!cell) {
    return;
  }

  if (
    side === "home"
  ) {
    cell.homePlayers.push(
      player.id
    );
  }

  if (
    side === "away"
  ) {
    cell.awayPlayers.push(
      player.id
    );
  }
}


function calculateInfluence(
  player,
  playerSide,
  cell
) {
  const playerCell = {
    x:
      (cell.column + 0.5) /
      GRID_COLUMNS,

    y:
      (cell.row + 0.5) /
      GRID_ROWS,
  };

  const dx =
    player.position.x -
    playerCell.x;

  const dy =
    player.position.y -
    playerCell.y;

  const distance =
    Math.sqrt(
      dx * dx +
      dy * dy
    );

  const radius = 0.20;

  if (
    distance >= radius
  ) {
    return 0;
  }

  const proximity =
    1 -
    distance / radius;

  const influence =
    proximity *
    proximity;

  return influence;
}


export function updateSpatialGrid(
  grid,
  homePlayers = [],
  awayPlayers = [],
  ball = null
) {
  if (!grid) {
    return;
  }

  /**
   * Reset.
   */
  for (
    const cell
    of grid.cells
  ) {
    cell.homePlayers = [];
    cell.awayPlayers = [];

    cell.homeInfluence = 0;
    cell.awayInfluence = 0;

    cell.pressure = 0;

    cell.freeSpace = 1;
    cell.ballDistance = 1;
  }

  /**
   * Posizione giocatori.
   */
  for (
    const player
    of homePlayers
  ) {
    if (!player?.position) {
      continue;
    }

    addPlayerToCell(
      grid,
      player,
      "home"
    );
  }

  for (
    const player
    of awayPlayers
  ) {
    if (!player?.position) {
      continue;
    }

    addPlayerToCell(
      grid,
      player,
      "away"
    );
  }

  /**
   * Influenza territoriale.
   */
  for (
    const cell
    of grid.cells
  ) {
    const center = {
      x:
        (cell.column + 0.5) /
        GRID_COLUMNS,

      y:
        (cell.row + 0.5) /
        GRID_ROWS,
    };

    for (
      const player
      of homePlayers
    ) {
      if (!player?.position) {
        continue;
      }

      const dx =
        player.position.x -
        center.x;

      const dy =
        player.position.y -
        center.y;

      const distance =
        Math.sqrt(
          dx * dx +
          dy * dy
        );

      if (
        distance <
        0.22
      ) {
        const influence =
          Math.pow(
            1 -
              distance /
                0.22,
            2
          );

        cell.homeInfluence +=
          influence;
      }
    }

    for (
      const player
      of awayPlayers
    ) {
      if (!player?.position) {
        continue;
      }

      const dx =
        player.position.x -
        center.x;

      const dy =
        player.position.y -
        center.y;

      const distance =
        Math.sqrt(
          dx * dx +
          dy * dy
        );

      if (
        distance <
        0.22
      ) {
        const influence =
          Math.pow(
            1 -
              distance /
                0.22,
            2
          );

        cell.awayInfluence +=
          influence;
      }
    }

    /**
     * Limitiamo l'influenza.
     */
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

    /**
     * Pressione.
     */
    cell.pressure =
      clamp(
        cell.homeInfluence +
          cell.awayInfluence,
        0,
        1
      );

    /**
     * Spazio libero.
     */
    cell.freeSpace =
      clamp(
        1 -
          cell.pressure,
        0,
        1
      );
  }

  /**
   * Palla.
   */
  if (ball) {
    const ballCell =
      positionToCell(
        ball
      );

    grid.ballCell =
      ballCell;

    for (
      const cell
      of grid.cells
    ) {
      const dx =
        cell.column -
        ballCell.column;

      const dy =
        cell.row -
        ballCell.row;

      const cellDistance =
        Math.sqrt(
          dx * dx +
          dy * dy
        );

      cell.ballDistance =
        clamp(
          cellDistance /
            6,
          0,
          1
        );
    }
  }

  grid.totalHomeInfluence =
    grid.cells.reduce(
      (
        total,
        cell
      ) =>
        total +
        cell.homeInfluence,
      0
    );

  grid.totalAwayInfluence =
    grid.cells.reduce(
      (
        total,
        cell
      ) =>
        total +
        cell.awayInfluence,
      0
    );
}


export function getCellAtPosition(
  grid,
  position
) {
  if (!grid) {
    return null;
  }

  const {
    index,
  } =
    positionToCell(
      position
    );

  return (
    grid.cells[index] ??
    null
  );
}


export function getFreeSpaceAtPosition(
  grid,
  position
) {
  const cell =
    getCellAtPosition(
      grid,
      position
    );

  return (
    cell?.freeSpace ??
    1
  );
}


export function getPressureAtPosition(
  grid,
  position
) {
  const cell =
    getCellAtPosition(
      grid,
      position
    );

  return (
    cell?.pressure ??
    0
  );
}


export function getZoneInfluence(
  grid,
  position
) {
  const cell =
    getCellAtPosition(
      grid,
      position
    );

  if (!cell) {
    return {
      home: 0,
      away: 0,
      freeSpace: 1,
      pressure: 0,
    };
  }

  return {
    home:
      cell.homeInfluence,

    away:
      cell.awayInfluence,

    freeSpace:
      cell.freeSpace,

    pressure:
      cell.pressure,
  };
}
