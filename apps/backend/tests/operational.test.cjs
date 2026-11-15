const {test}=require('node:test');const assert=require('node:assert/strict');
const {classifyDemo,DEMO_THRESHOLDS,ZONE_PROFILES,promoteSlots}=require('../dist/operational-rules');
test('four environments each define exactly three prioritized dynamic slots',()=>{
 assert.equal(Object.keys(ZONE_PROFILES).length,4);
 for(const profile of Object.values(ZONE_PROFILES)){assert.equal(profile.slots.length,3);assert.ok(profile.slots.every(s=>s.metrics.length>=2&&s.metrics.length<=5));}
});
test('yellow never displaces a slot; secondary red replaces only lowest-priority slot',()=>{
 const slots=[{id:3},{id:4},{id:5}];const yellow=promoteSlots(slots,[{metric:'blood_glucose',level:'YELLOW',priority:85}]);assert.deepEqual(yellow.slots,slots);
 const red=promoteSlots(slots,[{metric:'blood_glucose',level:'RED',priority:85}]);assert.deepEqual(red.slots.slice(0,2),slots.slice(0,2));assert.equal(red.slots[2].override.metric,'blood_glucose');
});
test('priority deterministic and universal metrics cannot evict contextual slots',()=>{
 const result=promoteSlots([1,2,3],[{metric:'spo2',level:'RED',priority:999},{metric:'blood_glucose',level:'RED',priority:85},{metric:'rover_pressure',level:'RED',priority:100}]);assert.equal(result.promoted.metric,'rover_pressure');
 assert.deepEqual(promoteSlots([1,2,3],[{metric:'spo2',level:'RED',priority:999}]).slots,[1,2,3]);
});
test('demo boundaries and units are explicit, not metric display ranges',()=>{
 const glucose=DEMO_THRESHOLDS.find(r=>r.metric==='blood_glucose');assert.equal(classifyDemo(105,glucose),'NONE');assert.equal(classifyDemo(195,glucose),'YELLOW');assert.equal(classifyDemo(280,glucose),'RED');
 const pressure=DEMO_THRESHOLDS.find(r=>r.metric==='rover_pressure');assert.equal(classifyDemo(101,pressure),'NONE');assert.equal(classifyDemo(80,pressure),'YELLOW');assert.equal(classifyDemo(50,pressure),'RED');
});
