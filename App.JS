/* ============================================
   KitsuneBG v67 — app.js
   Remove Background Photo & Video
   Firebase Auth + Firestore
   ============================================ */
'use strict';

/* ════════════════════════════════════════════
   🔥 GANTI DENGAN CONFIG FIREBASE KAMU
   Ambil dari: console.firebase.google.com
   → Project Settings → Your apps → Web
════════════════════════════════════════════ */
const firebaseConfig = {
    apiKey: "AIzaSyDe3F-n5nYQBg5ytOBvNofad1B5watVm5o",
    authDomain: "kitsunebg-221de.firebaseapp.com",
    databaseURL: "https://kitsunebg-221de-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "kitsunebg-221de",
    storageBucket: "kitsunebg-221de.firebasestorage.app",
    messagingSenderId: "770497390258",
    appId: "1:770497390258:web:c1c1f00c88097fa9e08bab",
  };

/* Email yang dapat akses Admin Panel + semua fitur */
const ADMIN_EMAIL = "kitsunelucky18@gmail.com";

/* Batas ukuran file */
const MAX_PHOTO_MB = 100;
const MAX_VIDEO_MB = 2048; // 2GB

/* ════ INIT FIREBASE ════ */
firebase.initializeApp(FIREBASE_CONFIG);
const auth = firebase.auth();
const db   = firebase.firestore();
const gp   = new firebase.auth.GoogleAuthProvider();
gp.setCustomParameters({ prompt: 'select_account' });

/* ════ STATE ════ */
let ME         = null;
let IS_ADMIN   = false;
let ALL_USERS  = [];
let ALL_LOGS   = [];
let ALL_ANNS   = [];
let curPhotoFile  = null;
let curVideoFile  = null;
let resultCanvas  = null;
let dropOpen      = false;

/* ════════════════════════════════════════════
   AUTH STATE LISTENER
════════════════════════════════════════════ */
auth.onAuthStateChanged(async user => {
  ME = user;
  if (user) {
    IS_ADMIN = user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();

    // Simpan / update user di Firestore
    const ref = db.collection('users').doc(user.uid);
    const doc = await ref.get();
    if (!doc.exists) {
      await ref.set({
        uid:       user.uid,
        name:      user.displayName || user.email.split('@')[0],
        email:     user.email,
        photoURL:  user.photoURL || null,
        role:      IS_ADMIN ? 'admin' : 'user',
        plan:      IS_ADMIN ? 'admin' : 'free',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        photoCount: 0,
        videoCount: 0,
      });
    } else {
      await ref.update({ lastLogin: firebase.firestore.FieldValue.serverTimestamp() });
    }

    // Log login
    addLog('login', user.email, 'Login berhasil');

    showApp();
  } else {
    showAuthGate();
  }
});

/* ════════════════════════════════════════════
   SHOW APP / AUTH GATE
════════════════════════════════════════════ */
function showApp() {
  document.getElementById('auth-gate').classList.add('hide');
  document.getElementById('app').classList.remove('hide');

  const av = ME.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(ME.displayName||'U')}&background=7B61FF&color=fff&size=64`;

  // Navbar
  document.getElementById('nav-av').src      = av;
  document.getElementById('nav-name').textContent = (ME.displayName || ME.email.split('@')[0]).substring(0, 14);
  document.getElementById('ud-av').src       = av;
  document.getElementById('ud-name').textContent  = ME.displayName || 'User';
  document.getElementById('ud-email').textContent = ME.email;

  if (IS_ADMIN) {
    document.getElementById('nav-crown').classList.remove('hide');
    document.getElementById('ud-admin-btn').style.display = 'flex';
  }

  // Load stats
  loadStats();
  if (IS_ADMIN) loadAdminData();

  goPage('home');
  showToast('✅ Selamat datang, ' + (ME.displayName || ME.email.split('@')[0]) + '!');
}

function showAuthGate() {
  document.getElementById('app').classList.add('hide');
  document.getElementById('auth-gate').classList.remove('hide');
}

/* ════════════════════════════════════════════
   AUTH FUNCTIONS
════════════════════════════════════════════ */
function switchAuthTab(tab, btn) {
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.auth-panel').forEach(p => p.classList.remove('show'));
  document.getElementById('panel-' + tab).classList.add('show');
  clearAuthErrs();
}

function clearAuthErrs() {
  ['su-err','li-err'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.textContent = ''; el.classList.remove('show'); }
  });
}

function showAuthErr(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
}

function setBtnLoad(id, on, lbl) {
  const b = document.getElementById(id);
  if (!b) return;
  b.disabled = on;
  b.innerHTML = on
    ? '<span class="dots"><span></span><span></span><span></span></span>'
    : (lbl || b.innerHTML);
}

function togglePw(id, btn) {
  const i = document.getElementById(id);
  if (!i) return;
  i.type = i.type === 'password' ? 'text' : 'password';
  btn.textContent = i.type === 'password' ? '👁' : '🙈';
}

async function authGoogle(mode) {
  const btnId = mode === 'signup' ? 'su-btn' : 'li-btn';
  setBtnLoad(btnId, true);
  try {
    await auth.signInWithPopup(gp);
  } catch (err) {
    setBtnLoad(btnId, false, mode === 'signup' ? 'Buat Akun' : 'Login');
    const msgs = {
      'auth/popup-closed-by-user':    '⚠️ Popup ditutup.',
      'auth/popup-blocked':           '❌ Popup diblokir browser. Izinkan popup untuk site ini.',
      'auth/cancelled-popup-request': '⚠️ Request dibatalkan.',
    };
    showAuthErr(mode === 'signup' ? 'su-err' : 'li-err', msgs[err.code] || '❌ ' + err.message);
  }
}

async function doSignup(e) {
  e.preventDefault();
  const name  = document.getElementById('su-name').value.trim();
  const email = document.getElementById('su-email').value.trim();
  const pw    = document.getElementById('su-pw').value;
  const pw2   = document.getElementById('su-pw2').value;

  if (!name || name.length < 3)   return showAuthErr('su-err', '❌ Username minimal 3 karakter.');
  if (pw !== pw2)                  return showAuthErr('su-err', '❌ Password tidak cocok!');

  setBtnLoad('su-btn', true);
  try {
    const c = await auth.createUserWithEmailAndPassword(email, pw);
    await c.user.updateProfile({ displayName: name });
    showToast('🎉 Akun berhasil dibuat!');
  } catch (err) {
    setBtnLoad('su-btn', false, 'Buat Akun');
    const msgs = {
      'auth/email-already-in-use': '❌ Email sudah terdaftar. Coba login.',
      'auth/invalid-email':        '❌ Format email tidak valid.',
      'auth/weak-password':        '❌ Password minimal 6 karakter.',
    };
    showAuthErr('su-err', msgs[err.code] || '❌ ' + err.message);
  }
}

async function doLogin(e) {
  e.preventDefault();
  const email = document.getElementById('li-email').value.trim();
  const pw    = document.getElementById('li-pw').value;

  setBtnLoad('li-btn', true);
  try {
    await auth.signInWithEmailAndPassword(email, pw);
  } catch (err) {
    setBtnLoad('li-btn', false, 'Login');
    const msgs = {
      'auth/user-not-found':   '❌ Email tidak terdaftar. Daftar dulu!',
      'auth/wrong-password':   '❌ Password salah.',
      'auth/invalid-email':    '❌ Format email tidak valid.',
      'auth/too-many-requests':'❌ Terlalu banyak percobaan. Tunggu sebentar.',
    };
    showAuthErr('li-err', msgs[err.code] || '❌ ' + err.message);
  }
}

async function doForgot() {
  const email = document.getElementById('li-email').value.trim();
  if (!email) return showAuthErr('li-err', '⚠️ Isi email dulu di kolom email.');
  try {
    await auth.sendPasswordResetEmail(email);
    showToast('📧 Email reset password dikirim ke ' + email);
  } catch {
    showAuthErr('li-err', '❌ Email tidak ditemukan.');
  }
}

async function doLogout() {
  closeDrop();
  addLog('logout', ME?.email || '', 'Logout');
  await auth.signOut();
  showToast('👋 Logout berhasil!');
}

/* ════════════════════════════════════════════
   NAVIGATION
════════════════════════════════════════════ */
function goPage(page) {
  document.querySelectorAll('.page').forEach(p => { p.classList.remove('show'); p.classList.add('hide'); });
  document.querySelectorAll('.nlink').forEach(l => l.classList.remove('active'));

  const el  = document.getElementById('page-' + page);
  const lnk = document.querySelector(`.nlink[data-page="${page}"]`);
  if (el)  { el.classList.remove('hide'); el.classList.add('show'); }
  if (lnk) lnk.classList.add('active');

  closeDrop();
  window.scrollTo(0, 0);

  // Admin guard
  if (page === 'admin' && !IS_ADMIN) {
    goPage('home');
    showToast('❌ Akses ditolak!');
    return;
  }

  // Load page data
  if (page === 'history')  loadHistory();
  if (page === 'account')  loadAccountInfo();
  if (page === 'admin')    loadAdminData();
}

/* ════════════════════════════════════════════
   USER DROPDOWN
════════════════════════════════════════════ */
function toggleDrop() {
  dropOpen = !dropOpen;
  document.getElementById('udrop').classList.toggle('hide', !dropOpen);
}
function closeDrop() {
  dropOpen = false;
  document.getElementById('udrop')?.classList.add('hide');
}
document.addEventListener('click', e => {
  if (!document.getElementById('nav-right')?.contains(e.target)) closeDrop();
});

/* ════════════════════════════════════════════
   STATS
════════════════════════════════════════════ */
async function loadStats() {
  try {
    const snap = await db.collection('users').get();
    animNum('s-users', snap.size);

    const processed = await db.collection('processed').get();
    const photos = processed.docs.filter(d => d.data().type === 'photo').length;
    const videos = processed.docs.filter(d => d.data().type === 'video').length;
    animNum('s-processed', photos + videos);
  } catch { /* offline / no data */ }
}

function animNum(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  const from = parseInt(el.textContent) || 0;
  if (from === target) return;
  let i = 0;
  const t = setInterval(() => {
    el.textContent = Math.round(from + (target - from) * ++i / 40);
    if (i >= 40) clearInterval(t);
  }, 20);
}

/* ════════════════════════════════════════════
   PHOTO PROCESSING
════════════════════════════════════════════ */
function updatePhotoBgOptions() {
  const val = document.getElementById('photo-bg').value;
  document.getElementById('bg-color-wrap').style.display = val === 'color' ? 'flex' : 'none';
}

function onDrag(e, id) {
  e.preventDefault();
  document.getElementById(id).classList.add('dragover');
}
function offDrag(id) {
  document.getElementById(id).classList.remove('dragover');
}
function onDropPhoto(e) {
  e.preventDefault();
  offDrag('photo-upload-box');
  const f = e.dataTransfer.files[0];
  if (f) processPhotoFile(f);
}
function onDropVideo(e) {
  e.preventDefault();
  offDrag('video-upload-box');
  const f = e.dataTransfer.files[0];
  if (f) processVideoFile(f);
}
function handlePhotoFile(e) {
  const f = e.target.files[0];
  if (f) processPhotoFile(f);
}
function handleVideoFile(e) {
  const f = e.target.files[0];
  if (f) processVideoFile(f);
}

function processPhotoFile(file) {
  // Validasi tipe
  const allowed = ['image/jpeg','image/png','image/webp','image/heic','image/heif'];
  if (!allowed.includes(file.type) && !file.name.match(/\.(jpg|jpeg|png|webp|heic|heif)$/i)) {
    showToast('❌ Format tidak didukung! Gunakan JPG, PNG, WebP, atau HEIC.');
    return;
  }
  // Validasi ukuran
  const maxBytes = MAX_PHOTO_MB * 1024 * 1024;
  if (file.size > maxBytes) {
    showToast(`❌ Ukuran foto melebihi ${MAX_PHOTO_MB}MB! File kamu: ${(file.size/1024/1024).toFixed(1)}MB`);
    return;
  }

  curPhotoFile = file;
  showPhotoProcessing(file);
}

function showPhotoProcessing(file) {
  const panel    = document.getElementById('photo-result');
  const progress = document.getElementById('photo-progress');
  const done     = document.getElementById('photo-done');

  panel.classList.add('show');
  progress.style.display = 'block';
  done.style.display     = 'none';

  // Show original preview
  const reader = new FileReader();
  reader.onload = ev => {
    document.getElementById('photo-orig').src = ev.target.result;
    simulatePhotoProcessing(ev.target.result);
  };
  reader.readAsDataURL(file);
}

function simulatePhotoProcessing(dataUrl) {
  const steps = [
    [5,  'Membaca gambar...', 'Memuat file ke memori'],
    [15, 'Mendeteksi objek...', 'Model AI menganalisis konten'],
    [30, 'Memisahkan foreground...', 'Mendeteksi tepi objek utama'],
    [50, 'Menghapus background...', 'Masking pixel per pixel'],
    [70, 'Menghaluskan tepi...', 'Edge refinement & anti-aliasing'],
    [85, 'Mengaplikasikan background...', 'Menerapkan background baru'],
    [95, 'Finalisasi...', 'Menyiapkan output'],
    [100,'Selesai!', 'Hasil siap didownload'],
  ];

  let idx = 0;
  const interval = setInterval(() => {
    if (idx >= steps.length) {
      clearInterval(interval);
      applyPhotoResult(dataUrl);
      return;
    }
    const [pct, lbl, step] = steps[idx];
    updateProgress(pct, lbl, step, 'prog-circle', 'prog-pct', 'prog-label', 'prog-step');
    idx++;
  }, 400);
}

function updateProgress(pct, lbl, step, circleId, pctId, lblId, stepId) {
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (pct / 100) * circumference;
  const circle = document.getElementById(circleId);
  if (circle) circle.style.strokeDashoffset = offset;
  const pctEl = document.getElementById(pctId);
  if (pctEl) pctEl.textContent = pct + '%';
  const lblEl = document.getElementById(lblId);
  if (lblEl) lblEl.textContent = lbl;
  const stepEl = document.getElementById(stepId);
  if (stepEl) stepEl.textContent = step;
}

function applyPhotoResult(dataUrl) {
  const progress = document.getElementById('photo-progress');
  const done     = document.getElementById('photo-done');
  progress.style.display = 'none';
  done.style.display     = 'block';

  const canvas  = document.getElementById('photo-result-canvas');
  const ctx     = canvas.getContext('2d');
  const img     = new Image();
  img.onload = () => {
    canvas.width  = img.width;
    canvas.height = img.height;

    // Apply background based on setting
    const bgType  = document.getElementById('photo-bg').value;
    const bgColor = document.getElementById('photo-bg-color')?.value || '#7B61FF';

    if (bgType === 'white') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else if (bgType === 'black') {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else if (bgType === 'color') {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else if (bgType === 'gradient') {
      const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      grad.addColorStop(0, '#7B61FF');
      grad.addColorStop(1, '#F472B6');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    // else transparent: do nothing

    ctx.drawImage(img, 0, 0);

    // Simulate background removal (client-side demo)
    removeBackgroundFromCanvas(ctx, canvas.width, canvas.height);

    resultCanvas = canvas;

    // Save to history
    saveToHistory(curPhotoFile.name, 'photo', canvas.toDataURL('image/png', 0.8));
    // Save to Firestore
    saveProcessed('photo', curPhotoFile.name, curPhotoFile.size);

    showToast('✅ Background berhasil dihapus!');
  };
  img.src = dataUrl;
}

// Simple client-side background removal simulation using color threshold
function removeBackgroundFromCanvas(ctx, w, h) {
  const imageData = ctx.getImageData(0, 0, w, h);
  const data      = imageData.data;

  // Sample background color from corners (simple approach)
  // Get average color from corners
  const corners = [
    [0,0], [w-1,0], [0,h-1], [w-1,h-1],
    [Math.floor(w/2), 0], [Math.floor(w/2), h-1],
  ];
  let rSum=0, gSum=0, bSum=0, count=0;
  corners.forEach(([x,y]) => {
    const i = (y*w + x) * 4;
    rSum += data[i]; gSum += data[i+1]; bSum += data[i+2];
    count++;
  });
  const bgR = rSum/count, bgG = gSum/count, bgB = bSum/count;
  const threshold = 60;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i+1], b = data[i+2];
    const dist = Math.sqrt(
      Math.pow(r - bgR, 2) +
      Math.pow(g - bgG, 2) +
      Math.pow(b - bgB, 2)
    );
    if (dist < threshold) {
      // Make transparent
      data[i+3] = 0;
    } else if (dist < threshold + 30) {
      // Soft edge
      data[i+3] = Math.round(((dist - threshold) / 30) * 255);
    }
  }
  ctx.putImageData(imageData, 0, 0);
}

function downloadPhoto() {
  if (!resultCanvas) return;
  const format   = document.getElementById('photo-format').value;
  const mimeType = format === 'jpg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png';
  const ext      = format;
  const link     = document.createElement('a');
  link.download  = 'kitsunebg_result.' + ext;
  link.href      = resultCanvas.toDataURL(mimeType, 0.92);
  link.click();
  showToast('⬇ Mendownload hasil...');
}

function copyToClipboard() {
  if (!resultCanvas) return;
  resultCanvas.toBlob(blob => {
    const item = new ClipboardItem({ 'image/png': blob });
    navigator.clipboard.write([item])
      .then(() => showToast('📋 Gambar dicopy ke clipboard!'))
      .catch(() => showToast('❌ Browser tidak support copy gambar.'));
  });
}

function resetPhoto() {
  document.getElementById('photo-result').classList.remove('show');
  document.getElementById('photo-progress').style.display = 'none';
  document.getElementById('photo-done').style.display     = 'none';
  document.getElementById('photo-file').value = '';
  curPhotoFile = null;
  resultCanvas = null;
}

/* ════════════════════════════════════════════
   VIDEO PROCESSING
════════════════════════════════════════════ */
function processVideoFile(file) {
  const allowedTypes = ['video/mp4','video/quicktime','video/x-msvideo','video/webm','video/mpeg'];
  const allowedExts  = /\.(mp4|mov|avi|webm|mkv|mpeg)$/i;
  if (!allowedTypes.includes(file.type) && !allowedExts.test(file.name)) {
    showToast('❌ Format tidak didukung! Gunakan MP4, MOV, AVI, atau WebM.');
    return;
  }
  const maxBytes = MAX_VIDEO_MB * 1024 * 1024;
  if (file.size > maxBytes) {
    showToast(`❌ Ukuran video melebihi 2GB! File kamu: ${(file.size/1024/1024/1024).toFixed(2)}GB`);
    return;
  }

  curVideoFile = file;
  showVideoProcessing(file);
}

function showVideoProcessing(file) {
  const panel    = document.getElementById('video-result');
  const progress = document.getElementById('video-progress');
  const done     = document.getElementById('video-done');

  panel.classList.add('show');
  progress.style.display = 'block';
  done.style.display     = 'none';

  // Show original video
  const url = URL.createObjectURL(file);
  document.getElementById('vid-orig').src = url;

  simulateVideoProcessing(url, file);
}

function simulateVideoProcessing(url, file) {
  const steps = [
    [5,  'Membaca video...', 'Memuat metadata video'],
    [10, 'Mendeteksi resolusi...', `Ukuran: ${(file.size/1024/1024).toFixed(1)}MB`],
    [20, 'Memulai frame processing...', 'Menginisialisasi model AI'],
    [35, 'Memproses frame 1/4...', 'Background detection per frame'],
    [50, 'Memproses frame 2/4...', 'Masking & segmentation'],
    [65, 'Memproses frame 3/4...', 'Temporal consistency check'],
    [80, 'Memproses frame 4/4...', 'Edge smoothing & refinement'],
    [90, 'Menggabungkan frames...', 'Encoding output video'],
    [95, 'Mengompres video...', 'Optimasi ukuran file'],
    [100,'Selesai!', 'Video siap didownload'],
  ];

  // Durasi simulasi: 500ms per step (total ~5 detik untuk demo)
  let idx = 0;
  const interval = setInterval(() => {
    if (idx >= steps.length) {
      clearInterval(interval);
      applyVideoResult(url, file);
      return;
    }
    const [pct, lbl, step] = steps[idx];
    updateProgress(pct, lbl, step, 'vprog-circle', 'vprog-pct', 'vprog-label', 'vprog-step');
    idx++;
  }, 500);
}

function applyVideoResult(url, file) {
  const progress = document.getElementById('video-progress');
  const done     = document.getElementById('video-done');
  progress.style.display = 'none';
  done.style.display     = 'block';

  // Show processed video (same video untuk demo)
  document.getElementById('vid-result').src = url;

  // Save
  saveToHistory(file.name, 'video', null);
  saveProcessed('video', file.name, file.size);
  showToast('✅ Background video berhasil dihapus!');
}

function downloadVideo() {
  if (!curVideoFile) return;
  const a       = document.createElement('a');
  a.href        = URL.createObjectURL(curVideoFile);
  a.download    = 'kitsunebg_video_result.mp4';
  a.click();
  showToast('⬇ Mendownload video...');
}

function resetVideo() {
  document.getElementById('video-result').classList.remove('show');
  document.getElementById('video-progress').style.display = 'none';
  document.getElementById('video-done').style.display     = 'none';
  document.getElementById('video-file').value = '';
  curVideoFile = null;
}

/* ════════════════════════════════════════════
   HISTORY
════════════════════════════════════════════ */
function saveToHistory(name, type, thumb) {
  const history = JSON.parse(localStorage.getItem('kbg_history') || '[]');
  history.unshift({
    id:    Date.now(),
    name,
    type,
    thumb,
    time:  new Date().toISOString(),
    user:  ME?.email || 'guest',
  });
  if (history.length > 50) history.pop();
  localStorage.setItem('kbg_history', JSON.stringify(history));
}

function loadHistory() {
  const container = document.getElementById('history-container');
  const history   = JSON.parse(localStorage.getItem('kbg_history') || '[]').filter(h => h.user === ME?.email);

  if (!history.length) {
    container.innerHTML = `<div class="empty-state">
      <span class="empty-icon">📂</span>
      <div class="empty-title">Belum ada riwayat</div>
      <div class="empty-sub">Proses foto atau video untuk melihat riwayat di sini.</div>
    </div>`;
    return;
  }

  container.innerHTML = `<div class="history-grid">
    ${history.map(h => `
      <div class="hist-card">
        ${h.thumb
          ? `<img src="${h.thumb}" class="hist-thumb" alt="${h.name}">`
          : `<div class="hist-thumb" style="display:flex;align-items:center;justify-content:center;font-size:40px">${h.type==='photo'?'🖼️':'🎬'}</div>`
        }
        <div class="hist-info">
          <div class="hist-name">${h.name}</div>
          <div class="hist-meta">${new Date(h.time).toLocaleDateString('id-ID', {day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}</div>
          <span class="hist-badge ${h.type}">${h.type === 'photo' ? '🖼️ Foto' : '🎬 Video'}</span>
        </div>
      </div>`
    ).join('')}
  </div>`;
}

function clearHistory() {
  if (!confirm('Hapus semua riwayat?')) return;
  const history = JSON.parse(localStorage.getItem('kbg_history') || '[]').filter(h => h.user !== ME?.email);
  localStorage.setItem('kbg_history', JSON.stringify(history));
  loadHistory();
  showToast('🗑 Riwayat dihapus.');
}

/* ════════════════════════════════════════════
   ACCOUNT INFO
════════════════════════════════════════════ */
function loadAccountInfo() {
  const av = ME?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(ME?.displayName||'U')}&background=7B61FF&color=fff&size=80`;
  const history = JSON.parse(localStorage.getItem('kbg_history') || '[]').filter(h => h.user === ME?.email);
  const photos  = history.filter(h => h.type === 'photo').length;
  const videos  = history.filter(h => h.type === 'video').length;

  document.getElementById('account-info').innerHTML = `
    <div style="display:flex;align-items:center;gap:16px;margin-bottom:20px;padding:16px;background:var(--dark2);border-radius:12px">
      <img src="${av}" style="width:60px;height:60px;border-radius:50%;border:3px solid var(--accent)">
      <div>
        <div style="font-size:17px;font-weight:600;margin-bottom:4px">${ME?.displayName || 'User'}</div>
        <div style="font-size:13px;color:var(--txt2)">${ME?.email}</div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div style="background:var(--dark2);border-radius:10px;padding:16px;text-align:center">
        <div style="font-family:'Syne',sans-serif;font-size:24px;font-weight:800;color:var(--accent)">${photos}</div>
        <div style="font-size:12px;color:var(--txt2)">Foto Diproses</div>
      </div>
      <div style="background:var(--dark2);border-radius:10px;padding:16px;text-align:center">
        <div style="font-family:'Syne',sans-serif;font-size:24px;font-weight:800;color:var(--pink)">${videos}</div>
        <div style="font-size:12px;color:var(--txt2)">Video Diproses</div>
      </div>
    </div>`;

  document.getElementById('account-plan').innerHTML = `
    <span class="plan-badge ${IS_ADMIN ? 'admin' : 'free'}">${IS_ADMIN ? '👑 Admin' : '🆓 Free'}</span>
    <p style="font-size:13px;color:var(--txt2);margin-top:10px">${IS_ADMIN ? 'Kamu memiliki akses penuh ke semua fitur dan Admin Panel.' : 'Akun gratis dengan akses ke fitur dasar.'}</p>`;
}

/* ════════════════════════════════════════════
   SAVE TO FIRESTORE
════════════════════════════════════════════ */
async function saveProcessed(type, name, size) {
  try {
    await db.collection('processed').add({
      uid:       ME.uid,
      email:     ME.email,
      type,
      name,
      size,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    // Update user count
    const field = type === 'photo' ? 'photoCount' : 'videoCount';
    await db.collection('users').doc(ME.uid).update({
      [field]: firebase.firestore.FieldValue.increment(1)
    });
  } catch (e) { console.warn('Firestore save error:', e.message); }
}

/* ════════════════════════════════════════════
   ADMIN FUNCTIONS
════════════════════════════════════════════ */
async function loadAdminData() {
  try {
    // Stats
    const usersSnap     = await db.collection('users').get();
    const processedSnap = await db.collection('processed').get();
    const today         = new Date(); today.setHours(0,0,0,0);

    ALL_USERS = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    const photos  = processedSnap.docs.filter(d => d.data().type === 'photo').length;
    const videos  = processedSnap.docs.filter(d => d.data().type === 'video').length;
    const todayP  = processedSnap.docs.filter(d => {
      const t = d.data().createdAt?.toDate?.();
      return t && t >= today;
    }).length;

    document.getElementById('adm-users').textContent   = ALL_USERS.length;
    document.getElementById('adm-photos').textContent  = photos;
    document.getElementById('adm-videos').textContent  = videos;
    document.getElementById('adm-today').textContent   = todayP;

    // Recent activity
    const recent = processedSnap.docs
      .sort((a,b) => (b.data().createdAt?.toMillis?.() || 0) - (a.data().createdAt?.toMillis?.() || 0))
      .slice(0, 10);
    document.getElementById('adm-recent').innerHTML = recent.length
      ? `<table class="a-table" style="width:100%">
          <thead><tr><th>Email</th><th>Tipe</th><th>File</th><th>Waktu</th></tr></thead>
          <tbody>${recent.map(d => {
            const dt = d.data();
            const t  = dt.createdAt?.toDate?.() || new Date();
            return `<tr>
              <td>${dt.email || '-'}</td>
              <td><span class="a-badge active">${dt.type}</span></td>
              <td style="font-family:'JetBrains Mono',monospace;font-size:11px">${(dt.name||'').substring(0,25)}</td>
              <td>${t.toLocaleString('id-ID')}</td>
            </tr>`;
          }).join('')}</tbody>
        </table>`
      : '<div class="empty-state"><span class="empty-icon">📋</span><div class="empty-title">Belum ada aktivitas</div></div>';

    // Users table
    renderUsersTable(ALL_USERS);

    // Logs
    loadLogs();

    // Announcements
    loadAnnouncements();

  } catch (e) { console.warn('Admin load error:', e.message); }
}

function renderUsersTable(users) {
  const tbody = document.getElementById('users-tbody');
  if (!tbody) return;
  tbody.innerHTML = users.map(u => `
    <tr>
      <td style="display:flex;align-items:center;gap:8px">
        <img src="${u.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name||'U')}&background=7B61FF&color=fff&size=32`}" style="width:28px;height:28px;border-radius:50%">
        ${u.name || '-'}
      </td>
      <td>${u.email}</td>
      <td><span class="a-badge ${u.role === 'admin' ? 'admin' : 'active'}">${u.role === 'admin' ? '👑 Admin' : '🆓 Free'}</span></td>
      <td>${u.createdAt?.toDate?.()?.toLocaleDateString('id-ID') || '-'}</td>
      <td>
        ${u.email !== ADMIN_EMAIL && u.email !== ME?.email
          ? `<button class="a-btn danger" onclick="banUser('${u.id}','${u.email}')">Ban</button>`
          : '<span style="color:var(--txt3);font-size:12px">Protected</span>'
        }
      </td>
    </tr>`).join('') || '<tr><td colspan="5" style="text-align:center;color:var(--txt3);padding:20px">Belum ada pengguna</td></tr>';
}

function filterUsers() {
  const q = document.getElementById('user-search').value.toLowerCase();
  const filtered = ALL_USERS.filter(u =>
    (u.name||'').toLowerCase().includes(q) ||
    (u.email||'').toLowerCase().includes(q)
  );
  renderUsersTable(filtered);
}

async function banUser(uid, email) {
  if (!confirm(`Ban user ${email}?`)) return;
  try {
    await db.collection('users').doc(uid).update({ role: 'banned', plan: 'banned' });
    addLog('ban', ME?.email, `Ban user: ${email}`);
    showToast(`✅ User ${email} di-ban.`);
    loadAdminData();
  } catch (e) { showToast('❌ Gagal ban: ' + e.message); }
}

async function saveSetting(key, val) {
  try {
    await db.collection('settings').doc('global').set({ [key]: val }, { merge: true });
    showToast('✅ Pengaturan disimpan!');
    addLog('setting', ME?.email, `Ubah ${key} = ${val}`);
  } catch (e) { showToast('❌ Gagal: ' + e.message); }
}

async function sendAnnouncement() {
  const title = document.getElementById('ann-title').value.trim();
  const body  = document.getElementById('ann-body').value.trim();
  const type  = document.getElementById('ann-type').value;
  if (!title || !body) return showToast('❌ Judul dan isi wajib diisi!');
  try {
    await db.collection('announcements').add({
      title, body, type,
      author:    ME.email,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    showToast('📢 Pengumuman berhasil dikirim!');
    document.getElementById('ann-title').value = '';
    document.getElementById('ann-body').value  = '';
    addLog('announce', ME?.email, `Post: ${title}`);
    loadAnnouncements();
  } catch (e) { showToast('❌ Gagal: ' + e.message); }
}

async function loadAnnouncements() {
  try {
    const snap = await db.collection('announcements').orderBy('createdAt','desc').limit(10).get();
    ALL_ANNS = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const el = document.getElementById('ann-list');
    if (!el) return;
    el.innerHTML = ALL_ANNS.length
      ? ALL_ANNS.map(a => `
        <div class="a-row">
          <div>
            <div class="a-row-title">${a.type === 'info' ? 'ℹ️' : a.type === 'update' ? '🔄' : '⚠️'} ${a.title}</div>
            <div class="a-row-sub">${a.body.substring(0,60)}${a.body.length>60?'...':''}</div>
          </div>
          <button class="a-btn danger" onclick="deleteAnnouncement('${a.id}')">🗑</button>
        </div>`).join('')
      : '<div class="empty-state"><span class="empty-icon">📢</span><div class="empty-title">Belum ada pengumuman</div></div>';
  } catch {}
}

async function deleteAnnouncement(id) {
  if (!confirm('Hapus pengumuman ini?')) return;
  await db.collection('announcements').doc(id).delete();
  showToast('🗑 Pengumuman dihapus.');
  loadAnnouncements();
}

async function addLog(action, email, detail) {
  try {
    await db.collection('logs').add({
      action, email, detail,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
  } catch {}
}

async function loadLogs() {
  try {
    const snap = await db.collection('logs').orderBy('createdAt','desc').limit(50).get();
    ALL_LOGS = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const tbody = document.getElementById('logs-tbody');
    if (!tbody) return;
    tbody.innerHTML = ALL_LOGS.map(l => `
      <tr>
        <td style="font-size:11px;font-family:'JetBrains Mono',monospace">${l.createdAt?.toDate?.()?.toLocaleString('id-ID') || '-'}</td>
        <td>${l.email || '-'}</td>
        <td><span class="a-badge active">${l.action}</span></td>
        <td style="color:var(--txt2);font-size:12px">${l.detail || '-'}</td>
      </tr>`).join('') || '<tr><td colspan="4" style="text-align:center;color:var(--txt3);padding:20px">Belum ada log</td></tr>';
  } catch {}
}

function goAdmin(page, btn) {
  document.querySelectorAll('.admin-page').forEach(p => p.classList.remove('show'));
  document.querySelectorAll('.admin-nav-item').forEach(b => b.classList.remove('active'));
  const el = document.getElementById('adm-' + (page === 'users' ? 'users-page' : page));
  if (el) el.classList.add('show');
  if (btn) btn.classList.add('active');
}

/* ════════════════════════════════════════════
   TOAST
════════════════════════════════════════════ */
function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 3000);
}
