import { Component, useEffect, useMemo, useRef, useState } from "react";
import { createTestEngine } from "./engine/matchTest.js";
import "./App.css";

const EVENT_META = {
  GOAL: ["⚽", "Gol", "goal"],
  OWN_GOAL: ["⚽", "Autogol", "goal"],
  SHOT: ["🎯", "Tiro", "shot"],
  SHOT_ATTEMPT: ["🎯", "Tiro", "shot"],
  SHOT_MISSED: ["↗", "Tiro fuori", "shot"],
  SAVE: ["🧤", "Parata", "save"],
  PASS: ["→", "Passaggio", "pass"],
  PASS_COMPLETED: ["✓", "Passaggio riuscito", "pass"],
  PASS_INTERCEPTED: ["✕", "Passaggio intercettato", "danger"],
  FOUL: ["⚑", "Fallo", "foul"],
  FOUL_COMMITTED: ["⚑", "Fallo", "foul"],
  YELLOW_CARD: ["🟨", "Ammonizione", "card"],
  RED_CARD: ["🟥", "Espulsione", "danger"],
  CORNER: ["◢", "Calcio d'angolo", "setpiece"],
  FREE_KICK_AWARDED: ["◉", "Punizione", "setpiece"],
  PENALTY: ["●", "Rigore", "setpiece"],
  SUBSTITUTION: ["↔", "Sostituzione", "sub"],
  INJURY: ["＋", "Infortunio", "injury"],
  OFFSIDE: ["▱", "Fuorigioco", "offside"],
  INTERCEPTION: ["◈", "Intercetto", "pass"],
  HALF_TIME: ["Ⅱ", "Intervallo", "neutral"],
  FULL_TIME: ["✓", "Fine partita", "neutral"],
};

const SPEEDS = [1, 2, 4, 8];

function formatClock(clock) {
  const minute = Number(clock?.minute ?? 0);
  const second = Number(clock?.second ?? 0);
  return `${minute}:${String(second).padStart(2, "0")}`;
}

function eventTime(event) {
  const minute = Number(event?.matchMinute ?? event?.payload?.minute ?? 0);
  const second = Number(event?.matchSecond ?? event?.payload?.second ?? 0);
  return `${minute}:${String(second).padStart(2, "0")}`;
}

function getActorId(event) {
  return (
    event?.actors?.[0] ??
    event?.payload?.playerId ??
    event?.payload?.shooterId ??
    event?.payload?.passerId ??
    null
  );
}

function actorName(event, teams) {
  const actorId = getActorId(event);
  if (!actorId) return "";

  for (const side of ["home", "away"]) {
    const players = teams?.[side]?.players ?? [];
    const player = players.find((p) => p.id === actorId);
    if (player) return player.name ?? player.shortName ?? actorId;
  }

  return actorId;
}

function eventTeam(event, teams) {
  const teamId =
    event?.payload?.teamId ??
    event?.payload?.team ??
    event?.teamId;

  if (teamId === teams?.home?.id || teamId === "home") return "home";
  if (teamId === teams?.away?.id || teamId === "away") return "away";

  const actorId = getActorId(event);
  if (actorId?.startsWith?.("home_")) return "home";
  if (actorId?.startsWith?.("away_")) return "away";

  return null;
}

/*
 * Le statistiche sono cumulative perché questa funzione legge SEMPRE
 * fullEvents, cioè tutta la cronologia della partita.
 *
 * La lista "events" della UI può contenere solo gli ultimi eventi:
 * questo non deve mai influenzare i totali.
 */
function calculateLiveStats(fullEvents, match) {
  const makeTeamStats = (goals) => ({
    shots: 0,
    shotsOnTarget: 0,
    goals: Number(goals ?? 0),
    passes: 0,
    passesCompleted: 0,
    tacklesWon: 0,
    interceptions: 0,
    fouls: 0,
    corners: 0,
    xg: 0,
  });

  const stats = {
    home: makeTeamStats(match?.score?.home),
    away: makeTeamStats(match?.score?.away),
  };

  let homePossession = 0;
  let awayPossession = 0;

  for (const event of fullEvents) {
    const type = String(event?.type ?? "");
    const payload = event?.payload ?? {};

    if (type === "ENGINE_TICK") {
      const seconds = Number(
        payload?.simulatedSeconds ??
        event?.simulatedSeconds ??
        0
      );

      const possession = payload?.possession ?? event?.possession;

      if (possession === "home") homePossession += seconds;
      if (possession === "away") awayPossession += seconds;
    }

    const side = eventTeam(event, match?.teams);
    if (!side) continue;

    const team = stats[side];

    if ([
      "SHOT",
      "SHOT_ATTEMPT",
      "SHOT_ON_TARGET",
      "SHOT_OFF_TARGET",
      "SHOT_BLOCKED",
      "SHOT_MISSED",
    ].includes(type)) {
      team.shots += 1;

      const onTarget =
        type === "SHOT_ON_TARGET" ||
        payload?.onTarget === true ||
        payload?.result === "save" ||
        payload?.result === "goal";

      if (onTarget) team.shotsOnTarget += 1;

      const xg = Number(
        payload?.xg ??
        payload?.expectedGoals ??
        0
      );

      if (Number.isFinite(xg) && xg > 0) {
        team.xg += xg;
      }
    }

    if (type === "PASS" || type === "PASS_ATTEMPT") {
      team.passes += 1;
    }

    if (type === "PASS_COMPLETED" || type === "PASS_COMPLETE") {
      team.passesCompleted += 1;
      team.passes = Math.max(team.passes, team.passesCompleted);
    }

    if (type === "TACKLE_SUCCESS" || type === "TACKLE_WON") {
      team.tacklesWon += 1;
    }

    if (type === "INTERCEPTION" || type === "PASS_INTERCEPTED") {
      team.interceptions += 1;
    }

    if (type === "FOUL" || type === "FOUL_COMMITTED") {
      team.fouls += 1;
    }

    if (type === "CORNER") {
      team.corners += 1;
    }
  }

  const totalPossession = homePossession + awayPossession;
  const homePercent =
    totalPossession > 0
      ? Math.round((homePossession / totalPossession) * 100)
      : 50;

  return {
    ...stats,
    possession: {
      home: homePercent,
      away: 100 - homePercent,
    },
  };
}

function getPlayers(match, side) {
  const players =
    match?.teams?.[side]?.players ??
    [];

  const starting = players.filter((player) =>
    player?.starting === true ||
    player?.onPitch === true ||
    player?.matchState?.onPitch === true
  );

  return (starting.length >= 11 ? starting : players).slice(0, 11);
}

function PitchPreview({ match }) {
  const homePlayers = getPlayers(match, "home");
  const awayPlayers = getPlayers(match, "away");

  const players = [
    ...homePlayers.map((player, index) => ({
      id: player.id,
      side: "home",
      number: player.number ?? index + 1,
      x: Number(
        player.matchState?.actualPosition?.x ??
        player.position?.x ??
        0.12 + (index % 5) * 0.15
      ),
      y: Number(
        player.matchState?.actualPosition?.y ??
        player.position?.y ??
        0.18 + Math.floor(index / 5) * 0.22
      ),
    })),
    ...awayPlayers.map((player, index) => ({
      id: player.id,
      side: "away",
      number: player.number ?? index + 1,
      x: Number(
        player.matchState?.actualPosition?.x ??
        player.position?.x ??
        0.88 - (index % 5) * 0.15
      ),
      y: Number(
        player.matchState?.actualPosition?.y ??
        player.position?.y ??
        0.18 + Math.floor(index / 5) * 0.22
      ),
    })),
  ];

  const ball = match?.ball;

  return (
    <div className="pitch-shell">
      <div className="pitch">
        <div className="pitch-line pitch-halfway" />
        <div className="pitch-circle" />
        <div className="pitch-center-dot" />
        <div className="pitch-box pitch-box-left" />
        <div className="pitch-box pitch-box-right" />
        <div className="pitch-goal pitch-goal-left" />
        <div className="pitch-goal pitch-goal-right" />

        {players.map((player) => (
          <div
            className={`pitch-player ${player.side}`}
            key={player.id}
            style={{
              left: `${Math.max(3, Math.min(97, player.x * 100))}%`,
              top: `${Math.max(4, Math.min(96, player.y * 100))}%`,
            }}
          >
            {player.number}
          </div>
        ))}

        <div
          className="pitch-ball"
          style={{
            left: `${Math.max(
              2,
              Math.min(98, Number(ball?.position?.x ?? ball?.x ?? 0.5) * 100)
            )}%`,
            top: `${Math.max(
              2,
              Math.min(98, Number(ball?.position?.y ?? ball?.y ?? 0.5) * 100)
            )}%`,
          }}
        />

        <div className="pitch-label">2D MATCH VIEW</div>
      </div>
    </div>
  );
}

class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      error: null,
    };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Calcio Manager render error:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <main className="fatal-error-screen">
          <div className="fatal-error-card">
            <div className="brand-mark">CM</div>
            <h1>Calcio Manager</h1>
            <strong>Errore di avvio dell'interfaccia</strong>
            <pre>{this.state.error?.stack ?? this.state.error?.message ?? String(this.state.error)}</pre>
            <button onClick={() => window.location.reload()}>
              Ricarica partita
            </button>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}

function AppContent() {
  const engineRef = useRef(null);
  const frameRef = useRef(null);
  const fullEventsRef = useRef([]);

  const [match, setMatch] = useState(null);
  const [events, setEvents] = useState([]);
  const [tab, setTab] = useState("live");
  const [speed, setSpeed] = useState(1);
  const [phaseControl, setPhaseControl] = useState("ready");
  const [engineError, setEngineError] = useState("");

  useEffect(() => {
    let engine;

    try {
      engine = createTestEngine();
      engineRef.current = engine;

      const sync = () => {
        setMatch({
          ...engine.getState(),
          clock: {
            ...engine.getClockState(),
          },
        });
      };

      const unsubscribe = engine.subscribe((event) => {
        fullEventsRef.current.push(event);
        setEvents((previous) =>
          [...previous, event].slice(-80)
        );

        if (event?.type === "HALF_TIME") {
          setPhaseControl("halftime");
        }

        if (event?.type === "FULL_TIME") {
          setPhaseControl("finished");
        }
      });

      sync();

      let lastTime = performance.now();

      const loop = (now) => {
        const delta = Math.min(100, now - lastTime);
        lastTime = now;

        try {
          /*
           * React non decide se il motore è in pausa.
           * Una volta avviato, il controllo temporale passa al Match Engine.
           */
          engine.update(delta);
          sync();
        } catch (error) {
          console.error(error);
          setEngineError(
            error?.stack ??
            error?.message ??
            String(error)
          );
        }

        frameRef.current =
          requestAnimationFrame(loop);
      };

      frameRef.current =
        requestAnimationFrame(loop);

      return () => {
        if (frameRef.current) {
          cancelAnimationFrame(frameRef.current);
        }

        unsubscribe?.();
        engine.stop?.();
        engineRef.current = null;
      };
    } catch (error) {
      console.error(error);
      setEngineError(
        error?.stack ??
        error?.message ??
        String(error)
      );
    }
  }, []);

  const stats = useMemo(
    () => calculateLiveStats(
      fullEventsRef.current,
      match
    ),
    [events, match]
  );

  const recentEvents = useMemo(
    () =>
      events
        .filter((event) =>
          EVENT_META[event?.type]
        )
        .slice()
        .reverse()
        .slice(0, 14),
    [events]
  );

  const home = match?.teams?.home;
  const away = match?.teams?.away;
  const clock = match?.clock ?? {
    minute: 0,
    second: 0,
    speed,
    paused: false,
    finished: false,
  };

  const isClockPaused = Boolean(clock.paused);
  const isFinished =
    phaseControl === "finished" ||
    Boolean(clock.finished);

  function startMatch() {
    const engine = engineRef.current;
    if (!engine || isFinished) return;

    try {
      engine.start();
      setPhaseControl("playing");
      setEngineError("");
    } catch (error) {
      console.error(error);
      setEngineError(
        error?.stack ??
        error?.message ??
        String(error)
      );
    }
  }

  function pauseMatch() {
    const engine = engineRef.current;
    if (!engine || isFinished) return;

    try {
      engine.pause?.();
      setPhaseControl("paused");
      setEngineError("");
    } catch (error) {
      console.error(error);
      setEngineError(
        error?.stack ??
        error?.message ??
        String(error)
      );
    }
  }

  function resumeMatch() {
    const engine = engineRef.current;
    if (!engine || isFinished) return;

    try {
      engine.resume?.();
      setPhaseControl("playing");
      setEngineError("");
    } catch (error) {
      console.error(error);
      setEngineError(
        error?.stack ??
        error?.message ??
        String(error)
      );
    }
  }

  function startSecondHalf() {
    const engine = engineRef.current;
    if (!engine || isFinished) return;

    try {
      /*
       * Il Match Engine ha già portato il clock a 45' e ha gestito
       * HALF_TIME. Qui chiediamo semplicemente di riprendere.
       */
      engine.resume?.();
      setPhaseControl("playing");
      setEngineError("");
    } catch (error) {
      console.error(error);
      setEngineError(
        error?.stack ??
        error?.message ??
        String(error)
      );
    }
  }

  function setMatchSpeed(value) {
    const engine = engineRef.current;
    if (!engine) return;

    try {
      engine.setSpeed(value);
      setSpeed(value);
      setEngineError("");
    } catch (error) {
      console.error(error);
      setEngineError(
        error?.stack ??
        error?.message ??
        String(error)
      );
    }
  }

  function downloadLog() {
    const log = {
      exportVersion: 2,
      game: {
        name: "Calcio Manager",
        type: "Match Engine Test",
      },
      match: {
        id: match?.id ?? null,
        seed: match?.seed ?? null,
        phase: match?.phase ?? null,
        score: match?.score ?? null,
        possession: match?.possession ?? null,
        status: match?.matchStatus ?? null,
      },
      clock,
      statistics: stats,
      teams: match?.teams ?? null,
      ball: match?.ball ?? null,
      events: fullEventsRef.current,
    };

    const blob = new Blob(
      [JSON.stringify(log, null, 2)],
      { type: "text/plain;charset=utf-8" }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download =
      `calcio-manager-match-${Date.now()}.txt`;

    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  if (engineError && !match) {
    return (
      <main className="fatal-error-screen">
        <div className="fatal-error-card">
          <div className="brand-mark">CM</div>
          <h1>Calcio Manager</h1>
          <strong>Il Match Engine non è riuscito ad avviarsi</strong>
          <pre>{engineError}</pre>
          <button onClick={() => window.location.reload()}>
            Riprova
          </button>
        </div>
      </main>
    );
  }

  if (!match) {
    return (
      <main className="loading-screen">
        <div className="loading-card">
          <div className="brand-mark">CM</div>
          <h1>Calcio Manager</h1>
          <p>Preparazione della partita…</p>
        </div>
      </main>
    );
  }

  const isReady = phaseControl === "ready";
  const isPaused =
    phaseControl === "paused" ||
    (phaseControl === "playing" && isClockPaused);

  return (
    <main className="app-shell">
      <div className="match-page">
        <header className="topbar">
          <div className="brand">
            <div className="brand-mark">CM</div>
            <div>
              <strong>CALCIO MANAGER</strong>
              <span>LIVE MATCH CENTRE</span>
            </div>
          </div>

          <div
            className={`live-pill ${
              isReady
                ? "ready-pill"
                : isPaused
                  ? "paused-pill"
                  : isFinished
                    ? "finished-pill"
                    : ""
            }`}
          >
            <i />
            {isReady
              ? "PRONTA"
              : isPaused
                ? "IN PAUSA"
                : isFinished
                  ? "FINALE"
                  : "LIVE"}
          </div>

          <div className="header-action">
            {!isReady && !isFinished && phaseControl !== "halftime" && (
              <button
                className="icon-button"
                onClick={
                  isPaused
                    ? resumeMatch
                    : pauseMatch
                }
                aria-label={
                  isPaused
                    ? "Riprendi partita"
                    : "Metti in pausa"
                }
              >
                {isPaused ? "▶" : "⏸"}
              </button>
            )}
          </div>
        </header>

        <section className="score-card">
          <div className="competition-line">
            <span>AMICHEVOLE</span>
            <span>
              {isReady
                ? "PRONTA"
                : phaseControl === "halftime"
                  ? "INTERVALLO"
                  : isFinished
                    ? "FINALE"
                    : "IN CORSO"}
            </span>
          </div>

          <div className="score-main">
            <div className="score-team">
              <div className="team-crest home-crest">N</div>
              <div>
                <strong>{home?.name ?? "Casa"}</strong>
                <small>CASA</small>
              </div>
            </div>

            <div className="score-center">
              <div className="score-numbers">
                <b>{match.score?.home ?? 0}</b>
                <span>—</span>
                <b>{match.score?.away ?? 0}</b>
              </div>
              <div className="match-clock">
                {formatClock(clock)}
              </div>
            </div>

            <div className="score-team score-team-away">
              <div>
                <strong>{away?.name ?? "Ospite"}</strong>
                <small>OSPITE</small>
              </div>
              <div className="team-crest away-crest">A</div>
            </div>
          </div>

          <div className="match-action-bar">
            {isReady && (
              <button
                className="primary-action"
                onClick={startMatch}
              >
                <span>▶</span>
                INIZIA PARTITA
              </button>
            )}

            {phaseControl === "halftime" && (
              <button
                className="primary-action"
                onClick={startSecondHalf}
              >
                <span>▶</span>
                INIZIA SECONDO TEMPO
              </button>
            )}

            {phaseControl === "paused" && (
              <button
                className="primary-action"
                onClick={resumeMatch}
              >
                <span>▶</span>
                RIPRENDI PARTITA
              </button>
            )}

            {phaseControl === "playing" && !isFinished && (
              <button
                className="secondary-action"
                onClick={pauseMatch}
              >
                <span>Ⅱ</span>
                PAUSA
              </button>
            )}

            {isFinished && (
              <div className="final-action">
                <span>✓</span>
                PARTITA TERMINATA
              </div>
            )}

            <div className="speed-control">
              <span>VELOCITÀ</span>
              {SPEEDS.map((value) => (
                <button
                  key={value}
                  className={
                    Number(clock.speed ?? speed) === value
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    setMatchSpeed(value)
                  }
                  disabled={isReady}
                >
                  {value}x
                </button>
              ))}
            </div>
          </div>
        </section>

        {phaseControl === "halftime" && (
          <section className="halftime-banner">
            <div>
              <span>45:00</span>
              <h2>INTERVALLO</h2>
              <p>
                Primo tempo terminato. Le statistiche sono state
                conservate e continueranno dal 45' nel secondo tempo.
              </p>
            </div>
            <div className="halftime-score">
              <b>{match.score?.home ?? 0}</b>
              <span>—</span>
              <b>{match.score?.away ?? 0}</b>
            </div>
          </section>
        )}

        <div className="match-layout">
          <section className="visual-column">
            <div className="section-heading">
              <div>
                <span>PARTITA</span>
                <h2>Live 2D</h2>
              </div>
              <span className="engine-status">
                ENGINE • {match.phase}
              </span>
            </div>

            <PitchPreview match={match} />

            <div className="quick-stats">
              <div>
                <strong>
                  {stats.possession.home}%
                </strong>
                <span>Possesso</span>
              </div>
              <div>
                <strong>
                  {stats.home.shots} — {stats.away.shots}
                </strong>
                <span>Tiri</span>
              </div>
              <div>
                <strong>
                  {stats.home.xg.toFixed(2)} — {stats.away.xg.toFixed(2)}
                </strong>
                <span>xG</span>
              </div>
            </div>

            <nav className="match-tabs">
              {[
                ["live", "◉", "Live"],
                ["events", "☷", "Eventi"],
                ["tactics", "⌘", "Tattica"],
                ["analysis", "▥", "Analisi"],
              ].map(([id, icon, label]) => (
                <button
                  key={id}
                  className={
                    tab === id
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    setTab(id)
                  }
                >
                  <span>{icon}</span>
                  {label}
                </button>
              ))}
            </nav>

            {tab === "live" && (
              <section className="stats-panel">
                <div className="panel-title">
                  <div>
                    <span>DATI LIVE</span>
                    <h3>
                      Statistiche partita
                    </h3>
                  </div>
                  <span className="updated-dot">
                    ● CUMULATIVE
                  </span>
                </div>

                <div className="stats-team-head">
                  <strong>
                    {home?.shortName ?? "CASA"}
                  </strong>
                  <span>STATISTICHE</span>
                  <strong>
                    {away?.shortName ?? "OSPITE"}
                  </strong>
                </div>

                <StatRow
                  label="Possesso"
                  home={stats.possession.home}
                  away={stats.possession.away}
                  format={(value) => `${value}%`}
                />
                <StatRow
                  label="Tiri"
                  home={stats.home.shots}
                  away={stats.away.shots}
                />
                <StatRow
                  label="Tiri in porta"
                  home={stats.home.shotsOnTarget}
                  away={stats.away.shotsOnTarget}
                />
                <StatRow
                  label="xG"
                  home={stats.home.xg}
                  away={stats.away.xg}
                  format={(value) => value.toFixed(2)}
                />
                <StatRow
                  label="Passaggi"
                  home={stats.home.passes}
                  away={stats.away.passes}
                />
                <StatRow
                  label="Passaggi riusciti"
                  home={stats.home.passesCompleted}
                  away={stats.away.passesCompleted}
                />
                <StatRow
                  label="Contrasti vinti"
                  home={stats.home.tacklesWon}
                  away={stats.away.tacklesWon}
                />
                <StatRow
                  label="Intercetti"
                  home={stats.home.interceptions}
                  away={stats.away.interceptions}
                />
                <StatRow
                  label="Falli"
                  home={stats.home.fouls}
                  away={stats.away.fouls}
                />
                <StatRow
                  label="Corner"
                  home={stats.home.corners}
                  away={stats.away.corners}
                />
              </section>
            )}

            {tab === "events" && (
              <section className="stats-panel">
                <div className="panel-title">
                  <div>
                    <span>CRONOLOGIA</span>
                    <h3>
                      Eventi della partita
                    </h3>
                  </div>
                </div>

                <div className="full-events">
                  {recentEvents.length === 0 && (
                    <div className="empty-state">
                      Nessun evento significativo ancora.
                    </div>
                  )}

                  {recentEvents.map((event, index) => {
                    const meta =
                      EVENT_META[event.type] ??
                      ["•", event.type, "neutral"];

                    const side =
                      eventTeam(
                        event,
                        match.teams
                      );

                    return (
                      <div
                        className="event-row"
                        key={`${event.id ?? event.type}-${index}`}
                      >
                        <time>
                          {eventTime(event)}
                        </time>

                        <span
                          className={`event-icon ${meta[2]}`}
                        >
                          {meta[0]}
                        </span>

                        <div>
                          <strong>
                            {meta[1]}
                          </strong>
                          <small>
                            {actorName(
                              event,
                              match.teams
                            ) ||
                              (side === "home"
                                ? home?.shortName
                                : away?.shortName) ||
                              "Partita"}
                          </small>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {tab === "tactics" && (
              <section className="placeholder-panel">
                <span>⌘</span>
                <h3>Tattica live</h3>
                <p>
                  Qui collegheremo il pannello per modificare modulo,
                  mentalità, pressing, altezza della linea e istruzioni
                  durante la partita.
                </p>
              </section>
            )}

            {tab === "analysis" && (
              <section className="placeholder-panel">
                <span>▥</span>
                <h3>Analisi avanzata</h3>
                <p>
                  Qui entreranno xG per azione, zone di attacco,
                  mappa dei tiri, possesso territoriale, PPDA e
                  altre metriche del Match Engine.
                </p>
              </section>
            )}
          </section>

          <aside className="side-column">
            <section className="side-card live-events-card">
              <div className="side-title">
                <div>
                  <span>LIVE</span>
                  <h3>Momenti chiave</h3>
                </div>
                <button
                  onClick={() =>
                    setTab("events")
                  }
                >
                  Vedi tutto
                </button>
              </div>

              <div className="event-list">
                {recentEvents
                  .slice(0, 7)
                  .map((event, index) => {
                    const meta =
                      EVENT_META[event.type] ??
                      ["•", event.type, "neutral"];

                    const side =
                      eventTeam(
                        event,
                        match.teams
                      );

                    return (
                      <div
                        className="compact-event"
                        key={`${event.id ?? event.type}-${index}`}
                      >
                        <time>
                          {eventTime(event)}
                        </time>

                        <span
                          className={`event-icon ${meta[2]}`}
                        >
                          {meta[0]}
                        </span>

                        <div>
                          <strong>
                            {meta[1]}
                          </strong>
                          <small>
                            {actorName(
                              event,
                              match.teams
                            ) ||
                              (side === "home"
                                ? home?.shortName
                                : away?.shortName) ||
                              ""}
                          </small>
                        </div>
                      </div>
                    );
                  })}

                {recentEvents.length === 0 && (
                  <div className="empty-state">
                    La partita non è ancora iniziata.
                  </div>
                )}
              </div>
            </section>

            <section className="side-card">
              <div className="side-title">
                <div>
                  <span>CONFRONTO</span>
                  <h3>Rendimento</h3>
                </div>
              </div>

              <div className="mini-comparison">
                <div className="comparison-team">
                  <b>{home?.shortName ?? "CASA"}</b>
                  <strong>
                    {stats.home.shots}
                  </strong>
                  <span>tiri</span>
                  <strong>
                    {stats.home.xg.toFixed(2)}
                  </strong>
                  <span>xG</span>
                </div>

                <div className="comparison-divider">
                  VS
                </div>

                <div className="comparison-team away">
                  <b>{away?.shortName ?? "OSP"}</b>
                  <strong>
                    {stats.away.shots}
                  </strong>
                  <span>tiri</span>
                  <strong>
                    {stats.away.xg.toFixed(2)}
                  </strong>
                  <span>xG</span>
                </div>
              </div>
            </section>

            <section className="side-card">
              <div className="side-title">
                <div>
                  <span>STATO</span>
                  <h3>Match Engine</h3>
                </div>
              </div>

              <div className="engine-grid">
                <div>
                  <span>Fase</span>
                  <b>{match.phase}</b>
                </div>
                <div>
                  <span>Stato</span>
                  <b>
                    {isReady
                      ? "PRONTA"
                      : phaseControl === "halftime"
                        ? "INTERVALLO"
                        : isPaused
                          ? "PAUSA"
                          : isFinished
                            ? "FINALE"
                            : "LIVE"}
                  </b>
                </div>
                <div>
                  <span>Velocità</span>
                  <b>
                    {clock.speed ?? speed}x
                  </b>
                </div>
                <div>
                  <span>Minuto</span>
                  <b>
                    {formatClock(clock)}
                  </b>
                </div>
              </div>
            </section>

            <button
              className="download-button"
              onClick={downloadLog}
            >
              ↓ Scarica log partita
            </button>
          </aside>
        </div>

        {engineError && (
          <div className="engine-error">
            <strong>Errore Match Engine</strong>
            <span>{engineError}</span>
          </div>
        )}
      </div>
    </main>
  );
}

function StatRow({
  label,
  home,
  away,
  format = (value) => value,
}) {
  const h = Number(home ?? 0);
  const a = Number(away ?? 0);
  const total = h + a;

  const homeWidth =
    total > 0
      ? Math.max(12, (h / total) * 100)
      : 50;

  const awayWidth =
    total > 0
      ? Math.max(12, (a / total) * 100)
      : 50;

  return (
    <div className="stat-row">
      <div className="stat-value stat-value-home">
        {format(h)}
      </div>

      <div className="stat-track">
        <div className="stat-label">
          {label}
        </div>

        <div className="stat-bars">
          <span style={{ width: `${homeWidth}%` }} />
          <span style={{ width: `${awayWidth}%` }} />
        </div>
      </div>

      <div className="stat-value stat-value-away">
        {format(a)}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppErrorBoundary>
      <AppContent />
    </AppErrorBoundary>
  );
}
