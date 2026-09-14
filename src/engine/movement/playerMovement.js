/**
 * PLAYER MOVEMENT
 *
 * Movimento progressivo dei giocatori.
 *
 * La posizione attuale converge
 * verso il target tattico.
 *
 * Nessun teleport.
 */

function clamp(
  value,
  min,
  max
) {
  return Math.max(
    min,
    Math.min(
      max,
      value
    )
  );
}


function distance(
  a,
  b
) {
  const dx =
    (b.x ?? 0) -
    (a.x ?? 0);

  const dy =
    (b.y ?? 0) -
    (a.y ?? 0);

  return Math.sqrt(
    dx * dx +
    dy * dy
  );
}


/**
 * Velocità base.
 *
 * Coordinate campo 0-1.
 */
function getPlayerSpeed(
  player
) {
  const acceleration =
    player.attributes
      ?.physical
      ?.accelerazione ??
    50;

  const speed =
    player.attributes
      ?.physical
      ?.velocita ??
    50;

  const agility =
    player.attributes
      ?.physical
      ?.agilita ??
    50;

  const physical =
    (
      acceleration +
      speed +
      agility
    ) /
    3;

  /**
   * Circa 0.015 - 0.035
   * per tick.
   */
  return (
    0.012 +
    (physical / 99) *
      0.023
  );
}


/**
 * Muove un singolo giocatore.
 */
export function updatePlayerMovement(
  player,
  deltaSimulationSeconds = 0.6
) {
  if (!player) {
    return;
  }

  if (!player.position) {
    player.position = {
      x: 0.5,
      y: 0.5,
    };
  }

  if (!player.targetPosition) {
    player.targetPosition = {
      x:
        player.position.x,

      y:
        player.position.y,
    };
  }

  const target =
    player.targetPosition;

  const current =
    player.position;

  const distanceToTarget =
    distance(
      current,
      target
    );

  if (
    distanceToTarget <
    0.001
  ) {
    player.position = {
      x:
        target.x,

      y:
        target.y,
    };

    player.velocity = {
      x: 0,
      y: 0,
    };

    return;
  }

  const speed =
    getPlayerSpeed(
      player
    );

  /**
   * La velocità tiene conto
   * anche del tempo simulato.
   */
  const movement =
    clamp(
      speed *
        deltaSimulationSeconds,
      0,
      distanceToTarget
    );

  const ratio =
    movement /
    distanceToTarget;

  const nextX =
    current.x +
    (
      target.x -
      current.x
    ) *
    ratio;

  const nextY =
    current.y +
    (
      target.y -
      current.y
    ) *
    ratio;

  const previousX =
    current.x;

  const previousY =
    current.y;

  player.position = {
    x:
      clamp(
        nextX,
        0.02,
        0.98
      ),

    y:
      clamp(
        nextY,
        0.02,
        0.98
      ),
  };

  player.velocity = {
    x:
      player.position.x -
      previousX,

    y:
      player.position.y -
      previousY,
  };
}


/**
 * Aggiorna tutti i giocatori.
 */
export function updateTeamMovement(
  players = [],
  deltaSimulationSeconds
) {
  for (
    const player
    of players
  ) {
    updatePlayerMovement(
      player,
      deltaSimulationSeconds
    );
  }
}


/**
 * Aggiorna entrambe le squadre.
 */
export function updateAllPlayerMovement({
  homePlayers = [],
  awayPlayers = [],
  deltaSimulationSeconds = 0.6,
}) {
  updateTeamMovement(
    homePlayers,
    deltaSimulationSeconds
  );

  updateTeamMovement(
    awayPlayers,
    deltaSimulationSeconds
  );
}
