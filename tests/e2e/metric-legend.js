async (page) => {
 const plot=page.getByRole('img',{name:/^(Historical telemetry|Telemetría histórica)/});
 const box=await plot.boundingBox();
 if(!box)throw new Error('Missing plot');
 // The first visible legend entry was inspected in the chart screenshot.
 await page.mouse.click(box.x+90,box.y+20);
 await page.getByText(/^(Choose metrics by category|Elegir métricas por categoría)$/).click();
 const checked=await page.getByRole('checkbox').evaluateAll(items=>items.filter(item=>item.checked).length);
 if(checked!==37)throw new Error('Canvas legend did not synchronize selection: '+checked);
 await page.getByRole('button',{name:/^(Select all|Seleccionar todas)$/}).click();
 await page.getByText(/^(Choose metrics by category|Elegir métricas por categoría)$/).click();
 return {passed:true,checkedAfterLegendClick:checked,restored:38};
}
