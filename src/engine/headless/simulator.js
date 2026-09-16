/**
 * HEADLESS SIMULATOR
 *
 * Esegue il Match Engine senza:
 *
 * - React
 * - Phaser
 * - browser
 * - UI
 *
 * Serve per:
 *
 * - test
 * - benchmark
 * - bilanciamento
 * - simulazioni massive.
 */

import {
  MatchEngine,
} from "../matchEngine.js";

import {
  createTestMatch,
} from "../data/matchSetup.js";

/**
 * Crea un motore di test.
 */
export function createHeadlessEngine({
  seed = 123456789,
} = {}) {
  const {
    homeTeam,
    awayTeam,
  } = createTestMatch();

  return new MatchEngine({
    homeTeam,
    awayTeam,
    seed,
  });
}

/**
 * Esegue una singola partita.
 *
 * Usiamo 8x per completare rapidamente
 * la simulazione.
 */
export function simulateMatch({
  seed = 123456789,
  speed = 8,
} = {}) {
  const engine =
    createHeadlessEngine({
      seed,
    });

  const events = [];

  const unsubscribe =
    engine.subscribe(
      (event) => {
        events.push(event);
      }
    );

  engine.start();

  engine.setSpeed(speed);

  /**
   * 100 ms = un tick del motore.
   *
   * Non utilizziamo requestAnimationFrame.
   */
  let safetyCounter = 0;

  while (
    !engine.getState()
      .matchStatus.finished
  ) {
    if (engine.getState().phase === "half_time") {
      engine.startSecondHalf();
    }

    engine.update(100);

    safetyCounter += 1;

    /**
     * Protezione contro loop infiniti.
     */
    if (safetyCounter > 100000) {
      throw new Error(
        "Headless simulation: safety limit superato."
      );
    }
  }

  unsubscribe();

  return {
    seed,

    state:
      engine.getState(),

    events,

    tickCount:
      safetyCounter,
  };
}

/**
 * Esegue N partite.
 */
export function simulateMatches({
  count = 100,
  startingSeed = 1,
  speed = 8,
} = {}) {
  const results = [];

  for (
    let index = 0;
    index < count;
    index += 1
  ) {
    const seed =
      startingSeed + index;

    const result =
      simulateMatch({
        seed,
        speed,
      });

    results.push(result);
  }

  return results;
}

/**
 * Aggrega informazioni basilari.
 */
export function summarizeMatches(
  results
) {
  const summary = {
    matches:
      results.length,

    totalGoals: 0,

    homeGoals: 0,

    awayGoals: 0,

    averageGoals: 0,

    eventCounts: {},
  };

  for (const result of results) {
    const score =
      result.state.score;

    summary.homeGoals +=
      score.home;

    summary.awayGoals +=
      score.away;

    summary.totalGoals +=
      score.home +
      score.away;

    for (const event of result.events) {
      summary.eventCounts[
        event.type
      ] =
        (summary.eventCounts[
          event.type
        ] ?? 0) + 1;
    }
  }

  if (summary.matches > 0) {
    summary.averageGoals =
      summary.totalGoals /
      summary.matches;
  }

  return summary;
}
