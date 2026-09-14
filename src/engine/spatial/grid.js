/**
 * SPATIAL GRID
 *
 * Campo diviso in 12 x 8 celle.
 *
 * Gestisce:
 * - presenza giocatori
 * - influenza territoriale
 * - spazio libero
 * - pressione
 * - distanza
 * - zona della palla
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


/**
 * Distanza tra due punti del campo.
 *
 * Esportata perché viene utilizzata
 * anche dalla Utility AI.
 */
export function distance(a, b) {
  const dx =
    (b?.x ?? 0) -
    (a?.x ?? 0);

  const dy =
    (b?.y ?? 0) -
    (a?.y ?? 0);

  return Math.sqrt(
    dx * dx +
    dy * dy
  );
}


function getCellIndex(column, row) {
  return (
    row * GRID_COLUMNS +
    column
  );
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

        index:
          getCellIndex(
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
    columns:
      GRID_COLUMNS,

    rows:
      GRID_ROWS,

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

  if (side === "home") {
    cell.homePlayers.push(
      player.id
    );
  }

  if (side === "away") {
    cell.awayPlayers.push(
      player.id
    );
  }
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
   * RESET CELLE
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
   * POSIZIONI GIOCATORI
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
   * INFLUENZA TERRITORIALE
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


    /**
     * INFLUENZA HOME
     */
    for (
      const player
      of homePlayers
    ) {
      if (!player?.position) {
        continue;
      }

      const playerDistance =
        distance(
          player.position,
          center
        );

      const radius = 0.22;

      if (
        playerDistance <
        radius
      ) {
        const influence =
          Math.pow(
            1 -
              playerDistance /
                radius,
            2
          );

        cell.homeInfluence +=
          influence;
      }
    }


    /**
     * INFLUENZA AWAY
     */
    for (
      const player
      of awayPlayers
    ) {
      if (!player?.position) {
        continue;
      }

      const playerDistance =
        distance(
          player.position,
          center
        );

      const radius = 0.22;

      if (
        playerDistance <
        radius
      ) {
        const influence =
          Math.pow(
            1 -
              playerDistance /
                radius,
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
     * PRESSIONE
     *
     * La pressione aumenta quando
     * entrambe le squadre sono presenti
     * nella stessa zona.
     */
    cell.pressure =
      clamp(
        (
          cell.homeInfluence *
          cell.awayInfluence *
          2
        ) +
        (
          Math.max(
            cell.homeInfluence,
            cell.awayInfluence
          ) *
          0.15
        ),
        0,
        1
      );


    /**
     * SPAZIO LIBERO
     */
    const occupation =
      Math.max(
        cell.homeInfluence,
        cell.awayInfluence
      );

    cell.freeSpace =
      clamp(
        1 -
          occupation,
        0,
        1
      );
  }


  /**
   * POSIZIONE PALLA
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
  else {
    grid.ballCell =
      null;
  }


  /**
   * INFLUENZA TOTALE
   */
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
