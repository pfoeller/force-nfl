const fs=require('fs');
const app=fs.readFileSync('assets/app.js','utf8');
const model=fs.readFileSync('model/live_profiles.js','utf8');
function ok(x,m){if(!x)throw new Error(m)}
ok(model.includes('standardRushPressureWeight:0.75'),'standard-rush pressure weight must be 75%');
ok(model.includes('overallPressureWeight:0.25'),'overall pressure weight must be 25%');
ok(model.includes('qbOlRatingAdjustment=qbStandardRushPressureAdjustment+qbOverallPressureAdjustment'),'O-line adjustment must combine standard-rush and overall terms');
ok(model.includes('+qbOpponentRatingAdjustment+qbOlRatingAdjustment'),'canonical QB score must apply both context adjustments');
ok(app.includes('<th>O-Line Adjustment</th>'),'QB table must show O-Line Adjustment');
ok(app.includes('rawRating=Math.max(0,Math.min(100,r.rating-adj-olAdj))'),'raw rating must remove both adjustments');
ok(app.includes('75% standard-rush disruption rate and 25% overall pressure rate'),'UI must explain 75/25 formula');
console.log('V133 QB O-line adjustment checks passed');
