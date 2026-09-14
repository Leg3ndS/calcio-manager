import { useEffect, useRef, useState } from "react";
import "./App.css";

const GAME_SPEED = 20;
const MATCH_LENGTH = 90 * 60;

const HOME_FORMATION = [
  { x: 7, y: 50 },  // POR
  { x: 21, y: 84 }, // TD
  { x: 20, y: 63 }, // DC
  { x: 20, y: 37 }, // DC
  { x: 21, y: 16 }, // TS
  { x: 37, y: 50 }, // MED
  { x: 46, y: 70 }, // CC
  { x: 46, y: 30 }, // CC
  { x: 62, y: 84 }, // AD
  { x: 61, y: 50 }, // TQ
  { x: 62, y: 16 }, // AS
];

const AWAY_FORMATION = [
  { x: 93, y: 50 }, // POR
  { x: 79, y: 16 }, // TD
  { x: 80, y: 37 }, // DC
  { x: 80, y: 63 }, // DC
  { x: 79, y: 84 }, // TS
  { x: 63, y: 50 }, // MED
  { x: 54, y: 30 }, // CC
  { x: 54, y: 70 }, // CC
  { x: 38, y: 16 }, // AD
  { x: 39, y: 50 }, // TQ
  { x: 38, y: 84 }, // AS
];

function createPlayer(data) {
  return {
    ...data,
    baseX: data.x,
    baseY: data.y,
  };
}

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
    ...HOME_FORMATION[0],
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
    ...HOME_FORMATION[1],
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
    ...HOME_FORMATION[2],
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
    ...HOME_FORMATION[3],
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
    ...HOME_FORMATION[4],
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
    ...HOME_FORMATION[5],
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
    ...HOME_FORMATION[6],
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
    ...HOME_FORMATION[7],
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
    ...HOME_FORMATION[8],
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
    ...HOME_FORMATION[9],
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
    ...HOME_FORMATION[10],
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
    ...AWAY_FORMATION[0],
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
    ...AWAY_FORMATION[1],
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
    ...AWAY_FORMATION[2],
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
    ...AWAY_FORMATION[3],
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
    ...AWAY_FORMATION[4],
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
    ...AWAY_FORMATION[5],
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
    ...AWAY_FORMATION[6],
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
    ...AWAY_FORMATION[7],
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
    ...AWAY_FORMATION[8],
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
    ...AWAY_FORMATION[9],
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
    ...AWAY_FORMATION[10],
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
  const technical =
    player.passing +
    player.dribbling +
    player.shooting;

  const physical =
    player.pace +
    player.acceleration +
    player.stamina +
    player.strength;

  const mental =
    player.decisions +
    player.positioning +
    player.mentality;

  const defensive =
    player.tackling +
    player.marking;

  if (player.role === "POR") {
    return Math.round(
      (player.positioning * 0.25 +
        player.decisions * 0.2 +
        player.passing * 0.15 +
        player.mentality * 0.15 +
        player.jumping * 0.1 +
        player.strength * 0.1 +
        player.pace * 0.05)
    );
  }

  if (
    player.role === "DC"
  ) {
    return Math.round(
      defensive * 0.25 +
        player.positioning * 0.2 +
        player.strength * 0.15 +
        player.jumping * 0.1 +
        player.passing * 0.1 +
        player.decisions * 0.1 +
        player.pace * 0.1
    );
  }

  if (
    player.role === "TD" ||
    player.role === "TS"
  ) {
    return Math.round(
      physical * 0.18 +
        defensive * 0.16 +
        player.passing * 0.14 +
        player.positioning * 0.12 +
        player.decisions * 0.12 +
        player.dribbling * 0.1 +
        player.mentality * 0.08 +
        player.shooting * 0.1
    );
  }

  if (
    player.role === "AD" ||
    player.role === "AS"
  ) {
    return Math.round(
      player.pace * 0.17 +
        player.acceleration * 0.15 +
        player.dribbling * 0.2 +
        player.finishing * 0.14 +
        player.shooting * 0.1 +
        player.passing * 0.08 +
        player.decisions * 0.08 +
        player.mentality * 0.08
    );
  }

  return Math.round(
    technical * 0.3 +
      mental * 0.25 +
      physical * 0.2 +
      defensive * 0.1 +
      player.shooting * 0.15
  );
}

function App() {
  const [players, setPlayers] =
    useState(initialPlayers);

  const [ball, setBall] = useState({
    x: 50,
    y: 50,
    targetX: 50,
    targetY: 50,
    owner: null,
    mode: "free",
  });

  const [score, setScore] =
    useState({
      home: 0,
      away: 0,
    });

  const [time, setTime] =
    useState(0);

  const [paused, setPaused] =
    useState(true);

  const [speed, setSpeed] =
    useState(1);

  const [selectedPlayer, setSelectedPlayer] =
    useState(null);

  const [matchStats, setMatchStats] =
    useState({
      homePossession: 50,
      awayPossession: 50,
      homeShots: 0,
      awayShots: 0,
      homePasses: 0,
      awayPasses: 0,
      homeXg: 0,
      awayXg: 0,
    });

  const playersRef =
    useRef(initialPlayers);

  const ballRef =
    useRef({
      x: 50,
      y: 50,
      targetX: 50,
      targetY: 50,
      owner: null,
      mode: "free",
    });

  const possessionRef =
    useRef("home");

  const lastActionRef =
    useRef(0);

  const lastShotRef =
    useRef(0);

  const lastPossessionRef =
    useRef(0);

  const animationRef =
    useRef(null);

  const lastFrameRef =
    useRef(performance.now());

  /*
   * ==========================================================
   * RESET
   * ==========================================================
   */

  const resetMatch = () => {
    const resetPlayers =
      initialPlayers.map(
        (player) => ({
          ...player,
          x: player.baseX,
          y: player.baseY,
        })
      );

    const resetBall = {
      x: 50,
      y: 50,
      targetX: 50,
      targetY: 50,
      owner: null,
      mode: "free",
    };

    playersRef.current =
      resetPlayers;

    ballRef.current =
      resetBall;

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

    possessionRef.current =
      "home";

    lastActionRef.current = 0;
    lastShotRef.current = 0;
    lastPossessionRef.current = 0;

    setTime(0);
    setPaused(true);
  };

  /*
   * ==========================================================
   * MATCH ENGINE
   * ==========================================================
   */

  useEffect(() => {
    if (paused) {
      lastFrameRef.current =
        performance.now();

      return;
    }

    const animate = (now) => {
      const realDelta =
        Math.min(
          (now -
            lastFrameRef.current) /
            1000,
          0.04
        );

      lastFrameRef.current =
        now;

      const gameDelta =
        realDelta *
        GAME_SPEED *
        speed;

      /*
       * ------------------------------------------------------
       * CRONOMETRO
       * ------------------------------------------------------
       */

      setTime((current) => {
        const next =
          current + gameDelta;

        if (
          next >= MATCH_LENGTH
        ) {
          setPaused(true);
          return MATCH_LENGTH;
        }

        return next;
      });

      const currentPlayers =
        playersRef.current;

      const currentBall =
        ballRef.current;

      /*
       * ------------------------------------------------------
       * MOVIMENTO GIOCATORI
       * ------------------------------------------------------
       */

      const updatedPlayers =
        currentPlayers.map(
          (player) => {
            const formation =
              player.team === "home"
                ? HOME_FORMATION[
                    player.id - 1
                  ]
                : AWAY_FORMATION[
                    player.id - 12
                  ];

            let targetX =
              formation.x;

            let targetY =
              formation.y;

            /*
             * La squadra sale e scende
             * seguendo l'azione.
             */

            const ballXInfluence =
              (currentBall.x - 50) *
              0.22;

            const ballYInfluence =
              (currentBall.y - 50) *
              0.16;

            targetX +=
              ballXInfluence;

            targetY +=
              ballYInfluence;

            /*
             * I giocatori offensivi
             * fanno movimenti più ampi.
             */

            const attackingRoles = [
              "AD",
              "AS",
              "TQ",
              "CC",
            ];

            if (
              attackingRoles.includes(
                player.role
              )
            ) {
              const attackMovement =
                Math.sin(
                  now / 900 +
                    player.id
                ) * 4;

              const lateralMovement =
                Math.cos(
                  now / 750 +
                    player.id
                ) * 3;

              targetX +=
                attackMovement;

              targetY +=
                lateralMovement;
            } else {
              /*
               * Difensori e mediano
               * mantengono più struttura.
               */

              targetY +=
                Math.sin(
                  now / 1200 +
                    player.id
                ) * 1.8;

              targetX +=
                Math.cos(
                  now / 1400 +
                    player.id
                ) * 1.5;
            }

            /*
             * Se la palla è vicina,
             * il giocatore reagisce.
             */

            const ballDistance =
              distance(
                player,
                currentBall
              );

            if (
              player.role !== "POR" &&
              ballDistance < 25
            ) {
              const reaction =
                0.28;

              targetX +=
                (currentBall.x -
                  player.x) *
                reaction;

              targetY +=
                (currentBall.y -
                  player.y) *
                reaction;
            }

            /*
             * Il giocatore che possiede
             * la palla la segue.
             */

            if (
              currentBall.owner ===
              player.id
            ) {
              targetX +=
                Math.cos(
                  now / 400
                ) * 1.4;

              targetY +=
                Math.sin(
                  now / 450
                ) * 1.4;
            }

            targetX =
              clamp(
                targetX,
                4,
                96
              );

            targetY =
              clamp(
                targetY,
                5,
                95
              );

            const dx =
              targetX -
              player.x;

            const dy =
              targetY -
              player.y;

            const targetDistance =
              Math.hypot(
                dx,
                dy
              );

            /*
             * QUI aumentiamo
             * significativamente
             * la velocità.
             */

            const baseSpeed =
              0.022 +
              player.pace /
                5500;

            const accelerationFactor =
              0.7 +
              player.acceleration /
                330;

            const movement =
              baseSpeed *
              accelerationFactor *
              gameDelta *
              8;

            let nextX =
              player.x;

            let nextY =
              player.y;

            if (
              targetDistance >
              0.03
            ) {
              const ratio =
                Math.min(
                  movement /
                    targetDistance,
                  1
                );

              nextX +=
                dx * ratio;

              nextY +=
                dy * ratio;
            }

            return {
              ...player,
              x: clamp(
                nextX,
                4,
                96
              ),
              y: clamp(
                nextY,
                5,
                95
              ),
            };
          }
        );

      playersRef.current =
        updatedPlayers;

      setPlayers(
        updatedPlayers
      );

      /*
       * ------------------------------------------------------
       * PALLONE
       * ------------------------------------------------------
       */

      let nextBall = {
        ...currentBall,
      };

      /*
       * Se il pallone è in tiro/passaggio,
       * viaggia verso il bersaglio.
       */

      if (
        currentBall.mode ===
        "pass" ||
        currentBall.mode ===
        "shot"
      ) {
        const dx =
          currentBall.targetX -
          currentBall.x;

        const dy =
          currentBall.targetY -
          currentBall.y;

        const ballDistance =
          Math.hypot(
            dx,
            dy
          );

        const ballSpeed =
          currentBall.mode ===
          "shot"
            ? 1.9
            : 1.15;

        const movement =
          ballSpeed *
          gameDelta;

        if (
          ballDistance <=
          movement
        ) {
          nextBall.x =
            currentBall.targetX;

          nextBall.y =
            currentBall.targetY;

          if (
            currentBall.mode ===
            "shot"
          ) {
            /*
             * IL TIRO È ARRIVATO.
             * Solo adesso decidiamo
             * se è gol/parata/fuori.
             */

            const shootingTeam =
              possessionRef.current;

            const shooter =
              updatedPlayers.find(
                (player) =>
                  player.id ===
                  currentBall.owner
              );

            const finishing =
              shooter
                ? shooter.finishing /
                  99
                : 0.5;

            const shooting =
              shooter
                ? shooter.shooting /
                  99
                : 0.5;

            const goalkeeper =
              updatedPlayers.find(
                (player) =>
                  player.team !==
                    shootingTeam &&
                  player.role ===
                    "POR"
              );

            const goalkeeperQuality =
              goalkeeper
                ? goalkeeper.positioning /
                  99
                : 0.5;

            const goalChance =
              0.18 +
              finishing * 0.22 +
              shooting * 0.12 -
              goalkeeperQuality *
                0.12;

            const goal =
              Math.random() <
              goalChance;

            if (goal) {
              setScore(
                (currentScore) => ({
                  ...currentScore,
                  [shootingTeam]:
                    currentScore[
                      shootingTeam
                    ] + 1,
                })
              );
            }

            /*
             * Dopo il tiro rimettiamo
             * il pallone al centro.
             */

            nextBall = {
              x: 50,
              y: 50,
              targetX: 50,
              targetY: 50,
              owner: null,
              mode: "free",
            };

            possessionRef.current =
              shootingTeam ===
              "home"
                ? "away"
                : "home";
          } else {
            /*
             * Fine del passaggio.
             */

            nextBall.owner =
              currentBall.targetOwner;

            nextBall.mode =
              "free";
          }
        } else {
          const ratio =
            movement /
            ballDistance;

          nextBall.x +=
            dx * ratio;

          nextBall.y +=
            dy * ratio;
        }
      } else if (
        currentBall.owner !==
        null
      ) {
        /*
         * La palla segue il
         * portatore.
         */

        const owner =
          updatedPlayers.find(
            (player) =>
              player.id ===
              currentBall.owner
          );

        if (owner) {
          nextBall.x =
            owner.x;

          nextBall.y =
            owner.y;

          nextBall.targetX =
            owner.x;

          nextBall.targetY =
            owner.y;
        }
      }

      ballRef.current =
        nextBall;

      setBall(nextBall);

      /*
       * ------------------------------------------------------
       * PASSAGGI / DECISIONI
       * ------------------------------------------------------
       */

      if (
        now -
          lastActionRef.current >
        950 / speed
      ) {
        lastActionRef.current =
          now;

        /*
         * Se non c'è un possessore,
         * cerchiamo chi recupera
         * la palla.
         */

        if (
          nextBall.owner ===
          null &&
          nextBall.mode ===
          "free"
        ) {
          const nearest =
            [...updatedPlayers]
              .filter(
                (player) =>
                  player.role !==
                  "POR"
              )
              .sort(
                (a, b) =>
                  distance(
                    a,
                    nextBall
                  ) -
                  distance(
                    b,
                    nextBall
                  )
              )[0];

          if (
            nearest &&
            distance(
              nearest,
              nextBall
            ) < 12
          ) {
            possessionRef.current =
              nearest.team;

            const recoveredBall =
              {
                ...nextBall,
                owner:
                  nearest.id,
                mode: "free",
              };

            ballRef.current =
              recoveredBall;

            setBall(
              recoveredBall
            );
          }
        }

        /*
         * Se abbiamo un possessore,
         * valutiamo il passaggio.
         */

        if (
          nextBall.owner !==
          null &&
          nextBall.mode ===
          "free"
        ) {
          const passer =
            updatedPlayers.find(
              (player) =>
                player.id ===
                nextBall.owner
            );

          if (passer) {
            const teammates =
              updatedPlayers.filter(
                (player) =>
                  player.team ===
                    passer.team &&
                  player.id !==
                    passer.id &&
                  player.role !==
                    "POR"
              );

            if (
              teammates.length
            ) {
              /*
               * Preferiamo compagni
               * vicini ma in posizione
               * utile.
               */

              const receiver =
                [...teammates]
                  .sort(
                    (a, b) => {
                      const aForward =
                        passer.team ===
                        "home"
                          ? a.x -
                            passer.x
                          : passer.x -
                            a.x;

                      const bForward =
                        passer.team ===
                        "home"
                          ? b.x -
                            passer.x
                          : passer.x -
                            b.x;

                      const aScore =
                        aForward * 1.3 -
                        distance(
                          passer,
                          a
                        ) *
                          0.35 +
                        a.decisions *
                          0.02;

                      const bScore =
                        bForward * 1.3 -
                        distance(
                          passer,
                          b
                        ) *
                          0.35 +
                        b.decisions *
                          0.02;

                      return (
                        bScore -
                        aScore
                      );
                    }
                  )[0];

              const passQuality =
                passer.passing /
                99;

              const decisionQuality =
                passer.decisions /
                99;

              const successChance =
                0.62 +
                passQuality *
                  0.2 +
                decisionQuality *
                  0.12;

              const successful =
                Math.random() <
                successChance;

              if (
                successful
              ) {
                const passBall =
                  {
                    x: nextBall.x,
                    y: nextBall.y,
                    targetX:
                      receiver.x,
                    targetY:
                      receiver.y,
                    targetOwner:
                      receiver.id,
                    owner:
                      passer.id,
                    mode: "pass",
                  };

                ballRef.current =
                  passBall;

                setBall(
                  passBall
                );

                setMatchStats(
                  (stats) => ({
                    ...stats,
                    [passer.team ===
                    "home"
                      ? "homePasses"
                      : "awayPasses"]:
                      stats[
                        passer.team ===
                        "home"
                          ? "homePasses"
                          : "awayPasses"
                      ] + 1,
                  })
                );
              } else {
                /*
                 * Passaggio sbagliato.
                 */

                const errorBall =
                  {
                    x: nextBall.x,
                    y: nextBall.y,
                    targetX: clamp(
                      receiver.x +
                        (Math.random() -
                          0.5) *
                          15,
                      3,
                      97
                    ),
                    targetY: clamp(
                      receiver.y +
                        (Math.random() -
                          0.5) *
                          15,
                      3,
                      97
                    ),
                    targetOwner: null,
                    owner: null,
                    mode: "pass",
                  };

                ballRef.current =
                  errorBall;

                setBall(
                  errorBall
                );

                possessionRef.current =
                  passer.team ===
                  "home"
                    ? "away"
                    : "home";
              }
            }
          }
        }
      }

      /*
       * ------------------------------------------------------
       * TIRO
       * ------------------------------------------------------
       */

      if (
        now -
          lastShotRef.current >
        9500 / speed
      ) {
        lastShotRef.current =
          now;

        const attackingTeam =
          possessionRef.current;

        const attackingPlayers =
          updatedPlayers.filter(
            (player) =>
              player.team ===
                attackingTeam &&
              player.role !==
                "POR" &&
              player.x >
                (attackingTeam ===
                "home"
                  ? 55
                  : 0)
          );

        if (
          attackingPlayers.length
        ) {
          /*
           * Cerchiamo un giocatore
           * con buone qualità offensive.
           */

          const shooter =
            [...attackingPlayers]
              .sort(
                (a, b) => {
                  const aScore =
                    a.shooting +
                    a.finishing +
                    a.decisions;

                  const bScore =
                    b.shooting +
                    b.finishing +
                    b.decisions;

                  return (
                    bScore -
                    aScore
                  );
                }
              )[0];

          /*
           * Non facciamo partire il tiro
           * da centrocampo.
           */

          const goodPosition =
            attackingTeam ===
            "home"
              ? shooter.x >
                67
              : shooter.x <
                33;

          if (
            goodPosition
          ) {
            const goalX =
              attackingTeam ===
              "home"
                ? 98
                : 2;

            const goalY =
              50 +
              (Math.random() -
                0.5) *
                18;

            const shotXg =
              clamp(
                0.05 +
                  (shooter.finishing /
                    99) *
                    0.18,
                0.04,
                0.35
              );

            const shotBall = {
              x: shooter.x,
              y: shooter.y,
              targetX: goalX,
              targetY: goalY,
              owner: shooter.id,
              mode: "shot",
            };

            ballRef.current =
              shotBall;

            setBall(
              shotBall
            );

            setMatchStats(
              (stats) => ({
                ...stats,
                [attackingTeam ===
                "home"
                  ? "homeShots"
                  : "awayShots"]:
                  stats[
                    attackingTeam ===
                    "home"
                      ? "homeShots"
                      : "awayShots"
                  ] + 1,
                [attackingTeam ===
                "home"
                  ? "homeXg"
                  : "awayXg"]:
                  stats[
                    attackingTeam ===
                    "home"
                      ? "homeXg"
                      : "awayXg"
                  ] + shotXg,
              })
            );
          }
        }
      }

      /*
       * ------------------------------------------------------
       * POSSESSO
       * ------------------------------------------------------
       */

      if (
        now -
          lastPossessionRef.current >
        2000
      ) {
        lastPossessionRef.current =
          now;

        const home =
          updatedPlayers
            .filter(
              (player) =>
                player.team ===
                "home"
            )
            .reduce(
              (sum, player) =>
                sum +
                player.passing +
                player.decisions +
                player.mentality,
              0
            );

        const away =
          updatedPlayers
            .filter(
              (player) =>
                player.team ===
                "away"
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
          home + away;

        const homePossession =
          Math.round(
            (home / total) *
              100
          );

        setMatchStats(
          (stats) => ({
            ...stats,
            homePossession,
            awayPossession:
              100 -
              homePossession,
          })
        );
      }

      animationRef.current =
        requestAnimationFrame(
          animate
        );
    };

    animationRef.current =
      requestAnimationFrame(
        animate
      );

    return () => {
      if (
        animationRef.current
      ) {
        cancelAnimationFrame(
          animationRef.current
        );
      }
    };
  }, [paused, speed]);

  const formatTime = (
    seconds
  ) => {
    const minutes =
      Math.floor(
        seconds / 60
      );

    const secs =
      Math.floor(
        seconds % 60
      );

    return `${String(
      minutes
    ).padStart(
      2,
      "0"
    )}:${String(secs).padStart(
      2,
      "0"
    )}`;
  };

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="competition">
            SERIE A • GIORNATA 1
          </div>

          <h1>
            CALCIO MANAGER
          </h1>
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

      <main>
        <div className="stadium">
          <div className="stand">
            {Array.from({
              length: 52,
            }).map(
              (_, index) => (
                <span
                  key={index}
                >
                  {index % 3 ===
                  0
                    ? "●"
                    : "•"}
                </span>
              )
            )}
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

              {players.map(
                (player) => (
                  <button
                    key={
                      player.id
                    }
                    className={`player ${player.team}`}
                    style={{
                      left: `${player.x}%`,
                      top: `${player.y}%`,
                    }}
                    onClick={() =>
                      setSelectedPlayer(
                        {
                          ...player,
                          overall:
                            calculateOverall(
                              player
                            ),
                        }
                      )
                    }
                  >
                    <span>
                      {player.number}
                    </span>
                  </button>
                )
              )}

              <div
                className={`ball ${
                  ball.mode ===
                  "shot"
                    ? "shot-ball"
                    : ""
                }`}
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
            }).map(
              (_, index) => (
                <span
                  key={index}
                >
                  {index % 3 ===
                  0
                    ? "●"
                    : "•"}
                </span>
              )
            )}
          </div>
        </div>

        <section className="controls">
          <button
            className="main-button"
            onClick={() =>
              setPaused(
                (value) =>
                  !value
              )
            }
          >
            {paused
              ? "▶ INIZIA PARTITA"
              : "Ⅱ PAUSA"}
          </button>

          {[1, 2, 4].map(
            (value) => (
              <button
                key={value}
                className={
                  speed === value
                    ? "speed active"
                    : "speed"
                }
                onClick={() =>
                  setSpeed(
                    value
                  )
                }
              >
                {value}×
              </button>
            )
          )}

          <button
            onClick={
              resetMatch
            }
          >
            ↻ RESET
          </button>
        </section>

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

        <section className="tactics">
          <div>
            <span>
              MODULO
            </span>
            <strong>
              4-3-3
            </strong>
          </div>

          <div>
            <span>
              MENTALITÀ
            </span>
            <strong>
              Equilibrata
            </strong>
          </div>

          <div>
            <span>
              PRESSING
            </span>
            <strong>
              Medio
            </strong>
          </div>

          <div>
            <span>
              RITMO
            </span>
            <strong>
              Alto
            </strong>
          </div>
        </section>
      </main>

      {selectedPlayer && (
        <div
          className="modal-overlay"
          onClick={() =>
            setSelectedPlayer(
              null
            )
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
                setSelectedPlayer(
                  null
                )
              }
            >
              ×
            </button>

            <div className="card-header">
              <div
                className={`big-number ${selectedPlayer.team}`}
              >
                {
                  selectedPlayer.number
                }
              </div>

              <div className="player-info">
                <span className="small-role">
                  {
                    selectedPlayer.role
                  }
                </span>

                <h2>
                  {
                    selectedPlayer.name
                  }
                </h2>

                <span>
                  {
                    selectedPlayer.team ===
                    "home"
                      ? "NAPOLI"
                      : "JUVENTUS"
                  }
                </span>
              </div>

              <div className="overall">
                <small>
                  OVR
                </small>

                <strong>
                  {
                    selectedPlayer.overall
                  }
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

function Stat({
  title,
  value,
}) {
  return (
    <div className="stat-box">
      <span>
        {title}
      </span>

      <strong>
        {value}
      </strong>
    </div>
  );
}

function Attribute({
  name,
  value,
}) {
  return (
    <div className="attribute">
      <div className="attribute-top">
        <span>
          {name}
        </span>

        <strong>
          {value}
        </strong>
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
