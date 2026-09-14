// Referee profiles for Calcio Manager.
// Values are simulation parameters, not real referee data.

export const REFEREE_PROFILES = {
  balanced: {
    id: "balanced",
    name: "Arbitro equilibrato",
    accuracy: 92,
    strictness: 50,
    cardTendency: 50,
    advantageTendency: 55,
    offsideAccuracy: 96,
    penaltyTendency: 50,
    contactTolerance: 50,
  },
  permissive: {
    id: "permissive",
    name: "Arbitro permissivo",
    accuracy: 90,
    strictness: 32,
    cardTendency: 30,
    advantageTendency: 68,
    offsideAccuracy: 94,
    penaltyTendency: 42,
    contactTolerance: 68,
  },
  strict: {
    id: "strict",
    name: "Arbitro severo",
    accuracy: 94,
    strictness: 72,
    cardTendency: 72,
    advantageTendency: 42,
    offsideAccuracy: 97,
    penaltyTendency: 58,
    contactTolerance: 34,
  },
};

export function createReferee(overrides = {}, profile = "balanced") {
  const base = REFEREE_PROFILES[profile] ?? REFEREE_PROFILES.balanced;
  return {
    ...base,
    ...overrides,
  };
}
