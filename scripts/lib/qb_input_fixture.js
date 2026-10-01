import fs from 'node:fs';

export const qbReference=JSON.parse(fs.readFileSync('data/live-cache/e0914b8c5a086741a555.bin','utf8'));
export function gameFlowFixture(extra={}) {
  return {qb_epa_definition:'v149-all-play',v104_reference:qbReference,
    v106_reference_status:{valid:true,error:null},defensive_drive_games:[],...extra};
}
