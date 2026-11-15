async (page) => {
 const checks=[];const check=(ok,label)=>{if(!ok)throw new Error(label);checks.push(label);};
 await page.getByRole('button',{name:'Vehículo explorador Vehículo exterior',exact:true}).click();
 const dialog=page.getByRole('dialog',{name:'Vista operativa prioritaria'});
 await dialog.locator('[data-slot="5"]').waitFor();
 check(await page.evaluate(()=>document.documentElement.lang==='es'&&document.documentElement.dataset.theme==='light'),'Retained display supports Spanish and light theme');
 await page.screenshot({path:'/workspace/output/playwright/continuity-spanish-light.png'});
 await page.evaluate(()=>window.dispatchEvent(new Event('aegis:session-expired')));
 await dialog.waitFor({state:'detached'});await page.locator('.modal').waitFor();
 check(await page.evaluate(()=>!document.querySelector('.shell').inert),'Reauthentication releases the inert background');
 check(await page.locator('.modal input[name="password"]').isVisible(),'Login is accessible after expiry in fullscreen');
 await page.getByRole('button',{name:/^(Cancel|Cancelar)$/,exact:true}).click();
 const fallback=await page.context().newPage();
 try{
  await fallback.addInitScript(()=>Object.defineProperty(window,'indexedDB',{get(){throw new Error('Controlled storage denial');}}));
  await fallback.goto(new URL('/',page.url()).href);await fallback.locator('.crew-card').first().waitFor();
  check(await fallback.locator('.crew-card').count()===4,'Blocked browser storage does not prevent actual API rendering');
  check(await fallback.locator('.continuity-banner').count()>0,'Unavailable local persistence is explicitly reported');
 }finally{await fallback.close();}
 await page.reload();return {passed:true,checks};
}
