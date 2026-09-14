/**
 * POSSESSION SYSTEM
 *
 * Responsabilità:
 *
 * - gestione del giocatore in possesso
 * - scelta/esecuzione del passaggio
 * - utilizzo della decisione dell'Utility AI
 * - pressione tramite Spatial Grid
 * - probabilità di completamento
 * - intercetti
 * - ricezione
 * - cambio possesso
 *
 * IMPORTANTE:
 *
 * L'Utility AI decide COSA fare.
 * Questo sistema esegue la decisione.
 *
 * Non viene quindi ricalcolata una seconda
 * decisione indipendente.
 */

import {
  POSSESSION,
} from "../worldState.js";


/**
 * ---------------------------------------------------------
 * COSTANTI
 * ---------------------------------------------------------
 */

const MIN_PROBABILITY = 0.05;
const MAX_PROBABILITY = 0.95;

const PASS_COOLDOWN_SECONDS = 0.25;

const MAX_PASS_DISTANCE = 0.75;

const MIN_PASS_DISTANCE = 0.025;


/**
 * ---------------------------------------------------------
 * UTILITY
 * ---------------------------------------------------------
 */

function clamp(value, min, max) {
  return Math.max(
    min,
    Math.min(max, value)
  );
}


function clamp01(value) {
  return clamp(
    value,
    0,
    1
  );
}


function distance(a, b) {
  if (!a || !b) {
    return Infinity;
  }

  const dx =
    a.x - b.x;

  const dy =
    a.y - b.y;

  return Math.sqrt(
    dx * dx +
    dy * dy
  );
}


function normalizePosition(position) {
  if (!position) {
    return null;
  }

  return {
    x: clamp01(
      Number(position.x) || 0
    ),

    y: clamp01(
      Number(position.y) || 0
    ),
  };
}


/**
 * ---------------------------------------------------------
 * POSSESSION SIDE
 * ---------------------------------------------------------
 */

export function getPlayerSide(
  state,
  playerId
) {
  if (!state || !playerId) {
    return POSSESSION.NONE;
  }

  const player =
    findPlayer(
      state,
      playerId
    );

  if (!player) {
    return POSSESSION.NONE;
  }

  const homeId =
    state.teams?.home?.id;

  const awayId =
    state.teams?.away?.id;

  if (
    player.teamId === homeId
  ) {
    return POSSESSION.HOME;
  }

  if (
    player.teamId === awayId
  ) {
    return POSSESSION.AWAY;
  }

  return POSSESSION.NONE;
}


function sideForTeamId(
  state,
  teamId
) {
  if (
    teamId ===
    state.teams?.home?.id
  ) {
    return POSSESSION.HOME;
  }

  if (
    teamId ===
    state.teams?.away?.id
  ) {
    return POSSESSION.AWAY;
  }

  return POSSESSION.NONE;
}


/**
 * ---------------------------------------------------------
 * PLAYER LOOKUP
 * ---------------------------------------------------------
 */

function getAllPlayers(state) {
  if (
    Array.isArray(
      state.players
    )
  ) {
    return state.players;
  }

  const home =
    state.teams?.home?.players ??
    [];

  const away =
    state.teams?.away?.players ??
    [];

  return [
    ...home,
    ...away,
  ];
}


function findPlayer(
  state,
  playerId
) {
  if (!playerId) {
    return null;
  }

  const players =
    getAllPlayers(state);

  return (
    players.find(
      (player) =>
        player?.id === playerId
    ) ??
    null
  );
}


function getActivePlayers(
  state
) {
  return getAllPlayers(
    state
  ).filter(
    (player) =>
      player &&
      player.isActive !== false &&
      player.redCard !== true &&
      player.redCards !== true
  );
}


/**
 * ---------------------------------------------------------
 * POSSESSION GET / SET
 * ---------------------------------------------------------
 */

export function getPossessingPlayer(
  state
) {
  if (
    !state ||
    !state.possessionPlayerId
  ) {
    return null;
  }

  return findPlayer(
    state,
    state.possessionPlayerId
  );
}


export function setPossession(
  state,
  side,
  playerId
) {
  state.possession =
    side;

  state.possessionPlayerId =
    playerId ?? null;

  const player =
    playerId
      ? findPlayer(
          state,
          playerId
        )
      : null;

  if (player) {
    player.hasBall = true;
  }

  for (
    const other
    of getAllPlayers(state)
  ) {
    if (
      !playerId ||
      other.id !== playerId
    ) {
      other.hasBall = false;
    }
  }
}


/**
 ---------------------------------------------------------
 * TEAM / OPPONENT
 * ---------------------------------------------------------
 */

function getPlayersForSide(
  state,
  side
) {
  const teamId =
    side === POSSESSION.HOME
      ? state.teams?.home?.id
      : state.teams?.away?.id;

  return getActivePlayers(
    state
  ).filter(
    (player) =>
      player.teamId === teamId
  );
}


function getOpponentPlayers(
  state,
  side
) {
  const opponentSide =
    side === POSSESSION.HOME
      ? POSSESSION.AWAY
      : POSSESSION.HOME;

  return getPlayersForSide(
    state,
    opponentSide
  );
}


/**
 * ---------------------------------------------------------
 * SPATIAL GRID
 * ---------------------------------------------------------
 *
 * Il sistema può ricevere una Spatial Grid con
 * implementazioni diverse. Cerchiamo quindi di
 * utilizzare le API disponibili senza rendere
 * il motore dipendente da una singola implementazione.
 */

function getGridCell(
  spatialGrid,
  position
) {
  if (
    !spatialGrid ||
    !position
  ) {
    return null;
  }

  if (
    typeof spatialGrid.getCellAtPosition ===
    "function"
  ) {
    return spatialGrid.getCellAtPosition(
      position.x,
      position.y
    );
  }

  if (
    typeof spatialGrid.getCell ===
    "function"
  ) {
    return spatialGrid.getCell(
      position.x,
      position.y
    );
  }

  if (
    typeof spatialGrid.getCellForPosition ===
    "function"
  ) {
    return spatialGrid.getCellForPosition(
      position.x,
      position.y
    );
  }

  return null;
}


function getPressure(
  spatialGrid,
  position,
  opponents = []
) {
  const cell =
    getGridCell(
      spatialGrid,
      position
    );

  if (cell) {
    if (
      Number.isFinite(
        cell.pressure
      )
    ) {
      return clamp01(
        cell.pressure
      );
    }

    if (
      Number.isFinite(
        cell.opponentPressure
      )
    ) {
      return clamp01(
        cell.opponentPressure
      );
    }
  }

  /**
   * Fallback:
   * calcoliamo la pressione in base
   * alla distanza dagli avversari.
   */
  let pressure = 0;

  for (
    const opponent
    of opponents
  ) {
    if (
      !opponent?.position
    ) {
      continue;
    }

    const d =
      distance(
        position,
        opponent.position
      );

    if (d < 0.08) {
      pressure += 0.40;
    }

    else if (d < 0.15) {
      pressure += 0.20;
    }

    else if (d < 0.25) {
      pressure += 0.08;
    }
  }

  return clamp01(
    pressure
  );
}


/**
 * ---------------------------------------------------------
 * PASS TARGET
 * ---------------------------------------------------------
 */

function getDecisionForPlayer(
  decisions,
  player
) {
  if (
    !decisions ||
    !player
  ) {
    return null;
  }

  /**
   * Nuova struttura:
   *
   * decisions[playerId]
   */
  if (
    decisions[player.id]
  ) {
    return decisions[
      player.id
    ];
  }

  /**
   * Compatibilità con eventuale
   * struttura per squadra.
   */
  if (
    Array.isArray(
      decisions.home
    )
  ) {
    const decision =
      decisions.home.find(
        (item) =>
          item?.playerId ===
          player.id
      );

    if (decision) {
      return decision;
    }
  }

  if (
    Array.isArray(
      decisions.away
    )
  ) {
    const decision =
      decisions.away.find(
        (item) =>
          item?.playerId ===
          player.id
      );

    if (decision) {
      return decision;
    }
  }

  return null;
}


function getDecisionTarget(
  state,
  player,
  decision
) {
  if (
    !decision
  ) {
    return null;
  }

  /**
   * Il target preferito è quello
   * deciso dall'Utility AI.
   */
  if (
    decision.targetPlayerId
  ) {
    return findPlayer(
      state,
      decision.targetPlayerId
    );
  }

  if (
    decision.passTargetId
  ) {
    return findPlayer(
      state,
      decision.passTargetId
    );
  }

  if (
    decision.targetId
  ) {
    const target =
      findPlayer(
        state,
        decision.targetId
      );

    if (target) {
      return target;
    }
  }

  /**
   * Alcune versioni dell'AI possono
   * fornire direttamente targetPlayer.
   */
  if (
    decision.targetPlayer
  ) {
    return findPlayer(
      state,
      decision.targetPlayer
    );
  }

  return null;
}


/**
 * Se l'AI non ha fornito un target,
 * cerchiamo il compagno migliore.
 *
 * Questo NON sostituisce una decisione
 * di passaggio: viene utilizzato solo
 * come fallback quando l'azione è già
 * stata decisa come "pass".
 */
function findFallbackPassTarget(
  state,
  player,
  side,
  spatialGrid
) {
  const teammates =
    getPlayersForSide(
      state,
      side
    ).filter(
      (candidate) =>
        candidate.id !==
          player.id &&
        candidate.position
    );

  if (
    !teammates.length
  ) {
    return null;
  }

  const opponents =
    getOpponentPlayers(
      state,
      side
    );

  let best =
    null;

  let bestScore =
    -Infinity;

  for (
    const teammate
    of teammates
  ) {
    const d =
      distance(
        player.position,
        teammate.position
      );

    if (
      d <
      MIN_PASS_DISTANCE
    ) {
      continue;
    }

    if (
      d >
      MAX_PASS_DISTANCE
    ) {
      continue;
    }

    const pressure =
      getPressure(
        spatialGrid,
        teammate.position,
        opponents
      );

    const forwardProgress =
      side === POSSESSION.HOME
        ? teammate.position.x -
          player.position.x
        : player.position.x -
          teammate.position.x;

    const centrality =
      1 -
      Math.abs(
        teammate.position.y -
        0.5
      );

    const distanceScore =
      1 -
      clamp01(
        d /
        MAX_PASS_DISTANCE
      );

    const score =
      distanceScore *
        0.30 +
      clamp01(
        forwardProgress + 0.5
      ) *
        0.25 +
      (1 - pressure) *
        0.35 +
      centrality *
        0.10;

    if (
      score >
      bestScore
    ) {
      bestScore =
        score;

      best =
        teammate;
    }
  }

  return best;
}


/**
 * ---------------------------------------------------------
 * PASS PROBABILITY
 * ---------------------------------------------------------
 *
 * Gli attributi devono incidere realmente.
 *
 * Principali:
 *
 * - passaggi
 * - primo controllo
 * - tecnica
 * - decisioni
 * - visione
 * - freddezza
 *
 * Contesto:
 *
 * - distanza
 * - pressione
 * - spazio del ricevente
 * - direzione
 * - condizione fisica
 * - fatica
 */

function getAttribute(
  player,
  name,
  fallback = 50
) {
  const value =
    player?.attributes?.[name] ??
    player?.[name];

  if (
    Number.isFinite(value)
  ) {
    return clamp(
      value,
      1,
      99
    );
  }

  return fallback;
}


function getConditionFactor(
  player
) {
  const condition =
    Number(
      player?.condition ??
      player?.fitness ??
      100
    );

  const fatigue =
    Number(
      player?.fatigue ??
      0
    );

  const normalizedCondition =
    clamp01(
      condition / 100
    );

  const normalizedFatigue =
    clamp01(
      fatigue / 100
    );

  return clamp(
    0.65 +
      normalizedCondition *
        0.25 -
      normalizedFatigue *
        0.20,
    0.50,
    1
  );
}


function calculatePassProbability({
  passer,
  receiver,
  distanceValue,
  pressure,
  state,
  side,
}) {
  const passing =
    getAttribute(
      passer,
      "passaggi"
    );

  const technique =
    getAttribute(
      passer,
      "tecnica"
    );

  const firstTouch =
    getAttribute(
      passer,
      "primoControllo"
    );

  const decisions =
    getAttribute(
      passer,
      "decisioni"
    );

  const vision =
    getAttribute(
      passer,
      "visione"
    );

  const composure =
    getAttribute(
      passer,
      "freddezza"
    );

  /**
   * Qualità tecnica del passatore.
   */
  const passerQuality =
    (
      passing *
        0.30 +
      technique *
        0.15 +
      firstTouch *
        0.05 +
      decisions *
        0.20 +
      vision *
        0.20 +
      composure *
        0.10
    ) / 100;

  /**
   * Distanza.
   */
  const distancePenalty =
    clamp01(
      distanceValue /
        MAX_PASS_DISTANCE
    ) *
    0.20;

  /**
   * Pressione.
   */
  const pressurePenalty =
    pressure *
    0.30;

  /**
   * Spazio del ricevente.
   */
  const receiverSpace =
    receiver
      ? 1 -
        getPressure(
          state?.spatialGrid,
          receiver.position,
          []
        )
      : 0.50;

  /**
   * Avanzamento.
   */
  let progressionBonus =
    0;

  if (
    passer?.position &&
    receiver?.position
  ) {
    const forward =
      side === POSSESSION.HOME
        ? receiver.position.x -
          passer.position.x
        : passer.position.x -
          receiver.position.x;

    progressionBonus =
      clamp(
        forward,
        -0.25,
        0.25
      );
  }

  /**
   * Base.
   */
  let probability =
    0.30 +
    passerQuality *
      0.45 +
    receiverSpace *
      0.10 +
    progressionBonus *
      0.10 -
    distancePenalty -
    pressurePenalty;

  /**
   * Condizione/fatica.
   */
  probability *=
    getConditionFactor(
      passer
    );

  /**
   * Piccolo vantaggio per
   * riceventi molto tecnici.
   */
  if (receiver) {
    const receiverControl =
      getAttribute(
        receiver,
        "primoControllo"
      );

    probability +=
      (
        receiverControl -
        50
      ) /
      1000;
  }

  return clamp(
    probability,
    MIN_PROBABILITY,
    MAX_PROBABILITY
  );
}


/**
 * ---------------------------------------------------------
 * INTERCEPTION PROBABILITY
 * ---------------------------------------------------------
 */

function calculateInterceptionProbability({
  interceptor,
  passDistance,
  pressure,
}) {
  const anticipation =
    getAttribute(
      interceptor,
      "anticipazione"
    );

  const positioning =
    getAttribute(
      interceptor,
      "posizionamento"
    );

  const reactions =
    getAttribute(
      interceptor,
      "reattività"
    );

  const concentration =
    getAttribute(
      interceptor,
      "concentrazione"
    );

  const acceleration =
    getAttribute(
      interceptor,
      "accelerazione"
    );

  const quality =
    (
      anticipation *
        0.30 +
      positioning *
        0.25 +
      reactions *
        0.20 +
      concentration *
        0.15 +
      acceleration *
        0.10
    ) / 100;

  const distanceFactor =
    1 -
    clamp01(
      passDistance /
        MAX_PASS_DISTANCE
    );

  return clamp(
    0.04 +
      quality *
        0.22 +
      distanceFactor *
        0.10 +
      pressure *
        0.12,
    0.02,
    0.60
  );
}


/**
 * ---------------------------------------------------------
 * INTERCEPTOR
 * ---------------------------------------------------------
 */

function findInterceptor({
  state,
  receiver,
  passer,
  side,
  spatialGrid,
  rng,
}) {
  const opponents =
    getOpponentPlayers(
      state,
      side
    );

  if (
    !opponents.length
  ) {
    return null;
  }

  let best =
    null;

  let bestProbability =
    0;

  for (
    const opponent
    of opponents
  ) {
    if (
      !opponent.position
    ) {
      continue;
    }

    const d =
      distance(
        opponent.position,
        passer.position
      );

    const targetDistance =
      receiver?.position
        ? distance(
            opponent.position,
            receiver.position
          )
        : d;

    /**
     * Un avversario molto lontano
     * non può realisticamente
     * intercettare il pallone.
     */
    if (
      targetDistance >
      0.35
    ) {
      continue;
    }

    const pressure =
      getPressure(
        spatialGrid,
        receiver?.position ??
          passer.position,
        opponents
      );

    const probability =
      calculateInterceptionProbability({
        interceptor:
          opponent,

        passDistance:
          d,

        pressure,
      });

    if (
      probability >
      bestProbability
    ) {
      bestProbability =
        probability;

      best =
        {
          player:
            opponent,

          probability,
        };
    }
  }

  if (
    !best
  ) {
    return null;
  }

  if (
    rng &&
    typeof rng.chance ===
      "function"
  ) {
    if (
      rng.chance(
        best.probability
      )
    ) {
      return best.player;
    }

    return null;
  }

  return null;
}


/**
 * ---------------------------------------------------------
 * BALL HELPERS
 * ---------------------------------------------------------
 */

function ensureBall(
  state,
  player
) {
  state.ball =
    state.ball ??
    {
      x:
        player?.position?.x ??
        0.5,

      y:
        player?.position?.y ??
        0.5,

      z:
        0,

      ownerId:
        player?.id ??
        null,

      state:
        "controlled",
    };

  return state.ball;
}


function moveBallToPlayer(
  state,
  player
) {
  const ball =
    ensureBall(
      state,
      player
    );

  if (
    player?.position
  ) {
    ball.x =
      player.position.x;

    ball.y =
      player.position.y;
  }

  ball.z =
    0;

  ball.ownerId =
    player?.id ??
    null;

  ball.state =
    "controlled";
}


/**
 * ---------------------------------------------------------
 * NEXT ACTION COOLDOWN
 * ---------------------------------------------------------
 */

function canPlayerAct(
  player,
  state
) {
  const nextActionAt =
    Number(
      player?.nextActionAt ??
      0
    );

  return (
    Number(
      state.timeSeconds ??
      0
    ) >=
    nextActionAt
  );
}


function setActionCooldown(
  player,
  state,
  seconds =
    PASS_COOLDOWN_SECONDS
) {
  player.nextActionAt =
    Number(
      state.timeSeconds ??
      0
    ) +
    seconds;
}


/**
 * ---------------------------------------------------------
 * EVENT HELPERS
 * ---------------------------------------------------------
 */

function emit(
  emitEvent,
  type,
  payload,
  causedBy = null
) {
  if (
    typeof emitEvent !==
    "function"
  ) {
    return null;
  }

  return emitEvent(
    type,
    {
      ...payload,
      causedBy,
    },
    causedBy
  );
}


/**
 * ---------------------------------------------------------
 * PASS EXECUTION
 * ---------------------------------------------------------
 */

function executePass({
  state,
  passer,
  receiver,
  side,
  rng,
  spatialGrid,
  emitEvent,
}) {
  if (
    !passer ||
    !receiver
  ) {
    return null;
  }

  if (
    !passer.position ||
    !receiver.position
  ) {
    return null;
  }

  const passDistance =
    distance(
      passer.position,
      receiver.position
    );

  if (
    passDistance <
    MIN_PASS_DISTANCE
  ) {
    return null;
  }

  if (
    passDistance >
    MAX_PASS_DISTANCE
  ) {
    return null;
  }

  const opponents =
    getOpponentPlayers(
      state,
      side
    );

  const pressure =
    getPressure(
      spatialGrid,
      passer.position,
      opponents
    );

  /**
   * Calcoliamo la probabilità
   * usando il contesto reale.
   */
  const probability =
    calculatePassProbability({
      passer,

      receiver,

      distanceValue:
        passDistance,

      pressure,

      state,

      side,
    });

  /**
   * Evento iniziale.
   *
   * Tutto quello che succederà
   * dopo potrà riferirsi a questo
   * evento tramite causedBy.
   */
  const attemptEvent =
    emit(
      emitEvent,
      "PASS_ATTEMPT",
      {
        actors: [
          passer.id,
          receiver.id,
        ],

        payload: {
          passerId:
            passer.id,

          receiverId:
            receiver.id,

          probability,

          distance:
            passDistance,

          pressure,
        },
      }
    );

  const intercepted =
    findInterceptor({
      state,

      receiver,

      passer,

      side,

      spatialGrid,

      rng,
    });

  /**
   * INTERCETTO
   */
  if (
    intercepted
  ) {
    const interceptionEvent =
      emit(
        emitEvent,
        "PASS_INTERCEPTED",
        {
          actors: [
            passer.id,

            receiver.id,

            intercepted.id,
          ],

          payload: {
            passerId:
              passer.id,

            intendedReceiverId:
              receiver.id,

            interceptorId:
              intercepted.id,

            probability,
          },
        },

        attemptEvent?.id ??
          null
      );

    const newSide =
      sideForTeamId(
        state,
        intercepted.teamId
      );

    setPossession(
      state,
      newSide,
      intercepted.id
    );

    moveBallToPlayer(
      state,
      intercepted
    );

    emit(
      emitEvent,
      "POSSESSION_WON",
      {
        actors: [
          intercepted.id,
        ],

        payload: {
          side:
            newSide,

          reason:
            "pass_interception",

          previousPlayerId:
            passer.id,
        },
      },

      interceptionEvent?.id ??
        attemptEvent?.id ??
        null
    );

    return {
      type:
        "PASS_INTERCEPTED",

      intercepted:
        true,

      event:
        interceptionEvent,
    };
  }

  /**
   * RISULTATO DEL PASSAGGIO.
   */
  const completed =
    rng &&
    typeof rng.chance ===
      "function"
      ? rng.chance(
          probability
        )
      : Math.random() <
        probability;

  if (
    !completed
  ) {
    /**
     * Palla persa senza
     * intercetto diretto.
     */
    state.possession =
      POSSESSION.CONTESTED;

    state.possessionPlayerId =
      null;

    if (
      state.ball
    ) {
      state.ball.ownerId =
        null;

      state.ball.state =
        "free";
    }

    emit(
      emitEvent,
      "POSSESSION_WON",
      {
        actors: [
          passer.id,
        ],

        payload: {
          side:
            side,

          reason:
            "failed_pass",
        },
      },

      attemptEvent?.id ??
        null
    );

    return {
      type:
        "PASS_FAILED",

      intercepted:
        false,

      completed:
        false,
    };
  }

  /**
   * PASSAGGIO COMPLETATO.
   */
  const completeEvent =
    emit(
      emitEvent,
      "PASS_COMPLETE",
      {
        actors: [
          passer.id,

          receiver.id,
        ],

        payload: {
          passerId:
            passer.id,

          receiverId:
            receiver.id,

          probability,

          distance:
            passDistance,
        },
      },

      attemptEvent?.id ??
        null
    );

  /**
   * La ricezione avviene
   * come conseguenza del passaggio.
   */
  const receiveEvent =
    emit(
      emitEvent,
      "RECEIVE",
      {
        actors: [
          receiver.id,
        ],

        payload: {
          receiverId:
            receiver.id,

          passerId:
            passer.id,
        },
      },

      completeEvent?.id ??
        attemptEvent?.id ??
        null
    );

  setPossession(
    state,
    side,
    receiver.id
  );

  moveBallToPlayer(
    state,
    receiver
  );

  setActionCooldown(
    receiver,
    state
  );

  return {
    type:
      "PASS_COMPLETE",

    intercepted:
      false,

    completed:
      true,

    event:
      completeEvent,

    receiveEvent,
  };
}


/**
 * ---------------------------------------------------------
 * PROCESS POSSESSION
 * ---------------------------------------------------------
 *
 * Questa è la funzione utilizzata
 * direttamente dal Match Engine.
 */
export function processPossession({
  state,
  rng,
  emitEvent,
  decisions = {},
  spatialGrid = null,
  tacticalInstructions = null,
}) {
  if (
    !state
  ) {
    return null;
  }

  /**
   * Nessun possesso.
   */
  if (
    state.possession !==
      POSSESSION.HOME &&
    state.possession !==
      POSSESSION.AWAY
  ) {
    return null;
  }

  const holder =
    getPossessingPlayer(
      state
    );

  if (
    !holder
  ) {
    return null;
  }

  /**
   * Verifica che il giocatore
   * appartenga realmente alla squadra
   * che ha il possesso.
   */
  const actualSide =
    getPlayerSide(
      state,
      holder.id
    );

  if (
    actualSide !==
    state.possession
  ) {
    setPossession(
      state,
      actualSide,
      holder.id
    );
  }

  /**
   * Cooldown.
   */
  if (
    !canPlayerAct(
      holder,
      state
    )
  ) {
    return null;
  }

  /**
   * Recuperiamo la decisione
   * dell'Utility AI.
   */
  const decision =
    getDecisionForPlayer(
      decisions,
      holder
    );

  /**
   * Se non esiste una decisione,
   * non inventiamo un'azione.
   *
   * Il giocatore mantiene il
   * possesso e il prossimo tick
   * ricalcolerà la situazione.
   */
  if (
    !decision
  ) {
    holder.currentAction =
      "hold";

    holder.intent =
      "hold";

    return null;
  }

  /**
   * Aggiorniamo lo stato runtime
   * con la decisione corrente.
   */
  holder.aiDecision =
    decision;

  holder.currentAction =
    decision.action ??
    "hold";

  holder.intent =
    decision.intent ??
    decision.action ??
    "hold";


  /**
   * -------------------------------------------------------
   * PASS
   * -------------------------------------------------------
   */
  if (
    decision.action ===
    "pass"
  ) {
    let receiver =
      getDecisionTarget(
        state,
        holder,
        decision
      );

    /**
     * Se l'AI ha deciso PASS,
     * ma non ha fornito un target,
     * cerchiamo un fallback.
     */
    if (
      !receiver
    ) {
      receiver =
        findFallbackPassTarget(
          state,

          holder,

          state.possession,

          spatialGrid
        );
    }

    /**
     * Nessun compagno disponibile.
     */
    if (
      !receiver
    ) {
      holder.currentAction =
        "hold";

      holder.intent =
        "hold";

      setActionCooldown(
        holder,
        state,
        0.10
      );

      return null;
    }

    const result =
      executePass({
        state,

        passer:
          holder,

        receiver,

        side:
          state.possession,

        rng,

        spatialGrid,

        emitEvent,
      });

    setActionCooldown(
      holder,
      state
    );

    return result;
  }


  /**
   * -------------------------------------------------------
   * HOLD / CARRY
   * -------------------------------------------------------
   *
   * Per ora queste azioni non
   * modificano il possesso.
   *
   * Il movimento e il comportamento
   * verranno sviluppati nei sistemi
   * successivi.
   */
  if (
    decision.action ===
      "hold" ||
    decision.action ===
      "move" ||
    decision.action ===
      "support" ||
    decision.action ===
      "press" ||
    decision.action ===
      "dribble"
  ) {
    holder.currentAction =
      decision.action;

    /**
     * Il giocatore continua
     * ad avere il pallone.
     */
    moveBallToPlayer(
      state,
      holder
    );

    setActionCooldown(
      holder,
      state,
      decision.action ===
        "dribble"
        ? 0.15
        : 0.10
    );

    return null;
  }


  /**
   * Azione sconosciuta:
   * non facciamo nulla.
   */
  holder.currentAction =
    "hold";

  return null;
}


/**
 * ---------------------------------------------------------
 * EXPORT DEBUG
 * ---------------------------------------------------------
 */

export function getPossessionDebugInfo(
  state,
  decisions = {},
  spatialGrid = null
) {
  const holder =
    getPossessingPlayer(
      state
    );

  if (
    !holder
  ) {
    return {
      possession:
        state?.possession ??
        POSSESSION.NONE,

      player:
        null,

      decision:
        null,
    };
  }

  const decision =
    getDecisionForPlayer(
      decisions,
      holder
    );

  const opponents =
    getOpponentPlayers(
      state,
      state.possession
    );

  const pressure =
    getPressure(
      spatialGrid,
      holder.position,
      opponents
    );

  return {
    possession:
      state.possession,

    playerId:
      holder.id,

    decision,

    pressure,

    position:
      holder.position
        ? {
            ...holder.position,
          }
        : null,

    currentAction:
      holder.currentAction ??
      "hold",

    intent:
      holder.intent ??
      "hold",
  };
}
