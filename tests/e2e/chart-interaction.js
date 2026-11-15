async (page) => {
  const plot=page.getByRole('img',{name:/^(Historical telemetry|Telemetría histórica)/});
  const box=await plot.boundingBox();
  if(!box)throw new Error('Missing chart');
  await page.mouse.move(box.x+box.width*.5,box.y+box.height*.5);
  await page.mouse.wheel(0,-300);
  await page.mouse.down();
  await page.mouse.move(box.x+box.width*.65,box.y+box.height*.5,{steps:8});
  await page.mouse.up();
  const canvas=await plot.locator('canvas').count();
  if(!canvas)throw new Error('Chart did not retain Canvas renderer');
  return {passed:true,interaction:'wheel zoom and drag pan executed on native ECharts Canvas'};
}
