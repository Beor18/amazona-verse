(async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const $ = id => document.getElementById(id);
  const espera = async (f, ms) => {
    const t0 = performance.now();
    while (performance.now() - t0 < ms) {
      try { if (f()) return true; } catch (e) {}
      await sleep(100);
    }
    return false;
  };
  const t = $('title');
  if (t && t.open) {
    const b = t.querySelector('form[method=dialog] button');
    if (b) b.click();
    await espera(() => !t.open, 5000);
  }
  await espera(() => {
    try { return !(window.AV && AV.G && AV.G.ui && AV.G.ui.worldHidden && AV.G.ui.worldHidden()); }
    catch (e) { return false; }
  }, 20000);
  return 'ok';
})()
