// loginController.js (rapih & robust)

// Show / Hide Password
function showPassword() { document.getElementById('pwd').type = 'text'; }
function hidePassword() { document.getElementById('pwd').type = 'password'; }

let pwShown = 0;
const eye = document.getElementById("eye");
if (eye) {
  eye.addEventListener("click", function () {
    if (pwShown === 0) { pwShown = 1; showPassword(); }
    else { pwShown = 0; hidePassword(); }
  });
}

// --- Global user cache ---
let users = [];

// Fetch user list from Apps Script endpoint on load
async function loadUsers() {
  try {
    const resp = await fetch('https://script.google.com/macros/s/AKfycbxH7mYTWSsQTWZ83UTd81euAnPPvYr_7A7nbOafARtb6Royo7sqinD7C6KNlKZ2btc_/exec?action=getUserRole');
    const json = await resp.json();
    if (json && json.status === 'success' && Array.isArray(json.data)) {
      users = json.data;
      console.log('User list:', users);
    } else {
      console.warn('Gagal load users:', json);
      users = [];
    }
  } catch (err) {
    console.error('Error loadUsers:', err);
    users = [];
  }
}

// Call loadUsers saat halaman siap
document.addEventListener('DOMContentLoaded', () => {
  loadUsers();

  // Attach submit handler to the form or button
  const form = document.querySelector('form');
  const btn = document.getElementById('btnLogin');

  // If you use <button type="submit"> inside a form, prevent default submit
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      handleLogin();
    });
  }

  if (btn) {
    btn.addEventListener('click', (e) => {
      // If button is inside form with type=submit, previous handler already prevents default.
      e.preventDefault();
      handleLogin();
    });
  }
});

function handleLogin() {
  const usernameInput = document.getElementById('txt-input'); // sesuai login.html
  const pwdInput = document.getElementById('pwd');

  if (!usernameInput || !pwdInput) {
    alert('Elemen form tidak ditemukan (cek id input).');
    return;
  }

  const username = usernameInput.value.trim();
  const password = pwdInput.value;

  if (!username || !password) {
    alert('Silakan isi username dan password.');
    return;
  }

  // Cari user berdasarkan nama (case-insensitive)
  const user = users.find(u => {
    if (!u || typeof u.nama === 'undefined') return false;
    return String(u.nama).trim().toLowerCase() === username.toLowerCase();
  });

  if (!user) {
    alert('User tidak ditemukan. Periksa username Anda.');
    return;
  }

  // Cocokkan password — convert both to string untuk menghindari perbedaan tipe (angka vs string)
  if (String(user.password).trim() !== String(password).trim()) {
    alert('Password salah. Periksa kembali.');
    return;
  }

  // Login sukses -> simpan info user di localStorage
  const loggedUser = {
    nama: String(user.nama).trim(),
    role: String(user.role).trim()
  };

  localStorage.setItem('loggedUser', JSON.stringify(loggedUser));
  // Simpan juga key 'role' karena kode approvalController sebelumnya membaca localStorage.getItem('role')
  localStorage.setItem('role', loggedUser.role);

  // Reset form (kosongkan dan hide password)
  usernameInput.value = '';
  pwdInput.value = '';
  hidePassword();
  pwShown = 0;

  // Arahkan ke halaman utama (ubah sesuai rute kamu: index.html atau approve.html)
  // Sebelumnya kamu menyebut pergi ke index.html — ganti jika mau ke approve.html
  smoothRedirect('index.html');
}

/**
 * Redirect ke URL tujuan dengan animasi fade-out smooth
 * @param {string} url - URL tujuan (misal: 'index.html')
 */
function smoothRedirect(url) {
    // Buat atau ambil overlay transisi
    let overlay = document.getElementById('pageTransition');
    
    if (!overlay) {
      // Jika belum ada, buat secara dinamis
      overlay = document.createElement('div');
      overlay.id = 'pageTransition';
      overlay.style.cssText = `
        position: fixed;
        top: 0; left: 0;
        width: 100%; height: 100%;
        background: white; /* Sesuaikan dengan background login Anda */
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.4s ease;
        z-index: 9999;
      `;
      document.body.appendChild(overlay);
    }
  
    // Trigger fade-out
    requestAnimationFrame(() => {
      overlay.style.opacity = '1';
      overlay.style.pointerEvents = 'auto';
      
      setTimeout(() => {
        window.location.href = url;
      }, 400); // Harus = durasi CSS transition (0.4s)
    });
  }
