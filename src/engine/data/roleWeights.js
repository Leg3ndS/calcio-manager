/**
 * ROLE WEIGHTS
 *
 * Matrice centrale:
 *
 * RUOLO → ATTRIBUTI IMPORTANTI
 *
 * I valori sono pesi relativi.
 *
 * 1.00 = importanza molto alta
 * 0.75 = alta
 * 0.50 = media
 * 0.25 = bassa
 * 0.00 = irrilevante
 *
 * Questa struttura verrà utilizzata sia dall'OVR
 * sia dal decision making.
 */

export const ROLE_WEIGHTS = {
  portiere: {
    riflessi: 1.0,
    presa: 0.9,
    posizionamento: 0.9,
    unoControUno: 0.9,
    uscite: 0.8,
    anticipazione: 0.7,
    comunicazione: 0.7,
    decisioni: 0.8,
    gestionePalla: 0.6,
    passaggi: 0.5,
  },

  portiere_libero: {
    riflessi: 0.9,
    presa: 0.8,
    posizionamento: 0.8,
    anticipazione: 0.9,
    decisioni: 0.9,
    gestionePalla: 0.9,
    passaggi: 0.8,
    velocita: 0.6,
  },

  terzino: {
    velocita: 0.8,
    accelerazione: 0.8,
    resistenza: 0.8,
    marcatura: 0.8,
    contrasti: 0.7,
    cross: 0.7,
    passaggi: 0.7,
    movimentoSenzaPalla: 0.7,
    posizionamento: 0.8,
  },

  terzino_di_spinta: {
    velocita: 0.9,
    accelerazione: 0.9,
    resistenza: 0.9,
    cross: 0.8,
    passaggi: 0.7,
    movimentoSenzaPalla: 0.9,
    dribbling: 0.6,
    marcatura: 0.7,
  },

  terzino_offensivo: {
    velocita: 0.9,
    accelerazione: 0.9,
    cross: 0.9,
    dribbling: 0.7,
    movimentoSenzaPalla: 0.9,
    tecnica: 0.7,
    finalizzazione: 0.5,
  },

  terzino_invertito: {
    passaggi: 0.8,
    tecnica: 0.8,
    decisioni: 0.9,
    visione: 0.8,
    posizionamento: 0.9,
    giocoDiSquadra: 0.8,
    movimentoSenzaPalla: 0.8,
  },

  difensore_centrale: {
    marcatura: 1.0,
    contrasti: 0.9,
    colpiDiTesta: 0.9,
    posizionamento: 0.9,
    forza: 0.8,
    anticipazione: 0.8,
    concentrazione: 0.8,
  },

  difensore_centrale_con_impostazione: {
    marcatura: 0.9,
    contrasti: 0.8,
    passaggi: 0.9,
    tecnica: 0.8,
    visione: 0.8,
    decisioni: 0.9,
    colpiDiTesta: 0.7,
  },

  difensore_centrale_largo: {
    marcatura: 0.9,
    velocita: 0.7,
    accelerazione: 0.7,
    passaggi: 0.7,
    posizionamento: 0.9,
    anticipazione: 0.8,
  },

  mediano: {
    posizionamento: 0.9,
    anticipazione: 0.9,
    contrasti: 0.8,
    marcatura: 0.8,
    passaggi: 0.8,
    decisioni: 0.9,
    giocoDiSquadra: 0.9,
    resistenza: 0.8,
  },

  mediano_d_attesa: {
    posizionamento: 1.0,
    anticipazione: 0.9,
    marcatura: 0.9,
    passaggi: 0.8,
    decisioni: 0.9,
    concentrazione: 0.9,
  },

  regista_arretrato: {
    passaggi: 1.0,
    visione: 1.0,
    tecnica: 0.9,
    decisioni: 1.0,
    anticipazione: 0.8,
    calma: 0.8,
    giocoDiSquadra: 0.9,
  },

  centrocampista: {
    passaggi: 0.8,
    tecnica: 0.8,
    decisioni: 0.8,
    resistenza: 0.8,
    giocoDiSquadra: 0.8,
    movimentoSenzaPalla: 0.7,
  },

  centrocampista_incursore: {
    resistenza: 0.9,
    movimentoSenzaPalla: 1.0,
    accelerazione: 0.8,
    finalizzazione: 0.7,
    tiro: 0.6,
    decisioni: 0.8,
  },

  mezzala: {
    resistenza: 0.9,
    movimentoSenzaPalla: 1.0,
    passaggi: 0.8,
    tecnica: 0.8,
    decisioni: 0.9,
    accelerazione: 0.7,
    giocoDiSquadra: 0.9,
  },

  regista: {
    passaggi: 1.0,
    visione: 1.0,
    tecnica: 0.9,
    decisioni: 1.0,
    anticipazione: 0.8,
    giocoDiSquadra: 0.9,
  },

  rifinitore: {
    tecnica: 0.9,
    visione: 1.0,
    passaggi: 0.9,
    decisioni: 0.9,
    movimentoSenzaPalla: 0.9,
    dribbling: 0.7,
  },

  trequartista: {
    tecnica: 0.9,
    visione: 1.0,
    passaggi: 0.9,
    dribbling: 0.8,
    decisioni: 0.9,
    movimentoSenzaPalla: 0.9,
    finalizzazione: 0.7,
  },

  ala: {
    accelerazione: 0.9,
    velocita: 0.9,
    dribbling: 0.9,
    cross: 0.8,
    tecnica: 0.8,
    movimentoSenzaPalla: 0.8,
  },

  ala_invertita: {
    accelerazione: 0.8,
    velocita: 0.8,
    dribbling: 0.9,
    tecnica: 0.9,
    finalizzazione: 0.8,
    tiro: 0.7,
    movimentoSenzaPalla: 0.9,
  },

  attaccante_esterno: {
    accelerazione: 0.9,
    velocita: 0.9,
    dribbling: 0.8,
    finalizzazione: 0.8,
    movimentoSenzaPalla: 0.9,
    cross: 0.7,
  },

  ala_interna: {
    dribbling: 0.9,
    tecnica: 0.9,
    finalizzazione: 0.8,
    movimentoSenzaPalla: 0.9,
    tiro: 0.7,
  },

  seconda_punta: {
    finalizzazione: 0.9,
    tecnica: 0.8,
    movimentoSenzaPalla: 1.0,
    accelerazione: 0.8,
    dribbling: 0.7,
    decisioni: 0.8,
  },

  trequartista_avanzato: {
    tecnica: 0.9,
    visione: 0.9,
    passaggi: 0.8,
    finalizzazione: 0.8,
    movimentoSenzaPalla: 0.9,
    dribbling: 0.8,
  },

  attaccante_avanzato: {
    accelerazione: 0.9,
    velocita: 0.9,
    finalizzazione: 1.0,
    movimentoSenzaPalla: 1.0,
    freddezza: 0.9,
    anticipazione: 0.8,
  },

  attaccante_di_pressione: {
    accelerazione: 0.8,
    resistenza: 0.9,
    movimentoSenzaPalla: 0.9,
    aggressivita: 0.8,
    lavoroDiSquadra: 0.9,
    finalizzazione: 0.7,
  },

  attaccante_boa: {
    forza: 0.9,
    colpiDiTesta: 0.9,
    controllo: 0.9,
    finalizzazione: 0.9,
    passaggi: 0.7,
    freddezza: 0.8,
  },

  attaccante_completo: {
    finalizzazione: 0.9,
    tecnica: 0.9,
    controllo: 0.9,
    passaggi: 0.8,
    dribbling: 0.8,
    movimentoSenzaPalla: 0.9,
    forza: 0.7,
    decisioni: 0.9,
  },
};

/**
 * Restituisce i pesi del ruolo.
 */
export function getRoleWeights(role) {
  return ROLE_WEIGHTS[role] ?? {};
}

/**
 * Restituisce il peso di un attributo per un determinato ruolo.
 */
export function getRoleAttributeWeight(role, attribute) {
  return ROLE_WEIGHTS[role]?.[attribute] ?? 0;
}
