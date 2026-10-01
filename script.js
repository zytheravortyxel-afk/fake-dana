/* =========================================================
   FAKE DANA — Generator Saldo
   Developer: Rafz
   ========================================================= */

const btn        = document.getElementById('submitBtn');
const input      = document.getElementById('nominalInput');
const select     = document.getElementById('nominalSelect');
const randomBtn  = document.getElementById('randomBtn');
const result     = document.getElementById('result');
const logPanel   = document.getElementById('logPanel');
const logEl      = document.getElementById('log');

const API = 'https://api.nexray.eu.cc/maker/fakedana';
const FILENAME = 'rafz_fakedana.jpg';

/* ================= SETTINGS ================= */
const SKEY = 'fakedana_settings_v1';
const defaultSettings = {
  autoDownload: false,
  saveHistory: true,
  compact: false
};
let settings = { ...defaultSettings };

function loadSettings(){
  try{
    const saved = JSON.parse(localStorage.getItem(SKEY));
    if(saved) settings = { ...defaultSettings, ...saved };
  }catch(_){}
}
function saveSettingsToStorage(){
  try{ localStorage.setItem(SKEY, JSON.stringify(settings)); }catch(_){}
}
function syncSettingsUI(){
  document.getElementById('setAutoDownload').checked = settings.autoDownload;
  document.getElementById('setSaveHistory').checked  = settings.saveHistory;
  document.getElementById('setCompact').checked      = settings.compact;
}
function readSettingsUI(){
  settings.autoDownload = document.getElementById('setAutoDownload').checked;
  settings.saveHistory  = document.getElementById('setSaveHistory').checked;
  settings.compact      = document.getElementById('setCompact').checked;
}

/* ================= HELPERS ================= */
const esc = (s) => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function log(msg, cls){
  logPanel.hidden = false;
  const line = document.createElement('div');
  if(cls) line.className = cls;
  line.textContent = msg;
  logEl.appendChild(line);
}

function showError(title, text, hint){
  result.hidden = false;
  result.className = 'result error';
  result.innerHTML =
    `<div class="panel-label" style="color:var(--dim);">${esc(title)}</div>
     <div class="err-text">${esc(text)}</div>
     ${hint ? `<div class="meta">${esc(hint)}</div>` : ''}`;
}

/* ================= FORMAT NOMINAL ================= */
/* Ubah "7000" -> "7.000", "1500000" -> "1.500.000" */
function formatNumber(str){
  const digits = String(str).replace(/\D/g, '');
  if(!digits) return '';
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/* Hapus titik, ambil digit asli */
function toDigits(str){
  return String(str).replace(/\D/g, '');
}

/* ================= INPUT EVENT ================= */
/* Auto format titik ribuan sambil ketik */
input.addEventListener('input', () => {
  const digits = toDigits(input.value);
  if(!digits){
    input.value = '';
    return;
  }
  input.value = formatNumber(digits);

  // Reset select kalau user ketik manual
  if(select.value !== ''){
    // kalau value input sama dengan salah satu option, biarkan select tetap
    const match = Array.from(select.options).find(o => o.value === input.value);
    if(!match) select.value = '';
  }
});

/* ================= SELECT EVENT ================= */
/* Pilih dari dropdown -> auto isi ke input */
select.addEventListener('change', () => {
  if(select.value){
    input.value = select.value;
  }
});

/* ================= RANDOM ================= */
/* Random pakai preset dari select (yang ada value nya saja) */
function randomNominal(){
  const options = Array.from(select.options)
    .map(o => o.value)
    .filter(v => v !== '');
  if(!options.length) return;
  const pick = options[Math.floor(Math.random() * options.length)];
  input.value = pick;
  select.value = pick;
  input.focus();
}

/* ================= GENERATE ================= */
async function generate(){
  const nominal = input.value.trim();
  logEl.innerHTML = '';
  logPanel.hidden = true;
  result.hidden = true;

  if(!nominal){
    showError('Nominal kosong', 'Ketik nominal saldo terlebih dahulu, atau pilih dari preset.');
    return;
  }
  const digits = toDigits(nominal);
  if(!digits || parseInt(digits) <= 0){
    showError('Nominal tidak valid', 'Nominal harus berupa angka lebih dari 0.', 'Contoh: 7000 atau 1.500.000');
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<span class="loader"></span>Generating...';
  const start = performance.now();
  log('› Mengirim nominal ke API...', 'dim');
  log(`› Nominal: ${nominal}`, 'dim');

  try{
    const apiUrl = `${API}?nominal=${encodeURIComponent(nominal)}`;
    const res = await fetch(apiUrl, { method: 'GET' });
    if(!res.ok) throw new Error(`HTTP Error: ${res.status}`);

    log('› Membaca respon...', 'dim');
    const contentType = res.headers.get('content-type') || '';
    let imageUrl = '';

    if(contentType.includes('application/json')){
      const data = await res.json();
      imageUrl = data.result || data.url || data.data;
      if(!imageUrl) throw new Error('Media URL tidak ditemukan di respon API');
      log('› Mengambil gambar dari URL...', 'dim');
      log('✓ Generate sukses', 'ok');
      const runtime = ((performance.now() - start) / 1000).toFixed(2) + 's';
      renderImageResult(imageUrl, nominal, runtime);
    } else {
      const blob = await res.blob();
      imageUrl = URL.createObjectURL(blob);
      log('✓ Generate sukses', 'ok');
      const runtime = ((performance.now() - start) / 1000).toFixed(2) + 's';
      renderImageResult(imageUrl, nominal, runtime);
    }

  }catch(err){
    console.error(err);
    log('✗ Gagal', 'err');
    showError('Gagal generate', err.message || 'Terjadi kesalahan tak terduga',
      'Kemungkinan server down atau nominal tidak valid.');
  }finally{
    btn.disabled = false;
    btn.textContent = 'Generate Sekarang';
  }
}

/* ================= RENDER RESULT ================= */
function renderImageResult(imageUrl, nominal, runtime){
  const compactCls = settings.compact ? ' compact' : '';
  result.hidden = false;
  result.className = 'result' + compactCls;

  const safeUrl = esc(imageUrl);
  const timeStr = new Date().toLocaleString('id-ID', {
    day:'numeric', month:'long', year:'numeric',
    hour:'2-digit', minute:'2-digit'
  });

  result.innerHTML = `
    <div class="panel-label" style="color:var(--white);">✓ HASIL GENERATE</div>
    <img class="result-img" src="${safeUrl}" alt="Fake Saldo DANA" loading="lazy">
    <div class="result-actions">
      <button type="button" class="dl" id="dlBtn">⬇ Download ${FILENAME}</button>
      <a href="${safeUrl}" target="_blank" rel="noopener noreferrer">Buka</a>
      <button type="button" id="shareBtn">Share</button>
    </div>
    <div class="meta">
      <span>💰 ${esc(nominal)}</span>
      <span>⏱ ${esc(runtime)}</span>
      <span>📅 ${esc(timeStr)}</span>
    </div>
  `;

  /* ---- DOWNLOAD ---- */
  document.getElementById('dlBtn').addEventListener('click', async () => {
    try{
      const r = await fetch(imageUrl);
      const b = await r.blob();
      const jpgBlob = await convertToJpg(b);
      const dlUrl = URL.createObjectURL(jpgBlob);
      const a = document.createElement('a');
      a.href = dlUrl;
      a.download = FILENAME;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(dlUrl), 2000);
    }catch(e){
      console.error(e);
      alert('Gagal download, coba klik kanan gambar > Save image as...');
    }
  });

  /* ---- SHARE ---- */
  const shareBtn = document.getElementById('shareBtn');
  shareBtn.addEventListener('click', async () => {
    try{
      if(navigator.share){
        let shareFile = null;
        try{
          const r = await fetch(imageUrl);
          const b = await r.blob();
          const jpgBlob = await convertToJpg(b);
          shareFile = new File([jpgBlob], FILENAME, { type: 'image/jpeg' });
        }catch(_){}
        if(shareFile && navigator.canShare && navigator.canShare({ files: [shareFile] })){
          await navigator.share({ files: [shareFile], title: 'Fake Dana', text: `Saldo: ${nominal}` });
        } else {
          await navigator.share({ title: 'Fake Dana', text: `Cek saldo DANA: ${nominal}`, url: imageUrl });
        }
      } else {
        await navigator.clipboard.writeText(imageUrl);
        shareBtn.textContent = 'URL Tersalin!';
        setTimeout(() => shareBtn.textContent = 'Share', 1400);
      }
    }catch(_){}
  });

  /* ---- AUTO DOWNLOAD ---- */
  if(settings.autoDownload){
    setTimeout(() => document.getElementById('dlBtn')?.click(), 600);
  }

  /* ---- SIMPAN RIWAYAT ---- */
  if(settings.saveHistory){
    const urlToSave = imageUrl.startsWith('blob:') || imageUrl.startsWith('data:')
      ? null : imageUrl;
    addHistory(nominal, urlToSave, runtime);
  }
}

/* ================= CONVERT TO JPG ================= */
async function convertToJpg(blob){
  if(blob.type === 'image/jpeg') return blob;
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(
        (out) => {
          URL.revokeObjectURL(url);
          resolve(out || blob);
        },
        'image/jpeg',
        0.95
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(blob);
    };
    img.src = url;
  });
}

/* ================= RIWAYAT ================= */
const HKEY = 'fakedana_history_v1';
const CHANNEL = 'https://whatsapp.com/channel/0029VbDGtCEDzgT8iNvBqB0V';
const hList = document.getElementById('hList');
const hCount = document.getElementById('hCount');

function loadHistory(){
  try{ return JSON.parse(localStorage.getItem(HKEY)) || []; }catch(_){ return []; }
}
function saveHistory(l){
  try{ localStorage.setItem(HKEY, JSON.stringify(l)); }catch(_){}
}
function fmtDate(ts){
  return new Intl.DateTimeFormat('id-ID', {
    day:'numeric', month:'long', year:'numeric',
    hour:'2-digit', minute:'2-digit'
  }).format(new Date(ts));
}
function addHistory(nominal, imageUrl, runtime){
  const l = loadHistory();
  l.unshift({ id: Date.now() + Math.random(), nominal, imageUrl, runtime, ts: Date.now() });
  saveHistory(l.slice(0, 30));
  renderHistory();
}
function el(tag, cls, text){
  const e = document.createElement(tag);
  if(cls) e.className = cls;
  if(text !== undefined) e.textContent = text;
  return e;
}
function renderHistory(){
  const l = loadHistory();
  hCount.textContent = l.length + ' riwayat';
  hList.innerHTML = '';
  if(!l.length){
    hList.appendChild(el('div', 'empty', 'Belum ada riwayat. Hasil generate bakal muncul di sini.'));
    return;
  }
  l.forEach(it => {
    const card = el('div', 'h-item');
    card.appendChild(el('div', 'h-date', fmtDate(it.ts)));
    card.appendChild(el('div', 'h-k', 'NOMINAL'));
    card.appendChild(el('div', 'h-v res', it.nominal));
    const act = el('div', 'h-act');
    if(it.imageUrl){
      const a = el('a', '', 'Buka');
      a.href = it.imageUrl;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      act.appendChild(a);
    }
    const del = el('button', 'del', 'Hapus');
    del.type = 'button';
    del.addEventListener('click', () => {
      saveHistory(loadHistory().filter(x => x.id !== it.id));
      renderHistory();
    });
    act.appendChild(del);
    card.appendChild(act);
    hList.appendChild(card);
  });
}
document.getElementById('clearAll').addEventListener('click', () => {
  if(loadHistory().length && confirm('Hapus semua riwayat?')){
    saveHistory([]);
    renderHistory();
  }
});

/* ================= DRAWER ================= */
const drawer = document.getElementById('drawer');
const overlay = document.getElementById('overlay');
function openDrawer(){
  drawer.classList.add('open');
  overlay.classList.add('show');
  renderHistory();
  syncSettingsUI();
}
function closeDrawer(){
  drawer.classList.remove('open');
  overlay.classList.remove('show');
}
document.getElementById('menuBtn').addEventListener('click', openDrawer);
document.getElementById('drawerClose').addEventListener('click', closeDrawer);
overlay.addEventListener('click', closeDrawer);

document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => {
  document.querySelectorAll('.tab').forEach(x => x.classList.toggle('active', x === t));
  document.getElementById('tabHistory').hidden  = t.dataset.tab !== 'history';
  document.getElementById('tabGuide').hidden    = t.dataset.tab !== 'guide';
  document.getElementById('tabSettings').hidden = t.dataset.tab !== 'settings';
}));

/* ================= SETTINGS BUTTONS ================= */
document.getElementById('setSave').addEventListener('click', () => {
  readSettingsUI();
  saveSettingsToStorage();
  const b = document.getElementById('setSave');
  b.textContent = '✓ Tersimpan';
  setTimeout(() => b.textContent = 'Simpan', 1400);
});
document.getElementById('setReset').addEventListener('click', () => {
  settings = { ...defaultSettings };
  saveSettingsToStorage();
  syncSettingsUI();
  const b = document.getElementById('setReset');
  b.textContent = '✓ Direset';
  setTimeout(() => b.textContent = 'Reset', 1400);
});

/* ================= MODAL ================= */
const modal = document.getElementById('modal');
const closeModal = () => { modal.hidden = true; };
document.getElementById('mClose').addEventListener('click', closeModal);
document.getElementById('mJoin').addEventListener('click', () => {
  window.open(CHANNEL, '_blank', 'noopener,noreferrer');
  closeModal();
});
document.addEventListener('keydown', (e) => {
  if(e.key === 'Escape'){ closeModal(); closeDrawer(); }
});

/* ================= EVENTS ================= */
btn.addEventListener('click', generate);
randomBtn.addEventListener('click', randomNominal);
input.addEventListener('keydown', (e) => { if(e.key === 'Enter') generate(); });

/* ================= INIT ================= */
loadSettings();
syncSettingsUI();
renderHistory();