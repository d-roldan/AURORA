async (page) => {
 const results=[];
 const check=(condition,message)=>{if(!condition)throw new Error(message);results.push(message);};
 await page.getByRole('heading',{name:/^(Stored trends & comparison|Tendencias almacenadas y comparación)$/}).waitFor();
 await page.getByText(/^(Choose metrics by category|Elegir métricas por categoría)$/).click();
 const boxes=page.getByRole('checkbox');
 check(await boxes.count()===60,'60 independently selectable metrics');
 check(await boxes.evaluateAll(items=>items.every(item=>item.checked)),'All metrics selected initially');
 await page.getByRole('button',{name:/^(Deselect all|Deseleccionar todas)$/}).click();
 check(await boxes.evaluateAll(items=>items.every(item=>!item.checked)),'Deselect all synchronizes all controls');
 const heart=page.getByRole('checkbox',{name:/^(Heart rate|Frecuencia cardíaca) /});
 const oxygen=page.getByRole('checkbox',{name:/^SpO₂ /});
 await heart.check();await oxygen.check();
 const scale=page.getByRole('combobox',{name:/^(Display scale|Escala de visualización)$/});
 await scale.selectOption('original');
 check(await scale.inputValue()==='original','Original-unit axes available for two units');
 await heart.uncheck();
 check(await boxes.evaluateAll(items=>items.filter(item=>item.checked).length)===1,'Individual metric deselection');
 await page.getByRole('button',{name:/^(Select all|Seleccionar todas)$/}).click();
 check(await boxes.evaluateAll(items=>items.every(item=>item.checked)),'Select all restores the full overlay');
 check(await scale.inputValue()==='normalized','Full overlay uses explicit relative display scale');
 const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:/^(Export CSV|Exportar CSV)$/}).click()]);
 await download.saveAs('/workspace/output/playwright/all-metrics-export.csv');
 await page.getByText(/^(Choose metrics by category|Elegir métricas por categoría)$/).click();
 return {passed:true,checks:results,download:download.suggestedFilename()};
}

