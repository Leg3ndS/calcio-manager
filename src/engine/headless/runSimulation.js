import {
  simulateMatches,
  summarizeMatches,
} from "./simulator.js";

const COUNT =
  Number(
    process.argv[2] ?? 10
  );

const STARTING_SEED =
  Number(
    process.argv[3] ?? 1
  );

console.log("");
console.log(
  "=============================="
);

console.log(
  " CALCIO MANAGER - HEADLESS TEST"
);

console.log(
  "=============================="
);

console.log("");

console.log(
  `Partite: ${COUNT}`
);

console.log(
  `Seed iniziale: ${STARTING_SEED}`
);

console.log("");

const start =
  performance.now();

const results =
  simulateMatches({
    count: COUNT,
    startingSeed:
      STARTING_SEED,
    speed: 8,
  });

const end =
  performance.now();

const summary =
  summarizeMatches(
    results
  );

console.log(
  "RISULTATI"
);

console.log(
  "------------------------------"
);

console.log(
  `Partite simulate: ${summary.matches}`
);

console.log(
  `Gol totali: ${summary.totalGoals}`
);

console.log(
  `Gol medi: ${summary.averageGoals.toFixed(2)}`
);

console.log(
  `Gol casa: ${summary.homeGoals}`
);

console.log(
  `Gol ospite: ${summary.awayGoals}`
);

console.log("");

console.log(
  "EVENTI"
);

console.log(
  "------------------------------"
);

for (
  const [
    type,
    count,
  ] of Object.entries(
    summary.eventCounts
  )
) {
  console.log(
    `${type}: ${count}`
  );
}

console.log("");

console.log(
  `Tempo simulazione reale: ${(end - start).toFixed(0)} ms`
);

console.log("");

console.log(
  "=============================="
);
