const UIController = {
    currentData: [],
    currentFilters: {},
  
    async init() {
      try {
        this.showLoading(true)
  
        // Setup sidebar toggle
        this.setupSidebarToggle()
  
        // Load data
        await DataService.loadAllData()
  
        // Populate filters
        this.populateFilters()
  
        // Setup event listeners
        this.setupEventListeners()
  
        // Load initial data
        this.applyFilters()
  
        this.showLoading(false)
      } catch (error) {
        console.error("Initialization error:", error)
        this.showError("Gagal memuat data. Silakan refresh halaman.")
      }
    },

    async hitungTotalJamRow(row, daysInMonth, tglDari, tglSampai) {
      const shiftDuration = await DataService.loadShiftDuration()
      let totalJam = 0
    
      for (let day = 1; day <= daysInMonth; day++) {
        if (day < tglDari || day > tglSampai) continue
    
        const kodeShift = row[day.toString()]
        if (!kodeShift || kodeShift === '#' || kodeShift.toUpperCase() === 'L') continue
    
        const durasi = shiftDuration[kodeShift] || 0
        totalJam += durasi
      }
    
      return totalJam
    },
    

  /**
   * Setup sidebar toggle for mobile
   */
  setupSidebarToggle() {
    const sidebar = document.querySelector(".sidebar")
    const toggleOpen = document.getElementById("sidebarToggleOpen")
    const toggleClose = document.getElementById("sidebarToggleClose")

    if (toggleOpen) {
      toggleOpen.addEventListener("click", () => {
        sidebar.classList.add("active")
        document.body.style.overflow = "hidden"
      })
    }

    if (toggleClose) {
      toggleClose.addEventListener("click", () => {
        sidebar.classList.remove("active")
        document.body.style.overflow = ""
      })
    }

    // Close sidebar when clicking on main content
    document.addEventListener("click", (e) => {
      if (window.innerWidth <= 768) {
        if (!sidebar.contains(e.target) && !toggleOpen?.contains(e.target)) {
          sidebar.classList.remove("active")
          document.body.style.overflow = ""
        }
      }
    })
  },

  /**
   * Populate dropdown filters
   */
  populateFilters() {
    const data = DataService.cache.jadwalShift

    // Ruangan dropdown
    const ruanganSelect = document.getElementById("filterRuangan")
    const ruanganList = DataService.getUniqueValues(data, "Ruangan")
    ruanganList.forEach((ruangan) => {
      const option = document.createElement("option")
      option.value = ruangan
      option.textContent = ruangan
      ruanganSelect.appendChild(option)
    })

    // Bulan dropdown
    const bulanSelect = document.getElementById("filterBulan")
    const bulanList = DataService.getUniqueValues(data, "Bulan")
    bulanList.forEach((bulan) => {
      const option = document.createElement("option")
      option.value = bulan
      option.textContent = bulan
      bulanSelect.appendChild(option)
    })
  },

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Filter button
    document.getElementById("btnFilter").addEventListener("click", () => {
      this.applyFilters()
    })

    // Print PDF button
    document.getElementById("btnPrint").addEventListener("click", () => {
      this.openApprovalModal()
    })

    // Real-time search
    document
      .getElementById("filterNama")
      .addEventListener("input", (e) => {
        this.applyFilters()
      })

    // Enter key on inputs
    ;["filterNama", "filterTglDari", "filterTglSampai"].forEach((id) => {
      document.getElementById(id).addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          this.applyFilters()
        }
      })
    })
  },

  /**
   * Apply filters dan render tabel
   */
  async applyFilters() {
    const ruangan = document.getElementById("filterRuangan").value
    const bulan = document.getElementById("filterBulan").value
    const nama = document.getElementById("filterNama").value
    const tglDari = Number.parseInt(document.getElementById("filterTglDari").value) || 1
    const tglSampai = Number.parseInt(document.getElementById("filterTglSampai").value) || 31

    this.currentFilters = {
      ruangan,
      bulan,
      nama,
      tglDari,
      tglSampai,
    }

    // Transform data
    const filters = {}
    if (ruangan) filters.ruangan = ruangan
    if (bulan) filters.bulan = bulan
    if (nama) filters.nama = nama

    this.currentData = DataService.transformShiftData(DataService.cache.jadwalShift, filters)

    // Render tabel
    await this.renderTable()
  },

  /**
   * Render tabel jadwal
   */
  async renderTable() {
    const container = document.getElementById("tableContainer")

    if (this.currentData.length === 0) {
      container.innerHTML = '<div class="no-data">Tidak ada data yang sesuai dengan filter</div>'
      return
    }

    const shiftDurationMap = await DataService.loadShiftDuration()

    // Get bulan untuk menentukan jumlah hari
    const bulan = this.currentData[0]["Bulan"]
    const daysInMonth = DataService.getDaysInMonth(bulan)
    const tglDari = this.currentFilters.tglDari || 1
    const tglSampai = Math.min(this.currentFilters.tglSampai || daysInMonth, daysInMonth)

    // Buat tabel
    let html = '<div class="table-wrapper"><table class="shift-table">'

    // Header
    html += "<thead><tr>"
    html += '<th class="sticky-col">Nama Karyawan</th>'
    html += '<th class="sticky-col-2">NIP</th>'
    html += "<th>Bulan</th>"

    // Kolom tanggal
    for (let day = 1; day <= daysInMonth; day++) {
      html += `<th>${day}</th>`
    }

    // Kolom total
    html += "<th>Total Jadwal</th>"
    html += "<th>Total Libur</th>"
    html += "<th>Total Jam Kerja</th>"
    html += "</tr></thead>"

    // Body
    html += "<tbody>"
    this.currentData.forEach((row) => {
      let totalJadwal = 0
      let totalLibur = 0
      let totalJamKerja = 0

      html += "<tr>"
      html += `<td class="sticky-col">${row["Nama"]}</td>`
      html += `<td class="sticky-col-2">${row["NIP"]}</td>`
      html += `<td>${row["Bulan"]}</td>`

      // Data shift per tanggal

      for (let day = 1; day <= daysInMonth; day++) {
        const shift = row[day.toString()] || ""
        const isInRange = day >= tglDari && day <= tglSampai
        const displayShift = isInRange ? shift : ""
        const bgColor = displayShift ? this.getShiftColor(displayShift) : ""
      
        html += `<td style="background-color: ${bgColor};">${displayShift}</td>`
      
        if (isInRange && displayShift) {
          const kode = displayShift.toUpperCase()
      
          if (kode === "#" || kode.startsWith("L") || kode === "OFF") {
            totalLibur++
          }
          else if (kode.startsWith("C")) {
            // cuti → tidak dihitung jam
          }
          else {
            totalJadwal++
            totalJamKerja += shiftDurationMap[kode] || 0
          }
        }
      }
      

      // Total columns
      html += `<td style="background-color: var(--grey-light); font-weight: 600;">${totalJadwal}</td>`
      html += `<td style="background-color: var(--grey-light); font-weight: 600;">${totalLibur}</td>`
      html += `<td style="background-color: var(--primary-light); font-weight: 700;">${totalJamKerja} Jam</td>`
      html += "</tr>"
    })
    html += "</tbody>"

    html += "</table></div>"

    // Add legend
    html += this.getLegendHTML()

    container.innerHTML = html
  },

  /**
   * Get HTML for legend
   */
  getLegendHTML() {
    return `
            <div style="margin-top: 20px; padding: 15px; background: var(--grey-light); border-radius: 8px;">
                <strong style="color: var(--primary);">Keterangan Shift:</strong>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; margin-top: 10px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="display: inline-block; width: 20px; height: 20px; background: #C8E6C9; border: 1px solid #ddd; border-radius: 3px;"></span>
                        <span><strong>P</strong> - Shift Pagi</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="display: inline-block; width: 20px; height: 20px; background: #FFF9C4; border: 1px solid #ddd; border-radius: 3px;"></span>
                        <span><strong>S</strong> - Shift Sore</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="display: inline-block; width: 20px; height: 20px; background: #BBDEFB; border: 1px solid #ddd; border-radius: 3px;"></span>
                        <span><strong>M</strong> - Shift Malam</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="display: inline-block; width: 20px; height: 20px; background: #FFE0B2; border: 1px solid #ddd; border-radius: 3px;"></span>
                        <span><strong>C</strong> - Cuti</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="display: inline-block; width: 20px; height: 20px; background: #EEEEEE; border: 1px solid #ddd; border-radius: 3px;"></span>
                        <span><strong>L</strong> - Libur</span>
                    </div>
                </div>
            </div>
        `
  },

  /**
   * Get color untuk shift code
   */
  getShiftColor(shiftCode) {
    // Check exact match first
    if (CONFIG.SHIFT_COLORS[shiftCode]) {
      return CONFIG.SHIFT_COLORS[shiftCode]
    }

    // Check prefix (P, S, M, C)
    const prefix = shiftCode.charAt(0)
    if (CONFIG.SHIFT_COLORS[prefix]) {
      return CONFIG.SHIFT_COLORS[prefix]
    }

    return "#FFFFFF" // Default white
  },

  /**
   * Open approval modal
   */
  openApprovalModal() {
    if (this.currentData.length === 0) {
      alert("Tidak ada data untuk dicetak. Silakan pilih filter terlebih dahulu.")
      return
    }

    if (!this.currentFilters.ruangan || !this.currentFilters.bulan) {
      alert("Silakan pilih Ruangan dan Bulan terlebih dahulu.")
      return
    }

    ModalController.open(this.currentFilters.ruangan, this.currentFilters.bulan)
  },

  /**
   * Show/hide loading
   */
  showLoading(show) {
    const loader = document.getElementById("loader")
    if (loader) {
      loader.style.display = show ? "flex" : "none"
    }
  },

  /**
   * Show error message
   */
  showError(message) {
    alert(message)
    this.showLoading(false)
  },
}

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  UIController.init()
})
