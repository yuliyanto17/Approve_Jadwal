// Configuration file untuk Jadwal Shift Application
window.CONFIG = {
    API: {
        SHIFT_DURATION: "https://script.google.com/macros/s/AKfycbxH7mYTWSsQTWZ83UTd81euAnPPvYr_7A7nbOafARtb6Royo7sqinD7C6KNlKZ2btc_/exec?action=getMasterShift"
      },

    // URL Spreadsheet
    SPREADSHEET: {
        JADWAL_SHIFT: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSsZz2DI2v5lrF3r02BDJFduAa2PbMqVa4Rb_-vCfacrzyYXcvxZZGidO0lM8pVicL_vgjgh2aw7dg2/pub?gid=1638275873&single=true&output=csv',
        KABAG_MAPPING: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSsZz2DI2v5lrF3r02BDJFduAa2PbMqVa4Rb_-vCfacrzyYXcvxZZGidO0lM8pVicL_vgjgh2aw7dg2/pub?gid=285402215&single=true&output=csv'
    },

    // Color scheme untuk shift codes
    SHIFT_COLORS: {
        // Shift Pagi
        'P': '#C8E6C9',
        'P1': '#C8E6C9',
        'P2': '#C8E6C9',
        'P3': '#C8E6C9',
        
        // Shift Siang
        'S': '#FFF9C4',
        'S1': '#FFF9C4',
        'S2': '#FFF9C4',
        'S3': '#FFF9C4',
        
        // Shift Malam
        'M': '#BBDEFB',
        'M1': '#BBDEFB',
        'M2': '#BBDEFB',
        'M3': '#BBDEFB',
        
        // Libur
        '#': '#EEEEEE',
        'L': '#EEEEEE',
        'OFF': '#EEEEEE',
        'LIBUR': '#EEEEEE',

        // Cuti
        'C': '#FFE0B2',
        'C1': '#FFE0B2',
        'CUTI': '#FFE0B2'
    },

    // Theme colors
    THEME: {
        PRIMARY: '#2E7D32',
        PRIMARY_LIGHT: '#4CAF50',
        PRIMARY_LIGHTER: '#81C784',
        SECONDARY: '#FFFFFF',
        GREY_LIGHT: '#F5F5F5',
        GREY: '#E0E0E0',
        TEXT_DARK: '#212121',
        TEXT_LIGHT: '#757575'
    },

    // Nama bulan dalam Bahasa Indonesia
    MONTHS: {
        'January': 'Januari',
        'February': 'Februari',
        'March': 'Maret',
        'April': 'April',
        'May': 'Mei',
        'June': 'Juni',
        'July': 'Juli',
        'August': 'Agustus',
        'September': 'September',
        'October': 'Oktober',
        'November': 'November',
        'December': 'Desember'
    },

    // Days in month
    DAYS_IN_MONTH: {
        'January': 31, 'Januari': 31,
        'February': 28, 'Februari': 28,
        'March': 31, 'Maret': 31,
        'April': 30,
        'May': 31, 'Mei': 31,
        'June': 30, 'Juni': 30,
        'July': 31, 'Juli': 31,
        'August': 31, 'Agustus': 31,
        'September': 30,
        'October': 31, 'Oktober': 31,
        'November': 30,
        'December': 31, 'Desember': 31
    }
};