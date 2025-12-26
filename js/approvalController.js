// Approval Controller - Handle approve.html page
const ApprovalController = {
    currentData: [],
    currentFilters: {},
    currentRecord: null,
    lastFetchTime: 0,
    minFetchInterval: 2000,

    /**
     * Initialize approve page
     */
    async init() {
        try {
            this.showLoading(true);
            await this.loadApprovalData();
            this.populateFilters();
            this.setupEventListeners();
            this.renderTable();
            this.showLoading(false);
        } catch (error) {
            console.error('Initialization error:', error);
            this.showError('Gagal memuat data. Silakan refresh halaman.');
        }
    },

    /**
     * Load approval data from service with rate limiting
     */
    async loadApprovalData(forceRefresh = false) {
        try {
            const now = Date.now();
            const timeSinceLastFetch = now - this.lastFetchTime;
            
            if (!forceRefresh && timeSinceLastFetch < this.minFetchInterval) {
                console.log('⏳ Rate limit: using cached data');
                return;
            }
            
            console.log('📡 Fetching approval data from server...');
            this.currentData = await ApprovalService.fetchApprovalList();
            this.lastFetchTime = now;
            
            console.log('✅ Approval data loaded:', this.currentData.length, 'records');
        } catch (error) {
            console.error('Error loading approval data:', error);
            
            if (error.message.includes('429') || error.message.includes('Too Many Requests')) {
                alert('⚠️ Terlalu banyak request. Silakan tunggu beberapa saat.');
                this.currentData = [];
            } else {
                this.currentData = [];
            }
        }
    },

    /**
     * Populate filter dropdowns
     */
    populateFilters() {
        if (this.currentData.length === 0) return;

        const bulanSelect = document.getElementById('filterApprovalBulan');
        const bulanList = ApprovalService.getUniqueMonths(this.currentData);
        bulanList.forEach(bulan => {
            const option = document.createElement('option');
            option.value = bulan;
            option.textContent = bulan;
            bulanSelect.appendChild(option);
        });

        const tahunSelect = document.getElementById('filterApprovalTahun');
        const tahunList = ApprovalService.getUniqueYears(this.currentData);
        tahunList.forEach(tahun => {
            const option = document.createElement('option');
            option.value = tahun;
            option.textContent = tahun;
            tahunSelect.appendChild(option);
        });
    },

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        document.getElementById('btnApprovalFilter').addEventListener('click', () => {
            this.applyFilters();
        });

        document.getElementById('btnApprovalRefresh').addEventListener('click', async () => {
            await this.refreshData(true);
        });

        document.getElementById('filterApprovalSearch').addEventListener('input', () => {
            this.applyFilters();
        });

        document.getElementById('btnApprovalClose').addEventListener('click', () => {
            this.closeModal();
        });

        document.getElementById('btnApprovalCancel').addEventListener('click', () => {
            this.closeModal();
        });

        document.getElementById('btnApprovalSubmit').addEventListener('click', () => {
            this.submitApproval();
        });

        const loggedRole = localStorage.getItem("role");

        const roleSelect = document.getElementById("roleSelect");
        const submitBtn = document.getElementById("btnApprovalSubmit");

        let warning = document.getElementById("roleWarning");
        if (!warning) {
            warning = document.createElement("div");
            warning.id = "roleWarning";
            warning.style.color = "red";
            warning.style.marginTop = "10px";
            warning.style.fontWeight = "600";
            roleSelect.parentNode.appendChild(warning);
        }

        submitBtn.disabled = true;

        const roleMap = {
            "Kepala_Ruangan": "Kepala Ruangan",
            "Kabag": "Kepala Bagian",
            "HRD": "Kepala HRD"
        };

        roleSelect.addEventListener("change", () => {
            const selectedRoleRaw = roleSelect.value;
            const selectedRole = roleMap[selectedRoleRaw] || selectedRoleRaw;
            // Jika user belum memilih role
            if (!selectedRole) {
                submitBtn.disabled = true;
                warning.style.display = "none";
                return;
            }
        
            // Validasi role login dengan role yang dipilih
            if (selectedRole.trim().toLowerCase() === loggedRole.trim().toLowerCase()) {
                submitBtn.disabled = false;
                warning.style.display = "none";
            } else {
                submitBtn.disabled = true;
                warning.style.display = "block";
                warning.innerHTML = `❌ Role tidak sesuai.<br>Anda login sebagai <b>${loggedRole}</b>, bukan <b>${selectedRole}</b>.`;
            }
        });        
    },

        


    /**
     * Apply filters and render table
     */
    applyFilters() {
        const bulan = document.getElementById('filterApprovalBulan').value;
        const tahun = document.getElementById('filterApprovalTahun').value;
        const status = document.getElementById('filterApprovalStatus').value;
        const search = document.getElementById('filterApprovalSearch').value;

        this.currentFilters = {
            bulan,
            tahun,
            status,
            search
        };

        const filteredData = ApprovalService.filterApprovalData(
            this.currentData,
            this.currentFilters
        );

        this.renderTable(filteredData);
    },

    /**
     * Render approval table
     */
    renderTable(data = null) {
        const container = document.getElementById('approvalTableContainer');
        const displayData = data || this.currentData;

        if (displayData.length === 0) {
            container.innerHTML = '<div class="no-data">Tidak ada data approval</div>';
            return;
        }

        let html = '<div class="table-wrapper"><table class="shift-table">';

        html += '<thead><tr>';
        html += '<th>No</th>';
        html += '<th>Departemen</th>';
        html += '<th>Bulan</th>';
        html += '<th>Tahun</th>';
        html += '<th>Kepala Ruangan</th>';
        html += '<th>Kepala Bagian</th>';
        html += '<th>Kepala HRD</th>';
        html += '<th>Aksi</th>';
        html += '</tr></thead>';

        html += '<tbody>';
        displayData.forEach((row, index) => {
            html += '<tr>';
            html += `<td>${index + 1}</td>`;
            html += `<td class="col-dept">${row.Departemen}</td>`;
            html += `<td>${row.Bulan}</td>`;
            html += `<td>${row.Tahun}</td>`;
            html += `<td>${this.getStatusBadge(row.Kepala_Ruangan)}</td>`;
            html += `<td>${this.getStatusBadge(row.Kepala_Bagian)}</td>`;
            html += `<td>${this.getStatusBadge(row.Kepala_HRD)}</td>`;
            html += `<td>
                <div style="display: flex; gap: 5px; justify-content: center;">
                    ${row.PDF_URL ? `<a href="${row.PDF_URL}" target="_blank" class="btn-action btn-view" title="Lihat PDF">📄</a>` : ''}
                    <button class="btn-action btn-approve" onclick="ApprovalController.openApprovalModal('${row.id}')" title="Approve">✓</button>
                </div>
            </td>`;
            html += '</tr>';
        });
        html += '</tbody>';
        html += '</table></div>';

        container.innerHTML = html;
    },

    /**
     * Get status badge HTML
     */
    getStatusBadge(status) {
        if (status === 'Approved') {
            return '<span class="status-badge status-approved">✓ Approved</span>';
        } else if (status === 'Pending') {
            return '<span class="status-badge status-pending">⏳ Pending</span>';
        } else {
            return '<span class="status-badge status-unknown">-</span>';
        }
    },

    /**
     * Open approval modal
     */
    openApprovalModal(recordId) {
        this.currentRecord = this.currentData.find(r => r.id.toString() === recordId.toString());

        if (!this.currentRecord) {
            alert('Data tidak ditemukan');
            return;
        }

        document.getElementById('actionDepartemen').textContent = this.currentRecord.Departemen;
        document.getElementById('actionBulan').textContent = this.currentRecord.Bulan;
        document.getElementById('actionTahun').textContent = this.currentRecord.Tahun;

        const pdfLink = document.getElementById('viewPDFLink');
        if (this.currentRecord.PDF_URL) {
            pdfLink.href = this.currentRecord.PDF_URL;
            pdfLink.style.display = 'block';
        } else {
            pdfLink.style.display = 'none';
        }

        document.getElementById('roleSelect').value = '';
        document.getElementById("roleWarning").style.display = "none";
        document.getElementById("btnApprovalSubmit").disabled = true;
        document.getElementById('approvalActionModal').style.display = 'flex';
    },

    /**
     * Close modal
     */
    closeModal() {
        document.getElementById('approvalActionModal').style.display = 'none';
        this.currentRecord = null;
    },

    /**
 * ✅ WORKAROUND: Approve dengan PDF regeneration, skip spreadsheet auto-update
 */
async submitApproval() {
    const roleInput = document.getElementById('roleSelect').value;

    if (!roleInput) {
        alert('Silakan pilih role Anda');
        return;
    }

    if (!this.currentRecord) {
        alert('Data tidak ditemukan');
        return;
    }

    // Map role
    const roleMapping = {
        'Karu': 'Kepala_Ruangan',
        'Kabag': 'Kepala_Bagian',
        'PSDM': 'Kepala_HRD',
        'HRD': 'Kepala_HRD',
        'Kepala_Ruangan': 'Kepala_Ruangan',
        'Kepala_Bagian': 'Kepala_Bagian',
        'Kepala_HRD': 'Kepala_HRD',
        'Kepala Ruangan': 'Kepala_Ruangan',
        'Kepala Bagian': 'Kepala_Bagian',
        'Kepala HRD': 'Kepala_HRD'
    };

    const role = roleMapping[roleInput] || roleInput;
    
    console.log('📝 Role mapping:', roleInput, '→', role);

    // Validate
    if (role === 'Kepala_Bagian' && this.currentRecord.Kepala_Ruangan !== 'Approved') {
        alert('⚠️ Kepala Ruangan harus approve terlebih dahulu!');
        return;
    }

    if (role === 'Kepala_HRD' && this.currentRecord.Kepala_Bagian !== 'Approved') {
        alert('⚠️ Kepala Bagian harus approve terlebih dahulu!');
        return;
    }

    const roleNames = {
        'Kepala_Ruangan': 'Kepala Ruangan',
        'Kepala_Bagian': 'Kepala Bagian',
        'Kepala_HRD': 'Kepala HRD'
    };

    if (!confirm(`Anda yakin akan approve sebagai ${roleNames[role]}?\n\nPDF akan di-regenerate dengan tanda tangan Anda.`)) {
        return;
    }

    this.showLoading(true);

    try {
        console.log('🚀 Starting approval process for role:', role);

        // ✅ STEP 1: Load data
        if (!DataService.cache.jadwalShift || !DataService.cache.kabagMapping) {
            console.log('Loading data from spreadsheet...');
            await DataService.loadAllData();
        }
        
        const jadwalData = DataService.transformShiftData(
            DataService.cache.jadwalShift,
            {
                ruangan: this.currentRecord.Departemen,
                bulan: this.currentRecord.Bulan
            }
        );

        if (!jadwalData || jadwalData.length === 0) {
            throw new Error('Jadwal data tidak ditemukan');
        }

        console.log('✅ Jadwal data loaded:', jadwalData.length, 'records');

        // ✅ STEP 2: Get pejabat data
        const pejabatData = DataService.getPejabatByRuangan(this.currentRecord.Departemen);
        
        if (!pejabatData) {
            throw new Error('Data pejabat tidak ditemukan');
        }

        console.log('✅ Pejabat data loaded');

        // ✅ STEP 3: Build selected approvals
        const selectedApprovals = {
            kepalaRuangan: this.currentRecord.Kepala_Ruangan === 'Approved',
            kabagKeperawatan: this.currentRecord.Kepala_Bagian === 'Approved' || role === 'Kepala_Bagian',
            kepalaHRD: this.currentRecord.Kepala_HRD === 'Approved' || role === 'Kepala_HRD'
        };

        console.log('📋 Selected approvals:', selectedApprovals);

        // ✅ STEP 4: Generate PDF
        console.log('📄 Generating PDF with new signature...');
        
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'legal'
        });

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 10;

        PDFGenerator.addHeader(doc, this.currentRecord.Departemen, this.currentRecord.Bulan, pageWidth, margin);

        const filters = {
            ruangan: this.currentRecord.Departemen,
            bulan: this.currentRecord.Bulan,
            tglDari: 1,
            tglSampai: DataService.getDaysInMonth(this.currentRecord.Bulan)
        };

        await PDFGenerator.addTable(doc, jadwalData, filters, margin, pageWidth);
        await PDFGenerator.addApprovalSection(doc, selectedApprovals, pejabatData, pageWidth, pageHeight, margin);

        // ✅ STEP 5: Upload PDF
        const fileName = `Jadwal_Shift_${this.currentRecord.Departemen}_${this.currentRecord.Bulan}.pdf`;
        const pdfBlob = doc.output('blob');

        console.log('📤 Uploading updated PDF to Google Drive...');
        const pdfUrl = await ApprovalService.uploadPDF(
            pdfBlob,
            fileName,
            this.currentRecord.Departemen,
            this.currentRecord.Bulan,
            this.currentRecord.Tahun
        );

        console.log('✅ Updated PDF uploaded:', pdfUrl);

        // ✅ STEP 6: TRY to update spreadsheet (might fail)
        console.log('💾 Attempting to update spreadsheet...');
        
        try {
            await ApprovalService.updateApprovalStatus(
                this.currentRecord.id,
                role,
                'Approved',
                pdfUrl
            );
            console.log('✅ Spreadsheet updated successfully');
            
            alert('✅ Approval berhasil!\n\n' +
                  '📄 PDF telah di-update dengan tanda tangan Anda\n' +
                  '☁️ PDF telah tersimpan di Google Drive\n' +
                  '📊 Status approval telah diperbarui');

        } catch (spreadsheetError) {
            console.error('⚠️ Spreadsheet update failed:', spreadsheetError);
            
            // ✅ PDF sudah ter-update, tapi spreadsheet gagal
            alert('✅ PDF berhasil di-update!\n\n' +
                  '📄 PDF dengan tanda tangan Anda: ' + pdfUrl + '\n\n' +
                  '⚠️ PERHATIAN:\n' +
                  'Update spreadsheet gagal karena error teknis.\n\n' +
                  'Silakan update spreadsheet MANUAL:\n' +
                  '1. Buka spreadsheet approval\n' +
                  '2. Cari row: ' + this.currentRecord.Departemen + ' - ' + this.currentRecord.Bulan + '\n' +
                  '3. Update kolom "' + roleNames[role] + '" → "Approved"\n' +
                  '4. Update "PDF_URL" → ' + pdfUrl);
        }

        this.closeModal();

        setTimeout(async () => {
            await this.refreshData(true);
        }, 1000);

    } catch (error) {
        console.error('❌ Error submitting approval:', error);
        alert('❌ Gagal melakukan approval.\n\nError: ' + error.message);
    } finally {
        this.showLoading(false);
    }
},

    /**
     * Refresh approval data
     */
    async refreshData(forceRefresh = false) {
        this.showLoading(true);
        try {
            await this.loadApprovalData(forceRefresh);
            this.applyFilters();
        } catch (error) {
            console.error('Error refreshing data:', error);
            
            if (error.message && (error.message.includes('429') || error.message.includes('Too Many Requests'))) {
                alert('⚠️ Terlalu banyak request. Silakan tunggu beberapa saat dan coba lagi.');
            } else {
                alert('Gagal refresh data');
            }
        } finally {
            this.showLoading(false);
        }
    },

    /**
     * Show/hide loading
     */
    showLoading(show) {
        const loader = document.getElementById('loader');
        if (loader) {
            loader.style.display = show ? 'flex' : 'none';
        }
    },

    /**
     * Show error message
     */
    showError(message) {
        alert(message);
        this.showLoading(false);
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    ApprovalController.init();
});