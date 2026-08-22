const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3002;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Standard Grade Scale Mapping (Skala 4)
const GRADE_POINTS = {
    'A': 4.00,
    'A-': 3.75,
    'B+': 3.50,
    'B': 3.00,
    'B-': 2.75,
    'C+': 2.50,
    'C': 2.00,
    'D': 1.00,
    'E': 0.00
};

// Helper: Determine Academic Standing / Predikat
const getPredikat = (ips) => {
    if (ips >= 3.51) return 'Dengan Pujian (Cumlaude)';
    if (ips >= 3.00) return 'Sangat Memuaskan';
    if (ips >= 2.75) return 'Memuaskan';
    if (ips >= 2.00) return 'Cukup';
    return 'Kurang';
};

// Helper: Determine Maximum SKS for Next Semester
const getMaxSksNextSemester = (ips) => {
    if (ips >= 3.00) return 24;
    if (ips >= 2.50) return 22;
    if (ips >= 2.00) return 20;
    return 18;
};

// Routes
// 1. Root & Status
app.get('/', (req, res) => {
    res.json({
        service: 'score-service',
        environment: NODE_ENV,
        status: 'running',
        description: 'Layanan Perhitungan IPS (Indeks Prestasi Semester) Mahasiswa'
    });
});

// 2. Health Check
app.get('/health', (req, res) => {
    res.json({
        service: 'score-service',
        status: 'healthy',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

// 3. Get Grade Scales Information
app.get('/grades-scale', (req, res) => {
    res.json({
        success: true,
        data: GRADE_POINTS
    });
});

// 4. Calculate IPS (Indeks Prestasi Semester)
app.post('/calculate-ips', (req, res) => {
    try {
        const { student_name, nim, semester, courses } = req.body;

        if (!courses || !Array.isArray(courses) || courses.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Data courses wajib berupa array dan tidak boleh kosong.'
            });
        }

        let totalSks = 0;
        let totalMutu = 0;
        let totalSksLulus = 0;
        const processedCourses = [];

        for (let i = 0; i < courses.length; i++) {
            const c = courses[i];
            const courseName = c.name || c.matakuliah || `Mata Kuliah ${i + 1}`;
            const sks = parseFloat(c.sks);
            const grade = String(c.grade || c.nilai || '').toUpperCase().trim();

            if (isNaN(sks) || sks <= 0) {
                return res.status(400).json({
                    success: false,
                    message: `SKS untuk ${courseName} harus berupa angka positif.`
                });
            }

            if (!(grade in GRADE_POINTS)) {
                return res.status(400).json({
                    success: false,
                    message: `Nilai huruf '${grade}' untuk ${courseName} tidak valid. Pilihan: ${Object.keys(GRADE_POINTS).join(', ')}`
                });
            }

            const point = GRADE_POINTS[grade];
            const mutu = sks * point;

            totalSks += sks;
            totalMutu += mutu;
            if (point >= 2.00) {
                totalSksLulus += sks;
            }

            processedCourses.push({
                code: c.code || `MK-${i + 1}`,
                name: courseName,
                sks: sks,
                grade: grade,
                point: point,
                mutu: parseFloat(mutu.toFixed(2)),
                is_passed: point >= 2.00
            });
        }

        const rawIps = totalMutu / totalSks;
        const ips = parseFloat(rawIps.toFixed(2));
        const predikat = getPredikat(ips);
        const maxSksNextSemester = getMaxSksNextSemester(ips);

        res.json({
            success: true,
            message: 'Perhitungan IPS berhasil.',
            data: {
                student: {
                    nim: nim || 'N/A',
                    name: student_name || 'Mahasiswa'
                },
                semester: semester || 1,
                summary: {
                    total_matakuliah: courses.length,
                    total_sks: totalSks,
                    total_sks_lulus: totalSksLulus,
                    total_mutu: parseFloat(totalMutu.toFixed(2)),
                    ips: ips,
                    predikat: predikat,
                    max_sks_semester_berikutnya: maxSksNextSemester
                },
                courses: processedCourses
            }
        });
    } catch (error) {
        console.error('[Score Calculate Error]:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan saat menghitung IPS.',
            error: error.message
        });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`[score-service] Service is running on port ${PORT} in ${NODE_ENV} mode`);
});
