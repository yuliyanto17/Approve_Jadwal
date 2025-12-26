// Modal Controller - Handle approval modal
const ModalController = {
    pejabatData: null,
    selectedApprovals: {
        kepalaRuangan: false,
        kabagKeperawatan: false,
        kepalaHRD: false
    },

    /**
     * Open modal dengan data ruangan
     */
    async open(ruangan, bulan) {
        this.resetApprovals();
        
        // Get pejabat data
        this.pejabatData = await DataService.getPejabatByRuangan(ruangan);
        console.log("Pejabat Data:", this.pejabatData);

        if (!this.pejabatData) {
            alert('Data pejabat untuk ruangan ini tidak ditemukan.');
            return;
        }

        // Populate modal
        document.getElementById('modalRuangan').textContent = ruangan;
        document.getElementById('modalBulan').textContent = bulan;

        // Kepala Ruangan
        this.setupApprovalItem(
            'kepalaRuangan',
            this.pejabatData.kepalaRuangan.nama,
            this.pejabatData.kepalaRuangan.ttdUrl
        );

        // Kabag Keperawatan
        this.setupApprovalItem(
            'kabagKeperawatan',
            this.pejabatData.kabagKeperawatan.nama,
            this.pejabatData.kabagKeperawatan.ttdUrl
        );

        // Kepala HRD
        this.setupApprovalItem(
            'kepalaHRD',
            this.pejabatData.kepalaHRD.nama,
            this.pejabatData.kepalaHRD.ttdUrl
        );

        // Reset selections
        this.selectedApprovals = {
            kepalaRuangan: false,
            kabagKeperawatan: false,
            kepalaHRD: false
        };

        // Show modal
        document.getElementById('approvalModal').style.display = 'flex';
    },

    /**
     * Setup individual approval item
     */
    setupApprovalItem(id, nama, ttdUrl) {
        const checkbox = document.getElementById(`check_${id}`);
        const namaEl = document.getElementById(`nama_${id}`);
        const ttdContainer = document.getElementById(`ttd_${id}`);
    
        checkbox.checked = false;
        namaEl.textContent = nama;
    
        // Hanya tampilkan placeholder dulu, gambar muncul setelah checkbox dicentang
        ttdContainer.innerHTML = '<div class="signature-placeholder">TTD belum tersedia</div>';
    },

    /**
     * Tampilkan / sembunyikan tanda tangan berdasarkan checkbox
     */
    toggleSignature(role, isChecked) {
        const container = document.getElementById(`ttd_${role}`);
        if (!container) return;

        // Ambil data pejabat sesuai role
        const pejabat = this.pejabatData[role];

        if (isChecked) {
            // Jika ada URL TTD, tampilkan gambarnya
            if (pejabat && pejabat.ttdUrl) {
                container.innerHTML = `
                    <img src="${pejabat.ttdUrl}" 
                         alt="TTD ${pejabat.nama}" 
                         class="signature-preview" 
                         onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                    <div class="signature-placeholder" style="display:none;">TTD belum tersedia</div>
                `;
            } else {
                container.innerHTML = `<div class="signature-placeholder">TTD tidak ditemukan</div>`;
            }
        } else {
            // Jika tidak dicentang, tampilkan placeholder
            container.innerHTML = `<div class="signature-placeholder">TTD belum tersedia</div>`;
        }
    },

    /**
     * Reset semua tanda tangan dan checkbox (termasuk hapus gambar TTD)
     */
    resetApprovals() {
        // Reset checkbox
        ['check_kepalaRuangan', 'check_kabagKeperawatan', 'check_kepalaHRD'].forEach(id => {
            const checkbox = document.getElementById(id);
            if (checkbox) checkbox.checked = false;
        });

        // Reset tanda tangan (hapus gambar dan tampilkan placeholder)
        ['ttd_kepalaRuangan', 'ttd_kabagKeperawatan', 'ttd_kepalaHRD'].forEach(id => {
            const container = document.getElementById(id);
            if (container) {
                container.innerHTML = '<div class="signature-placeholder">TTD belum tersedia</div>';
            }
        });

        // Reset data internal
        this.selectedApprovals = {
            kepalaRuangan: false,
            kabagKeperawatan: false,
            kepalaHRD: false
        };
    },

    /**
     * Close modal
     */
    close() {
        const modal = document.getElementById('approvalModal');
        if (modal) {
            modal.style.display = 'none';
        }

        // Reset di sini
        this.resetApprovals();
    },

    /**
     * Generate PDF dengan approval yang dipilih + Upload ke Drive
     */
    async generatePDF() {
        // Get selected approvals
        this.selectedApprovals = {
            kepalaRuangan: document.getElementById('check_kepalaRuangan').checked,
            kabagKeperawatan: document.getElementById('check_kabagKeperawatan').checked,
            kepalaHRD: document.getElementById('check_kepalaHRD').checked
        };
    
        // Validasi: minimal 1 approval
        const hasApproval = Object.values(this.selectedApprovals).some(v => v === true);
        if (!hasApproval) {
            alert('Pilih minimal 1 pejabat yang menyetujui.');
            return;
        }
    
        UIController.showLoading(true);
    
        try {
            console.log("STEP 1: Generate final PDF (blob)...");
            
            // 🔥 generate() sekarang mengembalikan { blob, fileName }
            const pdfData = await PDFGenerator.generate(
                UIController.currentData,
                UIController.currentFilters,
                this.selectedApprovals,
                this.pejabatData,
                true   // → TRUE berarti return blob (bukan download)
            );
    
            console.log("PDF ready for upload:", pdfData.fileName);
    
            // Upload PDF ke Google Drive
            console.log("STEP 2: Uploading PDF...");
            const currentYear = new Date().getFullYear();
    
            const pdfUrl = await ApprovalService.uploadPDF(
                pdfData.blob,
                pdfData.fileName,
                UIController.currentFilters.ruangan,
                UIController.currentFilters.bulan,
                currentYear.toString()
            );
    
            console.log("PDF uploaded:", pdfUrl);
    
            // Save approval record ke spreadsheet
            console.log("STEP 3: Saving approval record...");
            await ApprovalService.saveApprovalRecord({
                departemen: UIController.currentFilters.ruangan,
                bulan: UIController.currentFilters.bulan,
                tahun: currentYear.toString(),
                kepalaRuangan: this.selectedApprovals.kepalaRuangan ? 'Approved' : 'Pending',
                kabag: this.selectedApprovals.kabagKeperawatan ? 'Approved' : 'Pending',
                hrd: this.selectedApprovals.kepalaHRD ? 'Approved' : 'Pending',
                pdfUrl
            });
    
            console.log("STEP 4: Download PDF for user...");
            await PDFGenerator.generate(
                UIController.currentData,
                UIController.currentFilters,
                this.selectedApprovals,
                this.pejabatData,
                false  // → FALSE berarti download PDF ke user
            );
    
            alert('✅ PDF berhasil di-upload dan approval tersimpan!');
    
            this.close();
    
        } catch (error) {
            console.error("ERROR:", error);
            alert("❌ Gagal generate/upload PDF. " + error.message);
        } finally {
            UIController.showLoading(false);
        }
    }
};

// Setup modal event listeners when DOM ready
document.addEventListener('DOMContentLoaded', () => {
    // Close button
    document.getElementById('btnModalClose').addEventListener('click', () => {
        ModalController.close();
    });

    // Cancel button
    document.getElementById('btnModalCancel').addEventListener('click', () => {
        ModalController.close();
    });

    // Generate button
    document.getElementById('btnModalGenerate').addEventListener('click', () => {
        ModalController.generatePDF();
    });

    // Close on background click
    document.getElementById('approvalModal').addEventListener('click', (e) => {
        if (e.target.id === 'approvalModal') {
            ModalController.close();
        }
    });

    // Checkbox event handlers
    document.getElementById('check_kepalaRuangan').addEventListener('change', (e) => {
        ModalController.toggleSignature('kepalaRuangan', e.target.checked);
    });

    document.getElementById('check_kabagKeperawatan').addEventListener('change', (e) => {
        ModalController.toggleSignature('kabagKeperawatan', e.target.checked);
    });

    document.getElementById('check_kepalaHRD').addEventListener('change', (e) => {
        ModalController.toggleSignature('kepalaHRD', e.target.checked);
    });
});