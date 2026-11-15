async (page) => {
 const phase='__PHASE__';const checks=[];const check=(ok,label)=>{if(!ok)throw new Error(label);checks.push(label);};
 const dialog=page.getByRole('dialog',{name:'Operational focus view'});
 const reading=()=>dialog.locator('[data-slot="1"] [data-metric="spo2"]');
 if(phase==='warm'){
  await page.locator('.crew-card').first().click();
  await page.getByRole('button',{name:'Rover Exterior vehicle',exact:true}).click();
  await reading().waitFor();
  await page.waitForFunction(()=>document.querySelector('[data-slot="1"] [data-metric="spo2"]')?.getAttribute('data-recorded')==='false');
  const stamp=await reading().getAttribute('data-observed-at');check(!!stamp,'Real API reading available before interruption');
  await page.waitForFunction(()=>document.querySelector('.focus-primary-reading strong')?.textContent!=='N/A');
  // Persistence is throttled; wait for the actual IndexedDB write, not an arbitrary delay.
  await page.waitForFunction(async()=>{const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('aegis-display-cache',1);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});try{return await new Promise(resolve=>{const r=db.transaction('snapshots').objectStore('snapshots').getAll();r.onsuccess=()=>resolve(r.result.some(s=>s.entries.some(e=>e.key[0]==='operationalView')));});}finally{db.close();}});
  check(true,'Operational display persisted to IndexedDB');
 }
 if(phase==='stopped'){
  await page.waitForFunction(()=>document.querySelector('[data-slot="1"] [data-metric="spo2"]')?.getAttribute('data-recorded')==='true');
  const text=await reading().locator('strong').textContent();check(!!text&&text!=='N/A','Stale SpO2 retains its actual numeric value');
  check((await reading().textContent()).includes('Last recorded'),'Stale value explicitly marked as last recorded');
  check(await dialog.locator('[data-slot]').evaluateAll(cards=>cards.every(card=>card.scrollHeight<=card.clientHeight+1)),'Recorded-state labels fit inside their cards');
  const stamp=await reading().getAttribute('data-observed-at');
  await page.screenshot({path:'/workspace/output/playwright/continuity-focus-stale.png'});
  await page.getByRole('button',{name:'Exit focus',exact:true}).click();await dialog.waitFor({state:'detached'});
  await page.getByRole('link',{name:'Mission Control',exact:true}).click();
  await page.waitForFunction(()=>document.querySelectorAll('.crew-card .metric[data-recorded="true"]').length===12);
  check(!(await page.locator('.crew-card .crew-metrics').allTextContents()).some(s=>s.includes('—')),'Dashboard retains all twelve recorded crew values');
  await page.waitForFunction(()=>document.querySelector('.retained-signal-status')?.textContent.includes('Last recorded ECG'));
  check((await page.getByRole('img',{name:/^ECG chart/}).getAttribute('aria-label')).includes('persisted samples'),'Actual ECG trace retained after moving live window empties');
  await page.screenshot({path:'/workspace/output/playwright/continuity-dashboard-stale.png'});
  await page.reload();await page.locator('.crew-card').first().waitFor();
  check(!(await page.locator('.crew-card .crew-metrics').allTextContents()).some(s=>s.includes('—')),'Recorded dashboard values survive browser reload');
  await page.locator('.crew-card').first().click();await page.getByRole('button',{name:'Rover Exterior vehicle',exact:true}).click();await reading().waitFor();
  check(await reading().getAttribute('data-observed-at')===stamp,'Original observation time survives reload');
 }
 if(phase==='api-down'){
  await page.getByText('Connection interrupted. Last recorded data remains visible; it is not live.',{exact:true}).last().waitFor();
  check((await reading().locator('strong').textContent())!=='N/A','API outage does not erase operational reading');
  check(await dialog.locator('[data-slot]').count()===5,'All five slots survive API interruption');
  await page.screenshot({path:'/workspace/output/playwright/continuity-api-down.png'});
 }
 if(phase==='cache-reload'){
  // Authenticate against the real API, but block GET reads to prove restoration is
  // from the browser snapshot rather than a fast successful telemetry response.
  await page.route('**/api/v1/**',route=>route.request().method()==='GET'?route.abort('failed'):route.continue());
  await page.reload();await page.getByRole('button',{name:'Rover Exterior vehicle',exact:true}).waitFor();
  await page.getByRole('button',{name:'Rover Exterior vehicle',exact:true}).click();await reading().waitFor();
  check((await reading().locator('strong').textContent())!=='N/A','Persistent display restored while telemetry reads are blocked');
  await page.waitForFunction(()=>document.querySelector('[data-slot="1"] [data-metric="spo2"]')?.getAttribute('data-recorded')==='true');
  check(true,'Restored old data is never labeled live');
  const safe=await page.evaluate(async()=>{const db=await new Promise(resolve=>{const r=indexedDB.open('aegis-display-cache',1);r.onsuccess=()=>resolve(r.result);});try{return await new Promise(resolve=>{const r=db.transaction('snapshots').objectStore('snapshots').getAll();r.onsuccess=()=>resolve(!JSON.stringify(r.result).includes('"token"'));});}finally{db.close();}});
  check(safe,'Display snapshots contain no authentication tokens');
  await page.screenshot({path:'/workspace/output/playwright/continuity-cached-reload.png'});
  await page.getByRole('button',{name:'Exit focus',exact:true}).click();await dialog.waitFor({state:'detached'});
  await page.locator('.history .continuity-banner').waitFor();
  const historyLabel=await page.getByRole('img',{name:/^Historical telemetry chart/}).getAttribute('aria-label');
  const count=Number(historyLabel.match(/chart, ([\d,]+) persisted/)[1].replaceAll(',',''));
  check(count>1000,'Historical chart restores stored points while reads are blocked');
  const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'Export CSV',exact:true}).click()]);
  await download.saveAs('/workspace/output/playwright/retained-export.csv');
  let csv='';const stream=await download.createReadStream();for await(const chunk of stream)csv+=chunk.toString();
  check(csv.split('\r\n')[0].includes('"displayState"')&&csv.includes('"RETAINED"'),'CSV explicitly marks retained records with original observation columns');
  await page.getByRole('button',{name:'Rover Exterior vehicle',exact:true}).click();await reading().waitFor();await page.unroute('**/api/v1/**');
 }
 if(phase==='recovered'){
  await page.waitForFunction(()=>document.querySelector('[data-slot="1"] [data-metric="spo2"]')?.getAttribute('data-recorded')==='false',null,{timeout:90000});
  check(!(await reading().textContent()).includes('Last recorded'),'Fresh data automatically replaces recorded fallback');
  await page.screenshot({path:'/workspace/output/playwright/continuity-recovered.png'});
  await page.getByRole('button',{name:'Exit focus',exact:true}).click();await dialog.waitFor({state:'detached'});
 }
 return {passed:true,phase,checks};
}


