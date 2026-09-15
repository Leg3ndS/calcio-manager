/**
 * PLAYER MOVEMENT SYSTEM
 *
 * Gestisce il movimento progressivo
 * dei giocatori sul campo.
 *
 * PRINCIPI:
 * - nessun teleport
 * - posizione attuale separata dal target
 * - velocità basata sugli attributi
 * - movimento influenzato dalla palla
 * - movimento diverso in base al ruolo
 * - mantenimento della struttura tattica
 */

const FIELD_MIN = 0.025;
const FIELD_MAX = 0.975;


/**
 * Limita un valore.
 */
function clamp(value, min, max) {
  return Math.max(
    min,
    Math.min(max, value)
  );
}


/**
 * Distanza tra due punti.
 */
function distance(a, b) {
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


/**
 * Attributo fisico.
 */
function physicalAttribute(
  player,
  name,
  fallback = 50
) {
  return (
    player?.attributes?.physical?.[
      name
    ] ??
    fallback
  );
}


/**
 * Velocità del giocatore.
 *
 * Non usiamo direttamente "velocità"
 * perché accelerazione e agilità
 * devono influenzare il movimento.
 */
function getMovementSpeed(player) {
  const acceleration =
    physicalAttribute(
      player,
      "accelerazione"
    );

  const speed =
    physicalAttribute(
      player,
      "velocita"
    );

  const agility =
    physicalAttribute(
      player,
      "agilita"
    );

  const average =
    (
      acceleration +
      speed +
      agility
    ) / 3;

  /**
   * Coordinate campo 0-1.
   *
   * Il valore rappresenta
   * la distanza massima percorribile
   * in un secondo simulato.
   */
  return (
    0.018 +
    (
      average / 99
    ) *
      0.035
  );
}


/**
 * Determina il ruolo principale.
 */
function getRole(player) {
  return (
    player.role ??
    player.positionRole ??
    player.currentRole ??
    "centrocampista"
  );
}


/**
 * Restituisce una piccola influenza
 * della palla sul movimento.
 */
function getBallInfluence(
  player,
  ball,
  side
) {
  if (!ball) {
    return {
      x: 0,
      y: 0,
    };
  }

  const d =
    distance(
      player.position,
      ball
    );

  /**
   * La palla influenza maggiormente
   * i giocatori vicini.
   */
  const influence =
    clamp(
      1 -
        d / 0.45,
      0,
      1
    );

  /**
   * Direzione verso la palla.
   */
  if (d < 0.001) {
    return {
      x: 0,
      y: 0,
    };
  }

  const directionX =
    (
      ball.x -
      player.position.x
    ) / d;

  const directionY =
    (
      ball.y -
      player.position.y
    ) / d;

  /**
   * Non vogliamo che tutti
   * corrano sulla palla.
   *
   * L'influenza viene quindi
   * attenuata.
   */
  let factor =
    influence * 0.025;

  /**
   * I difensori si muovono meno
   * aggressivamente verso la palla.
   */
  const role =
    getRole(player)
      .toLowerCase();

  if (
    role.includes("difens") ||
    role.includes("terzino") ||
    role.includes("mediano")
  ) {
    factor *= 0.55;
  }

  /**
   * Gli attaccanti possono
   * allontanarsi maggiormente
   * dalla loro posizione.
   */
  if (
    role.includes("attacc") ||
    role.includes("ala") ||
    role.includes("trequart")
  ) {
    factor *= 1.20;
  }

  /**
   * Il lato della squadra
   * non cambia la direzione:
   * la palla è sempre globale.
   */
  void side;

  return {
    x:
      directionX *
      factor,

    y:
      directionY *
      factor,
  };
}


/**
 * Piccola separazione dai compagni.
 *
 * Evita che tutti i giocatori
 * finiscano nello stesso punto.
 */
function getSeparationForce(
  player,
  teammates
) {
  let forceX = 0;
  let forceY = 0;

  for (
    const teammate
    of teammates
  ) {
    if (
      teammate.id ===
      player.id
    ) {
      continue;
    }

    const d =
      distance(
        player.position,
        teammate.position
      );

    if (
      d < 0.075 &&
      d > 0.001
    ) {
      const dx =
        player.position.x -
        teammate.position.x;

      const dy =
        player.position.y -
        teammate.position.y;

      forceX +=
        (
          dx / d
        ) *
        0.012;

      forceY +=
        (
          dy / d
        ) *
        0.012;
    }
  }

  return {
    x: forceX,
    y: forceY,
  };
}


/**
 * Aggiorna il target del giocatore.
 *
 * Il target viene modificato
 * gradualmente, non la posizione.
 */
export function updatePlayerTarget({
  player,
  ball,
  teammates = [],
  opponents = [],
  side,
  tacticalTarget = null,
}) {
  if (!player) {
    return;
  }

  if (!player.position) {
    player.position = {
      x: 0.5,
      y: 0.5,
    };
  }

  /**
   * Base tattica.
   */
  const base =
    tacticalTarget ??
    player.targetPosition ??
    player.position;

  let targetX =
    base.x;

  let targetY =
    base.y;


  /**
   * Influenza della palla.
   */
  const ballInfluence =
    getBallInfluence(
      player,
      ball,
      side
    );

  targetX +=
    ballInfluence.x;

  targetY +=
    ballInfluence.y;


  /**
   * Separazione dai compagni.
   */
  const separation =
    getSeparationForce(
      player,
      teammates
    );

  targetX +=
    separation.x;

  targetY +=
    separation.y;


  /**
   * Pressione semplice:
   *
   * se un avversario è molto vicino,
   * il giocatore tende a non restare
   * esattamente sullo stesso punto.
   */
  let closestOpponentDistance =
    Infinity;

  for (
    const opponent
    of opponents
  ) {
    const d =
      distance(
        player.position,
        opponent.position
      );

    if (
      d <
      closestOpponentDistance
    ) {
      closestOpponentDistance =
        d;
    }
  }


  if (
    closestOpponentDistance <
    0.055
  ) {
    const role =
      getRole(player)
        .toLowerCase();

    /**
     * Gli attaccanti cercano
     * maggiormente lo spazio.
     */
    if (
      role.includes("attacc") ||
      role.includes("ala") ||
      role.includes("trequart")
    ) {
      targetY +=
        player.position.y <
        0.5
          ? -0.018
          : 0.018;
    }
  }


  player.targetPosition = {
    x:
      clamp(
        targetX,
        FIELD_MIN,
        FIELD_MAX
      ),

    y:
      clamp(
        targetY,
        FIELD_MIN,
        FIELD_MAX
      ),
  };
}


/**
 * Movimento progressivo.
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

  const current =
    player.position;

  const target =
    player.targetPosition;

  const d =
    distance(
      current,
      target
    );

  if (
    d < 0.001
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
    getMovementSpeed(
      player
    );

  const maxMovement =
    speed *
    deltaSimulationSeconds;

  const movement =
    Math.min(
      maxMovement,
      d
    );

  const ratio =
    movement /
    d;


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
        FIELD_MIN,
        FIELD_MAX
      ),

    y:
      clamp(
        nextY,
        FIELD_MIN,
        FIELD_MAX
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


  /**
   * Informazioni utili
   * per Debug Mode.
   */
  player.runtimeMovement = {
    distanceToTarget:
      d,

    speed,

    moving:
      movement > 0.0001,

    target: {
      x:
        player.targetPosition.x,

      y:
        player.targetPosition.y,
    },
  };
}


/**
 * Aggiorna una squadra.
 */
export function updateTeamMovement({
  players = [],
  opponents = [],
  ball = null,
  side = "home",
  tacticalTargets = {},
  deltaSimulationSeconds = 0.6,
}) {
  /**
   * Prima aggiorniamo i target
   * di tutti i giocatori.
   */
  for (
    const player
    of players
  ) {
    updatePlayerTarget({
      player,

      ball,

      teammates:
        players,

      opponents,

      side,

      tacticalTarget:
        tacticalTargets[
          player.id
        ] ??
        null,
    });
  }


  /**
   * Poi muoviamo i giocatori.
   *
   * Separare target e movimento
   * evita che un giocatore
   * influenzi immediatamente
   * il target di un altro nello
   * stesso ciclo.
   */
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
  ball = null,
  homeTacticalTargets = {},
  awayTacticalTargets = {},
  deltaSimulationSeconds = 0.6,
}) {
  updateTeamMovement({
    players:
      homePlayers,

    opponents:
      awayPlayers,

    ball,

    side:
      "home",

    tacticalTargets:
      homeTacticalTargets,

    deltaSimulationSeconds,
  });


  updateTeamMovement({
    players:
      awayPlayers,

    opponents:
      homePlayers,

    ball,

    side:
      "away",

    tacticalTargets:
      awayTacticalTargets,

    deltaSimulationSeconds,
  });
}
