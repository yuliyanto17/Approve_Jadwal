document.addEventListener("DOMContentLoaded", () => {
  // --- Sidebar Behaviour ---
  const sidebarToggleBtns = document.querySelectorAll(".sidebar-toggle");
  const sidebar = document.querySelector(".sidebar");

  if (sidebar) {
    sidebarToggleBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        sidebar.classList.toggle("collapsed");
      });
    });

    // Expand sidebar automatically on desktop
    if (window.innerWidth > 768) {
      sidebar.classList.remove("collapsed");
    }
  }

  // --- Logout Modal Logic ---
  const logoutBtn = document.querySelector(".logout-button");
  const logoutModal = document.getElementById("logoutModal");
  const cancelLogout = document.getElementById("cancelLogout");
  const confirmLogout = document.getElementById("confirmLogout");

  // ✅ Pastikan modal disembunyikan saat halaman dimuat
  if (logoutModal) {
    logoutModal.style.display = "none";
  }

  // Buka modal saat tombol logout diklik
  if (logoutBtn && logoutModal) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault(); // Cegah default behavior jika tombol dalam <a> atau form
      logoutModal.style.display = "flex";
    });
  }

  // Tutup modal saat "Batal" diklik
  if (cancelLogout && logoutModal) {
    cancelLogout.addEventListener("click", () => {
      logoutModal.style.display = "none";
    });
  }

  // Logout saat dikonfirmasi
  // Logout saat dikonfirmasi — dengan loading overlay
if (confirmLogout && logoutModal) {
  confirmLogout.addEventListener("click", () => {
    // Sembunyikan modal logout
    logoutModal.style.display = "none";

    // Buat overlay loading secara dinamis
    const loadingOverlay = document.createElement("div");
    loadingOverlay.id = "logoutLoadingOverlay";
    loadingOverlay.style.cssText = `
      position: fixed;
      top: 0; left: 0;
      width: 100%; height: 100%;
      background: rgba(255, 255, 255, 0.92);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 18px;
      color: #333;
    `;
    loadingOverlay.innerHTML = `
      <div style="text-align: center;">
        <div style="
          width: 40px; height: 40px;
          border: 4px solid #f0f0f0;
          border-top: 4px solid #3498db;
          border-radius: 50%;
          animation: logout-spin 0.8s linear infinite;
          margin: 0 auto 16px;
        "></div>
        Logging out...
      </div>
    `;

    // Tambahkan animasi CSS jika belum ada
    if (!document.getElementById("logout-spin-style")) {
      const style = document.createElement("style");
      style.id = "logout-spin-style";
      style.textContent = `
        @keyframes logout-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `;
      document.head.appendChild(style);
    }

    // Tambahkan ke body
    document.body.appendChild(loadingOverlay);

    // Hapus data login
    localStorage.removeItem("loggedUser");
    localStorage.removeItem("role");

    // Redirect setelah loading terlihat (opsional: 300ms)
    setTimeout(() => {
      window.location.href = "login.html";
    }, 300);
  });
}

  // Tutup modal saat klik di luar konten modal
  if (logoutModal) {
    window.addEventListener("click", (event) => {
      if (event.target === logoutModal) {
        logoutModal.style.display = "none";
      }
    });
  }
});