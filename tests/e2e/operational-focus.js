async (page) => {
 const checks=[];const check=(ok,label)=>{if(!ok)throw new Error(label);checks.push(label);};
 const exit=page.getByRole('button',{name:'Exit focus',exact:true});if(await exit.count())await exit.click();
 await page.setViewportSize({width:1440,height:900});
 await page.getByRole('button',{name:'Rover Exterior vehicle',exact:true}).click();
 const dialog=page.getByRole('dialog',{name:'Operational focus view'});
 await dialog.getByRole('button',{name:'Detailed monitor',exact:true}).click();
 await dialog.locator('[data-slot="5"]').waitFor();
 check(await page.evaluate(()=>!!document.fullscreenElement),'Actual browser fullscreen entered');
 check(await page.evaluate(()=>document.querySelector('.shell').inert),'Background is inert while focus view is active');
 for(const name of ['Spacecraft','Space station','Rover','Lunar / planetary base']){
  await dialog.getByRole('button',{name,exact:true}).click();
  await page.waitForFunction(()=>document.querySelectorAll('[data-slot]').length===5);
  check(await dialog.locator('[data-slot="1"][data-kind="UNIVERSAL"]').count()===1 && await dialog.locator('[data-slot="2"][data-kind="UNIVERSAL"]').count()===1,`Fixed universal slots in ${name}`);
  check(await dialog.getByLabel('Permanent radiation monitoring').count()===1,`Permanent radiation in ${name}`);
 }
 await dialog.getByRole('button',{name:'Rover',exact:true}).click();
 await page.screenshot({path:'/workspace/output/playwright/operational-desktop.png'});
 await exit.click();await dialog.waitFor({state:'detached'});check(await dialog.count()===0,'Exit returns to profile');
 check(await page.evaluate(()=>!document.fullscreenElement&&!document.querySelector('.shell').inert),'Fullscreen and background restored');
 await page.evaluate(()=>{document.documentElement.requestFullscreen=()=>Promise.reject(new Error('Controlled browser rejection'));});
 await page.getByRole('button',{name:'Spacecraft Deep-space transit',exact:true}).click();
 await page.getByText('Full-window view active. Browser fullscreen may require permission.',{exact:true}).waitFor();
 check(await dialog.count()===1,'Denied fullscreen retains usable full-window view');
 await page.keyboard.press('Escape');await dialog.waitFor({state:'detached'});check(await dialog.count()===0,'Escape closes fallback view');
 await page.reload();await page.getByRole('button',{name:'Rover Exterior vehicle',exact:true}).waitFor();
 await page.setViewportSize({width:390,height:844});
 await page.getByRole('button',{name:'Rover Exterior vehicle',exact:true}).click();
 await dialog.getByRole('button',{name:'Detailed monitor',exact:true}).click();
 await dialog.locator('[data-slot="5"]').waitFor();
 check(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth+1),'Mobile view has no horizontal overflow');
 await page.screenshot({path:'/workspace/output/playwright/operational-mobile.png'});
 await exit.click();await page.setViewportSize({width:1440,height:900});
 return {passed:true,checks};
}

