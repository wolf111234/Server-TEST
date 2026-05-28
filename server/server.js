const express = require('express');
const app = express();
app.use(express.json());

const PORT = process.env.PORT || 6790;
const AUTH_TOKEN = process.env.RENDER_AUTH_TOKEN || 'sb-secret-2024';

let servers = {};

function auth(req, res, next) {
  const token = req.headers['x-auth-token'];
  if (token !== AUTH_TOKEN) return res.status(403).json({ error: 'forbidden' });
  next();
}

app.post('/register', auth, (req, res) => {
  const { name, ip, port, players, max, game, version } = req.body;
  if (!name || !ip) return res.status(400).json({ error: 'missing fields' });
  const sid = Date.now().toString();
  servers[sid] = {
    id: sid, name, ip, port: port || 6789,
    players: players || 1, max: max || 2,
    game: game || 'stick-battle', version: version || '1.0',
    ping: null, updated: Date.now()
  };
  console.log('[+]', name, ip);
  res.json({ ok: true, id: sid });
});

app.post('/unregister', auth, (req, res) => {
  const { id } = req.body;
  if (id && servers[id]) { console.log('[-]', servers[id].name); delete servers[id]; }
  res.json({ ok: true });
});

app.get('/list', (req, res) => {
  res.json({ servers: Object.values(servers).map(s => ({ ...s, age: Date.now() - s.updated })) });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', count: Object.keys(servers).length });
});

app.get('/api/servers', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.json({
    total: Object.keys(servers).length,
    servers: Object.values(servers),
    updated: Date.now()
  });
});

app.get('/api/config', auth, (req, res) => {
  res.json({
    port: PORT,
    auth: AUTH_TOKEN ? 'enabled' : 'disabled',
    servers: Object.keys(servers).length,
    uptime: process.uptime()
  });
});

app.delete('/api/servers/:id', auth, (req, res) => {
  const s = servers[req.params.id];
  if (s) { console.log('[-] admin removed', s.name); delete servers[req.params.id]; }
  res.json({ ok: true });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', servers: Object.keys(servers).length });
});

const PAGE = `<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Stick Battle — серверы</title><style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0d0d1a;color:#e0e0e0;min-height:100vh}
nav{display:flex;justify-content:space-between;align-items:center;padding:16px 24px;background:#16162b;border-bottom:1px solid #2a2a50}
nav h1{font-size:20px;font-weight:700;color:#7c7cff}
nav a{color:#7c7cff;text-decoration:none;font-size:14px;padding:6px 14px;border:1px solid #7c7cff33;border-radius:6px}
nav a:hover{background:#7c7cff15}
.container{max-width:1000px;margin:0 auto;padding:24px}
.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:24px}
.stat-card{background:#16162b;border:1px solid #2a2a50;border-radius:10px;padding:16px;text-align:center}
.stat-card .num{font-size:28px;font-weight:700;color:#7c7cff}
.stat-card .label{font-size:12px;color:#888;margin-top:4px}
table{width:100%;border-collapse:collapse;background:#16162b;border-radius:10px;overflow:hidden}
th{background:#1e1e3a;color:#888;font-size:12px;text-transform:uppercase;letter-spacing:.5px;padding:12px 16px;text-align:left;border-bottom:1px solid #2a2a50}
td{padding:12px 16px;border-bottom:1px solid #222244;font-size:14px}
tr:last-child td{border-bottom:none}
tr:hover{background:#1a1a33}
.badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600}
.badge.online{background:#1a4a1a;color:#4cff4c}
.badge.full{background:#4a1a1a;color:#ff4c4c}
.status-dot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:6px}
.status-dot.online{background:#4cff4c;box-shadow:0 0 6px #4cff4c66}
.status-dot.offline{background:#ff4c4c;box-shadow:0 0 6px #ff4c4c66}
.empty{text-align:center;padding:48px;color:#555}
.empty p{font-size:16px;margin-top:8px}
.loading{text-align:center;padding:48px;color:#555}
.footer{text-align:center;padding:24px;color:#444;font-size:12px}
</style></head><body>
<nav><h1>⚔️ Stick Battle</h1><a href="/admin">🔧 Админка</a></nav>
<div class="container">
<div class="stats"><div class="stat-card"><div class="num" id="total">0</div><div class="label">Серверов онлайн</div></div><div class="stat-card"><div class="num" id="players">0</div><div class="label">Игроков</div></div><div class="stat-card"><div class="num" id="max">0</div><div class="label">Вместимость</div></div></div>
<div id="grid"><div class="loading">Загрузка...</div></div>
<div class="footer">Stick Battle Matchmaker</div>
</div>
<script>
async function load(){try{
const r=await fetch('/api/servers');const d=await r.json();
const list=document.getElementById('grid');const total=document.getElementById('total');const players=document.getElementById('players');const max=document.getElementById('max');
total.textContent=d.total;let pc=0,pm=0;d.servers.forEach(s=>{pc+=s.players||0;pm+=s.max||0});players.textContent=pc;max.textContent=pm;
if(!d.servers.length){list.innerHTML='<div class="empty"><div style="font-size:48px">🎮</div><p>Нет активных серверов</p></div>';return}
let h='<table><thead><tr><th>Сервер</th><th>IP</th><th>Порт</th><th>Версия</th><th>Игроки</th><th>Статус</th></tr></thead><tbody>';
d.servers.sort((a,b)=>a.name.localeCompare(b.name)).forEach(s=>{
const full=s.players>=s.max;const age=s.age?Math.floor(s.age/1000):0;
h+='<tr>'
+'<td><strong>'+s.name+'</strong></td>'
+'<td style="font-family:monospace;color:#888">'+s.ip+'</td>'
+'<td style="font-family:monospace;color:#888">'+s.port+'</td>'
+'<td>'+s.version+'</td>'
+'<td>'+s.players+'/'+s.max+'</td>'
+'<td>'+(full?'<span class="badge full">Полный</span>':'<span class="badge online">'+Math.max(0,60-age)+'с</span>')+'</td>'
+'</tr>'
});
h+='</tbody></table>';list.innerHTML=h
}catch(e){document.getElementById('grid').innerHTML='<div class="empty"><p>Ошибка загрузки</p></div>'}}
load();setInterval(load,5000);
</script></body></html>`;

const ADMIN = `<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Админка — Stick Battle</title><style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0d0d1a;color:#e0e0e0;min-height:100vh}
nav{display:flex;justify-content:space-between;align-items:center;padding:16px 24px;background:#16162b;border-bottom:1px solid #2a2a50}
nav h1{font-size:20px;font-weight:700;color:#7c7cff}
nav a{color:#7c7cff;text-decoration:none;font-size:14px;padding:6px 14px;border:1px solid #7c7cff33;border-radius:6px}
nav a:hover{background:#7c7cff15}
.container{max-width:1000px;margin:0 auto;padding:24px}
.login-box{max-width:400px;margin:80px auto;background:#16162b;border:1px solid #2a2a50;border-radius:12px;padding:32px;text-align:center}
.login-box h2{font-size:20px;margin-bottom:16px;color:#7c7cff}
.login-box input[type=password]{width:100%;padding:10px 14px;background:#0d0d1a;border:1px solid #2a2a50;border-radius:6px;color:#e0e0e0;font-size:16px;margin-bottom:12px;outline:none}
.login-box input[type=password]:focus{border-color:#7c7cff}
.login-box button{width:100%;padding:10px;background:#7c7cff;border:none;border-radius:6px;color:#fff;font-size:16px;font-weight:600;cursor:pointer}
.login-box button:hover{background:#6a6aff}
.login-box .error{color:#ff4c4c;margin-top:12px;font-size:14px;display:none}
.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px}
.stat-card{background:#16162b;border:1px solid #2a2a50;border-radius:10px;padding:16px;text-align:center}
.stat-card .num{font-size:24px;font-weight:700;color:#7c7cff}
.stat-card .label{font-size:12px;color:#888;margin-top:4px}
table{width:100%;border-collapse:collapse;background:#16162b;border-radius:10px;overflow:hidden}
th{background:#1e1e3a;color:#888;font-size:12px;text-transform:uppercase;letter-spacing:.5px;padding:12px 16px;text-align:left;border-bottom:1px solid #2a2a50}
td{padding:12px 16px;border-bottom:1px solid #222244;font-size:14px}
tr:last-child td{border-bottom:none}
tr:hover{background:#1a1a33}
.btn{display:inline-block;padding:6px 14px;border-radius:6px;font-size:13px;font-weight:600;border:none;cursor:pointer;text-decoration:none}
.btn-danger{background:#4a1a1a;color:#ff6b6b}
.btn-danger:hover{background:#5a2020}
.empty{text-align:center;padding:48px;color:#555}
.hidden{display:none}
#adminPanel.hidden{display:none}
.toast{position:fixed;bottom:24px;right:24px;background:#16162b;border:1px solid #2a2a50;border-radius:8px;padding:12px 20px;font-size:14px;opacity:0;transition:opacity .3s;z-index:100}
.toast.show{opacity:1}
.toast.success{border-color:#4cff4c;color:#4cff4c}
.toast.error{border-color:#ff4c4c;color:#ff4c4c}
</style></head><body>
<nav><h1>⚔️ Админка</h1><a href="/">← На главную</a></nav>
<div class="container">
<div id="loginBox" class="login-box">
<h2>🔑 Вход</h2>
<p style="color:#888;font-size:14px;margin-bottom:16px">Введите токен администратора</p>
<input type="password" id="tokenInput" placeholder="AUTH_TOKEN" onkeydown="if(event.key==='Enter')login()">
<button onclick="login()">Войти</button>
<div class="error" id="loginError">Неверный токен</div>
</div>
<div id="adminPanel" class="hidden">
<div class="stats">
<div class="stat-card"><div class="num" id="aTotal">0</div><div class="label">Серверов</div></div>
<div class="stat-card"><div class="num" id="aPlayers">0</div><div class="label">Игроков</div></div>
<div class="stat-card"><div class="num" id="aPort">-</div><div class="label">Порт</div></div>
<div class="stat-card"><div class="num" id="aUptime">-</div><div class="label">Аптайм (ч)</div></div>
</div>
<div style="display:flex;gap:8px;margin-bottom:16px">
<button class="btn btn-danger" onclick="purgeAll()">🧹 Очистить все</button>
</div>
<div id="aGrid"><div class="loading">Загрузка...</div></div>
</div>
</div>
<div class="toast" id="toast"></div>
<script>
let token='';
function toast(msg,type){const t=document.getElementById('toast');t.textContent=msg;t.className='toast '+type+' show';setTimeout(()=>t.classList.remove('show'),3000)}
async function login(){
token=document.getElementById('tokenInput').value;
try{
const r=await fetch('/api/config',{headers:{'x-auth-token':token}});
if(!r.ok)throw Error('bad');
document.getElementById('loginBox').classList.add('hidden');
document.getElementById('adminPanel').classList.remove('hidden');
loadAdmin();
toast('Вход выполнен','success')
}catch(e){
document.getElementById('loginError').style.display='block';
token=''
}}
async function api(path,init){
init=init||{};init.headers=init.headers||{};init.headers['x-auth-token']=token;
const r=await fetch(path,init);if(!r.ok)throw Error('fail');
return r.json()
}
async function loadAdmin(){
try{
const cfg=await api('/api/config');
document.getElementById('aPort').textContent=cfg.port;
document.getElementById('aUptime').textContent=(cfg.uptime/3600).toFixed(1);
const d=await api('/api/servers');
const grid=document.getElementById('aGrid');const total=document.getElementById('aTotal');const players=document.getElementById('aPlayers');
total.textContent=d.total;let pc=0;d.servers.forEach(s=>{pc+=s.players||0});players.textContent=pc;
if(!d.servers.length){grid.innerHTML='<div class="empty"><p>Нет активных серверов</p></div>';return}
let h='<table><thead><tr><th>ID</th><th>Сервер</th><th>IP</th><th>Порт</th><th>Версия</th><th>Игроки</th><th>Статус</th><th></th></tr></thead><tbody>';
d.servers.sort((a,b)=>a.name.localeCompare(b.name)).forEach(s=>{
const full=s.players>=s.max;const age=Math.floor((Date.now()-s.updated)/1000);
h+='<tr>'
+'<td style="font-family:monospace;font-size:11px;color:#555">'+s.id.slice(-6)+'</td>'
+'<td><strong>'+s.name+'</strong></td>'
+'<td style="font-family:monospace;color:#888">'+s.ip+'</td>'
+'<td style="font-family:monospace;color:#888">'+s.port+'</td>'
+'<td>'+s.version+'</td>'
+'<td>'+s.players+'/'+s.max+'</td>'
+'<td>'+(full?'<span class="badge full">Полный</span>':'<span class="badge online">'+Math.max(0,60-age)+'с</span>')+'</td>'
+'<td><button class="btn btn-danger" onclick="removeServer(\\''+s.id+'\\',\\''+s.name+'\\')">✕</button></td>'
+'</tr>'
});
h+='</tbody></table>';grid.innerHTML=h
}catch(e){document.getElementById('aGrid').innerHTML='<div class="empty"><p>Ошибка</p></div>'}}
async function removeServer(id,name){
if(!confirm('Удалить сервер "'+name+'"?'))return;
await api('/api/servers/'+id,{method:'DELETE'});
toast('Сервер удалён','success');
loadAdmin()
}
async function purgeAll(){
if(!confirm('Удалить ВСЕ серверы? Это нельзя отменить.'))return;
try{
const d=await api('/api/servers');
for(const s of d.servers)await api('/api/servers/'+s.id,{method:'DELETE'});
toast('Все серверы очищены','success');
loadAdmin()
}catch(e){toast('Ошибка','error')}
}
</script></body></html>`;

app.get('/', (req, res) => res.type('html').send(PAGE));
app.get('/admin', (req, res) => res.type('html').send(ADMIN));

app.listen(PORT, '0.0.0.0', () => {
  console.log('[Master] HTTP server on port', PORT);
  console.log('[Master] Auth:', AUTH_TOKEN ? 'enabled' : 'disabled');
  console.log('[Master] Admin: /admin');
  console.log('[Master] API:  /api/servers');
});
