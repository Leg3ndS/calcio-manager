export const REFEREE_PROFILES={
 balanced:{name:'Balanced',accuracy:92,strictness:50,cardTendency:50,advantageTendency:52,offsideAccuracy:95,penaltyTendency:50,contactTolerance:50},
 permissive:{name:'Permissive',accuracy:90,strictness:30,cardTendency:35,advantageTendency:65,offsideAccuracy:93,penaltyTendency:40,contactTolerance:68},
 strict:{name:'Strict',accuracy:95,strictness:72,cardTendency:70,advantageTendency:38,offsideAccuracy:97,penaltyTendency:58,contactTolerance:32}
};
export function createReferee(config={},profile='balanced'){const base=REFEREE_PROFILES[profile]??REFEREE_PROFILES.balanced;return {...base,...config};}
