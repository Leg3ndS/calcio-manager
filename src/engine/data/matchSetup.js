/**
 * MATCH SETUP
 *
 * Costruisce i dati necessari per iniziare una partita.
 *
 * PER ORA:
 * utilizziamo giocatori generati di test.
 *
 * SUCCESSIVAMENTE:
 * questo file verrà sostituito/affiancato
 * dal database reale di giocatori e squadre.
 */

import {
  createPlayer,
  PLAYER_POSITIONS,
  PLAYER_ROLES,
  updatePlayerRating,
} from "./playerModel.js";

import {
  createTeam,
} from "./teamModel.js";

/**
 * Crea un giocatore di test.
 */
function createTestPlayer({
  id,
  name,
  surname,
  number,
  position,
  role,
  attributes = {},
}) {
  const player = createPlayer({
    id,
    name,
    surname,
    age: 24,

    nationality: "Italia",

    height: 180,

    preferredFoot: "destro",

    positions: [position],

    primaryRole: role,

    shirtNumber: number,

    attributes,

    potential: 85,
  });

  updatePlayerRating(player, role);

  return player;
}

/**
 * Crea una rosa completa di 22 giocatori.
 */
function createTestSquad(teamPrefix) {
  return [
    // ================================
    // PORTIERE
    // ================================

    createTestPlayer({
      id: `${teamPrefix}_1`,
      name: "Luca",
      surname: "Ferrari",
      number: 1,
      position: PLAYER_POSITIONS.PORTIERE,
      role: PLAYER_ROLES.PORTIERE,

      attributes: {
        physical: {
          reattivita: 82,
          agilita: 78,
        },

        mental: {
          concentrazione: 80,
          decisioni: 76,
          anticipazione: 75,
        },

        goalkeeper: {
          riflessi: 84,
          presa: 79,
          unoControUno: 81,
          uscite: 75,
          usciteAlte: 72,
          posizionamento: 82,
          comunicazione: 77,
          anticipazione: 76,
          rilancioConLeMani: 70,
          passaggi: 68,
          rinvio: 73,
          calcio: 70,
          gestionePalla: 65,
          decisioni: 78,
          reattivita: 84,
        },
      },
    }),

    // ================================
    // DIFESA
    // ================================

    createTestPlayer({
      id: `${teamPrefix}_2`,
      name: "Marco",
      surname: "Romano",
      number: 2,
      position: PLAYER_POSITIONS.TERZINO_DESTRO,
      role: PLAYER_ROLES.TERZINO,

      attributes: {
        physical: {
          velocita: 82,
          accelerazione: 80,
          resistenza: 84,
        },

        technical: {
          cross: 72,
          passaggi: 76,
          contrasti: 78,
          marcatura: 75,
          dribbling: 69,
        },

        mental: {
          posizionamento: 76,
          decisioni: 73,
          movimentoSenzaPalla: 78,
        },
      },
    }),

    createTestPlayer({
      id: `${teamPrefix}_3`,
      name: "Andrea",
      surname: "Esposito",
      number: 3,
      position: PLAYER_POSITIONS.TERZINO_SINISTRO,
      role: PLAYER_ROLES.TERZINO,

      attributes: {
        physical: {
          velocita: 80,
          accelerazione: 78,
          resistenza: 83,
        },

        technical: {
          cross: 75,
          passaggi: 74,
          contrasti: 76,
          marcatura: 74,
          dribbling: 72,
        },

        mental: {
          posizionamento: 75,
          decisioni: 72,
          movimentoSenzaPalla: 80,
        },
      },
    }),

    createTestPlayer({
      id: `${teamPrefix}_4`,
      name: "Matteo",
      surname: "Conti",
      number: 4,
      position: PLAYER_POSITIONS.DIFENSORE_CENTRALE,
      role: PLAYER_ROLES.DIFENSORE_CENTRALE,

      attributes: {
        physical: {
          forza: 84,
          elevazione: 83,
          velocita: 68,
        },

        technical: {
          contrasti: 82,
          marcatura: 84,
          colpiDiTesta: 86,
          passaggi: 70,
        },

        mental: {
          posizionamento: 86,
          anticipazione: 82,
          concentrazione: 84,
          decisioni: 75,
        },
      },
    }),

    createTestPlayer({
      id: `${teamPrefix}_5`,
      name: "Davide",
      surname: "Rossi",
      number: 5,
      position: PLAYER_POSITIONS.DIFENSORE_CENTRALE,
      role: PLAYER_ROLES.DIFENSORE_CENTRALE_CON_IMPOSTAZIONE,

      attributes: {
        physical: {
          forza: 80,
          elevazione: 80,
          velocita: 70,
        },

        technical: {
          contrasti: 79,
          marcatura: 80,
          colpiDiTesta: 82,
          passaggi: 84,
          tecnica: 78,
          primoControllo: 76,
        },

        mental: {
          posizionamento: 82,
          anticipazione: 80,
          concentrazione: 81,
          decisioni: 84,
          visione: 78,
        },
      },
    }),

    // ================================
    // CENTROCAMPO
    // ================================

    createTestPlayer({
      id: `${teamPrefix}_6`,
      name: "Simone",
      surname: "De Luca",
      number: 6,
      position: PLAYER_POSITIONS.MEDIANO,
      role: PLAYER_ROLES.MEDIANO,

      attributes: {
        physical: {
          forza: 78,
          resistenza: 86,
          velocita: 67,
        },

        technical: {
          passaggi: 80,
          primoControllo: 78,
          contrasti: 81,
        },

        mental: {
          posizionamento: 87,
          anticipazione: 84,
          decisioni: 82,
          concentrazione: 86,
          collaborazione: 84,
        },
      },
    }),

    createTestPlayer({
      id: `${teamPrefix}_8`,
      name: "Federico",
      surname: "Marino",
      number: 8,
      position: PLAYER_POSITIONS.MEZZALA,
      role: PLAYER_ROLES.MEZZALA,

      attributes: {
        physical: {
          resistenza: 88,
          accelerazione: 76,
          velocita: 75,
        },

        technical: {
          passaggi: 82,
          primoControllo: 83,
          dribbling: 76,
          tiro: 72,
        },

        mental: {
          visione: 80,
          decisioni: 83,
          movimentoSenzaPalla: 88,
          anticipazione: 78,
        },
      },
    }),

    createTestPlayer({
      id: `${teamPrefix}_10`,
      name: "Alessandro",
      surname: "Bianchi",
      number: 10,
      position: PLAYER_POSITIONS.TREQUARTISTA,
      role: PLAYER_ROLES.TREQUARTISTA,

      attributes: {
        physical: {
          agilita: 88,
          accelerazione: 82,
        },

        technical: {
          tecnica: 91,
          primoControllo: 92,
          dribbling: 88,
          passaggi: 86,
          tiro: 78,
          finalizzazione: 76,
        },

        mental: {
          visione: 94,
          decisioni: 87,
          movimentoSenzaPalla: 84,
          anticipazione: 85,
          freddezza: 82,
        },
      },
    }),

    createTestPlayer({
      id: `${teamPrefix}_7`,
      name: "Lorenzo",
      surname: "Ricci",
      number: 7,
      position: PLAYER_POSITIONS.ALA_DESTRA,
      role: PLAYER_ROLES.ALA,

      attributes: {
        physical: {
          velocita: 91,
          accelerazione: 93,
          agilita: 88,
        },

        technical: {
          dribbling: 87,
          cross: 81,
          primoControllo: 84,
          finalizzazione: 73,
        },

        mental: {
          movimentoSenzaPalla: 87,
          decisioni: 76,
          anticipazione: 79,
        },
      },
    }),

    createTestPlayer({
      id: `${teamPrefix}_11`,
      name: "Gabriele",
      surname: "Moretti",
      number: 11,
      position: PLAYER_POSITIONS.ALA_SINISTRA,
      role: PLAYER_ROLES.ALA_INVERTITA,

      attributes: {
        physical: {
          velocita: 89,
          accelerazione: 91,
          agilita: 90,
        },

        technical: {
          dribbling: 90,
          tiro: 78,
          finalizzazione: 80,
          primoControllo: 87,
          tecnica: 88,
        },

        mental: {
          movimentoSenzaPalla: 89,
          decisioni: 81,
          anticipazione: 82,
        },
      },
    }),

    // ================================
    // ATTACCANTE
    // ================================

    createTestPlayer({
      id: `${teamPrefix}_9`,
      name: "Riccardo",
      surname: "Ferrante",
      number: 9,
      position: PLAYER_POSITIONS.ATTACCANTE,
      role: PLAYER_ROLES.ATTACCANTE_AVANZATO,

      attributes: {
        physical: {
          velocita: 86,
          accelerazione: 87,
          forza: 78,
          elevazione: 81,
        },

        technical: {
          finalizzazione: 90,
          tiro: 86,
          primoControllo: 85,
          dribbling: 78,
          colpiDiTesta: 84,
        },

        mental: {
          movimentoSenzaPalla: 93,
          anticipazione: 89,
          freddezza: 88,
          decisioni: 82,
        },
      },
    }),

    // ================================
    // PANCHINA
    // ================================

    createTestPlayer({
      id: `${teamPrefix}_12`,
      name: "Paolo",
      surname: "Riva",
      number: 12,
      position: PLAYER_POSITIONS.PORTIERE,
      role: PLAYER_ROLES.PORTIERE,
    }),

    createTestPlayer({
      id: `${teamPrefix}_13`,
      name: "Enrico",
      surname: "Sala",
      number: 13,
      position: PLAYER_POSITIONS.DIFENSORE_CENTRALE,
      role: PLAYER_ROLES.DIFENSORE_CENTRALE,
    }),

    createTestPlayer({
      id: `${teamPrefix}_14`,
      name: "Nicola",
      surname: "Gallo",
      number: 14,
      position: PLAYER_POSITIONS.TERZINO_DESTRO,
      role: PLAYER_ROLES.TERZINO_DI_SPINTA,
    }),

    createTestPlayer({
      id: `${teamPrefix}_15`,
      name: "Stefano",
      surname: "Villa",
      number: 15,
      position: PLAYER_POSITIONS.MEDIANO,
      role: PLAYER_ROLES.MEDIANO_D_ATTESA,
    }),

    createTestPlayer({
      id: `${teamPrefix}_16`,
      name: "Fabio",
      surname: "Serra",
      number: 16,
      position: PLAYER_POSITIONS.CENTROCAMPISTA_CENTRALE,
      role: PLAYER_ROLES.REGISTA,
    }),

    createTestPlayer({
      id: `${teamPrefix}_17`,
      name: "Tommaso",
      surname: "Greco",
      number: 17,
      position: PLAYER_POSITIONS.MEZZALA,
      role: PLAYER_ROLES.CENTROCAMPISTA_INCURSORE,
    }),

    createTestPlayer({
      id: `${teamPrefix}_18`,
      name: "Emanuele",
      surname: "Pellegrini",
      number: 18,
      position: PLAYER_POSITIONS.ALA_DESTRA,
      role: PLAYER_ROLES.ALA,
    }),

    createTestPlayer({
      id: `${teamPrefix}_19`,
      name: "Michele",
      surname: "Fontana",
      number: 19,
      position: PLAYER_POSITIONS.ALA_SINISTRA,
      role: PLAYER_ROLES.ATTACCANTE_ESTERNO,
    }),

    createTestPlayer({
      id: `${teamPrefix}_20`,
      name: "Antonio",
      surname: "Costa",
      number: 20,
      position: PLAYER_POSITIONS.SECONDA_PUNTA,
      role: PLAYER_ROLES.SECONDA_PUNTA,
    }),

    createTestPlayer({
      id: `${teamPrefix}_21`,
      name: "Giovanni",
      surname: "Ferri",
      number: 21,
      position: PLAYER_POSITIONS.ATTACCANTE,
      role: PLAYER_ROLES.ATTACCANTE_DI_PRESSIONE,
    }),

    createTestPlayer({
      id: `${teamPrefix}_22`,
      name: "Christian",
      surname: "Leone",
      number: 22,
      position: PLAYER_POSITIONS.ATTACCANTE,
      role: PLAYER_ROLES.ATTACCANTE_BOA,
    }),
  ];
}

/**
 * Crea la squadra di casa.
 */
export function createTestHomeTeam() {
  const players = createTestSquad("home");

  return createTeam({
    id: "team_home",
    name: "Napoli Test",
    shortName: "NAP",
    color: "#0077aa",
    players,
    formation: "4-3-3",
  });
}

/**
 * Crea la squadra ospite.
 */
export function createTestAwayTeam() {
  const players = createTestSquad("away");

  return createTeam({
    id: "team_away",
    name: "Roma Test",
    shortName: "ROM",
    color: "#aa2222",
    players,
    formation: "4-3-3",
  });
}

/**
 * Crea una partita completa di test.
 */
export function createTestMatch() {
  return {
    homeTeam: createTestHomeTeam(),
    awayTeam: createTestAwayTeam(),
  };
}
