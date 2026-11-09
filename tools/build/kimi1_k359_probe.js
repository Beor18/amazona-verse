(async () => {
  const { spawn, execSync } = require('child_process');
  const http = require('http');
  const fs = require('fs'), os = require('os'), path = require('path');
  const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'k1heap-probe-'));
  const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf,
    '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--mute-audio', '--disable-sync', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--disable-component-update', '--enable-precise-memory-info',
    '--window-size=1366,768', '--force-device-scale-factor=1', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
  let err = ''; chrome.stderr.on('data', d => err += d);
  console.log('SPAWN pid=' + chrome.pid);
  chrome.on('exit', (c, s) => console.log('EXIT spawn cod=' + c + ' sen=' + s + ' stderr:' + err.slice(-200)));
  let puerto;
  for (let i = 0; i < 60; i++) { try { const s = fs.readFileSync(path.join(perf, 'DevToolsActivePort'), 'utf8').split('\n'); if (s.length > 1) { puerto = parseInt(s[0], 10); break; } } catch (e) { } await new Promise(r => setTimeout(r, 250)); }
  console.log('puerto=' + puerto);
  for (let t = 0; t < 45; t++) {
    await new Promise(r => setTimeout(r, 1000));
    try {
      const out = execSync('powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \\"Name=\'chrome.exe\'\\" | Where-Object { $_.CommandLine -like \'*k1heap-probe*\' } | Select-Object ProcessId,ParentProcessId | Format-Table -HideTableHeaders"').toString().trim();
      const lineas = out ? out.split('\n').filter(x => x.trim()) : [];
      let vivo = 'no';
      try { await new Promise((res) => { const rq = http.get('http://127.0.0.1:' + puerto + '/json/version', r => { vivo = 'si ' + r.statusCode; r.resume(); r.on('end', res); }); rq.on('error', e => { vivo = 'no(' + e.code + ')'; res(); }); rq.setTimeout(1500, () => { rq.destroy(); vivo = 'timeout'; res(); }); }); } catch (e) { }
      console.log('t=' + (t + 1) + 's chromeProcs=' + lineas.length + ' devtools=' + vivo);
      if (lineas.length === 0 && t > 3) { console.log('YA NO HAY PROCESOS CHROME DEL PERFIL'); break; }
    } catch (e) { console.log('t=' + (t + 1) + 's err ' + String(e).slice(0, 120)); }
  }
  try { chrome.kill(); } catch (e) { }
  try { fs.rmSync(perf, { recursive: true, force: true }); } catch (e) { }
  process.exit(0);
})();
