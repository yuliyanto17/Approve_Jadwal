// Data Service - Handle fetching and transforming data
window.DataService = {
    // Cache untuk data
    cache: {
        jadwalShift: null,
        kabagMapping: null
    },

    /**
     * Fetch CSV data dari URL dan convert ke array of objects
     */
    async fetchCSV(url) {
        try {
            const response = await fetch(url, { mode: 'cors' });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const csvText = await response.text();
            return this.parseCSV(csvText);
        } catch (error) {
            console.error('Error fetching CSV:', error);
            throw new Error('Gagal mengambil data dari spreadsheet');
        }
    },
    

    /**
     * Parse CSV text menjadi array of objects
     */
    parseCSV(csvText) {
        const lines = csvText.split('\n').filter(line => line.trim());
        if (lines.length === 0) return [];

        const headers = lines[0].split(',').map(h => h.trim());
        const data = [];

        for (let i = 1; i < lines.length; i++) {
            const values = this.parseCSVLine(lines[i]);
            if (values.length === headers.length) {
                const obj = {};
                headers.forEach((header, index) => {
                    obj[header] = values[index].trim();
                });
                data.push(obj);
            }
        }

        return data;
    },

    /**
     * Parse single CSV line (handling quoted values)
     */
    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current);
        
        return result;
    },

    /**
     * Load semua data dari spreadsheet
     */
    async loadAllData() {
        try {
            console.log('📡 Loading data from spreadsheets...');
            
            // Fetch kedua spreadsheet secara parallel
            const [jadwalShift, kabagMapping] = await Promise.all([
                this.fetchCSV(CONFIG.SPREADSHEET.JADWAL_SHIFT),
                this.fetchCSV(CONFIG.SPREADSHEET.KABAG_MAPPING)
            ]);

            this.cache.jadwalShift = jadwalShift;
            this.cache.kabagMapping = kabagMapping;

            console.log('✅ Data loaded:');
            console.log('  - Jadwal Shift:', jadwalShift.length, 'rows');
            console.log('  - Kabag Mapping:', kabagMapping.length, 'rows');

            return {
                jadwalShift,
                kabagMapping
            };
        } catch (error) {
            console.error('Error loading data:', error);
            throw error;
        }
    },
    

    /**
     * Get unique values dari kolom tertentu
     */
    getUniqueValues(data, column) {
        const values = [...new Set(data.map(row => row[column]))];
        return values.filter(v => v).sort();
    },

    /**
     * Transform data jadwal shift dari format vertical ke horizontal
     * Input: Array of {Ruangan, Nama Karyawan, NIP, Bulan, Tanggal, Kode Shift}
     * Output: Array of {Nama, NIP, Bulan, '1': 'P1', '2': '#', ...}
     */
    transformShiftData(rawData, filters = {}) {
        // Filter data berdasarkan kriteria
        let filteredData = rawData;

        if (filters.ruangan) {
            filteredData = filteredData.filter(row => 
                row['Ruangan'] === filters.ruangan
            );
        }

        if (filters.bulan) {
            filteredData = filteredData.filter(row => 
                row['Bulan'] === filters.bulan
            );
        }

        if (filters.nama) {
            const searchTerm = filters.nama.toLowerCase();
            filteredData = filteredData.filter(row => 
                row['Nama Karyawan'].toLowerCase().includes(searchTerm)
            );
        }

        console.log('📊 Transforming shift data...');
        console.log('  Filtered rows:', filteredData.length);

        // Group by Nama Karyawan + NIP + Bulan
        const grouped = {};

        filteredData.forEach(row => {
            const key = `${row['Nama Karyawan']}_${row['NIP']}_${row['Bulan']}`;
            
            if (!grouped[key]) {
                grouped[key] = {
                    'Nama': row['Nama Karyawan'],
                    'NIP': row['NIP'],
                    'Bulan': row['Bulan'],
                    'Ruangan': row['Ruangan']
                };
                
                // Initialize all days 1-31
                for (let day = 1; day <= 31; day++) {
                    grouped[key][day.toString()] = '';
                }
            }

            // Extract tanggal dari format "MM/DD/YYYY" atau "M/D/YYYY"
            const tanggal = row['Tanggal'];
            let day = null;
            
            if (tanggal) {
                const tanggalParts = tanggal.toString().split('/');
                if (tanggalParts.length >= 2) {
                    // Format MM/DD/YYYY → day = parts[1]
                    day = parseInt(tanggalParts[1]);
                }
            }
            
            if (!isNaN(day) && day >= 1 && day <= 31) {
                grouped[key][day.toString()] = row['Kode Shift'] || '';
            }
        });

        const result = Object.values(grouped);
        console.log('✅ Transformed to', result.length, 'karyawan');
        
        return result;
    },

    /**
     * ✅ UPDATED: Get pejabat by ruangan with better error handling
     * Expected columns: Departemen, DIVISI, Karu, Kabag, PSDM, ttd Karu, ttd Kabag, ttd PSDM
     */
    getPejabatByRuangan(ruangan) {
        if (!this.cache.kabagMapping) {
            console.error('❌ kabagMapping cache is null');
            return null;
        }
        
        console.log('🔍 Looking for pejabat:', ruangan);
        console.log('Available departemen:', this.cache.kabagMapping.map(r => r['Departemen']));
    
        // Try exact match first
        let pejabat = this.cache.kabagMapping.find(row =>
            row['Departemen'] === ruangan
        );
        
        // If not found, try case-insensitive
        if (!pejabat) {
            pejabat = this.cache.kabagMapping.find(row =>
                row['Departemen']?.toLowerCase() === ruangan.toLowerCase()
            );
        }
        
        // If still not found, try trimmed
        if (!pejabat) {
            pejabat = this.cache.kabagMapping.find(row =>
                row['Departemen']?.trim() === ruangan.trim()
            );
        }
    
        if (!pejabat) {
            console.error('❌ Pejabat not found for:', ruangan);
            return null;
        }
        
        console.log('✅ Found pejabat:', pejabat);
    
        return {
            kepalaRuangan: {
                nama: pejabat['Karu'] || '',
                ttdUrl: pejabat['ttd Karu'] || ''
            },
            kabagKeperawatan: {
                nama: pejabat['Kabag'] || '',
                ttdUrl: pejabat['ttd Kabag'] || ''
            },
            kepalaHRD: {
                nama: pejabat['PSDM'] || '',
                ttdUrl: pejabat['ttd PSDM'] || ''
            }
        };
    },
    

    /**
     * Get days in month
     */
    getDaysInMonth(bulan) {
        return CONFIG.DAYS_IN_MONTH[bulan] || 31;
    },

    /**
     * Format tanggal Indonesia
     */
    formatDate(date = new Date()) {
        const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
                       'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
        
        return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
    }
};