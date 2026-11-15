async (page) => {
  const results = [];
  const check = (condition, message) => { if (!condition) throw new Error(message); results.push(message); };
  await page.getByRole('navigation').getByRole('link', {name:/^(Settings|Configuración)$/}).click();
  const nav = await page.getByRole('navigation').getByRole('link').evaluateAll(links => links.map(link => link.getAttribute('href')));
  check(nav.indexOf('/settings') === nav.indexOf('/system') + 1, 'Settings immediately below System');
  for (const language of ['en','es']) {
    await page.getByRole('radio', {name:language==='en'?'EN English':'ES Español',exact:true}).click();
    for (const theme of ['dark','light']) {
      await page.getByRole('radio', {name:theme==='dark'?/^(Dark mode|Modo oscuro)/:/^(Light mode|Modo claro)/}).click();
      const state = await page.evaluate(() => ({language:document.documentElement.lang,theme:document.documentElement.dataset.theme,saved:JSON.parse(localStorage.getItem('aegis.preferences')),background:getComputedStyle(document.body).backgroundColor}));
      check(state.language===language && state.theme===theme && state.saved.language===language && state.saved.theme===theme, `Applied and persisted ${language}/${theme}`);
      await page.getByRole('navigation').getByRole('link', {name:language==='es'?'Telemetría':'Telemetry',exact:true}).click();
      await page.getByRole('heading', {name:language==='es'?'Telemetría':'Telemetry',exact:true}).waitFor();
      await page.getByRole('button', {name:language==='es'?'Exportar CSV':'Export CSV',exact:true}).waitFor();
      check(await page.getByRole('img').count()>=2, `Native charts rendered ${language}/${theme}`);
      await page.getByRole('navigation').getByRole('link', {name:language==='es'?'Configuración':'Settings',exact:true}).click();
    }
  }
  await page.reload();
  await page.getByRole('heading', {name:'Configuración',exact:true}).waitFor();
  check(await page.getByRole('radio', {name:/^Modo claro/}).getAttribute('aria-checked')==='true', 'Light Spanish preferences survive reload');
  return {passed:true,checks:results};
}
