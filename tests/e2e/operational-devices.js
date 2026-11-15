async page => {
 const phase='__PHASE__';
 const check=(condition,label)=>{if(!condition)throw new Error(label);};
 const dialog=page.getByRole('dialog',{name:'Operational focus view'});
 if(phase==='normal'){
  await page.goto('http://localhost:8085/crew/20cd85e5-cb29-4f46-8fb1-e2c0fac227da');
  await page.setViewportSize({width:1920,height:1080});
  await page.getByRole('button',{name:'Space station Orbital habitat',exact:true}).click();
  await page.locator('.station-crew .station-radiation').nth(3).waitFor();
  check(await page.locator('.station-crew').count()===4,'TV must show four authorized crew');
  check(await page.locator('.station-cabin [data-metric]').count()===5,'Five cabin channels');
  check(await dialog.evaluate(e=>e.scrollHeight<=e.clientHeight+1&&e.scrollWidth<=e.clientWidth+1),'TV must fit 1920x1080');
  await page.screenshot({path:'output/playwright/station-tv.png'});
 }else if(phase==='yellow'){
  // Scenario targets CREW-02 while the profile behind the TV is CREW-01.
  await page.locator('.station-alerts .device-alert[data-level="YELLOW"]').waitFor({timeout:60000});
  check((await page.locator('.station-alerts').textContent()).includes('Elba Quaife'),'Companion alert must appear automatically');
  await page.screenshot({path:'output/playwright/station-tv-yellow.png'});
  await page.getByRole('button',{name:'Exit focus',exact:true}).click();
  await page.goto('http://localhost:8085/crew/384e5b0c-c2c2-450a-8132-44088f423ee8');
  await page.getByRole('button',{name:'Rover Exterior vehicle',exact:true}).click();
  await page.locator('.visor-display .device-alert[data-level="YELLOW"]').waitFor({timeout:60000});
  await page.setViewportSize({width:390,height:844});
  check(await dialog.evaluate(e=>e.scrollWidth<=e.clientWidth+1),'Visor mobile horizontal overflow');
  await page.screenshot({path:'output/playwright/visor-yellow-mobile.png'});
 }else if(phase==='red'){
  await page.locator('.visor-display .device-alert[data-level="RED"]').waitFor({timeout:60000});
  check(await page.locator('.visor-display .device-alert li').count()===4,'Red human review steps');
  await page.screenshot({path:'output/playwright/visor-red-mobile.png'});
  await page.getByRole('button',{name:'Interface language',exact:true}).click();
  await page.getByRole('button',{name:'TV de estación',exact:true}).waitFor();
  check((await page.locator('.visor-display .device-alert').textContent()).includes('Verificá el sensor'),'Spanish guidance');
  await page.getByRole('button',{name:'Idioma de la interfaz',exact:true}).click();
 }else if(phase==='offline'){
  const alert=page.locator('.visor-display .device-alert');
  await page.route('**/api/v1/crew/*/operational-view?*',route=>route.abort());
  try{
   await dialog.getByText('Data feed unavailable. Last alert remains visible; stale measurements are not shown as live.',{exact:true}).waitFor({timeout:30000});
   const before=await alert.locator('[data-metric="blood_glucose"]').getAttribute('data-observed-at');
   await page.waitForTimeout(3000);
   check(await alert.getAttribute('data-level')==='RED','Outage must not clear red');
   check(await alert.locator('[data-metric="blood_glucose"]').getAttribute('data-observed-at')===before,'Outage must preserve observation timestamp');
   check(await alert.locator('[data-recorded="true"]').count()>0,'Retained evidence must be labeled');
  }finally{await page.unroute('**/api/v1/crew/*/operational-view?*');}
 }
 return {passed:true,phase};
}
