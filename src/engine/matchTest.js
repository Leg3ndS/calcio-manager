import { MatchEngine } from "./matchEngine.js";
import { createTestMatch } from "./data/matchSetup.js";
import { createMatchSeed } from "./rng.js";

/**
 * Crea una nuova partita di test.
 *
 * - ogni nuova partita riceve un seed casuale;
 * - per riprodurre un bug si può passare un seed esplicito;
 * - non usiamo più un seed fisso di default.
 */
export function createTestEngine({ seed = null } = {}) {
  const { homeTeam, awayTeam } = createTestMatch();

  const matchSeed = seed ?? createMatchSeed();

  return new MatchEngine({
    homeTeam,
    awayTeam,
    seed: matchSeed,
  });
}
