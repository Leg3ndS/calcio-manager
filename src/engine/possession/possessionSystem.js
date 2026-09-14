/**
 * POSSESSION SYSTEM
 *
 * Gestisce:
 *
 * - giocatore in possesso
 * - passaggi
 * - ricezioni
 * - errori di passaggio
 * - intercetti
 * - palla contesa
 * - cambio possesso tra le squadre
 *
 * Il sistema NON decide la grafica.
 * Modifica esclusivamente il World State
 * e genera eventi.
 */

import {
  POSSESSION,
} from "../worldState.js";


/**
 * Restituisce tutti i giocatori
 * titolari di una squadra.
 */
function getTeamPlayers(team) {
  if (!team) {
    return [];
  }

  const startingXI =
    team.startingXI ?? [];

  return startingXI
    .map((reference) => {
      if (
        typeof reference ===
        "string"
      ) {
        return (
          team.players?.find(
            (player) =>
              player.id ===
              reference
          ) ?? null
        );
      }

      if (
        reference &&
        typeof reference ===
          "object"
      ) {
        return reference;
      }

      return null;
    })
    .filter(Boolean);
}


/**
 * Restituisce i giocatori attivi
 * della squadra avversaria.
 */
function getOpponentPlayers(
  state,
  side
) {
  if (
    side === POSSESSION.HOME
  ) {
    return getTeamPlayers(
      state.teams.away
    );
  }

  if (
    side === POSSESSION.AWAY
  ) {
    return getTeamPlayers(
      state.teams.home
    );
  }

  return [];
}


/**
 * Restituisce i giocatori della
 * squadra che possiede palla.
 */
function getPossessionPlayers(
  state,
  side
) {
  if (
    side === POSSESSION.HOME
  ) {
    return getTeamPlayers(
      state.teams.home
    );
  }

  if (
    side === POSSESSION.AWAY
  ) {
    return getTeamPlayers(
      state.teams.away
    );
  }

  return [];
}


/**
 * Restituisce la squadra opposta.
 */
function getOppositeSide(side) {
  if (
    side === POSSESSION.HOME
  ) {
    return POSSESSION.AWAY;
  }

  if (
    side === POSSESSION.AWAY
  ) {
    return POSSESSION.HOME;
  }

  return POSSESSION.CONTESTED;
}


/**
 * Distanza tra due punti.
 */
function distance(
  a,
  b
) {
  if (
    !a ||
    !b
  ) {
    return 1;
  }

  const dx =
    (a.x ?? 0) -
    (b.x ?? 0);

  const dy =
    (a.y ?? 0) -
    (b.y ?? 0);

  return Math.sqrt(
    dx * dx +
    dy * dy
  );
}


/**
 * Clamp.
 */
function clamp(
  value,
  min = 0,
  max = 1
) {
  return Math.max(
    min,
    Math.min(
      max,
      value
    )
  );
}


/**
 * Legge un attributo del giocatore.
 */
function getAttribute(
  player,
  category,
  key,
  fallback = 50
) {
  return (
    player?.attributes?.[
      category
    ]?.[key] ??
    fallback
  );
}


/**
 * Trova il giocatore più vicino
 * alla posizione della palla.
 */
function findNearestOpponent(
  state,
  side,
  position
) {
  const opponents =
    getOpponentPlayers(
      state,
      side
    );

  let nearest = null;
  let nearestDistance =
    Infinity;

  for (
    const player
    of opponents
  ) {
    const d =
      distance(
        player.position,
        position
      );

    if (
      d <
      nearestDistance
    ) {
      nearest =
        player;

      nearestDistance =
        d;
    }
  }

  return {
    player:
      nearest,

    distance:
      nearestDistance,
  };
}


/**
 * Trova un compagno adatto
 * a ricevere il passaggio.
 *
 * Per ora scegliamo in base a:
 *
 * - distanza
 * - spazio
 * - visione
 * - passaggi
 * - movimento senza palla
 */
function choosePassTarget({
  state,
  side,
  passer,
  rng,
}) {
  const teammates =
    getPossessionPlayers(
      state,
      side
    ).filter(
      (player) =>
        player.id !==
        passer.id
    );

  if (!teammates.length) {
    return null;
  }

  const candidates =
    teammates.map(
      (player) => {
        const d =
          distance(
            passer.position,
            player.position
          );

        const vision =
          getAttribute(
            passer,
            "mental",
            "visione"
          );

        const passing =
          getAttribute(
            passer,
            "technical",
            "passaggi"
          );

        const movement =
          getAttribute(
            player,
            "mental",
            "movimentoSenzaPalla",
            getAttribute(
              player,
              "mental",
              "movimento_senza_palla",
              50
            )
          );

        const space =
          1 -
          clamp(
            findNearestOpponent(
              state,
              side,
              player.position
            ).distance /
              0.35
          );

        /**
         * Distanza ideale:
         * non troppo vicino,
         * non troppo lontano.
         */
        const distanceScore =
          1 -
          clamp(
            Math.abs(
              d - 0.18
            ) /
              0.25
          );

        const score =
          distanceScore *
            25 +
          space *
            30 +
          vision /
            99 *
            15 +
          passing /
            99 *
            15 +
          movement /
            99 *
            15;

        return {
          player,
          score,
          distance: d,
        };
      }
    );

  candidates.sort(
    (a, b) =>
      b.score -
      a.score
  );

  /**
   * Piccola componente casuale
   * deterministica.
   *
   * Evita che la squadra scelga
   * SEMPRE lo stesso compagno.
   */
  const best =
    candidates[0];

  if (
    candidates.length > 1 &&
    rng.chance(0.20)
  ) {
    return candidates[
      rng.integer(
        0,
        Math.min(
          candidates.length - 1,
          2
        )
      )
    ].player;
  }

  return best.player;
}


/**
 * Calcola la probabilità che
 * il passaggio sia completato.
 */
function calculatePassSuccess({
  state,
  passer,
  receiver,
  side,
  rng,
}) {
  const passing =
    getAttribute(
      passer,
      "technical",
      "passaggi"
    );

  const technique =
    getAttribute(
      passer,
      "technical",
      "tecnica"
    );

  const firstControl =
    getAttribute(
      receiver,
      "technical",
      "primoControllo"
    );

  const anticipation =
    getAttribute(
      receiver,
      "mental",
      "anticipazione"
    );

  const opponentInfo =
    findNearestOpponent(
      state,
      side,
      receiver.position
    );

  const pressure =
    clamp(
      1 -
        opponentInfo.distance /
          0.25
    );

  /**
   * Più pressione =
   * meno probabilità di successo.
   */
  let probability =
    0.55 +
    passing /
      99 *
      0.20 +
    technique /
      99 *
      0.10 +
    firstControl /
      99 *
      0.08 +
    anticipation /
      99 *
      0.05 -
    pressure *
      0.28;

  /**
   * Evitiamo valori estremi.
   */
  probability =
    clamp(
      probability,
      0.35,
      0.94
    );

  /**
   * Piccola variazione deterministica.
   */
  probability +=
    (rng.float() -
      0.5) *
    0.04;

  return clamp(
    probability,
    0.30,
    0.96
  );
}


/**
 * Imposta il possesso.
 */
export function setPossession({
  state,
  side,
  playerId = null,
}) {
  state.possession =
    side;

  state.ball.ownerId =
    playerId;

  if (playerId) {
    const players =
      getPossessionPlayers(
        state,
        side
      );

    const player =
      players.find(
        (item) =>
          item.id ===
          playerId
      );

    if (player) {
      player.hasBall =
        true;

      state.ball.x =
        player.position.x;

      state.ball.y =
        player.position.y;
    }
  }

  /**
   * Tutti gli altri giocatori
   * perdono il possesso.
   */
  const allPlayers = [
    ...getTeamPlayers(
      state.teams.home
    ),

    ...getTeamPlayers(
      state.teams.away
    ),
  ];

  for (
    const player
    of allPlayers
  ) {
    if (
      player.id !==
      playerId
    ) {
      player.hasBall =
        false;
    }
  }
}


/**
 * Restituisce la squadra
 * di appartenenza del giocatore.
 */
export function getPlayerSide(
  state,
  playerId
) {
  const home =
    getTeamPlayers(
      state.teams.home
    );

  if (
    home.some(
      (player) =>
        player.id ===
        playerId
    )
  ) {
    return POSSESSION.HOME;
  }

  const away =
    getTeamPlayers(
      state.teams.away
    );

  if (
    away.some(
      (player) =>
        player.id ===
        playerId
    )
  ) {
    return POSSESSION.AWAY;
  }

  return POSSESSION.NONE;
}


/**
 * Passaggio intercettato.
 */
function handleInterception({
  state,
  side,
  passer,
  receiver,
  opponent,
  emitEvent,
}) {
  const opponentSide =
    getOppositeSide(
      side
    );

  /**
   * La palla diventa contesa
   * per un istante.
   */
  state.possession =
    POSSESSION.CONTESTED;

  state.ball.ownerId =
    null;

  state.ball.lastTouchPlayerId =
    passer.id;

  state.ball.x =
    receiver.position.x;

  state.ball.y =
    receiver.position.y;

  emitEvent({
    type:
      "PASS_INTERCEPTED",

    actors: [
      passer.id,
      opponent?.id,
    ].filter(Boolean),

    payload: {
      passerId:
        passer.id,

      intendedReceiverId:
        receiver.id,

      interceptorId:
        opponent?.id ??
        null,

      from:
        side,

      to:
        opponentSide,
    },
  });

  /**
   * L'intercettore conquista
   * immediatamente il possesso.
   *
   * Non aspettiamo un altro tick
   * perché altrimenti la palla
   * rimarrebbe troppo spesso
   * CONTESTED.
   */
  if (opponent) {
    setPossession({
      state,

      side:
        opponentSide,

      playerId:
        opponent.id,
    });

    emitEvent({
      type:
        "POSSESSION_WON",

      actors: [
        opponent.id,
      ],

      payload: {
        side:
          opponentSide,

        reason:
          "interception",

        previousSide:
          side,
      },
    });
  }
}


/**
 * Processa un'azione di possesso.
 */
export function processPossession({
  state,
  rng,
  emitEvent,
}) {
  const side =
    state.possession;

  if (
    side !==
      POSSESSION.HOME &&
    side !==
      POSSESSION.AWAY
  ) {
    return;
  }

  const players =
    getPossessionPlayers(
      state,
      side
    );

  if (!players.length) {
    return;
  }

  let holder =
    players.find(
      (player) =>
        player.id ===
        state.ball.ownerId
    );

  /**
   * Se non abbiamo un possessore,
   * assegniamo il giocatore più vicino.
   */
  if (!holder) {
    let nearest =
      null;

    let nearestDistance =
      Infinity;

    for (
      const player
      of players
    ) {
      const d =
        distance(
          player.position,
          state.ball
        );

      if (
        d <
        nearestDistance
      ) {
        nearest =
          player;

        nearestDistance =
          d;
      }
    }

    holder =
      nearest;

    if (holder) {
      setPossession({
        state,
        side,
        playerId:
          holder.id,
      });
    }
  }

  if (!holder) {
    return;
  }

  /**
   * Non facciamo un passaggio
   * ad ogni singolo tick.
   *
   * Il possessore deve avere
   * un breve tempo di controllo.
   */
  const actionRoll =
    rng.float();

  /**
   * 12% circa di possibilità
   * di iniziare un'azione
   * di passaggio per tick.
   */
  if (
    actionRoll >
    0.12
  ) {
    return;
  }

  const receiver =
    choosePassTarget({
      state,
      side,
      passer:
        holder,
      rng,
    });

  if (!receiver) {
    return;
  }

  const opponentInfo =
    findNearestOpponent(
      state,
      side,
      receiver.position
    );

  const successProbability =
    calculatePassSuccess({
      state,
      passer:
        holder,
      receiver,
      side,
      rng,
    });

  const success =
    rng.chance(
      successProbability
    );

  /**
   * PASS ATTEMPT
   */
  emitEvent({
    type:
      "PASS_ATTEMPT",

    actors: [
      holder.id,
      receiver.id,
    ],

    payload: {
      passerId:
        holder.id,

      receiverId:
        receiver.id,

      successProbability:
        Number(
          successProbability.toFixed(
            3
          )
        ),

      pressure:
        Number(
          clamp(
            1 -
              opponentInfo.distance /
                0.25
          ).toFixed(3)
        ),
    },
  });

  /**
   * PASS RIUSCITO
   */
  if (success) {
    state.ball.lastTouchPlayerId =
      holder.id;

    state.ball.ownerId =
      receiver.id;

    state.ball.x =
      receiver.position.x;

    state.ball.y =
      receiver.position.y;

    state.possession =
      side;

    holder.hasBall =
      false;

    receiver.hasBall =
      true;

    emitEvent({
      type:
        "PASS_COMPLETE",

      actors: [
        holder.id,
        receiver.id,
      ],

      payload: {
        passerId:
          holder.id,

        receiverId:
          receiver.id,
      },
    });

    emitEvent({
      type:
        "RECEIVE",

      actors: [
        receiver.id,
      ],

      payload: {
        playerId:
          receiver.id,

        fromPlayerId:
          holder.id,
      },
    });

    return;
  }

  /**
   * PASSAGGIO SBAGLIATO:
   *
   * cerchiamo l'avversario
   * più vicino alla traiettoria
   * di ricezione.
   */
  const opponent =
    opponentInfo.player;

  handleInterception({
    state,
    side,
    passer:
      holder,
    receiver,
    opponent,
    emitEvent,
  });
}
