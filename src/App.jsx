import { useEffect, useRef, useState } from "react";
import "./App.css";

/*
 * ============================================================
 * CALCIO MANAGER - MATCH ENGINE V0.2
 * ============================================================
 *
 * 90 minuti simulati ≈ 4 minuti e 30 secondi reali a 1x.
 *
 * 1x = 20 secondi di partita per ogni secondo reale
 * 2x = 40 secondi
 * 4x = 80 secondi
 *
 * Questa versione è ancora un prototipo del Match Engine.
 * La struttura è già pensata per aggiungere successivamente:
 * - tattiche reali
 * - stamina
 * - contrasti
 * - dribbling
 * - tiri
 * - IA
 * - xG
 * - eventi
 * ============================================================
 */

const GAME_SECONDS_PER_REAL_SECOND = 20;

const FORMATION_HOME = [
  { x: 7, y: 50 },
  { x: 21, y: 16 },
  { x: 20, y: 37 },
  { x: 20, y: 63 },
  { x: 21, y: 84 },
  { x: 37, y: 50 },
  { x: 46, y: 30 },
  { x: 46, y: 70 },
  { x: 62, y: 18 },
  { x: 61, y: 50 },
  { x: 62, y: 82 },
];

const FORMATION_AWAY = [
  { x: 93, y: 50 },
  { x: 79, y: 84 },
  { x: 80, y: 63 },
  { x: 80, y: 37 },
  { x: 79, y: 16 },
  { x: 63, y: 50 },
  { x: 54, y: 70 },
  { x: 54, y: 30 },
  { x: 38, y: 82 },
  { x: 39, y: 50 },
  { x: 38, y: 18 },
];

const createPlayer = ({
  id,
  name,
  number,
  team,
  role,
  x,
  y,
  pace,
  acceleration,
  shooting,
  finishing,
  passing,
  dribbling,
  tackling,
  marking,
  strength,
  jumping,
  stamina,
  positioning,
  decisions,
  mentality,
}) => ({
  id,
  name,
  number,
  team,
  role,
  x,
  y,
  baseX: x,
  baseY: y,
  pace,
  acceleration,
  shooting,
  finishing,
  passing,
  dribbling,
  tackling,
  marking,
  strength,
  jumping,
  stamina,
  positioning,
  decisions,
  mentality,
});

const initialPlayers = [
  // =========================
  // NAPOLI
  // =========================
  createPlayer({
    id: 1,
    name: "Alex",
    number: 1,
    team: "home",
    role: "POR",
    ...FORMATION_HOME[0],
    pace: 70,
    acceleration: 65,
    shooting: 15,
    finishing: 10,
    passing: 72,
    dribbling: 35,
    tackling: 55,
    marking: 60,
    strength: 76,
    jumping: 78,
    stamina: 70,
    positioning: 88,
    decisions: 82,
    mentality: 84,
  }),

  createPlayer({
    id: 2,
    name: "Lorenzo",
    number: 2,
    team: "home",
    role: "TD",
    ...FORMATION_HOME[1],
    pace: 84,
    acceleration: 87,
    shooting: 48,
    finishing: 45,
    passing: 79,
    dribbling: 73,
    tackling: 76,
    marking: 78,
    strength: 72,
    jumping: 68,
    stamina: 88,
    positioning: 82,
    decisions: 78,
    mentality: 82,
  }),

  createPlayer({
    id: 3,
    name: "Marco",
    number: 3,
    team: "home",
    role: "DC",
    ...FORMATION_HOME[2],
    pace: 71,
    acceleration: 64,
    shooting: 28,
    finishing: 22,
    passing: 73,
    dribbling: 40,
    tackling: 89,
    marking: 91,
    strength: 86,
    jumping: 84,
    stamina: 82,
    positioning: 92,
    decisions: 81,
    mentality: 88,
  }),

  createPlayer({
    id: 4,
    name: "Diego",
    number: 4,
    team: "home",
    role: "DC",
    ...FORMATION_HOME[3],
    pace: 68,
    acceleration: 61,
    shooting: 25,
    finishing: 20,
    passing: 70,
    dribbling: 37,
    tackling: 91,
    marking: 88,
    strength: 90,
    jumping: 89,
    stamina: 80,
    positioning: 89,
    decisions: 84,
    mentality: 86,
  }),

  createPlayer({
    id: 5,
    name: "Nico",
    number: 5,
    team: "home",
    role: "TS",
    ...FORMATION_HOME[4],
    pace: 86,
    acceleration: 89,
    shooting: 42,
    finishing: 40,
    passing: 77,
    dribbling: 75,
    tackling: 79,
    marking: 81,
    strength: 70,
    jumping: 66,
    stamina: 91,
    positioning: 84,
    decisions: 80,
    mentality: 83,
  }),

  createPlayer({
    id: 6,
    name: "Leo",
    number: 6,
    team: "home",
    role: "MED",
    ...FORMATION_HOME[5],
    pace: 73,
    acceleration: 70,
    shooting: 48,
    finishing: 43,
    passing: 91,
    dribbling: 79,
    tackling: 84,
    marking: 82,
    strength: 75,
    jumping: 61,
    stamina: 93,
    positioning: 90,
    decisions: 94,
    mentality: 92,
  }),

  createPlayer({
    id: 7,
    name: "Mati",
    number: 7,
    team: "home",
    role: "CC",
    ...FORMATION_HOME[6],
    pace: 83,
    acceleration: 86,
    shooting: 72,
    finishing: 69,
    passing: 87,
    dribbling: 88,
    tackling: 63,
    marking: 58,
    strength: 67,
    jumping: 64,
    stamina: 88,
    positioning: 86,
    decisions: 89,
    mentality: 87,
  }),

  createPlayer({
    id: 8,
    name: "Andre",
    number: 8,
    team: "home",
    role: "CC",
    ...FORMATION_HOME[7],
    pace: 81,
    acceleration: 79,
    shooting: 69,
    finishing: 65,
    passing: 85,
    dribbling: 82,
    tackling: 69,
    marking: 61,
    strength: 72,
    jumping: 71,
    stamina: 90,
    positioning: 84,
    decisions: 87,
    mentality: 85,
  }),

  createPlayer({
    id: 9,
    name: "Luca",
    number: 9,
    team: "home",
    role: "AD",
    ...FORMATION_HOME[8],
    pace: 95,
    acceleration: 97,
    shooting: 82,
    finishing: 85,
    passing: 77,
    dribbling: 92,
    tackling: 25,
    marking: 30,
    strength: 66,
    jumping: 72,
    stamina: 84,
    positioning: 89,
    decisions: 82,
    mentality: 88,
  }),

  createPlayer({
    id: 10,
    name: "Davide",
    number: 10,
    team: "home",
    role: "TQ",
    ...FORMATION_HOME[9],
    pace: 88,
    acceleration: 90,
    shooting: 87,
    finishing: 88,
    passing: 94,
    dribbling: 93,
    tackling: 24,
    marking: 27,
    strength: 62,
    jumping: 63,
    stamina: 81,
    positioning: 91,
    decisions: 97,
    mentality: 95,
  }),

  createPlayer({
    id: 11,
    name: "Sam",
    number: 11,
    team: "home",
    role: "AS",
    ...FORMATION_HOME[10],
    pace: 93,
    acceleration: 95,
    shooting: 84,
    finishing: 86,
    passing: 80,
    dribbling: 91,
    tackling: 23,
    marking: 28,
    strength: 68,
    jumping: 75,
    stamina: 86,
    positioning: 87,
    decisions: 84,
    mentality: 90,
  }),

  // =========================
  // JUVENTUS
  // =========================
  createPlayer({
    id: 12,
    name: "Mike",
    number: 1,
    team: "away",
    role: "POR",
    ...FORMATION_AWAY[0],
    pace: 68,
    acceleration: 63,
    shooting: 15,
    finishing: 10,
    passing: 70,
    dribbling: 32,
    tackling: 56,
    marking: 62,
    strength: 78,
    jumping: 81,
    stamina: 71,
    positioning: 89,
    decisions: 83,
    mentality: 85,
  }),

  createPlayer({
    id: 13,
    name: "Tom",
    number: 2,
    team: "away",
    role: "TD",
    ...FORMATION_AWAY[1],
    pace: 81,
    acceleration: 84,
    shooting: 40,
    finishing: 37,
    passing: 75,
    dribbling: 69,
    tackling: 78,
    marking: 80,
    strength: 73,
    jumping: 69,
    stamina: 86,
    positioning: 81,
    decisions: 78,
    mentality: 80,
  }),

  createPlayer({
    id: 14,
    name: "Paul",
    number: 3,
    team: "away",
    role: "DC",
    ...FORMATION_AWAY[2],
    pace: 72,
    acceleration: 65,
    shooting: 27,
    finishing: 21,
    passing: 71,
    dribbling: 39,
    tackling: 86,
    marking: 89,
    strength: 88,
    jumping: 86,
    stamina: 81,
    positioning: 90,
    decisions: 83,
    mentality: 87,
  }),

  createPlayer({
    id: 15,
    name: "John",
    number: 4,
    team: "away",
    role: "DC",
    ...FORMATION_AWAY[3],
    pace: 70,
    acceleration: 62,
    shooting: 24,
    finishing: 19,
    passing: 69,
    dribbling: 35,
    tackling: 88,
    marking: 91,
    strength: 89,
    jumping: 91,
    stamina: 79,
    positioning: 92,
    decisions: 85,
    mentality: 88,
  }),

  createPlayer({
    id: 16,
    name: "Max",
    number: 5,
    team: "away",
    role: "TS",
    ...FORMATION_AWAY[4],
    pace: 82,
    acceleration: 85,
    shooting: 39,
    finishing: 35,
    passing: 74,
    dribbling: 70,
    tackling: 80,
    marking: 82,
    strength: 71,
    jumping: 68,
    stamina: 89,
    positioning: 83,
    decisions: 79,
    mentality: 82,
  }),

  createPlayer({
    id: 17,
    name: "Chris",
    number: 6,
    team: "away",
    role: "MED",
    ...FORMATION_AWAY[5],
    pace: 75,
    acceleration: 71,
    shooting: 51,
    finishing: 45,
    passing: 87,
    dribbling: 75,
    tackling: 86,
    marking: 85,
    strength: 78,
    jumping: 63,
    stamina: 92,
    positioning: 91,
    decisions: 91,
    mentality: 91,
  }),

  createPlayer({
    id: 18,
    name: "Alex",
    number: 7,
    team: "away",
    role: "CC",
    ...FORMATION_AWAY[6],
    pace: 82,
    acceleration: 84,
    shooting: 71,
    finishing: 67,
    passing: 85,
    dribbling: 84,
    tackling: 66,
    marking: 60,
    strength: 68,
    jumping: 66,
    stamina: 87,
    positioning: 85,
    decisions: 88,
    mentality: 86,
  }),

  createPlayer({
    id: 19,
    name: "Dan",
    number: 8,
    team: "away",
    role: "CC",
    ...FORMATION_AWAY[7],
    pace: 80,
    acceleration: 77,
    shooting: 66,
    finishing: 61,
    passing: 83,
    dribbling: 80,
    tackling: 71,
    marking: 65,
    strength: 74,
    jumping: 73,
    stamina: 89,
    positioning: 83,
    decisions: 85,
    mentality: 84,
  }),

  createPlayer({
    id: 20,
    name: "Ryan",
    number: 9,
    team: "away",
    role: "AD",
    ...FORMATION_AWAY[8],
    pace: 94,
    acceleration: 96,
    shooting: 83,
    finishing: 86,
    passing: 75,
    dribbling: 90,
    tackling: 24,
    marking: 27,
    strength: 67,
    jumping: 73,
    stamina: 85,
    positioning: 88,
    decisions: 84,
    mentality: 87,
  }),

  createPlayer({
    id: 21,
    name: "Jack",
    number: 10,
    team: "away",
    role: "TQ",
    ...FORMATION_AWAY[9],
    pace: 86,
    acceleration: 89,
    shooting: 84,
    finishing: 86,
    passing: 92,
    dribbling: 90,
    tackling: 25,
    marking: 29,
    strength: 64,
    jumping: 65,
    stamina: 80,
    positioning: 90,
    decisions: 94,
    mentality: 93,
  }),

  createPlayer({
    id: 22,
    name: "Noah",
    number: 11,
    team: "away",
    role: "AS",
    ...FORMATION_AWAY[10],
    pace: 91,
    acceleration: 94,
    shooting: 80,
    finishing: 83,
    passing: 78,
    dribbling: 89,
    tackling: 25,
    marking: 30,
    strength: 67,
    jumping: 74,
    stamina: 86,
    positioning: 86,
    decisions: 83,
    mentality: 88,
  }),
];

const clamp = (value, min, max) =>
  Math.max(min, Math.min(max, value));

const distance = (a, b) =>
  Math.hypot(a.x - b.x, a.y - b.y);

function calculateOverall(player) {
  const roleWeights = {
    POR: [
      ["positioning", 0.25],
      ["decisions", 0.18],
      ["passing", 0.14],
      ["mentality", 0.14],
      ["jumping", 0.1],
      ["strength", 0.1],
      ["pace", 0.09],
    ],
    DC: [
      ["tackling", 0.2],
      ["marking", 0.2],
      ["positioning", 0.17],
      ["strength", 0.12],
      ["jumping", 0.1],
      ["decisions", 0.09],
      ["passing", 0.07],
      ["pace", 0.05],
    ],
    MED: [
      ["passing", 0.2],
      ["decisions", 0.18],
      ["positioning", 0.15],
      ["tackling", 0.13],
      ["stamina", 0.1],
      ["mentality", 0.1],
      ["dribbling", 0.08],
      ["pace", 0.06],
    ],
    CC: [
      ["passing", 0.18],
      ["dribbling", 0.16],
      ["decisions", 0.15],
      ["stamina", 0.12],
      ["shooting", 0.11],
      ["positioning", 0.1],
      ["pace", 0.09],
      ["mentality", 0.09],
    ],
    TQ: [
      ["passing", 0.2],
      ["dribbling", 0.19],
      ["decisions", 0.18],
      ["shooting", 0.13],
      ["finishing", 0.1],
      ["positioning", 0.08],
      ["pace", 0.06],
      ["mentality", 0.06],
    ],
    AD: [
      ["pace", 0.18],
      ["acceleration", 0.16],
      ["dribbling", 0.17],
      ["finishing", 0.13],
      ["shooting", 0.1],
      ["passing", 0.08],
      ["positioning", 0.08],
      ["decisions", 0.1],
    ],
    AS: [
      ["pace", 0.18],
      ["acceleration", 0.16],
      ["dribbling", 0.17],
      ["finishing", 0.13],
      ["shooting", 0.1],
      ["passing", 0.08],
      ["positioning", 0.08],
      ["decisions", 0.1],
    ],
    TD: [
      ["pace", 0.14],
      ["acceleration", 0.12],
      ["tackling", 0.15],
      ["marking", 0.14],
      ["passing", 0.12],
      ["stamina", 0.1],
      ["positioning", 0.11],
      ["decisions", 0.12],
    ],
    TS: [
      ["pace", 0.14],
      ["acceleration", 0.12],
      ["tackling", 0.15],
      ["marking", 0.14],
      ["passing", 0.12],
      ["stamina", 0.1],
      ["positioning", 0.11],
      ["decisions", 0.12],
    ],
  };

  const weights = roleWeights[player.role] || roleWeights.CC;

  return Math.round(
    weights.reduce(
      (total, [attribute, weight]) =>
        total + player[attribute] * weight,
      0
    )
  );
}

function App() {
  const [players, setPlayers] = useState(initialPlayers);
  const [ball, setBall] = useState({
    x: 50,
    y: 50,
    targetX: 50,
    targetY: 50,
    owner: null,
  });

  const [score, setScore] = useState({
    home: 0,
    away: 0,
  });

  const [time, setTime] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [paused, setPaused] = useState(true);
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  const [matchStats, setMatchStats] = useState({
    homePossession: 50,
    awayPossession: 50,
    homeShots: 0,
    awayShots: 0,
    homePasses: 0,
    awayPasses: 0,
    homeXg: 0,
    awayXg: 0,
  });

  const playersRef = useRef(initialPlayers);
  const ballRef = useRef({
    x: 50,
    y: 50,
    targetX: 50,
    targetY: 50,
    owner: null,
  });

  const possessionRef = useRef("home");
  const lastActionRef = useRef(0);
  const lastStatUpdateRef = useRef(0);
  const lastTimeRef = useRef(performance.now());

  const resetMatch = () => {
    const resetPlayers = initialPlayers.map((player) => ({
      ...player,
      x: player.baseX,
      y: player.baseY,
    }));

    playersRef.current = resetPlayers;

    const resetBall = {
      x: 50,
      y: 50,
      targetX: 50,
      targetY: 50,
      owner: null,
    };

    ballRef.current = resetBall;

    setPlayers(resetPlayers);
    setBall(resetBall);

    setScore({
      home: 0,
      away: 0,
    });

    setMatchStats({
      homePossession: 50,
      awayPossession: 50,
      homeShots: 0,
      awayShots: 0,
      homePasses: 0,
      awayPasses: 0,
      homeXg: 0,
      awayXg: 0,
    });

    possessionRef.current = "home";
    lastActionRef.current = 0;
    lastStatUpdateRef.current = 0;

    setTime(0);
    setPaused(true);
  };

  useEffect(() => {
    if (paused) {
      lastTimeRef.current = performance.now();
      return;
    }

    let animationFrame;

    const animate = (now) => {
      const realDelta = Math.min(
        (now - lastTimeRef.current) / 1000,
        0.05
      );

      lastTimeRef.current = now;

      const gameDelta =
        realDelta *
        GAME_SECONDS_PER_REAL_SECOND *
        speed;

      setTime((currentTime) => {
        const nextTime = currentTime + gameDelta;

        if (nextTime >= 90 * 60) {
          setPaused(true);
          return 90 * 60;
        }

        return nextTime;
      });

      const currentPlayers = playersRef.current;
      const currentBall = ballRef.current;

      /*
       * ========================================================
       * MOVIMENTO DE SQUADRA
       * ========================================================
       */

      const newPlayers = currentPlayers.map((player) => {
        const formation =
          player.team === "home"
            ? FORMATION_HOME[player.id - 1]
            : FORMATION_AWAY[player.id - 12];

        let targetX = formation.x;
        let targetY = formation.y;

        /*
         * La squadra segue la posizione del pallone.
         * L'effetto è volutamente moderato per mantenere
         * la struttura tattica.
         */
        const ballPullX =
          (currentBall.x - 50) * 0.13;

        const ballPullY =
          (currentBall.y - 50) * 0.09;

        if (player.team === "home") {
          targetX += ballPullX;
        } else {
          targetX += ballPullX;
        }

        targetY += ballPullY;

        /*
         * Il giocatore più vicino alla palla tende ad
         * avvicinarsi maggiormente.
         */
        const playerDistance = distance(player, currentBall);

        if (
          playerDistance < 20 &&
          player.role !== "POR"
        ) {
          targetX +=
            (currentBall.x - player.x) * 0.18;

          targetY +=
            (currentBall.y - player.y) * 0.18;
        }

        /*
         * Movimento individuale.
         *
         * Il movimento sinusoidale rende le pedine
         * continuamente vive senza farle sembrare
         * completamente casuali.
         */
        const timeFactor = now / 1000;

        const individualX =
          Math.sin(
            timeFactor * 0.8 +
              player.id * 1.37
          ) * 2.2;

        const individualY =
          Math.cos(
            timeFactor * 0.65 +
              player.id * 1.71
          ) * 1.8;

        targetX += individualX;
        targetY += individualY;

        /*
         * Movimento verso il target.
         *
         * Pace e accelerazione influenzano realmente
         * la velocità della pedina.
         */
        const movementFactor =
          (0.0009 + player.pace / 90000) *
          (0.75 + player.acceleration / 200);

        const dx = targetX - player.x;
        const dy = targetY - player.y;

        const moveDistance = Math.hypot(dx, dy);

        let nextX = player.x;
        let nextY = player.y;

        if (moveDistance > 0.05) {
          const maxMove =
            movementFactor *
            gameDelta *
            12;

          const ratio = Math.min(
            maxMove / moveDistance,
            1
          );

          nextX =
            player.x +
            dx * ratio;

          nextY =
            player.y +
            dy * ratio;
        }

        return {
          ...player,
          x: clamp(nextX, 4, 96),
          y: clamp(nextY, 6, 94),
        };
      });

      playersRef.current = newPlayers;
      setPlayers(newPlayers);

      /*
       * ========================================================
       * MOVIMENTO DEL PALLONE
       * ========================================================
       */

      const ballDx =
        currentBall.targetX -
        currentBall.x;

      const ballDy =
        currentBall.targetY -
        currentBall.y;

      const ballDistance = Math.hypot(
        ballDx,
        ballDy
      );

      let nextBallX = currentBall.x;
      let nextBallY = currentBall.y;

      if (ballDistance > 0.05) {
        const ballMove =
          0.015 *
          gameDelta *
          10;

        const ratio = Math.min(
          ballMove / ballDistance,
          1
        );

        nextBallX =
          currentBall.x +
          ballDx * ratio;

        nextBallY =
          currentBall.y +
          ballDy * ratio;
      }

      /*
       * Se il pallone ha un proprietario, segue
       * il giocatore con un leggero ritardo.
       */
      if (currentBall.owner !== null) {
        const owner = newPlayers.find(
          (player) =>
            player.id === currentBall.owner
        );

        if (owner) {
          nextBallX +=
            (owner.x - nextBallX) * 0.25;

          nextBallY +=
            (owner.y - nextBallY) * 0.25;
        }
      }

      const nextBall = {
        ...currentBall,
        x: nextBallX,
        y: nextBallY,
      };

      ballRef.current = nextBall;
      setBall(nextBall);

      /*
       * ========================================================
       * DECISIONE / PASSAGGIO
       * ========================================================
       */

      if (
        now - lastActionRef.current >
        900 / speed
      ) {
        lastActionRef.current = now;

        const attackingTeam =
          possessionRef.current;

        const teamPlayers =
          newPlayers.filter(
            (player) =>
              player.team === attackingTeam &&
              player.role !== "POR"
          );

        if (teamPlayers.length > 1) {
          /*
           * Troviamo il giocatore più vicino al pallone.
           * Questo diventa il portatore.
           */
          const passer =
            [...teamPlayers].sort(
              (a, b) =>
                distance(a, currentBall) -
                distance(b, currentBall)
            )[0];

          /*
           * Cerchiamo compagni davanti al portatore.
           */
          const receivers =
            teamPlayers
              .filter(
                (player) =>
                  player.id !== passer.id
              )
              .map((player) => {
                const d = distance(
                  passer,
                  player
                );

                const forward =
                  attackingTeam === "home"
                    ? player.x - passer.x
                    : passer.x - player.x;

                return {
                  player,
                  distance: d,
                  forward,
                };
              })
              .sort((a, b) => {
                const scoreA =
                  a.forward * 1.5 -
                  a.distance * 0.35;

                const scoreB =
                  b.forward * 1.5 -
                  b.distance * 0.35;

                return scoreB - scoreA;
              });

          const receiver =
            receivers[0]?.player;

          if (receiver) {
            /*
             * Qualità del passaggio.
             */
            const passQuality =
              passer.passing / 99;

            const decisionQuality =
              passer.decisions / 99;

            const successChance =
              0.68 +
              passQuality * 0.18 +
              decisionQuality * 0.1;

            const successfulPass =
              Math.random() <
              successChance;

            if (successfulPass) {
              const updatedBall = {
                x: currentBall.x,
                y: currentBall.y,
                targetX: receiver.x,
                targetY: receiver.y,
                owner: receiver.id,
              };

              ballRef.current =
                updatedBall;

              setBall(updatedBall);

              setMatchStats((stats) => {
                const key =
                  attackingTeam === "home"
                    ? "homePasses"
                    : "awayPasses";

                return {
                  ...stats,
                  [key]: stats[key] + 1,
                };
              });
            } else {
              /*
               * Passaggio sbagliato:
               * il pallone va verso una posizione
               * leggermente casuale.
               */
              const errorX =
                receiver.x +
                (Math.random() - 0.5) * 12;

              const errorY =
                receiver.y +
                (Math.random() - 0.5) * 12;

              const updatedBall = {
                x: currentBall.x,
                y: currentBall.y,
                targetX: clamp(
                  errorX,
                  4,
                  96
                ),
                targetY: clamp(
                  errorY,
                  6,
                  94
                ),
                owner: null,
              };

              ballRef.current =
                updatedBall;

              setBall(updatedBall);

              possessionRef.current =
                possessionRef.current ===
                "home"
                  ? "away"
                  : "home";
            }
          }
        }
      }

      /*
       * ========================================================
       * EVENTI OFFENSIVI
       * ========================================================
       */

      if (
        Math.random() <
        0.0022 * speed
      ) {
        const attackingTeam =
          possessionRef.current;

        const attackingPlayers =
          newPlayers.filter(
            (player) =>
              player.team ===
              attackingTeam &&
              player.role !== "POR"
          );

        if (attackingPlayers.length) {
          const attacker =
            attackingPlayers[
              Math.floor(
                Math.random() *
                  attackingPlayers.length
              )
            ];

          const shootingPower =
            attacker.shooting / 99;

          const finishing =
            attacker.finishing / 99;

          const decision =
            attacker.decisions / 99;

          const chance =
            0.12 +
            shootingPower * 0.2 +
            finishing * 0.3 +
            decision * 0.15;

          setMatchStats((stats) => {
            const shotKey =
              attackingTeam === "home"
                ? "homeShots"
                : "awayShots";

            const xgKey =
              attackingTeam === "home"
                ? "homeXg"
                : "awayXg";

            const xg =
              0.03 +
              Math.random() * 0.18;

            return {
              ...stats,
              [shotKey]:
                stats[shotKey] + 1,
              [xgKey]:
                stats[xgKey] + xg,
            };
          });

          /*
           * Il tiro può diventare gol.
           */
          if (Math.random() < chance * 0.16) {
            setScore((currentScore) => ({
              ...currentScore,
              [attackingTeam]:
                currentScore[
                  attackingTeam
                ] + 1,
            }));

            const goalBall = {
              x:
                attackingTeam === "home"
                  ? 97
                  : 3,
              y: 50,
              targetX:
                attackingTeam === "home"
                  ? 97
                  : 3,
              targetY: 50,
              owner: null,
            };

            ballRef.current =
              goalBall;

            setBall(goalBall);

            possessionRef.current =
              attackingTeam === "home"
                ? "away"
                : "home";
          }
        }
      }

      /*
       * ========================================================
       * POSSESSO
       * ========================================================
       */

      if (
        now - lastStatUpdateRef.current >
        1000
      ) {
        lastStatUpdateRef.current = now;

        const homeControl =
          newPlayers
            .filter(
              (player) =>
                player.team === "home"
            )
            .reduce(
              (sum, player) =>
                sum +
                player.passing +
                player.decisions +
                player.mentality,
              0
            );

        const awayControl =
          newPlayers
            .filter(
              (player) =>
                player.team === "away"
            )
            .reduce(
              (sum, player) =>
                sum +
                player.passing +
                player.decisions +
                player.mentality,
              0
            );

        const total =
          homeControl +
          awayControl;

        const homePercentage =
          Math.round(
            (homeControl / total) * 100
          );

        setMatchStats((stats) => ({
          ...stats,
          homePossession:
            homePercentage,
          awayPossession:
            100 - homePercentage,
        }));
      }

      animationFrame =
        requestAnimationFrame(animate);
    };

    animationFrame =
      requestAnimationFrame(animate);

    return () =>
      cancelAnimationFrame(
        animationFrame
      );
  }, [paused, speed]);

  const formatTime = (seconds) => {
    const mins = Math.floor(
      seconds / 60
    );

    const secs = Math.floor(
      seconds % 60
    );

    return `${String(mins).padStart(
      2,
      "0"
    )}:${String(secs).padStart(
      2,
      "0"
    )}`;
  };

  const handleSelectPlayer = (player) => {
    setSelectedPlayer({
      ...player,
      overall:
        calculateOverall(player),
    });
  };

  return (
    <div className="app">
      {/* ======================================================
          HEADER
      ====================================================== */}

      <header className="topbar">
        <div className="brand">
          <div className="competition">
            SERIE A • GIORNATA 1
          </div>

          <h1>CALCIO MANAGER</h1>
        </div>

        <div className="match-score">
          <div className="team-name">
            NAPOLI
          </div>

          <div className="score">
            {score.home}
            <span>–</span>
            {score.away}
          </div>

          <div className="team-name">
            JUVENTUS
          </div>

          <div className="match-time">
            {formatTime(time)}
          </div>
        </div>
      </header>

      {/* ======================================================
          STADIO
      ====================================================== */}

      <main>
        <div className="stadium">
          <div className="stand">
            {Array.from({
              length: 52,
            }).map((_, index) => (
              <span key={index}>
                {index % 3 === 0
                  ? "●"
                  : "•"}
              </span>
            ))}
          </div>

          <div className="pitch-wrapper">
            <div className="pitch">
              <div className="center-line" />

              <div className="center-circle" />

              <div className="center-dot" />

              <div className="penalty-area left">
                <div className="goal-area" />
              </div>

              <div className="penalty-area right">
                <div className="goal-area" />
              </div>

              <div className="penalty-spot left" />
              <div className="penalty-spot right" />

              <div className="corner c1" />
              <div className="corner c2" />
              <div className="corner c3" />
              <div className="corner c4" />

              {players.map((player) => (
                <button
                  key={player.id}
                  className={`player ${player.team}`}
                  style={{
                    left: `${player.x}%`,
                    top: `${player.y}%`,
                  }}
                  onClick={() =>
                    handleSelectPlayer(
                      player
                    )
                  }
                  aria-label={
                    player.name
                  }
                >
                  <span>
                    {player.number}
                  </span>
                </button>
              ))}

              <div
                className="ball"
                style={{
                  left: `${ball.x}%`,
                  top: `${ball.y}%`,
                }}
              >
                ⚽
              </div>
            </div>
          </div>

          <div className="stand">
            {Array.from({
              length: 52,
            }).map((_, index) => (
              <span key={index}>
                {index % 3 === 0
                  ? "●"
                  : "•"}
              </span>
            ))}
          </div>
        </div>

        {/* ====================================================
            CONTROLLI
        ==================================================== */}

        <section className="controls">
          <button
            className="main-button"
            onClick={() =>
              setPaused(
                (current) => !current
              )
            }
          >
            {paused
              ? "▶ INIZIA PARTITA"
              : "Ⅱ PAUSA"}
          </button>

          <button
            className={
              speed === 1
                ? "speed active"
                : "speed"
            }
            onClick={() =>
              setSpeed(1)
            }
          >
            1×
          </button>

          <button
            className={
              speed === 2
                ? "speed active"
                : "speed"
            }
            onClick={() =>
              setSpeed(2)
            }
          >
            2×
          </button>

          <button
            className={
              speed === 4
                ? "speed active"
                : "speed"
            }
            onClick={() =>
              setSpeed(4)
            }
          >
            4×
          </button>

          <button
            onClick={resetMatch}
          >
            ↻ RESET
          </button>
        </section>

        {/* ====================================================
            STATISTICHE
        ==================================================== */}

        <section className="stats-panel">
          <Stat
            title="POSSESSO"
            value={`${matchStats.homePossession}% – ${matchStats.awayPossession}%`}
          />

          <Stat
            title="TIRI"
            value={`${matchStats.homeShots} – ${matchStats.awayShots}`}
          />

          <Stat
            title="PASSAGGI"
            value={`${matchStats.homePasses} – ${matchStats.awayPasses}`}
          />

          <Stat
            title="xG"
            value={`${matchStats.homeXg.toFixed(
              2
            )} – ${matchStats.awayXg.toFixed(
              2
            )}`}
          />
        </section>

        {/* ====================================================
            TATTICA
        ==================================================== */}

        <section className="tactics">
          <div>
            <span>MODULO</span>
            <strong>4-3-3</strong>
          </div>

          <div>
            <span>MENTALITÀ</span>
            <strong>Equilibrata</strong>
          </div>

          <div>
            <span>PRESSING</span>
            <strong>Medio</strong>
          </div>

          <div>
            <span>RITMO</span>
            <strong>Alto</strong>
          </div>
        </section>
      </main>

      {/* ======================================================
          SCHEDA GIOCATORE
      ====================================================== */}

      {selectedPlayer && (
        <div
          className="modal-overlay"
          onClick={() =>
            setSelectedPlayer(null)
          }
        >
          <div
            className="player-card"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <button
              className="close"
              onClick={() =>
                setSelectedPlayer(null)
              }
            >
              ×
            </button>

            <div className="card-header">
              <div
                className={`big-number ${selectedPlayer.team}`}
              >
                {selectedPlayer.number}
              </div>

              <div className="player-info">
                <span className="small-role">
                  {selectedPlayer.role}
                </span>

                <h2>
                  {selectedPlayer.name}
                </h2>

                <span>
                  {selectedPlayer.team ===
                  "home"
                    ? "NAPOLI"
                    : "JUVENTUS"}
                </span>
              </div>

              <div className="overall">
                <small>OVR</small>
                <strong>
                  {selectedPlayer.overall}
                </strong>
              </div>
            </div>

            <div className="attributes">
              <Attribute
                name="Velocità"
                value={
                  selectedPlayer.pace
                }
              />

              <Attribute
                name="Accelerazione"
                value={
                  selectedPlayer.acceleration
                }
              />

              <Attribute
                name="Tiro"
                value={
                  selectedPlayer.shooting
                }
              />

              <Attribute
                name="Finalizzazione"
                value={
                  selectedPlayer.finishing
                }
              />

              <Attribute
                name="Passaggio"
                value={
                  selectedPlayer.passing
                }
              />

              <Attribute
                name="Dribbling"
                value={
                  selectedPlayer.dribbling
                }
              />

              <Attribute
                name="Contrasti"
                value={
                  selectedPlayer.tackling
                }
              />

              <Attribute
                name="Marcatura"
                value={
                  selectedPlayer.marking
                }
              />

              <Attribute
                name="Forza"
                value={
                  selectedPlayer.strength
                }
              />

              <Attribute
                name="Elevazione"
                value={
                  selectedPlayer.jumping
                }
              />

              <Attribute
                name="Resistenza"
                value={
                  selectedPlayer.stamina
                }
              />

              <Attribute
                name="Posizionamento"
                value={
                  selectedPlayer.positioning
                }
              />

              <Attribute
                name="Decisioni"
                value={
                  selectedPlayer.decisions
                }
              />

              <Attribute
                name="Mentalità"
                value={
                  selectedPlayer.mentality
                }
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ title, value }) {
  return (
    <div className="stat-box">
      <span>{title}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Attribute({ name, value }) {
  return (
    <div className="attribute">
      <div className="attribute-top">
        <span>{name}</span>
        <strong>{value}</strong>
      </div>

      <div className="attribute-bar">
        <div
          style={{
            width: `${value}%`,
          }}
        />
      </div>
    </div>
  );
}

export default App;
