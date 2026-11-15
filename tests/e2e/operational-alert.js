async (page) => {
 const level='__LEVEL__';
 const button=page.getByRole('button',{name:'Rover Exterior vehicle',exact:true});
 if(await button.isVisible())await button.click();
 await page.waitForFunction(expected=>document.querySelector('[data-level]')?.getAttribute('data-level')===expected,level);
 const view=page.getByRole('dialog',{name:'Operational focus view'});
 await view.getByRole('button',{name:'Detailed monitor',exact:true}).click();
 if(await view.locator('[data-slot]').count()!==5)throw new Error('Incorrect slot count');
 const overrides=await view.locator('[data-kind="OVERRIDE"]').count();
 if(overrides!==(level==='RED'?1:0))throw new Error('Incorrect override behavior');
 if(!await view.locator('[data-slot]').evaluateAll(cards=>cards.every(card=>card.scrollHeight<=card.clientHeight+1)))throw new Error('Slot content overflows its card');
 if(level==='RED'&&await view.locator('[data-slot="5"] .focus-procedure li').count()!==4)throw new Error('Missing human verification steps');
 const before=await view.locator('[data-slot="1"] .focus-observed').textContent();
 await page.waitForFunction(previous=>document.querySelector('[data-slot="1"] .focus-observed')?.textContent!==previous,before);
 await page.screenshot({path:`/workspace/output/playwright/operational-${level.toLowerCase()}-final.png`});
 await page.getByRole('button',{name:'Exit focus',exact:true}).click();await view.waitFor({state:'detached'});
 return {passed:true,level,slots:5,overrides,liveObservationAdvanced:true};
}
