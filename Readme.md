# 🦊 KitsuneBG v67 — Panduan Setup Lengkap

Website remove background foto & video dengan Admin Panel.

---

## 📁 File yang Ada
```
KitsuneBG/
├── index.html   ← Halaman utama website
├── app.js       ← Semua logika (Firebase, proses, admin)
└── README.md    ← Panduan ini
```

---

## 🔥 STEP 1 — Buat Project Firebase (GRATIS)

### 1.1 Buka Firebase Console
1. Buka: **https://console.firebase.google.com**
2. Klik tombol **"Create a project"**
3. Isi nama project: `KitsuneBG`
4. Klik **Continue** → matikan Google Analytics → **Create project**
5. Tunggu selesai → klik **Continue**

---

### 1.2 Aktifkan Authentication (Login)
1. Di menu kiri, klik **Build** → **Authentication**
2. Klik tombol **Get started**
3. Pilih tab **Sign-in method**
4. Klik **Google** → aktifkan toggle → isi email support → **Save**
5. Klik **Email/Password** → aktifkan toggle atas → **Save**
6. Klik tab **Settings** → klik **Authorized domains**
7. Tambahkan domain:
   - `localhost` ← untuk test di komputer
   - `127.0.0.1` ← untuk Live Server VS Code
   - `namakamu.github.io` ← kalau pakai GitHub Pages

---

### 1.3 Buat Firestore Database
1. Di menu kiri, klik **Build** → **Firestore Database**
2. Klik **Create database**
3. Pilih **Start in test mode** → klik **Next**
4. Pilih region: **asia-southeast1 (Singapore)** → klik **Enable**
5. Tunggu sampai database siap

---

### 1.4 Atur Security Rules Firestore
1. Di Firestore, klik tab **Rules**
2. **Hapus semua** yang ada, lalu **paste** rules berikut:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    match /users/{userId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && request.auth.uid == userId;
      allow update: if request.auth != null && request.auth.uid == userId;
    }

    match /processed/{docId} {
      allow read: if request.auth != null && request.auth.token.email == "kitsunelucky18@gmail.com";
      allow create: if request.auth != null;
    }

    match /settings/{docId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.token.email == "kitsunelucky18@gmail.com";
    }

    match /announcements/{docId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.token.email == "kitsunelucky18@gmail.com";
    }

    match /logs/{docId} {
      allow read: if request.auth != null && request.auth.token.email == "kitsunelucky18@gmail.com";
      allow create: if request.auth != null;
    }
  }
}
```

3. Klik tombol **Publish**
4. Tunggu muncul tulisan "Rules published"

---

### 1.5 Ambil Config Firebase
1. Klik ikon **⚙️** (roda gigi) di samping "Project Overview"
2. Klik **Project settings**
3. Scroll ke bawah sampai bagian **Your apps**
4. Klik ikon **</>** (Web)
5. Isi **App nickname**: `KitsuneBG` → klik **Register app**
6. Kamu akan melihat kode seperti ini:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "kitsunebg-xxxxx.firebaseapp.com",
  projectId: "kitsunebg-xxxxx",
  storageBucket: "kitsunebg-xxxxx.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

7. **Copy semua nilai** tersebut (yang ada di dalam tanda kutip)

---

## ✏️ STEP 2 — Edit File app.js

1. Buka file `app.js` dengan **Notepad** atau VS Code
2. Cari bagian paling atas (sekitar baris 10-20):

```javascript
const FIREBASE_CONFIG = {
  apiKey:            "ISIAKAN_API_KEY",
  authDomain:        "ISIAKAN_AUTH_DOMAIN",
  projectId:         "ISIAKAN_PROJECT_ID",
  storageBucket:     "ISIAKAN_STORAGE_BUCKET",
  messagingSenderId: "ISIAKAN_SENDER_ID",
  appId:             "ISIAKAN_APP_ID"
};
```

3. Ganti setiap `"ISIAKAN_..."` dengan nilai dari Firebase kamu.

**Contoh setelah diisi:**
```javascript
const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyBxxxxxxxxxxxxxxxxxxxxx",
  authDomain:        "kitsunebg-12345.firebaseapp.com",
  projectId:         "kitsunebg-12345",
  storageBucket:     "kitsunebg-12345.appspot.com",
  messagingSenderId: "987654321",
  appId:             "1:987654321:web:abcdef123456"
};
```

4. **Save** file (Ctrl+S)

---

## 💻 STEP 3 — Buka Website di Komputer (Localhost)

### Cara Termudah — Pakai VS Code + Live Server:

**A. Install VS Code** (kalau belum punya):
- Download di: **https://code.visualstudio.com**
- Install seperti biasa

**B. Install Extension Live Server:**
1. Buka VS Code
2. Tekan **Ctrl+Shift+X** (buka Extensions)
3. Cari: `Live Server`
4. Klik **Install** pada yang dibuat oleh Ritwick Dey

**C. Buka website:**
1. Di VS Code, klik **File → Open Folder**
2. Pilih folder `KitsuneBG`
3. Di panel kiri, klik kanan file `index.html`
4. Klik **"Open with Live Server"**
5. Browser otomatis terbuka di `http://127.0.0.1:5500`

✅ **Website langsung bisa dipakai!**

---

### Cara Lain — Pakai Python (kalau sudah install Python):
```bash
# Buka terminal/command prompt di folder KitsuneBG
# Lalu ketik salah satu perintah berikut:

python -m http.server 8000
# Buka browser: http://localhost:8000

# Atau kalau Python 2:
python -m SimpleHTTPServer 8000
```

**Apa itu `python -m http.server 8000`?**
- `python` = menjalankan program Python
- `-m http.server` = pakai modul built-in untuk buat web server mini
- `8000` = nomor port (alamat akses: localhost:8000)
- Ini GRATIS dan tidak perlu install apapun selain Python

---

## 🐙 STEP 4 — Upload ke GitHub Pages (Online Gratis)

### 4.1 Buat Repository GitHub
1. Buka **https://github.com** → Login
2. Klik **"New repository"** (tombol hijau atau ikon +)
3. Nama repository: `KitsuneBG`
4. Pilih **Public**
5. Klik **"Create repository"**

### 4.2 Upload File
1. Di halaman repository yang baru dibuat
2. Klik **"uploading an existing file"**
3. **Drag & drop** ketiga file: `index.html`, `app.js`, `README.md`
4. Scroll ke bawah → klik **"Commit changes"**

### 4.3 Aktifkan GitHub Pages
1. Klik tab **Settings** di repository
2. Di menu kiri, klik **Pages**
3. Di bagian **Source**, pilih:
   - Branch: **main**
   - Folder: **/ (root)**
4. Klik **Save**
5. Tunggu 1-3 menit
6. Website live di: `https://usernamekamu.github.io/KitsuneBG`

---

## ✅ Fitur Lengkap

| Fitur | Keterangan |
|-------|-----------|
| 🔐 Signup | Daftar dengan email atau Google |
| 🔑 Login | Login dengan email atau Google |
| 🖼️ Remove BG Foto | Support JPG, PNG, WebP, HEIC max **100MB** |
| 🎬 Remove BG Video | Support MP4, MOV, AVI, WebM max **2GB** |
| 🎨 Custom Background | Transparan, warna solid, gradien |
| ⬇ Download | Download hasil PNG/JPG/WebP |
| 📋 Copy Clipboard | Copy gambar hasil langsung |
| 📁 Riwayat | Riwayat semua file yang diproses |
| 👤 Akun | Lihat info dan statistik akun |
| 👑 Admin Panel | Khusus kitsunelucky18@gmail.com |
| 📊 Dashboard Admin | Statistik pengguna dan file |
| 👥 Manajemen User | Lihat dan ban pengguna |
| ⚙️ Pengaturan | Atur batas file, toggle fitur |
| 📢 Pengumuman | Kirim pengumuman ke semua user |
| 📋 Activity Log | Log semua aktivitas website |

---

## 👑 Akun Admin

Email `kitsunelucky18@gmail.com` otomatis mendapat:
- Akses ke **Admin Panel** (muncul di menu dropdown)
- Melihat statistik semua pengguna
- Mengelola pengguna (ban, lihat detail)
- Mengubah pengaturan website
- Melihat semua file yang diproses
- Mengirim pengumuman
- Melihat activity log

---

## ❓ FAQ

**Q: Website tidak bisa dibuka di browser langsung (double-click)?**
A: Harus pakai web server (Live Server atau Python). Firebase tidak bisa jalan tanpa server.

**Q: Muncul error CORS atau Firebase?**
A: Pastikan domain sudah ditambahkan di Firebase Auth → Authorized Domains.

**Q: Login Google gagal?**
A: Pastikan domain `localhost` atau `127.0.0.1` sudah ada di Authorized Domains.

**Q: Background tidak terhapus sempurna?**
A: Versi ini menggunakan algoritma client-side (demo). Untuk hasil profesional, perlu integrasi API seperti Remove.bg atau Rembg.

---

*🦊 KitsuneBG v67 • by Kitsune_Lucky18 • youtube.com/@Kitsune_Lucky18*