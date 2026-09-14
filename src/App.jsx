import { useEffect, useRef, useState } from "react";
import "./App.css";

const initialPlayers = [
  // NAPOLI
  { id: 1, name: "Alex", number: 1, team: "home", role: "POR", x: 10, y: 50, pace: 70, shooting: 20, passing: 70, tackling: 60, mentality: 75 },
  { id: 2, name: "Lorenzo", number: 2, team: "home", role: "TD", x: 25, y: 15, pace: 82, shooting: 40, passing: 78, tackling: 75, mentality: 80 },
  { id: 3, name: "Marco", number: 3, team: "home", role: "DC", x: 20, y: 35, pace: 70, shooting: 30, passing: 72, tackling: 86, mentality: 82 },
  { id: 4, name: "Diego", number: 4, team: "home", role: "DC", x: 20, y: 65, pace: 68, shooting: 25, passing: 70, tackling: 88, mentality: 84 },
  { id: 5, name: "Nico", number: 5, team: "home", role: "TS", x: 25, y: 85, pace: 85, shooting: 35, passing: 76, tackling: 78, mentality: 79 },
  { id: 6, name: "Leo", number: 6, team: "home", role: "MED", x: 38, y: 50, pace: 72, shooting: 45, passing: 88, tackling: 82, mentality: 91 },
  { id: 7, name: "Mati", number: 7, team: "home", role: "CC", x: 45, y: 28, pace: 84, shooting: 72, passing: 87, tackling: 62, mentality: 85 },
  { id: 8, name: "Andre", number: 8, team: "home", role: "CC", x: 45, y: 72, pace: 81, shooting: 68, passing: 86, tackling: 66, mentality: 83 },
  { id: 9, name: "Luca", number: 9, team: "home", role: "AD", x: 62, y: 18, pace: 94, shooting: 79, passing: 75, tackling: 35, mentality: 81 },
  { id: 10, name: "Davide", number: 10, team: "home", role: "TQ", x: 60, y: 50, pace: 88, shooting: 84, passing: 93, tackling: 30, mentality: 94 },
  { id: 11, name: "Sam", number: 11, team: "home", role: "AS", x: 62, y: 82, pace: 92, shooting: 82, passing: 78, tackling: 32, mentality: 87 },

  // JUVENTUS
  { id: 12, name: "Mike", number: 1, team: "away", role: "POR", x: 90, y: 50, pace: 68, shooting: 20, passing: 68, tackling: 60, mentality: 78 },
  { id: 13, name: "Tom", number: 2, team: "away", role: "TD", x: 75, y: 15, pace: 80, shooting: 38, passing: 74, tackling: 77, mentality: 79 },
  { id: 14, name: "Paul", number: 3, team: "away", role: "DC", x: 80, y: 35, pace: 72, shooting: 28, passing: 70, tackling: 84, mentality: 83 },
  { id: 15, name: "John", number: 4, team: "away", role: "DC", x: 80, y: 65, pace: 70, shooting: 27, passing: 71, tackling: 86, mentality: 81 },
  { id: 16, name: "Max", number: 5, team: "away", role: "TS", x: 75, y: 85, pace: 83, shooting: 34, passing: 75, tackling: 79, mentality: 82 },
  { id: 17, name: "Chris", number: 6, team: "away", role: "MED", x: 62, y: 50, pace: 74, shooting: 46, passing: 85, tackling: 84, mentality: 89 },
  { id: 18, name: "Alex", number: 7, team: "away", role: "CC", x: 55, y: 28, pace: 83, shooting: 69, passing: 85, tackling: 64, mentality: 84 },
  { id: 19, name: "Dan", number: 8, team: "away", role: "CC", x: 55, y: 72, pace: 79, shooting: 67, passing: 83, tackling: 69, mentality: 82 },
  { id: 20, name: "Ryan", number: 9, team: "away", role: "AD", x: 38, y: 18, pace: 93, shooting: 81, passing: 74, tackling: 34, mentality: 83 },
  { id: 21, name: "Jack", number: 10, team: "away", role: "TQ", x: 40, y: 50, pace: 87, shooting: 82, passing: 91, tackling: 31, mentality: 92 },
  { id: 22, name: "Noah", number: 11, team: "away", role: "AS", x: 38, y: 82, pace: 91, shooting: 80, passing: 77, tackling: 30, mentality: 86 },
];

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function App() {
  const [players, setPlayers] = useState(initialPlayers);
  const [ball, setBall] = useState({ x: 50, y: 50, owner: null });
  const [score, setScore] = useState({ home: 0, away: 0 });
  const [time, setTime] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [paused, setPaused] = useState(true);
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  const possessionRef = useRef("home");
  const lastPassRef = useRef(0);
  const attackRef = useRef(1);

  useEffect(() => {
    if (paused) return;

    const interval = setInterval(() => {
      setTime((t) => {
        const next = t + speed;

        if (next >= 90 * 60) {
          setPaused(true);
          return 90 * 60;
        }

        return next;
      });

      setPlayers((currentPlayers) => {
        const newPlayers = currentPlayers.map((player) => {
          const isHome = player.team === "home";
          const direction = isHome ? 1 : -1;

          // Movimento tattico di base
          let targetX = player.x;
          let targetY = player.y;

          if (player.role === "POR") {
            targetX = isHome ? 10 : 90;
          } else {
            const push = Math.sin(Date.now() / 1700 + player.id) * 2.5;
            targetX = player.x + direction * push * 0.12;
            targetY = player.y + Math.cos(Date.now() / 1500 + player.id) * 0.12;
          }

          // Avvicinamento alla palla
          const distance = Math.hypot(
            player.x - ball.x,
            player.y - ball.y
          );

          if (distance < 18 && player.role !== "POR") {
            targetX += (ball.x - player.x) * 0.015;
            targetY += (ball.y - player.y) * 0.015;
          }

          return {
            ...player,
            x: clamp(targetX, 5, 95),
            y: clamp(targetY, 7, 93),
          };
        });

        return newPlayers;
      });

      // Gestione possesso/palla
      const now = Date.now();

      if (now - lastPassRef.current > 1600 / speed) {
        lastPassRef.current = now;

        const teamPlayers = players.filter(
          (p) => p.team === possessionRef.current && p.role !== "POR"
        );

        if (teamPlayers.length > 0) {
          const passer =
            teamPlayers[Math.floor(Math.random() * teamPlayers.length)];

          const teammates = teamPlayers.filter((p) => p.id !== passer.id);

          const receiver =
            teammates[Math.floor(Math.random() * teammates.length)];

          if (receiver) {
            setBall({
              x: receiver.x,
              y: receiver.y,
              owner: receiver.id,
            });

            possessionRef.current =
              Math.random() < 0.53
                ? possessionRef.current
                : possessionRef.current === "home"
                ? "away"
                : "home";
          }
        }
      }

      // Occasionali tiri/gol dimostrativi
      if (Math.random() < 0.008 * speed) {
        const attackingTeam = possessionRef.current;

        if (Math.random() < 0.22) {
          setScore((s) => ({
            ...s,
            [attackingTeam]: s[attackingTeam] + 1,
          }));

          setBall({
            x: attackingTeam === "home" ? 95 : 5,
            y: 50,
            owner: null,
          });
        }
      }

      attackRef.current++;
    }, 1000);

    return () => clearInterval(interval);
  }, [paused, speed, players, ball]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);

    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(
      2,
      "0"
    )}`;
  };

  const resetMatch = () => {
    setPlayers(initialPlayers);
    setBall({ x: 50, y: 50, owner: null });
    setScore({ home: 0, away: 0 });
    setTime(0);
    possessionRef.current = "home";
    setPaused(true);
  };

  const homePossession = possessionRef.current === "home";

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <div className="competition">SERIE A • GIORNATA 1</div>
          <h1>CALCIO MANAGER</h1>
        </div>

        <div className="match-score">
          <div className="team-name">NAPOLI</div>

          <div className="score">
            {score.home} <span>-</span> {score.away}
          </div>

          <div className="team-name">JUVENTUS</div>
          <div className="match-time">{formatTime(time)}</div>
        </div>
      </header>

      <main>
        <div className="stadium">
          <div className="stand stand-top">
            {Array.from({ length: 36 }).map((_, i) => (
              <span key={i}>●</span>
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
                  onClick={() => setSelectedPlayer(player)}
                >
                  <span className="player-number">{player.number}</span>
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

          <div className="stand stand-bottom">
            {Array.from({ length: 36 }).map((_, i) => (
              <span key={i}>●</span>
            ))}
          </div>
        </div>

        <section className="controls">
          <button
            className="main-button"
            onClick={() => setPaused(!paused)}
          >
            {paused ? "▶ INIZIA PARTITA" : "Ⅱ PAUSA"}
          </button>

          <button onClick={() => setSpeed(1)}>1×</button>
          <button onClick={() => setSpeed(2)}>2×</button>
          <button onClick={() => setSpeed(4)}>4×</button>

          <button onClick={resetMatch}>↻ RESET</button>
        </section>

        <section className="stats-panel">
          <div className="stat-box">
            <span>POSSESSO</span>
            <strong>{homePossession ? "53%" : "47%"}</strong>
          </div>

          <div className="stat-box">
            <span>TIRI</span>
            <strong>0 - 0</strong>
          </div>

          <div className="stat-box">
            <span>PASSAGGI</span>
            <strong>0 - 0</strong>
          </div>

          <div className="stat-box">
            <span>xG</span>
            <strong>0.00 - 0.00</strong>
          </div>
        </section>

        <section className="tactics">
          <div>
            <span className="label">MODULO</span>
            <strong>4-3-3</strong>
          </div>

          <div>
            <span className="label">MENTALITÀ</span>
            <strong>Equilibrata</strong>
          </div>

          <div>
            <span className="label">PRESSING</span>
            <strong>Medio</strong>
          </div>

          <div>
            <span className="label">RITMO</span>
            <strong>Alto</strong>
          </div>
        </section>
      </main>

      {selectedPlayer && (
        <div
          className="modal-overlay"
          onClick={() => setSelectedPlayer(null)}
        >
          <div
            className="player-card"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="close"
              onClick={() => setSelectedPlayer(null)}
            >
              ×
            </button>

            <div className="card-header">
              <div className={`big-number ${selectedPlayer.team}`}>
                {selectedPlayer.number}
              </div>

              <div>
                <div className="small-role">{selectedPlayer.role}</div>
                <h2>{selectedPlayer.name}</h2>
                <span>
                  {selectedPlayer.team === "home" ? "NAPOLI" : "JUVENTUS"}
                </span>
              </div>
            </div>

            <div className="attributes">
              <Attribute name="Velocità" value={selectedPlayer.pace} />
              <Attribute name="Tiro" value={selectedPlayer.shooting} />
              <Attribute name="Passaggio" value={selectedPlayer.passing} />
              <Attribute name="Contrasti" value={selectedPlayer.tackling} />
              <Attribute name="Mentalità" value={selectedPlayer.mentality} />
            </div>
          </div>
        </div>
      )}
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
        <div style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export default App;
