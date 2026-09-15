import { useEffect, useMemo, useRef, useState } from "react";
import { createTestEngine } from "./engine/matchTest.js";
import "./App.css";

const STAT_LABELS = [
  ["Possesso", "possession"],
  ["Tiri", "shots"],
  ["Tiri in porta", "shotsOnTarget"],
  ["xG", "xg"],
  ["Passaggi", "passes"],
  ["Passaggi riusciti", "passesCompleted"],
  ["Contrasti vinti", "tacklesWon"],
  ["Intercetti", "interceptions"],
  ["Falli", "fouls"],
  ["Corner", "corners"],
];

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
  HALF_TIME: ["Ⅱ", "Fine primo tempo", "neutral"],
  FULL_TIME: ["✓", "Fine partita", "neutral"],
};

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

function actorName(event, teams) {
  const actorId =
    event?.actors?.[0] ??
    event?.payload?.playerId ??
    event?.payload?.shooterId ??
    event?.payload?.passerId;

  if (!actorId) return "";

  for (const side of ["home", "away"]) {
    const player = teams?.[side]?.players?.find((p) => p.id === actorId);
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

  const actorId = event?.actors?.[0] ?? event?.payload?.playerId;
  if (actorId?.startsWith?.("home_")) return "home";
  if (actorId?.startsWith?.("away_")) return "away";

  return null;
}

function calculateLiveStats(events, match) {
  const stats = {
    home: {
      shots: 0,
      shotsOnTarget: 0,
      goals: Number(match?.score?.home ?? 0),
      passes: 0,
      passesCompleted: 0,
      tacklesWon: 0,
      interceptions: 0,
      fouls: 0,
      corners: 0,
      xg: 0,
    },
    away: {
      shots: 0,
      shotsOnTarget: 0,
      goals: Number(match?.score?.away ?? 0),
      passes: 0,
      passesCompleted: 0,
      tacklesWon: 0,
      interceptions: 0,
      fouls: 0,
      corners: 0,
      xg: 0,
    },
  };

  let possessionHomeSeconds = 0;
  let possessionAwaySeconds = 0;

  for (const event of events) {
    const side = eventTeam(event, match?.teams);
    const type = String(event?.type ?? "");
    const payload = event?.payload ?? {};

    // Possession is accumulated from the engine's actual simulated time,
    // not from the number of ENGINE_TICK events.
    if (type === "ENGINE_TICK") {
      const dt = Number(payload?.deltaSeconds ?? payload?.simulatedDeltaSeconds ?? 0.1);
      const possession = payload?.possession ?? event?.possession;
      if (possession === "home") possessionHomeSeconds += dt;
      if (possession === "away") possessionAwaySeconds += dt;
    }

    if (!side || !stats[side]) continue;

    if (["SHOT", "SHOT_ATTEMPT", "SHOT_ON_TARGET", "SHOT_OFF_TARGET", "SHOT_BLOCKED", "SHOT_MISSED"].includes(type)) {
      stats[side].shots += 1;

      const onTarget =
        type === "SHOT_ON_TARGET" ||
        payload?.onTarget === true ||
        payload?.result === "save" ||
        payload?.result === "goal";

      if (onTarget) stats[side].shotsOnTarget += 1;

      const xg = Number(payload?.xg ?? payload?.expectedGoals ?? 0);
      if (Number.isFinite(xg) && xg > 0) {
        stats[side].xg += xg;
      }
    }

    if (["PASS", "PASS_ATTEMPT"].includes(type)) {
      stats[side].passes += 1;
    }

    if (["PASS_COMPLETED", "PASS_COMPLETE"].includes(type)) {
      stats[side].passesCompleted += 1;
      if (stats[side].passes < stats[side].passesCompleted) {
        stats[side].passes = stats[side].passesCompleted;
      }
    }

    if (["TACKLE_SUCCESS", "TACKLE_WON"].includes(type)) {
      stats[side].tacklesWon += 1;
    }

    if (["INTERCEPTION", "PASS_INTERCEPTED"].includes(type)) {
      stats[side].interceptions += 1;
    }

    if (["FOUL", "FOUL_COMMITTED"].includes(type)) {
      stats[side].fouls += 1;
    }

    if (type === "CORNER") {
      stats[side].corners += 1;
    }
  }

  const totalPossession = possessionHomeSeconds + possessionAwaySeconds;
  const homePossession = totalPossession > 0
    ? Math.round((possessionHomeSeconds / totalPossession) * 100)
    : 50;

  return {
    ...stats,
    possession: {
      home: homePossession,
      away: 100 - homePossession,
    },
  };
}

function PitchPreview({ match }) {
  const players = useMemo(() => {
    const home = match?.teams?.home?.players?.filter((p) => p.starting) ?? match?.teams?.home?.players ?? [];
    const away = match?.teams?.away?.players?.filter((p) => p.starting) ?? match?.teams?.away?.players ?? [];

    return [
      ...home.slice(0, 11).map((p, i) => ({
        id: p.id,
        side: "home",
        number: p.number ?? i + 1,
        x: Number(p.matchState?.actualPosition?.x ?? p.position?.x ?? 0.18 + (i % 4) * 0.13),
        y: Number(p.matchState?.actualPosition?.y ?? p.position?.y ?? 0.16 + Math.floor(i / 4) * 0.18),
      })),
      ...away.slice(0, 11).map((p, i) => ({
        id: p.id,
        side: "away",
        number: p.number ?? i + 1,
        x: Number(p.matchState?.actualPosition?.x ?? p.position?.x ?? 0.82 - (i % 4) * 0.13),
        y: Number(p.matchState?.actualPosition?.y ?? p.position?.y ?? 0.16 + Math.floor(i / 4) * 0.18),
      })),
    ];
  }, [match]);

  const ball = match?.ball;

  return (
    <div className="pitch-shell">
      <div className="pitch-placeholder">
        <div className="pitch-mark center-circle" />
        <div className="pitch-mark center-dot" />
        <div className="pitch-line half-way" />
        <div className="pitch-box pitch-box-left" />
        <div className="pitch-box pitch-box-right" />
        <div className="pitch-goal pitch-goal-left" />
        <div className="pitch-goal pitch-goal-right" />

        {players.map((player) => {
          const x = Math.max(3, Math.min(97, player.x * 100));
          const y = Math.max(4, Math.min(96, player.y * 100));

          return (
            <div
              className={`pitch-player ${player.side}`}
              key={player.id}
              style={{ left: `${x}%`, top: `${y}%` }}
              title={player.id}
            >
              {player.number}
            </div>
          );
        })}

        <div
          className="pitch-ball"
          style={{
            left: `${Math.max(2, Math.min(98, Number(ball?.position?.x ?? 0.5) * 100))}%`,
            top: `${Math.max(2, Math.min(98, Number(ball?.position?.y ?? 0.5) * 100))}%`,
          }}
        />
        <div className="phaser-badge">PHASER 3 • MATCH VIEW</div>
      </div>
    </div>
  );
}

function App() {
  const engineRef = useRef(null);
  const frameRef = useRef(null);
  const fullEventsRef = useRef([]);
  const [match, setMatch] = useState(null);
  const [events, setEvents] = useState([]);
  const [tab, setTab] = useState("live");
  const [speed, setSpeed] = useState(1);
  const [isPaused, setIsPaused] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const engine = createTestEngine();
    engineRef.current = engine;

    const sync = () => {
      setMatch({
        ...engine.getState(),
        clock: { ...engine.getClockState() },
      });
    };

    const unsubscribe = engine.subscribe((event) => {
      fullEventsRef.current.push(event);
      setEvents((previous) => [...previous, event].slice(-80));
    });

    engine.start();
    sync();

    let lastTime = performance.now();

    const loop = (now) => {
      const delta = Math.min(100, now - lastTime);
      lastTime = now;

      try {
        if (!isPaused) {
          engine.update(delta);
        }

        sync();

        // Statistics are cumulative: always read the complete event history,
        // never only the last N events shown in the Live/Eventi panel.
      } catch (err) {
        console.error(err);
        setError(err?.message ?? String(err));
      }

      frameRef.current = requestAnimationFrame(loop);
    };

    frameRef.current = requestAnimationFrame(loop);

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      unsubscribe();
      engine.stop();
      engineRef.current = null;
    };
  }, []);

  const stats = calculateLiveStats(fullEventsRef.current, match);

  const recentEvents = useMemo(
    () => events.filter((event) => EVENT_META[event?.type]).slice().reverse().slice(0, 14),
    [events]
  );

  const home = match?.teams?.home;
  const away = match?.teams?.away;
  const clock = match?.clock ?? { minute: 0, second: 0, speed: speed };

  function setMatchSpeed(value) {
    setSpeed(value);
    engineRef.current?.setSpeed(value);
  }

  if (!match) {
    return (
      <main className="loading-screen">
        <div className="loading-card">
          <div className="brand-mark">CM</div>
          <h1>Calcio Manager</h1>
          <p>Preparazione del Match Engine…</p>
        </div>
      </main>
    );
  }

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

          <div className={`live-pill ${isPaused ? "paused-pill" : ""}`}>
            <i />
            {isPaused ? "IN PAUSA" : "LIVE"}
          </div>

          <button
            className={`icon-button ${isPaused ? "resume-button" : ""}`}
            onClick={() => {
              // Pause/resume is controlled by React. We deliberately do not
              // destroy/recreate the Match Engine, so the exact match state
              // and clock are preserved.
              setIsPaused((previous) => !previous);
            }}
            aria-label={isPaused ? "Riprendi partita" : "Metti in pausa"}
            title={isPaused ? "Riprendi" : "Pausa"}
          >
            {isPaused ? "▶" : "⏸"}
          </button>
        </header>

        <section className="score-card">
          <div className="competition-line">
            <span>AMICHEVOLE</span>
            <span>{match.phase === "full_time" ? "FINALE" : "IN CORSO"}</span>
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
              <div className="match-clock">{formatClock(clock)}</div>
            </div>

            <div className="score-team score-team-away">
              <div>
                <strong>{away?.name ?? "Ospite"}</strong>
                <small>OSPITE</small>
              </div>
              <div className="team-crest away-crest">A</div>
            </div>
          </div>

          <div className="match-controls">
            <div className="speed-control">
              <span>VELOCITÀ</span>
              {[0.5, 1, 2, 4, 8].map((value) => (
                <button
                  key={value}
                  className={Number(clock.speed ?? speed) === value ? "active" : ""}
                  onClick={() => setMatchSpeed(value)}
                >
                  {value}x
                </button>
              ))}
            </div>
            <div className="possession-chip">
              <span className={match.possession === "home" ? "active" : ""}>
                {home?.shortName ?? "CASA"}
              </span>
              <em>possesso</em>
              <span className={match.possession === "away" ? "active" : ""}>
                {away?.shortName ?? "OSP"}
              </span>
            </div>
          </div>
        </section>

        <div className="match-layout">
          <section className="visual-column">
            <div className="section-heading">
              <div>
                <span>PARTITA</span>
                <h2>Live 2D</h2>
              </div>
              <span className="engine-status">ENGINE • {match.phase}</span>
            </div>

            <PitchPreview match={match} />

            <div className="quick-stats">
              <div>
                <strong>{stats.possession.home}%</strong>
                <span>Possesso</span>
              </div>
              <div>
                <strong>{stats.home.shots} — {stats.away.shots}</strong>
                <span>Tiri</span>
              </div>
              <div>
                <strong>{stats.home.xg.toFixed(2)} — {stats.away.xg.toFixed(2)}</strong>
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
                  className={tab === id ? "active" : ""}
                  onClick={() => setTab(id)}
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
                    <h3>Statistiche partita</h3>
                  </div>
                  <span className="updated-dot">● AGGIORNATO</span>
                </div>

                <div className="stats-team-head">
                  <strong>{home?.shortName ?? "CASA"}</strong>
                  <span>STATISTICHE</span>
                  <strong>{away?.shortName ?? "OSPITE"}</strong>
                </div>

                <StatRow label="Possesso" home={stats.possession.home} away={stats.possession.away} format={(v) => `${v}%`} />
                <StatRow label="Tiri" home={stats.home.shots} away={stats.away.shots} />
                <StatRow label="Tiri in porta" home={stats.home.shotsOnTarget} away={stats.away.shotsOnTarget} />
                <StatRow label="xG" home={stats.home.xg} away={stats.away.xg} format={(v) => v.toFixed(2)} />
                <StatRow label="Passaggi" home={stats.home.passes} away={stats.away.passes} />
                <StatRow label="Passaggi riusciti" home={stats.home.passesCompleted} away={stats.away.passesCompleted} />
                <StatRow label="Contrasti vinti" home={stats.home.tacklesWon} away={stats.away.tacklesWon} />
                <StatRow label="Intercetti" home={stats.home.interceptions} away={stats.away.interceptions} />
                <StatRow label="Falli" home={stats.home.fouls} away={stats.away.fouls} />
                <StatRow label="Corner" home={stats.home.corners} away={stats.away.corners} />
              </section>
            )}

            {tab === "events" && (
              <section className="stats-panel">
                <div className="panel-title">
                  <div>
                    <span>CRONOLOGIA</span>
                    <h3>Eventi della partita</h3>
                  </div>
                </div>
                <div className="full-events">
                  {recentEvents.length === 0 && <div className="empty-state">Nessun evento significativo ancora.</div>}
                  {recentEvents.map((event, index) => {
                    const meta = EVENT_META[event.type] ?? ["•", event.type, "neutral"];
                    const side = eventTeam(event, match.teams);
                    return (
                      <div className="event-row" key={`${event.id ?? event.type}-${index}`}>
                        <time>{eventTime(event)}</time>
                        <span className={`event-icon ${meta[2]}`}>{meta[0]}</span>
                        <div>
                          <strong>{meta[1]}</strong>
                          <small>{actorName(event, match.teams) || (side === "home" ? home?.shortName : away?.shortName) || "Partita"}</small>
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
                <p>Qui collegheremo il pannello per modificare modulo, mentalità, pressing, altezza della linea e istruzioni durante la partita.</p>
              </section>
            )}

            {tab === "analysis" && (
              <section className="placeholder-panel">
                <span>▥</span>
                <h3>Analisi avanzata</h3>
                <p>Qui entreranno xG per azione, zone di attacco, mappa dei tiri, possesso territoriale, PPDA e altre metriche del Match Engine.</p>
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
                <button onClick={() => setTab("events")}>Vedi tutto</button>
              </div>

              <div className="event-list">
                {recentEvents.slice(0, 7).map((event, index) => {
                  const meta = EVENT_META[event.type] ?? ["•", event.type, "neutral"];
                  const side = eventTeam(event, match.teams);
                  return (
                    <div className="compact-event" key={`${event.id ?? event.type}-${index}`}>
                      <time>{eventTime(event)}</time>
                      <span className={`event-icon ${meta[2]}`}>{meta[0]}</span>
                      <div>
                        <strong>{meta[1]}</strong>
                        <small>{actorName(event, match.teams) || (side === "home" ? home?.shortName : away?.shortName) || ""}</small>
                      </div>
                    </div>
                  );
                })}
                {recentEvents.length === 0 && <div className="empty-state">La partita è appena iniziata.</div>}
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
                  <strong>{stats.home.shots}</strong>
                  <span>tiri</span>
                  <strong>{stats.home.xg.toFixed(2)}</strong>
                  <span>xG</span>
                </div>
                <div className="comparison-divider">VS</div>
                <div className="comparison-team away">
                  <b>{away?.shortName ?? "OSP"}</b>
                  <strong>{stats.away.shots}</strong>
                  <span>tiri</span>
                  <strong>{stats.away.xg.toFixed(2)}</strong>
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
                <div><span>Fase</span><b>{match.phase}</b></div>
                <div><span>Possesso</span><b>{match.possession}</b></div>
                <div><span>Velocità</span><b>{clock.speed ?? speed}x</b></div>
                <div><span>Stato</span><b>{isPaused ? "PAUSA" : "LIVE"}</b></div>
              </div>
            </section>

            <button
              className="download-button"
              onClick={() => {
                const log = {
                  exportVersion: 2,
                  game: { name: "Calcio Manager", type: "Match Engine Test" },
                  match: {
                    id: match.id ?? null,
                    seed: match.seed ?? null,
                    phase: match.phase ?? null,
                    score: match.score ?? null,
                    possession: match.possession ?? null,
                    status: match.matchStatus ?? null,
                  },
                  clock,
                  statistics: stats,
                  teams: match.teams ?? null,
                  ball: match.ball ?? null,
                  events: fullEventsRef.current,
                };

                const blob = new Blob([JSON.stringify(log, null, 2)], {
                  type: "text/plain;charset=utf-8",
                });
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = `calcio-manager-match-${new Date().toISOString().slice(0, 16).replace("T", "-").replace(":", "")}.txt`;
                link.click();
                URL.revokeObjectURL(url);
              }}
            >
              ↓ Scarica log partita
            </button>
          </aside>
        </div>

        {error && (
          <div className="engine-error">
            <strong>Errore Match Engine</strong>
            <span>{error}</span>
          </div>
        )}
      </div>
    </main>
  );
}

export default App;
