// Approval Service - Handle approval data and Google Apps Script API calls
const ApprovalService = {
    // URL Google Apps Script Web App
    APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbxH7mYTWSsQTWZ83UTd81euAnPPvYr_7A7nbOafARtb6Royo7sqinD7C6KNlKZ2btc_/exec',

    cache: {
        approvalList: null
    },

    /**
     * Fetch approval list dari Google Apps Script
     */
    async fetchApprovalList() {
        try {
            const response = await fetch(`${this.APPS_SCRIPT_URL}?action=getApprovalList`);
            const data = await response.json();
            
            if (data.status === 'success') {
                this.cache.approvalList = data.data;
                return data.data;
            } else {
                throw new Error(data.message || 'Failed to fetch approval list');
            }
        } catch (error) {
            console.error('Error fetching approval list:', error);
            throw error;
        }
    },

    /**
     * ✅ NEW: Get jadwal data for regenerating PDF
     */
    async getJadwalData(departemen, bulan, tahun) {
        try {
            console.log('📡 Fetching jadwal data from Apps Script...');
            console.log('Params:', { departemen, bulan, tahun });

            const response = await fetch(`${this.APPS_SCRIPT_URL}?action=getJadwalData&departemen=${encodeURIComponent(departemen)}&bulan=${encodeURIComponent(bulan)}&tahun=${encodeURIComponent(tahun)}`);
            const data = await response.json();
            
            if (data.status === 'success') {
                console.log('✅ Jadwal data received:', data.data.length, 'records');
                return data.data;
            } else {
                throw new Error(data.message || 'Failed to fetch jadwal data');
            }
        } catch (error) {
            console.error('Error fetching jadwal data:', error);
            throw error;
        }
    },

    /**
     * Save approval record ke spreadsheet
     */
    async saveApprovalRecord(approvalData) {
        try {
            const response = await fetch(this.APPS_SCRIPT_URL, {
                method: 'POST',
                body: JSON.stringify({
                    action: 'saveApproval',
                    data: approvalData
                })
            });

            const result = await response.json();
            
            if (result.status === 'success') {
                return result;
            } else {
                throw new Error(result.message || 'Failed to save approval');
            }
        } catch (error) {
            console.error('Error saving approval:', error);
            throw error;
        }
    },

    /**
     * Upload PDF to Google Drive
     */
    async uploadPDF(pdfBlob, fileName, departemen, bulan, tahun) {
        try {
            // Convert blob to base64
            const base64 = await this.blobToBase64(pdfBlob);

            const response = await fetch(this.APPS_SCRIPT_URL, {
                method: 'POST',
                body: JSON.stringify({
                    action: 'uploadPDF',
                    fileName: fileName,
                    fileContent: base64,
                    departemen: departemen,
                    bulan: bulan,
                    tahun: tahun
                })
            });

            const result = await response.json();
            
            if (result.status === 'success') {
                return result.pdfUrl;
            } else {
                throw new Error(result.message || 'Failed to upload PDF');
            }
        } catch (error) {
            console.error('Error uploading PDF:', error);
            throw error;
        }
    },

    /**
     * Update approval status (Kabag atau HRD approve)
     * ✅ ENHANCED: Sekarang juga regenerate PDF dan update URL
     */
    async updateApprovalStatus(id, role, status, newPdfUrl) {
        try {
    
            // Ambil role user login dari LocalStorage
            let loggedRole = localStorage.getItem("role");
    
            // Jika role belum ada, cek object loggedUser
            if (!loggedRole) {
                const userData = localStorage.getItem("loggedUser");
                if (userData) {
                    loggedRole = JSON.parse(userData).role;
                }
            }
    
            // Jika tetap tidak ada role, hentikan proses
            if (!loggedRole) {
                throw new Error("Role user tidak ditemukan. Silakan login ulang.");
            }
    
            // Mapping untuk mencocokkan format Apps Script
            const roleMap = {
                "Kepala Ruangan": "Kepala_Ruangan",
                "Kepala Bagian": "Kepala_Bagian",
                "Kepala HRD": "Kepala_HRD",
                "Kepala_Ruangan": "Kepala_Ruangan",
                "Kepala_Bagian": "Kepala_Bagian",
                "Kepala_HRD": "Kepala_HRD"
            };
    
            // Role yang dipilih di dropdown
            const approvalRole = roleMap[role] ?? role;
            
            // Role user login yang menyetujui
            const normalizedLoggedRole = roleMap[loggedRole] ?? loggedRole;
    
    
            // 🔥 Data yang dikirim ke Google Apps Script
            const requestData = {
                action: 'updateApprovalStatus',
                id: id,
                role: approvalRole,
                status: status,
                userRole: normalizedLoggedRole  // << WAJIB ADA
            };
    
            // Tambahkan PDF URL kalau ada
            if (newPdfUrl) {
                requestData.pdfUrl = newPdfUrl;
            }
    
            const response = await fetch(this.APPS_SCRIPT_URL, {
                method: 'POST',
                body: JSON.stringify(requestData)
            });
    
            const result = await response.json();
    
            if (result.status === 'success') {
                return result;
            } else {
                throw new Error(result.message || 'Failed to update status');
            }
    
        } catch (error) {
            console.error('Error updating status:', error);
            throw error;
        }
    },
    

    /**
     * Convert Blob to Base64
     */
    blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64 = reader.result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    },

    /**
     * Filter approval data
     */
    filterApprovalData(data, filters) {
        let filtered = [...data];

        if (filters.bulan) {
            filtered = filtered.filter(row => row.Bulan === filters.bulan);
        }

        if (filters.tahun) {
            filtered = filtered.filter(row => row.Tahun === filters.tahun);
        }

        if (filters.status) {
            filtered = filtered.filter(row => 
                row.Kepala_Ruangan === filters.status ||
                row.Kepala_Bagian === filters.status ||
                row.Kepala_HRD === filters.status
            );
        }

        if (filters.search) {
            const searchTerm = filters.search.toLowerCase();
            filtered = filtered.filter(row =>
                row.Departemen.toLowerCase().includes(searchTerm)
            );
        }

        return filtered;
    },

    /**
     * Get unique values for filters
     */
    getUniqueMonths(data) {
        return [...new Set(data.map(row => row.Bulan))].filter(v => v).sort();
    },

    getUniqueYears(data) {
        return [...new Set(data.map(row => row.Tahun))].filter(v => v).sort();
    }
};