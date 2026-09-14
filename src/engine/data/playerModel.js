/**
 * PLAYER MODEL
 *
 * Modello completo di un calciatore.
 *
 * Gli attributi sono separati da:
 * - dati anagrafici
 * - stato attuale
 * - caratteristiche persistenti
 * - storico
 * - valutazioni dinamiche
 *
 * Il Player Model NON decide cosa fa il giocatore in partita.
 * Sarà l'AI a utilizzare questi dati.
 */

export const PLAYER_POSITIONS = {
  PORTIERE: "portiere",

  DIFENSORE_CENTRALE: "difensore_centrale",
  TERZINO_DESTRO: "terzino_destro",
  TERZINO_SINISTRO: "terzino_sinistro",

  MEDIANO: "mediano",
  CENTROCAMPISTA_CENTRALE: "centrocampista_centrale",
  MEZZALA: "mezzala",

  TREQUARTISTA: "trequartista",
  ALA_DESTRA: "ala_destra",
  ALA_SINISTRA: "ala_sinistra",

  SECONDA_PUNTA: "seconda_punta",
  ATTACCANTE: "attaccante",
};

export const PLAYER_ROLES = {
  // PORTIERI
  PORTIERE: "portiere",
  PORTIERE_LIBERO: "portiere_libero",

  // DIFENSORI
  TERZINO: "terzino",
  TERZINO_DI_SPINTA: "terzino_di_spinta",
  TERZINO_OFFENSIVO: "terzino_offensivo",
  ESTERNO_BASSO: "esterno_basso",
  ESTERNO_A_TUTTA_FASCIA: "esterno_a_tutta_fascia",
  TERZINO_INVERTITO: "terzino_invertito",
  ESTERNO_INVERTITO: "esterno_invertito",

  DIFENSORE_CENTRALE: "difensore_centrale",
  DIFENSORE_CENTRALE_CON_IMPOSTAZIONE:
    "difensore_centrale_con_impostazione",
  DIFENSORE_CENTRALE_LARGO: "difensore_centrale_largo",
  DIFENSORE_ARCIGNO: "difensore_arcigno",

  // CENTROCAMPO
  MEDIANO: "mediano",
  MEDIANO_D_ATTESA: "mediano_d_attesa",
  CENTROCAMPISTA_DIFENSIVO: "centrocampista_difensivo",
  REGISTA_ARRETRATO: "regista_arretrato",
  CENTROCAMPISTA: "centrocampista",
  CENTROCAMPISTA_INCURSORE: "centrocampista_incursore",
  MEZZALA: "mezzala",
  REGISTA: "regista",
  RIFINITORE: "rifinitore",
  TREQUARTISTA: "trequartista",

  // ATTACCO
  ALA: "ala",
  ALA_INVERTITA: "ala_invertita",
  ATTACCANTE_ESTERNO: "attaccante_esterno",
  ALA_INTERNA: "ala_interna",
  SECONDA_PUNTA: "seconda_punta",
  TREQUARTISTA_AVANZATO: "trequartista_avanzato",
  ATTACCANTE_AVANZATO: "attaccante_avanzato",
  ATTACCANTE_DI_PRESSIONE: "attaccante_di_pressione",
  ATTACCANTE_BOA: "attaccante_boa",
  ATTACCANTE_COMPLETO: "attaccante_completo",
};

/**
 * ATTRIBUTI TECNICI
 *
 * Tutti i valori sono compresi tra 1 e 99.
 */
export const createTechnicalAttributes = (
  values = {}
) => ({
  primoControllo: values.primoControllo ?? 50,
  dribbling: values.dribbling ?? 50,
  passaggi: values.passaggi ?? 50,
  tecnica: values.tecnica ?? 50,

  cross: values.cross ?? 50,
  tiro: values.tiro ?? 50,
  finalizzazione: values.finalizzazione ?? 50,
  tiriDaLontano: values.tiriDaLontano ?? 50,

  punizioni: values.punizioni ?? 50,
  rigori: values.rigori ?? 50,
  calciDangolo: values.calciDangolo ?? 50,

  contrasti: values.contrasti ?? 50,
  marcatura: values.marcatura ?? 50,

  colpiDiTesta: values.colpiDiTesta ?? 50,
  rimesseLaterali: values.rimesseLaterali ?? 50,

  piedeDebole: values.piedeDebole ?? 50,
});

/**
 * ATTRIBUTI MENTALI
 */
export const createMentalAttributes = (
  values = {}
) => ({
  decisioni: values.decisioni ?? 50,
  visione: values.visione ?? 50,
  anticipazione: values.anticipazione ?? 50,

  concentrazione: values.concentrazione ?? 50,
  freddezza: values.freddezza ?? 50,

  determinazione: values.determinazione ?? 50,
  aggressivita: values.aggressivita ?? 50,
  coraggio: values.coraggio ?? 50,

  posizionamento: values.posizionamento ?? 50,
  movimentoSenzaPalla:
    values.movimentoSenzaPalla ?? 50,

  collaborazione: values.collaborazione ?? 50,
  leadership: values.leadership ?? 50,

  impegno: values.impegno ?? 50,
  costanza: values.costanza ?? 50,

  sensoDellaPosizione:
    values.sensoDellaPosizione ?? 50,

  adattabilita: values.adattabilita ?? 50,

  giocoDiSquadra: values.giocoDiSquadra ?? 50,
});

/**
 * ATTRIBUTI FISICI
 */
export const createPhysicalAttributes = (
  values = {}
) => ({
  accelerazione: values.accelerazione ?? 50,
  velocita: values.velocita ?? 50,

  agilita: values.agilita ?? 50,
  equilibrio: values.equilibrio ?? 50,

  forza: values.forza ?? 50,
  resistenza: values.resistenza ?? 50,

  elevazione: values.elevazione ?? 50,
  reattivita: values.reattivita ?? 50,

  coordinazione: values.coordinazione ?? 50,

  recuperoFisico:
    values.recuperoFisico ?? 50,
});

/**
 * ATTRIBUTI PORTIERE
 *
 * Per i giocatori di movimento rimarranno
 * comunque disponibili, ma normalmente saranno bassi.
 */
export const createGoalkeeperAttributes = (
  values = {}
) => ({
  riflessi: values.riflessi ?? 50,
  presa: values.presa ?? 50,

  unoControUno: values.unoControUno ?? 50,

  uscite: values.uscite ?? 50,
  usciteAlte: values.usciteAlte ?? 50,

  posizionamento: values.posizionamento ?? 50,
  comunicazione: values.comunicazione ?? 50,

  anticipazione: values.anticipazione ?? 50,

  rilancioConLeMani:
    values.rilancioConLeMani ?? 50,

  passaggi: values.passaggi ?? 50,
  rinvio: values.rinvio ?? 50,
  calcio: values.calcio ?? 50,

  gestionePalla: values.gestionePalla ?? 50,

  decisioni: values.decisioni ?? 50,
  reattivita: values.reattivita ?? 50,
});

/**
 * CARATTERISTICHE NASCOSTE
 *
 * Non devono essere necessariamente mostrate
 * al giocatore umano.
 */
export const createHiddenAttributes = (
  values = {}
) => ({
  professionalita:
    values.professionalita ?? 50,

  costanza:
    values.costanza ?? 50,

  propensioneInfortunio:
    values.propensioneInfortunio ?? 50,

  rendimentoPartiteImportanti:
    values.rendimentoPartiteImportanti ?? 50,

  resistenzaAllaPressione:
    values.resistenzaAllaPressione ?? 50,

  ambizione:
    values.ambizione ?? 50,

  lealta:
    values.lealta ?? 50,

  adattabilita:
    values.adattabilita ?? 50,
});

/**
 * CREA UN NUOVO GIOCATORE.
 */
export const createPlayer = ({
  id,
  name,
  surname = "",
  age = 18,

  nationality = "Italia",

  height = 180,

  preferredFoot = "destro",

  positions = [PLAYER_POSITIONS.CENTROCAMPISTA_CENTRALE],

  primaryRole = PLAYER_ROLES.CENTROCAMPISTA,

  shirtNumber = null,

  attributes = {},
  hiddenAttributes = {},

  potential = 80,

  injuryHistory = [],
} = {}) => {
  const technical = createTechnicalAttributes(
    attributes.technical
  );

  const mental = createMentalAttributes(
    attributes.mental
  );

  const physical = createPhysicalAttributes(
    attributes.physical
  );

  const goalkeeper = createGoalkeeperAttributes(
    attributes.goalkeeper
  );

  const hidden = createHiddenAttributes(
    hiddenAttributes
  );

  return {
    // ==================================================
    // IDENTITÀ
    // ==================================================

    id:
      id ??
      `player_${crypto.randomUUID()}`,

    name,
    surname,

    fullName: surname
      ? `${name} ${surname}`
      : name,

    age,
    nationality,

    height,

    preferredFoot,

    positions,

    primaryRole,

    shirtNumber,

    // ==================================================
    // ATTRIBUTI
    // ==================================================

    attributes: {
      technical,
      mental,
      physical,
      goalkeeper,
    },

    hiddenAttributes: hidden,

    // ==================================================
    // VALUTAZIONE
    // ==================================================

    rating: {
      /**
       * OVR BASE
       *
       * Calcolato dagli attributi.
       * NON deve essere modificato manualmente.
       */
      baseOverall: null,

      /**
       * OVR ATTUALE
       *
       * Dipende da:
       * - forma
       * - morale
       * - condizione
       * - stamina
       * - ruolo
       * - adattamento
       */
      currentOverall: null,

      /**
       * POTENZIALE
       *
       * Potenziale massimo stimato.
       */
      potential,

      /**
       * Potenziale residuo.
       */
      developmentRoom: null,
    },

    // ==================================================
    // STATO ATTUALE
    // ==================================================

    currentState: {
      form: 100,
      morale: 100,

      condition: 100,

      stamina: 100,
      fatigue: 0,

      sharpness: 100,

      confidence: 100,

      matchFitness: 100,

      suspended: false,
      unavailable: false,
    },

    // ==================================================
    // STATO IN PARTITA
    // ==================================================

    matchState: {
      onPitch: false,

      substituted: false,

      injured: false,

      injuryType: null,
      injuryMinute: null,

      hasBall: false,

      currentAction: "idle",

      intent: "hold_position",

      targetPosition: {
        x: 50,
        y: 50,
      },

      actualPosition: {
        x: 50,
        y: 50,
      },

      velocity: {
        x: 0,
        y: 0,
      },
    },

    // ==================================================
    // DISCIPLINA
    // ==================================================

    discipline: {
      yellowCards: 0,

      redCards: 0,

      careerYellowCards: 0,
      careerRedCards: 0,

      suspensionMatches: 0,
    },

    // ==================================================
    // INFORTUNI
    // ==================================================

    injuryProfile: {
      propensity:
        hidden.propensioneInfortunio,

      history: injuryHistory,

      currentInjury: null,

      totalDaysInjured: 0,

      totalInjuries: injuryHistory.length,
    },

    // ==================================================
    // STORICO
    // ==================================================

    careerHistory: [],

    // ==================================================
    // STATISTICHE STAGIONALI
    // ==================================================

    seasonStats: {
      appearances: 0,
      starts: 0,

      minutes: 0,

      goals: 0,
      assists: 0,

      shots: 0,
      shotsOnTarget: 0,

      passesAttempted: 0,
      passesCompleted: 0,

      keyPasses: 0,

      tackles: 0,
      interceptions: 0,

      foulsCommitted: 0,
      foulsSuffered: 0,

      offsides: 0,

      yellowCards: 0,
      redCards: 0,
    },

    // ==================================================
    // CONTRATTO
    // ==================================================

    contract: {
      clubId: null,

      salary: 0,

      contractStart: null,
      contractEnd: null,

      transferListed: false,

      loanListed: false,
    },
  };
};

/**
 * LIMITA UN VALORE TRA 1 E 99.
 */
export function clampAttribute(value) {
  return Math.max(
    1,
    Math.min(99, Math.round(value))
  );
}

/**
 * CALCOLA LA MEDIA DI UN GRUPPO DI ATTRIBUTI.
 */
export function averageAttributes(attributes = {}) {
  const values = Object.values(attributes)
    .filter((value) => typeof value === "number");

  if (values.length === 0) {
    return 1;
  }

  const total = values.reduce(
    (sum, value) => sum + value,
    0
  );

  return clampAttribute(
    total / values.length
  );
}

/**
 * CALCOLO OVR BASE.
 *
 * ATTENZIONE:
 * Questa è una prima base.
 *
 * Successivamente ogni ruolo avrà pesi specifici.
 *
 * Esempio futuro:
 *
 * Terzino:
 * velocità  + cross + contrasti + ...
 *
 * Regista:
 * passaggi + visione + decisioni + ...
 */
export function calculateBaseOverall(
  player,
  role = null
) {
  const technical =
    player.attributes.technical;

  const mental =
    player.attributes.mental;

  const physical =
    player.attributes.physical;

  const goalkeeper =
    player.attributes.goalkeeper;

  const roleToUse =
    role ?? player.primaryRole;

  let score = 0;

  /*
   * PORTIERI
   */
  if (
    roleToUse === PLAYER_ROLES.PORTIERE ||
    roleToUse === PLAYER_ROLES.PORTIERE_LIBERO
  ) {
    score =
      goalkeeper.riflessi * 0.18 +
      goalkeeper.presa * 0.12 +
      goalkeeper.unoControUno * 0.12 +
      goalkeeper.uscite * 0.10 +
      goalkeeper.posizionamento * 0.14 +
      goalkeeper.reattivita * 0.14 +
      goalkeeper.decisioni * 0.10 +
      mental.concentrazione * 0.05 +
      physical.reattivita * 0.05;
  }

  /*
   * DIFENSORI
   */
  else if (
    roleToUse === PLAYER_ROLES.DIFENSORE_CENTRALE ||
    roleToUse ===
      PLAYER_ROLES.DIFENSORE_CENTRALE_CON_IMPOSTAZIONE ||
    roleToUse === PLAYER_ROLES.DIFENSORE_CENTRALE_LARGO ||
    roleToUse === PLAYER_ROLES.DIFENSORE_ARCIGNO
  ) {
    score =
      technical.marcatura * 0.15 +
      technical.contrasti * 0.14 +
      technical.colpiDiTesta * 0.10 +
      technical.primoControllo * 0.07 +
      technical.passaggi * 0.09 +
      mental.posizionamento * 0.12 +
      mental.anticipazione * 0.10 +
      mental.concentrazione * 0.08 +
      mental.coraggio * 0.05 +
      physical.forza * 0.05 +
      physical.elevazione * 0.05;
  }

  /*
   * TERZINI / ESTERNI
   */
  else if (
    roleToUse === PLAYER_ROLES.TERZINO ||
    roleToUse === PLAYER_ROLES.TERZINO_DI_SPINTA ||
    roleToUse === PLAYER_ROLES.TERZINO_OFFENSIVO ||
    roleToUse === PLAYER_ROLES.ESTERNO_BASSO ||
    roleToUse ===
      PLAYER_ROLES.ESTERNO_A_TUTTA_FASCIA ||
    roleToUse === PLAYER_ROLES.TERZINO_INVERTITO ||
    roleToUse === PLAYER_ROLES.ESTERNO_INVERTITO
  ) {
    score =
      physical.velocita * 0.12 +
      physical.accelerazione * 0.10 +
      physical.resistenza * 0.10 +
      technical.cross * 0.11 +
      technical.passaggi * 0.09 +
      technical.contrasti * 0.10 +
      technical.marcatura * 0.09 +
      mental.posizionamento * 0.09 +
      mental.movimentoSenzaPalla * 0.07 +
      mental.decisioni * 0.07 +
      technical.primoControllo * 0.06;
  }

  /*
   * CENTROCAMPISTI
   */
  else if (
    roleToUse === PLAYER_ROLES.MEDIANO ||
    roleToUse === PLAYER_ROLES.MEDIANO_D_ATTESA ||
    roleToUse ===
      PLAYER_ROLES.CENTROCAMPISTA_DIFENSIVO ||
    roleToUse ===
      PLAYER_ROLES.REGISTA_ARRETRATO
  ) {
    score =
      technical.passaggi * 0.15 +
      technical.primoControllo * 0.10 +
      technical.contrasti * 0.10 +
      mental.visione * 0.12 +
      mental.decisioni * 0.13 +
      mental.anticipazione * 0.10 +
      mental.posizionamento * 0.10 +
      mental.concentrazione * 0.07 +
      mental.collaborazione * 0.06 +
      physical.resistenza * 0.07;
  }

  /*
   * MEZZALA / CENTROCAMPISTA
   */
  else if (
    roleToUse === PLAYER_ROLES.CENTROCAMPISTA ||
    roleToUse ===
      PLAYER_ROLES.CENTROCAMPISTA_INCURSORE ||
    roleToUse === PLAYER_ROLES.MEZZALA ||
    roleToUse === PLAYER_ROLES.REGISTA
  ) {
    score =
      technical.passaggi * 0.13 +
      technical.primoControllo * 0.09 +
      technical.dribbling * 0.07 +
      technical.tiro * 0.06 +
      mental.visione * 0.12 +
      mental.decisioni * 0.12 +
      mental.movimentoSenzaPalla * 0.10 +
      mental.anticipazione * 0.08 +
      mental.collaborazione * 0.07 +
      physical.resistenza * 0.09 +
      physical.accelerazione * 0.07;
  }

  /*
   * TREQUARTISTI
   */
  else if (
    roleToUse === PLAYER_ROLES.TREQUARTISTA ||
    roleToUse === PLAYER_ROLES.RIFINITORE ||
    roleToUse ===
      PLAYER_ROLES.TREQUARTISTA_AVANZATO
  ) {
    score =
      technical.tecnica * 0.10 +
      technical.primoControllo * 0.10 +
      technical.dribbling * 0.09 +
      technical.passaggi * 0.12 +
      technical.tiro * 0.07 +
      mental.visione * 0.15 +
      mental.decisioni * 0.12 +
      mental.movimentoSenzaPalla * 0.09 +
      mental.anticipazione * 0.07 +
      mental.freddezza * 0.05 +
      physical.agilita * 0.04;
  }

  /*
   * ALI
   */
  else if (
    roleToUse === PLAYER_ROLES.ALA ||
    roleToUse === PLAYER_ROLES.ALA_INVERTITA ||
    roleToUse === PLAYER_ROLES.ALA_INTERNA ||
    roleToUse ===
      PLAYER_ROLES.ATTACCANTE_ESTERNO
  ) {
    score =
      physical.velocita * 0.13 +
      physical.accelerazione * 0.12 +
      physical.agilita * 0.07 +
      technical.dribbling * 0.14 +
      technical.cross * 0.09 +
      technical.primoControllo * 0.09 +
      technical.tecnica * 0.07 +
      technical.finalizzazione * 0.06 +
      mental.movimentoSenzaPalla * 0.09 +
      mental.decisioni * 0.07 +
      mental.anticipazione * 0.07;
  }

  /*
   * ATTACCANTI
   */
  else if (
    roleToUse === PLAYER_ROLES.SECONDA_PUNTA ||
    roleToUse === PLAYER_ROLES.ATTACCANTE_AVANZATO ||
    roleToUse ===
      PLAYER_ROLES.ATTACCANTE_DI_PRESSIONE ||
    roleToUse === PLAYER_ROLES.ATTACCANTE_BOA ||
    roleToUse === PLAYER_ROLES.ATTACCANTE_COMPLETO
  ) {
    score =
      technical.finalizzazione * 0.17 +
      technical.tiro * 0.09 +
      technical.primoControllo * 0.09 +
      technical.dribbling * 0.07 +
      technical.colpiDiTesta * 0.07 +
      mental.movimentoSenzaPalla * 0.12 +
      mental.anticipazione * 0.10 +
      mental.freddezza * 0.10 +
      mental.decisioni * 0.07 +
      physical.accelerazione * 0.06 +
      physical.forza * 0.06;
  }

  /*
   * FALLBACK
   */
  else {
    score =
      averageAttributes(technical) * 0.4 +
      averageAttributes(mental) * 0.35 +
      averageAttributes(physical) * 0.25;
  }

  return clampAttribute(score);
}

/**
 * CALCOLA L'OVR ATTUALE.
 *
 * Non modifica gli attributi reali.
 *
 * Tiene conto dello stato del giocatore.
 */
export function calculateCurrentOverall(
  player,
  baseOverall = null
) {
  const base =
    baseOverall ??
    player.rating.baseOverall ??
    calculateBaseOverall(player);

  const state = player.currentState;

  /*
   * Forma, morale e condizione influenzano
   * la prestazione attuale.
   */
  const formModifier =
    (state.form - 50) * 0.08;

  const moraleModifier =
    (state.morale - 50) * 0.04;

  const conditionModifier =
    (state.condition - 50) * 0.10;

  const sharpnessModifier =
    (state.sharpness - 50) * 0.04;

  const fatiguePenalty =
    state.fatigue * 0.08;

  const modifier =
    formModifier +
    moraleModifier +
    conditionModifier +
    sharpnessModifier -
    fatiguePenalty;

  return clampAttribute(
    base + modifier
  );
}

/**
 * AGGIORNA TUTTA LA VALUTAZIONE DEL GIOCATORE.
 */
export function updatePlayerRating(
  player,
  role = null
) {
  const baseOverall =
    calculateBaseOverall(
      player,
      role
    );

  const currentOverall =
    calculateCurrentOverall(
      player,
      baseOverall
    );

  player.rating.baseOverall =
    baseOverall;

  player.rating.currentOverall =
    currentOverall;

  player.rating.developmentRoom =
    Math.max(
      0,
      player.rating.potential -
        currentOverall
    );

  return player.rating;
}
