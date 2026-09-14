import { useEffect, useRef, useState } from "react";

import { createTestEngine } from "./engine/matchTest.js";

import "./App.css";

function App() {
  const engineRef = useRef(null);

  const [match, setMatch] = useState(null);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    const engine = createTestEngine();

    engineRef.current = engine;

    const unsubscribe = engine.subscribe(
      (event) => {
        setEvents((previous) => {
          const next = [...previous, event];

          return next.slice(-20);
        });
      }
    );

    engine.start();

    setMatch({
      ...engine.getState(),
    });

    let lastTime = performance.now();

    let animationFrame;

    const loop = (currentTime) => {
      const delta = currentTime - lastTime;

      lastTime = currentTime;

      engine.update(delta);

      setMatch({
        ...engine.getState(),
        clock: {
          ...engine.getClockState(),
        },
      });

      animationFrame =
        requestAnimationFrame(loop);
    };

    animationFrame =
      requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animationFrame);

      unsubscribe();

      engine.stop();
    };
  }, []);

  if (!match) {
    return (
      <main className="app">
        <div className="app-content">
          <h1>Avvio Match Engine...</h1>
        </div>
      </main>
    );
  }

  const homeTeam = match.teams.home;
  const awayTeam = match.teams.away;

  return (
    <main className="app">
      <div className="match-test">

        <header className="match-header">
          <span>CALCIO MANAGER</span>

          <strong>ENGINE TEST</strong>
        </header>

        <section className="scoreboard">

          <div className="team">
            <small>CASA</small>
            <h2>{homeTeam.shortName}</h2>
          </div>

          <div className="score">
            <div>
              {match.score.home}
              {" - "}
              {match.score.away}
            </div>

            <span>
              {match.clock.minute}'
              {String(
                match.clock.second
              ).padStart(2, "0")}
            </span>
          </div>

          <div className="team">
            <small>OSPITE</small>
            <h2>{awayTeam.shortName}</h2>
          </div>

        </section>

        <section className="engine-info">

          <div>
            <span>STATO</span>
            <strong>
              {match.phase}
            </strong>
          </div>

          <div>
            <span>POSSESSO</span>
            <strong>
              {match.possession}
            </strong>
          </div>

          <div>
            <span>VELOCITÀ</span>
            <strong>
              {match.clock.speed}x
            </strong>
          </div>

          <div>
            <span>SEED</span>
            <strong>
              {match.seed}
            </strong>
          </div>

        </section>

        <section className="controls">

          <button
            onClick={() =>
              engineRef.current?.pause()
            }
          >
            PAUSA
          </button>

          <button
            onClick={() =>
              engineRef.current?.resume()
            }
          >
            RIPRENDI
          </button>

          <button
            onClick={() =>
              engineRef.current?.setSpeed(1)
            }
          >
            1x
          </button>

          <button
            onClick={() =>
              engineRef.current?.setSpeed(2)
            }
          >
            2x
          </button>

          <button
            onClick={() =>
              engineRef.current?.setSpeed(4)
            }
          >
            4x
          </button>

          <button
            onClick={() =>
              engineRef.current?.setSpeed(8)
            }
          >
            8x
          </button>

        </section>

        <section className="teams">

          <div>
            <h3>
              {homeTeam.name}
            </h3>

            <p>
              {homeTeam.players.length} giocatori
            </p>

            <p>
              Modulo: {homeTeam.formation}
            </p>

            <p>
              Titolari:{" "}
              {homeTeam.startingXI.length}
            </p>
          </div>

          <div>
            <h3>
              {awayTeam.name}
            </h3>

            <p>
              {awayTeam.players.length} giocatori
            </p>

            <p>
              Modulo: {awayTeam.formation}
            </p>

            <p>
              Titolari:{" "}
              {awayTeam.startingXI.length}
            </p>
          </div>

        </section>

        <section className="event-log">

          <h3>EVENTI ENGINE</h3>

          <div className="events">

            {events
              .slice()
              .reverse()
              .map((event, index) => (
                <div
                  key={`${event.timestamp}-${index}`}
                >
                  <span>
                    {event.matchMinute}'
                    {String(
                      event.matchSecond
                    ).padStart(2, "0")}
                  </span>

                  <strong>
                    {event.type}
                  </strong>
                </div>
              ))}

          </div>

        </section>

      </div>
    </main>
  );
}

export default App;
