/**
 * TACTICAL MODEL
 *
 * Contiene le istruzioni tattiche
 * runtime della squadra.
 *
 * Separiamo:
 *
 * - possesso
 * - non possesso
 * - transizioni
 * - istruzioni individuali
 */

export function createTacticalInstructions({
  team = {},
} = {}) {
  return {
    team: {
      mentality:
        team.mentality ??
        "equilibrata",

      pressing:
        team.pressing ??
        "medio",

      defensiveLine:
        team.defensiveLine ??
        "media",

      width:
        team.width ??
        "standard",

      tempo:
        team.tempo ??
        "medio",

      passingStyle:
        team.passingStyle ??
        "misto",

      buildUp:
        team.buildUp ??
        "costruzione_corta",

      transition:
        team.transition ??
        "equilibrata",

      attackingFocus:
        team.attackingFocus ??
        "misto",

      passingRisk:
        team.passingRisk ??
        "medio",

      crossing:
        team.crossing ??
        "misto",

      throughBalls:
        team.throughBalls ??
        "medio",

      longShots:
        team.longShots ??
        "medio",

      counterPress:
        team.counterPress ??
        false,

      counterAttack:
        team.counterAttack ??
        false,

      playOutFromBack:
        team.playOutFromBack ??
        true,

      overlapLeft:
        team.overlapLeft ??
        false,

      overlapRight:
        team.overlapRight ??
        false,
    },

    inPossession: {
      shape:
        team.inPossessionShape ??
        null,

      width:
        team.width ??
        "standard",

      attackingFocus:
        team.attackingFocus ??
        "misto",

      tempo:
        team.tempo ??
        "medio",
    },

    outOfPossession: {
      shape:
        team.outOfPossessionShape ??
        null,

      pressing:
        team.pressing ??
        "medio",

      defensiveLine:
        team.defensiveLine ??
        "media",

      compactness:
        "standard",
    },

    transition: {
      counterPress:
        team.counterPress ??
        false,

      counterAttack:
        team.counterAttack ??
        false,

      regroup:
        !(
          team.counterPress ??
          false
        ),
    },

    individual: {},
  };
}


/**
 * Imposta istruzioni individuali
 * per un giocatore.
 */
export function setIndividualInstructions(
  instructions,
  playerId,
  values = {}
) {
  if (
    !instructions ||
    !playerId
  ) {
    return;
  }

  instructions.individual[
    playerId
  ] = {
    ...(
      instructions.individual[
        playerId
      ] ?? {}
    ),

    ...values,
  };
}


/**
 * Restituisce le istruzioni
 * individuali del giocatore.
 */
export function getIndividualInstructions(
  instructions,
  playerId
) {
  return (
    instructions?.individual?.[
      playerId
    ] ?? {}
  );
}
