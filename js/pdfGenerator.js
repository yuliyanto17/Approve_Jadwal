// PDF Generator - Generate PDF using jsPDF
const PDFGenerator = {
    /**
     * Generate PDF
     * @param {Array} data - Data jadwal shift
     * @param {Object} filters - Filter yang diterapkan
     * @param {Object} selectedApprovals - Object approval yang dipilih
     * @param {Object} pejabatData - Data pejabat
     * @param {Boolean} returnBlob - Jika true, return blob tanpa download
     * @returns {Object|void} - Jika returnBlob=true, return { blob, fileName }
     */
    async generate(data, filters, selectedApprovals, pejabatData, returnBlob = false) {
        try {
            
            console.log('Selected approvals:', selectedApprovals);
            console.log('Pejabat Data:', pejabatData);
            // ✅ PASTIKAN shift duration sudah ter-load
            if (!DataService.cache.shiftDuration) {
                console.log('📡 Loading shift duration for PDF...');
                await DataService.loadShiftDuration();
            }


            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: 'legal'
            });

            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const margin = 10;

            // Header
            this.addHeader(doc, filters.ruangan, filters.bulan, pageWidth, margin);

            // Table
            await this.addTable(doc, data, filters, margin, pageWidth);

            // Approval section
            await this.addApprovalSection(doc, selectedApprovals, pejabatData, pageWidth, pageHeight, margin);

            // Generate filename
            const fileName = `Jadwal_Shift_${filters.ruangan}_${filters.bulan}.pdf`;
            
            // ✅ Support returnBlob parameter
            if (returnBlob) {
                // Return blob untuk upload, jangan download
                const blob = doc.output('blob');
                console.log('✅ PDF blob generated:', fileName);
                return {
                    blob: blob,
                    fileName: fileName
                };
            }

            // Default behavior: Download PDF
            doc.save(fileName);
            console.log('✅ PDF downloaded:', fileName);

            // ✅ REMOVED: Tidak ada upload & save di sini!
            // modal.js yang akan handle upload & save
            
        } catch (error) {
            console.error('PDF Generation Error:', error);
            throw error;
        }
    },

    /**
     * ✅ UPDATED: Regenerate PDF dengan DataService
     * Dipanggil saat Kepala Bagian atau Kepala HRD approve
     */
    async regenerate(approvalRecord, role) {
        try {
            console.log('🔄 Regenerating PDF with updated approvals...');
            console.log('Approval record:', approvalRecord);
            console.log('Approving role:', role);

            // ✅ STEP 1: Ensure data loaded
            console.log('📡 Ensuring data is loaded...');
            if (!DataService.cache.jadwalShift || !DataService.cache.kabagMapping) {
                console.log('Loading data from spreadsheets...');
                await DataService.loadAllData();
            }

            // ✅ STEP 2: Fetch jadwal data
            console.log('📡 Fetching jadwal data...');
            const jadwalData = DataService.transformShiftData(
                DataService.cache.jadwalShift,
                {
                    ruangan: approvalRecord.Departemen,
                    bulan: approvalRecord.Bulan
                }
            );

            if (!jadwalData || jadwalData.length === 0) {
                throw new Error('Jadwal data tidak ditemukan untuk ' + approvalRecord.Departemen + ' - ' + approvalRecord.Bulan);
            }

            console.log('✅ Jadwal data loaded:', jadwalData.length, 'records');

            // ✅ STEP 3: Get pejabat data
            console.log('📋 Getting pejabat data...');
            const pejabatData = DataService.getPejabatByRuangan(approvalRecord.Departemen);

            if (!pejabatData) {
                console.error('❌ Pejabat not found!');
                console.error('Looking for:', approvalRecord.Departemen);
                console.error('Available:', DataService.cache.kabagMapping?.map(r => r.Departemen));
                throw new Error('Data pejabat tidak ditemukan untuk ruangan "' + approvalRecord.Departemen + '"');
            }

            console.log('✅ Pejabat data loaded');

            // ✅ STEP 4: Build selected approvals object based on current status
            const selectedApprovals = {
                kepalaRuangan: approvalRecord.Kepala_Ruangan === 'Approved',
                kabagKeperawatan: approvalRecord.Kepala_Bagian === 'Approved' || role === 'Kepala_Bagian',
                kepalaHRD: approvalRecord.Kepala_HRD === 'Approved' || role === 'Kepala_HRD'
            };

            console.log('📋 Selected approvals:', selectedApprovals);

            // ✅ STEP 5: Generate PDF
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: 'legal'
            });

            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const margin = 10;

            // Header
            this.addHeader(doc, approvalRecord.Departemen, approvalRecord.Bulan, pageWidth, margin);

            // Table
            const filters = {
                ruangan: approvalRecord.Departemen,
                bulan: approvalRecord.Bulan,
                tglDari: 1,
                tglSampai: DataService.getDaysInMonth(approvalRecord.Bulan)
            };

            await this.addTable(doc, jadwalData, filters, margin, pageWidth);

            // Approval section with updated signatures
            await this.addApprovalSection(doc, selectedApprovals, pejabatData, pageWidth, pageHeight, margin);

            console.log('✅ PDF regenerated successfully');
            return doc;

        } catch (error) {
            console.error('❌ Error regenerating PDF:', error);
            throw error;
        }
    },

    /**
     * Add header ke PDF
     */
    addHeader(doc, ruangan, bulan, pageWidth, margin) {
        doc.setFontSize(16);
        doc.setFont(undefined, 'bold');
        doc.text('JADWAL SHIFT KARYAWAN', pageWidth / 2, margin + 5, { align: 'center' });

        doc.setFontSize(12);
        doc.setFont(undefined, 'normal');
        doc.text(ruangan, pageWidth / 2, margin + 12, { align: 'center' });
        doc.text(bulan, pageWidth / 2, margin + 18, { align: 'center' });

        doc.setLineWidth(0.5);
        doc.line(margin, margin + 22, pageWidth - margin, margin + 22);
    },

    /**
     * Add tabel jadwal
     */
    async addTable(doc, data, filters, margin, pageWidth) {
        const bulan = data[0]['Bulan'];
        const daysInMonth = DataService.getDaysInMonth(bulan);
        const tglDari = filters.tglDari || 1;
        const tglSampai = Math.min(filters.tglSampai || daysInMonth, daysInMonth);

        const columns = [
            { header: 'Nama', dataKey: 'Nama' },
            { header: 'NIP', dataKey: 'NIP' }
        ];

        for (let day = 1; day <= daysInMonth; day++) {
            columns.push({ 
                header: day.toString(), 
                dataKey: `day_${day}` 
            });
        }

        columns.push({ header: 'Jadwal', dataKey: 'totalJadwal' });
        columns.push({ header: 'Libur', dataKey: 'totalLibur' });
        columns.push({ header: 'Jam Kerja', dataKey: 'totalJamKerja' });

        const tableData = data.map(row => {
            const rowData = {
                Nama: row['Nama'],
                NIP: row['NIP']
            };

            let totalJadwal = 0;
            let totalLibur = 0;
            let totalJamKerja = 0;

            for (let day = 1; day <= daysInMonth; day++) {
                const isInRange = day >= tglDari && day <= tglSampai;
                const shift = isInRange ? (row[day.toString()] || '') : '';
                rowData[`day_${day}`] = shift;

                if (isInRange && shift) {
                    const shiftCode = shift.toString().trim().toUpperCase();

                    if (shiftCode === 'L' || shiftCode === '#' || shiftCode === 'OFF') {
                        totalLibur++;
                    }
                    else if (!shiftCode.startsWith('C')) {
                        totalJadwal++;

                        // ✅ PAKAI SHIFT CODE PENUH (P1, P2, S5, dst)
                        const durasi = DataService.cache.shiftDuration?.[shiftCode] || 0;
                        totalJamKerja += durasi;
                    }

                }                
                
            }

            rowData.totalJadwal = totalJadwal;
            rowData.totalLibur = totalLibur;
            rowData.totalJamKerja = totalJamKerja;

            return rowData;
        });

        doc.autoTable({
            startY: margin + 25,
            head: [columns.map(col => col.header)],
            body: tableData.map(row => columns.map(col => row[col.dataKey])),
            theme: 'grid',
            styles: {
                fontSize: 6,
                cellPadding: 1,
                overflow: 'linebreak',
                halign: 'center'
            },
            headStyles: {
                fillColor: [46, 125, 50],
                textColor: 255,
                fontStyle: 'bold',
                halign: 'center',
                fontSize: 6
            },
            columnStyles: {
                0: { cellWidth: 30, fontStyle: 'bold', halign: 'left' },
                1: { cellWidth: 22, fontSize: 5 },
                [columns.length - 3]: { cellWidth: 12, halign: 'center', fontStyle: 'bold', fontSize: 6 },
                [columns.length - 2]: { cellWidth: 12, halign: 'center', fontStyle: 'bold', fontSize: 6 },
                [columns.length - 1]: { cellWidth: 14, halign: 'center', fontStyle: 'bold', fontSize: 6 }
            },

            didParseCell: (data) => {
                const isShiftColumn =
                    data.column.index > 1 &&
                    data.column.index < columns.length - 2;
            
                if (data.section === 'body' && isShiftColumn) {
                    const cellValue = data.cell.raw;
            
                    if (typeof cellValue === 'string' && cellValue.trim() !== '') {
                        const color = this.getShiftColorRGB(cellValue);
                        data.cell.styles.fillColor = color;
                    }
            
                    data.cell.styles.fontSize = 5;
                }
            
                // Kolom total
                if (
                    data.section === 'body' &&
                    (data.column.index === columns.length - 2 ||
                     data.column.index === columns.length - 1)
                ) {
                    data.cell.styles.fillColor = [245, 245, 245];
                    data.cell.styles.fontStyle = 'bold';
                }
            },
            margin: { left: margin, right: margin }
        });

        this.addLegend(doc, margin);
    },

    /**
     * Add legend keterangan shift
     */
    addLegend(doc, margin) {
        const finalY = doc.lastAutoTable.finalY + 5;
    
        doc.setFontSize(9);
        doc.setFont(undefined, 'bold');
        doc.text('Keterangan Shift:', margin, finalY);
    
        doc.setFontSize(8);
        doc.setFont(undefined, 'normal');
    
        const legends = [
            { code: 'P', desc: 'Shift Pagi', color: [200, 230, 201] },
            { code: 'S', desc: 'Shift Sore', color: [255, 249, 196] },
            { code: 'M', desc: 'Shift Malam', color: [187, 222, 251] },
            { code: 'C', desc: 'Cuti', color: [255, 224, 178] },
            { code: 'L', desc: 'Libur', color: [238, 238, 238] }
        ];
    
        const yPos = finalY + 6;
        let xPos = margin;
        const spacing = 20;
    
        legends.forEach((legend) => {
            doc.setFillColor(...legend.color);
            doc.rect(xPos, yPos - 3, 4, 4, 'F');
            doc.text(`${legend.code} - ${legend.desc}`, xPos + 6, yPos);
            xPos += spacing + (legend.desc.length * 1.8);
        });
    },

    /**
     * Add approval section
     */
    async addApprovalSection(doc, selectedApprovals, pejabatData, pageWidth, pageHeight, margin) {
        const finalY = doc.lastAutoTable.finalY + 30;
        
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text('Mengetahui & Menyetujui:', margin, finalY);

        const approvals = [
            {
                title: 'Kepala Ruangan',
                nama: pejabatData.kepalaRuangan?.nama || '-',
                ttdUrl: pejabatData.kepalaRuangan?.ttdUrl || '',
                isChecked: selectedApprovals.kepalaRuangan
            },
            {
                title: 'Kepala Bagian',
                nama: pejabatData.kabagKeperawatan?.nama || '-',
                ttdUrl: pejabatData.kabagKeperawatan?.ttdUrl || '',
                isChecked: selectedApprovals.kabagKeperawatan
            },
            {
                title: 'Kepala HRD',
                nama: pejabatData.kepalaHRD?.nama || '-',
                ttdUrl: pejabatData.kepalaHRD?.ttdUrl || '',
                isChecked: selectedApprovals.kepalaHRD
            }
        ];

        const approvalWidth = (pageWidth - 2 * margin) / approvals.length;
        let xPos = margin;

        const today = DataService.formatDate();

        for (let approval of approvals) {
            const centerX = xPos + approvalWidth / 2;

            doc.setFontSize(9);
            doc.setFont(undefined, 'bold');
            doc.text(approval.title, centerX, finalY + 8, { align: 'center' });

            const signY = finalY + 12;

            if (approval.isChecked && approval.ttdUrl && approval.ttdUrl.trim() !== '') {
                try {
                    const img = await this.loadImage(approval.ttdUrl);
                    const imgWidth = 30;
                    const imgHeight = 15;
                    doc.addImage(img, 'PNG', centerX - imgWidth/2, signY, imgWidth, imgHeight);
                } catch (error) {
                    console.warn('Failed to load signature image:', error);
                    doc.setFontSize(7);
                    doc.setFont(undefined, 'italic');
                    doc.text('(TTD gagal dimuat)', centerX, signY + 10, { align: 'center' });
                }
            } else {
                doc.setFontSize(7);
                doc.setFont(undefined, 'italic');
                doc.text('(TTD belum tersedia)', centerX, signY + 10, { align: 'center' });
            }

            doc.setFontSize(9);
            doc.setFont(undefined, 'normal');
            doc.text(`(${approval.nama})`, centerX, signY + 20, { align: 'center' });

            doc.setFontSize(8);
            doc.text(`Tgl: ${today}`, centerX, signY + 25, { align: 'center' });

            xPos += approvalWidth;
        }
    },

    /**
     * Load image dari URL
     */
    loadImage(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = url;
        });
    },

    /**
     * Get RGB color untuk shift code
     */
    getShiftColorRGB(shiftCode) {
        const hexColor = this.getShiftColorHex(shiftCode);
        return this.hexToRGB(hexColor);
    },

    /**
     * Get hex color untuk shift code
     */
    getShiftColorHex(shiftCode) {
        // ✅ jika bukan string, langsung putih
        if (!shiftCode || typeof shiftCode !== 'string') {
            return '#FFFFFF';
        }
    
        if (CONFIG.SHIFT_COLORS[shiftCode]) {
            return CONFIG.SHIFT_COLORS[shiftCode];
        }
    
        const prefix = shiftCode.charAt(0);
        if (CONFIG.SHIFT_COLORS[prefix]) {
            return CONFIG.SHIFT_COLORS[prefix];
        }
    
        return '#FFFFFF';
    },

    /**
     * Convert hex color ke RGB array
     */
    hexToRGB(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? [
            parseInt(result[1], 16),
            parseInt(result[2], 16),
            parseInt(result[3], 16)
        ] : [255, 255, 255];
    }
};