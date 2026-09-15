import { MatchEngine } from "./matchEngine.js";
import { createTestMatch } from "./data/matchSetup.js";

export function createTestEngine() {
  const { homeTeam, awayTeam } = createTestMatch();

  const engine = new MatchEngine({
    homeTeam,
    awayTeam,
    seed: 123456789,
  });

  return engine;
}
