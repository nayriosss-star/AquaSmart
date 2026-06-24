// ── Bubbles ──
(function() {
  const bg = document.getElementById('water-bg');
  for (let i = 0; i < 12; i++) {
    const b = document.createElement('div');
    b.className = 'bubble';
    const size = 20 + Math.random() * 60;
    b.style.cssText = `width:${size}px;height:${size}px;left:${Math.random()*100}%;
      animation-duration:${8+Math.random()*12}s;animation-delay:${-Math.random()*15}s;`;
    bg.appendChild(b);
  }
})();
 
// ── User store (MongoDB via backend) ──
let currentUser = null;
 
function switchTab(t) {
  document.getElementById('login-form').style.display = t==='login' ? '' : 'none';
  document.getElementById('register-form').style.display = t==='register' ? '' : 'none';
  document.querySelectorAll('.tab-btn').forEach((b,i) => b.classList.toggle('active', (i===0&&t==='login')||(i===1&&t==='register')));
}
 
async function doLogin() {
  const email = document.getElementById('login-email').value.trim();
  const pass = document.getElementById('login-pass').value;
  const err = document.getElementById('login-error');
  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pass })
    });
    const data = await res.json();
    if (data.ok) {
      err.style.display = 'none';
      launchApp({ name: data.name, email: data.email });
    } else {
      err.textContent = data.error;
      err.style.display = 'block';
    }
  } catch {
    err.textContent = 'Error de conexión con el servidor.';
    err.style.display = 'block';
  }
}
 
async function doRegister() {
  const name  = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const pass  = document.getElementById('reg-pass').value;
  const pass2 = document.getElementById('reg-pass2').value;
  const err   = document.getElementById('register-error');
 
  if (!name || !email || !pass) {
    err.textContent = 'Completá todos los campos.';
    err.style.display = 'block'; return;
  }
  if (pass.length < 6) {
    err.textContent = 'La contraseña debe tener al menos 6 caracteres.';
    err.style.display = 'block'; return;
  }
  if (pass !== pass2) {
    err.textContent = 'Las contraseñas no coinciden.';
    err.style.display = 'block'; return;
  }
  try {
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password: pass })
    });
    const data = await res.json();
    if (data.ok) {
      err.style.display = 'none';
      launchApp({ name: data.name, email: data.email });
    } else {
      err.textContent = data.error;
      err.style.display = 'block';
    }
  } catch {
    err.textContent = 'Error de conexión con el servidor.';
    err.style.display = 'block';
  }
}
 
function launchApp(user) {
  currentUser = user;
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('app-screen').style.display = 'block';
  const initials = user.name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase();
  document.getElementById('sidebar-avatar').textContent = initials;
  document.getElementById('sidebar-name').textContent = user.name.split(' ')[0];
  document.getElementById('sidebar-email').textContent = user.email;
  initCharts();
  buildHistorial();
  buildAlertas();
  calcVol();
  startLiveData();
}
 
function doLogout() {
  document.getElementById('auth-screen').style.display = 'flex';
  document.getElementById('app-screen').style.display = 'none';
  if (liveInterval) clearInterval(liveInterval);
}
 
// ── Navigation ──
function showSection(s) {
  ['dashboard','piscina','historial','alertas','esp32','ia'].forEach(id =>
    document.getElementById('section-'+id).style.display = id===s ? '' : 'none'
  );
  document.querySelectorAll('.nav-item').forEach((el,i) => {
    const names = ['dashboard','piscina','historial','alertas','esp32','ia'];
    el.classList.toggle('active', names[i]===s);
  });
  if (s==='historial') draw7dChart();
}
 
// ── pH mini chart ──
function initCharts() {
  const svg = document.getElementById('ph-chart');
  const data = [7.1,7.3,7.6,7.8,8.1,7.5,7.3,7.2,7.4,7.3,7.1,7.0,7.2,7.3,7.2,7.4,7.5,7.3,7.2,7.1,7.3,7.4,7.3,7.2];
  drawLine(svg, data, 6.5, 8.5, 500, 120);
}
 
function drawLine(svg, data, min, max, W, H) {
  const pts = data.map((v,i) => `${(i/(data.length-1))*W},${H - ((v-min)/(max-min))*H}`);
  const yHi = H - ((7.6-min)/(max-min))*H;
  const yLo = H - ((6.8-min)/(max-min))*H;
  svg.innerHTML = `
    <rect x="0" y="${yHi}" width="${W}" height="${yLo-yHi}" fill="rgba(34,211,163,0.08)" rx="2"/>
    <polyline points="${pts.join(' ')}" fill="none" stroke="var(--aqua)" stroke-width="2.5" stroke-linejoin="round"/>
    ${data.map((v,i) => `<circle cx="${(i/(data.length-1))*W}" cy="${H-((v-min)/(max-min))*H}" r="3" fill="${v>=6.8&&v<=7.6?'var(--green-ok)':'var(--yellow-warn)'}"/>`).join('')}
    <line x1="0" y1="${yHi}" x2="${W}" y2="${yHi}" stroke="rgba(34,211,163,0.3)" stroke-dasharray="4"/>
    <line x1="0" y1="${yLo}" x2="${W}" y2="${yLo}" stroke="rgba(34,211,163,0.3)" stroke-dasharray="4"/>
  `;
}
 
function draw7dChart() {
  const svg = document.getElementById('ph-chart-7d');
  const data = [7.5,7.8,8.1,7.4,7.2,7.0,7.1,7.3,7.6,7.9,8.0,7.5,7.3,7.2,7.1,7.0,7.2,7.4,7.5,7.3,7.2,7.1,7.3,7.4,7.3,7.2,7.1,7.3,7.4,7.3,7.2,7.1,7.3,7.4,7.3,7.2,7.1,7.3,7.4,7.3,7.2,7.1];
  drawLine(svg, data, 6.5, 8.5, 600, 160);
}
 
// ── Pool volume calc ──
function calcVol() {
  const l = parseFloat(document.getElementById('pool-largo').value)||0;
  const a = parseFloat(document.getElementById('pool-ancho').value)||0;
  const p = parseFloat(document.getElementById('pool-prof').value)||0;
  const vol = (l*a*p).toFixed(1);
  document.getElementById('pool-volume-text').innerHTML =
    `💧 Volumen estimado: <strong>${vol} m³</strong> · Equivalente a ${(vol*1000).toLocaleString('es-AR')} litros de agua`;
  document.getElementById('card-vol').textContent = vol;
}
 
// ── Historial ──
function buildHistorial() {
  const rows = [
    ['13/06','14:30','7.8','Ácido activado (bomba A)','7.3'],
    ['13/06','08:14','7.1','Sin acción','7.1'],
    ['12/06','21:42','8.1','Ácido activado (bomba A)','7.5'],
    ['12/06','15:00','7.4','Sin acción','7.4'],
    ['11/06','10:30','6.7','Base activada (bomba B)','7.1'],
    ['10/06','09:00','7.2','Sin acción','7.2'],
  ];
  const colors = {'Ácido activado (bomba A)':'var(--red-alert)','Base activada (bomba B)':'var(--green-ok)','Sin acción':'var(--text-secondary)'};
  document.getElementById('historial-table').innerHTML = rows.map(r => `
    <tr style="border-bottom:1px solid rgba(255,255,255,0.04)">
      <td style="padding:10px 0;color:var(--text-secondary)">${r[0]}</td>
      <td style="padding:10px 0;color:var(--text-primary)">${r[1]}</td>
      <td style="padding:10px 0;color:var(--text-primary)">${r[2]}</td>
      <td style="padding:10px 0;color:${colors[r[3]]||'var(--text-primary)'}">${r[3]}</td>
      <td style="padding:10px 0;color:var(--aqua);font-weight:600">${r[4]}</td>
    </tr>`).join('');
}
 
// ── Alertas ──
function buildAlertas() {
  const alerts = [
    {type:'warn', msg:'Nivel de cloro estimado bajo (1.4 ppm) — supervisar manualmente', time:'Hace 12 min'},
    {type:'ok', msg:'Dosificación ácido completada — pH normalizado a 7.3', time:'Hace 1 h 8 min'},
    {type:'ok', msg:'ESP32 conectado y operativo', time:'Hoy 08:00'},
    {type:'alert', msg:'pH 8.1 detectado — por encima del límite', time:'Ayer 21:42'},
    {type:'ok', msg:'Sistema AquaSmart iniciado', time:'Ayer 07:55'},
  ];
  document.getElementById('alertas-list').innerHTML = alerts.map(a => `
    <div class="alert-item">
      <div class="alert-dot ${a.type}"></div>
      <div>
        <div class="alert-text">${a.msg}</div>
        <div class="alert-time">${a.time}</div>
      </div>
    </div>`).join('');
}
 
// ── Live data simulation ──
let liveInterval;
function startLiveData() {
  liveInterval = setInterval(() => {
    const ph = (7.3 + (Math.random()-0.5)*0.1).toFixed(2);
    const phEl = document.getElementById('card-ph');
    const temp = (24 + (Math.random()-0.5)*0.5).toFixed(1);
    phEl.textContent = ph;
    document.getElementById('card-temp').textContent = temp;
    const pct = ((ph - 0) / 14) * 100;
    document.getElementById('ph-marker').style.left = pct + '%';
  }, 3000);
}
 
// ── Enter key support ──
document.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    if (document.getElementById('login-form').style.display !== 'none') doLogin();
    else if (document.getElementById('register-form').style.display !== 'none') doRegister();
  }
});