import {qbCustomizeFixture} from './qb_customize_fixture.js';

// Synthetic current rows and outcomes, not production prevalence evidence.
// The prior/browser modules and V5 reference remain the tracked repository inputs.
export function projectionSemanticsFixture({fullSchedule = false, manualCarryover = false} = {}) {
  const input = qbCustomizeFixture();
  const pairs = input.schedule.slice(0, 16);
  for (let week = 4; week <= (fullSchedule ? 17 : 4); week++) {
    input.schedule.push(...pairs.map((g, i) => ({week, date:new Date(Date.UTC(2026,8,7+7*(week-1))).toISOString().slice(0,10),
      home:g.home, away:g.away, homeScore:null, awayScore:null,
      ...(i === 0 ? {homeMoneyline:-100000, awayMoneyline:100000} : {})})));
  }
  if (manualCarryover) input.qbCarryover = {enabled:true, team:'KC', restoreElo:50};
  return input;
}
