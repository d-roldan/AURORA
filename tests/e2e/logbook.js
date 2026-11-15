async (page) => {
 const checks=[];const check=(ok,label)=>{if(!ok)throw new Error(label);checks.push(label);};
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const form=page.locator('.logbook-compose form');
 await form.waitFor();
 const notes='Synthetic logbook browser validation / '+new Date().toISOString()+'\nObservación original: actividad ficticia. <b>Keep as text.</b>';
 await form.getByLabel('Entry title (optional)').fill('Synthetic onboard journal');
 await form.locator('select[name=category]').selectOption('ACTIVITY');
 await form.getByLabel('Logbook notes').fill(notes);
 check(await form.getByLabel('Sleep (hours, optional)').inputValue()===''&&await form.getByLabel('Fatigue (0–10, optional)').inputValue()==='','Manual note does not require sleep or fatigue');
 // Fail only this browser POST, preserving all production services.
 const abort=route=>route.request().method()==='POST'?route.abort('failed'):route.continue();
 await page.route('**/api/v1/check-ins',abort);
 await form.getByRole('button',{name:'Save logbook entry',exact:true}).click();
 await page.getByRole('alert').filter({hasText:'Entry not saved. Your text is still in the form.'}).waitFor();
 check(await form.getByLabel('Logbook notes').inputValue()===notes,'A failed save keeps the original draft and displays an error');
 await page.unroute('**/api/v1/check-ins',abort);
 await form.getByRole('button',{name:'Save logbook entry',exact:true}).click();
 await page.getByRole('status').filter({hasText:'Logbook entry saved.'}).waitFor();
 const entry=page.locator('.logbook-entry').filter({hasText:notes});await entry.waitFor();
 check(await entry.locator('.personal-note').textContent()===notes,'Saved entry preserves original language, line breaks and markup as plain text');
 check(await entry.locator('.personal-note b').count()===0,'User HTML is rendered as text');
 check(await entry.locator('.logbook-values').count()===0,'Missing optional values do not appear as zero');
 check(await form.getByLabel('Logbook notes').inputValue()==='','Successful save clears the draft');
 check(await page.locator('.personal-safety [data-metric]').count()===7,'Universal and radiation readings remain visible');
 await page.getByRole('button',{name:'Home',exact:true}).click();await page.getByRole('button',{name:'Routine & check-ins',exact:true}).click();
 await page.locator('.logbook-entry').filter({hasText:notes}).waitFor();
 check(true,'Saved logbook entry survives section navigation');
 // In-memory records remain visible while a failed refresh is labeled.
 const fail=route=>route.abort('failed');
 await page.route('**/api/v1/check-ins?**',fail);
 await page.getByRole('button',{name:'Home',exact:true}).click();
 await page.getByRole('button',{name:'Routine & check-ins',exact:true}).click();
 await page.getByRole('alert').filter({hasText:'Logbook unavailable. Previously loaded entries may be outdated.'}).waitFor({timeout:30000});
 check(await page.locator('.logbook-entry').filter({hasText:notes}).count()===1,'Failed history refresh retains loaded records with an explicit warning');
 await page.unroute('**/api/v1/check-ins?**',fail);
 await page.getByRole('button',{name:'Retry',exact:true}).click();
 await page.getByRole('alert').filter({hasText:'Logbook unavailable.'}).waitFor({state:'hidden'});
 await page.screenshot({path:'output/playwright/logbook-desktop-en-light.png',fullPage:true});
 await page.getByRole('link',{name:'Settings',exact:true}).click();
 await page.getByRole('radio',{name:'ES Español',exact:true}).click();
 await page.getByRole('radio',{name:/Modo oscuro/}).click();
 await page.getByRole('link',{name:'Tripulación',exact:true}).click();
 await page.getByRole('button',{name:'Rutina y registros',exact:true}).click();
 await page.getByRole('heading',{name:'Tu bitácora de misión',exact:true}).waitFor();
 await page.locator('.logbook-entry').filter({hasText:notes}).waitFor();
 check(await page.locator('.logbook-entry').filter({hasText:notes}).count()===1,'Spanish UI preserves original user text');
 await page.setViewportSize({width:390,height:844});
 check(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'Mobile logbook has no horizontal page overflow');
 check(await page.getByLabel('Notas de la bitácora').isVisible(),'Mobile manual entry form is available');
 await page.screenshot({path:'output/playwright/logbook-mobile-es-dark.png',fullPage:true});
 await page.goto('http://localhost:8085/crew/20cd85e5-cb29-4f46-8fb1-e2c0fac227da');await page.getByRole('button',{name:'Rutina y registros',exact:true}).click();await page.locator('.logbook-entry').filter({hasText:notes}).waitFor();check(true,'Saved entry survives reload through the API');check(await page.locator('.logbook-compose form').count()===0,'Read-only demo session cannot add entries');check(errors.length===0,'No browser JavaScript errors');
 return {passed:true,checks};
}


