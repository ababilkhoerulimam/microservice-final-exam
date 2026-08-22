const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Environment Configurations
const PORT = process.env.PORT || 3001;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://auth-db:27017/auth';
const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret_devops_unesa_2025';
const NODE_ENV = process.env.NODE_ENV || 'development';

const connectDB = async () => {
    let retries = 5;
    while (retries) {
        try {
            await mongoose.connect(MONGO_URI);
            console.log(`[auth-service] Connected to MongoDB at ${MONGO_URI}`);
            break;
        } catch (err) {
            console.error(`[auth-service] MongoDB connection failed: ${err.message}. Retries left: ${retries - 1}`);
            retries -= 1;
            await new Promise(res => setTimeout(res, 3000));
        }
    }
};
connectDB();

// User Schema & Model
const userSchema = new mongoose.Schema({
    nim: {
        type: String,
        required: [true, 'NIM is required'],
        unique: true,
        trim: true
    },
    name: {
        type: String,
        required: [true, 'Full Name is required'],
        trim: true
    },
    email: {
        type: String,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: 6
    },
    role: {
        type: String,
        enum: ['student', 'lecturer', 'admin'],
        default: 'student'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const User = mongoose.model('User', userSchema);

// JWT Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Access Denied: No token provided'
        });
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).json({
                success: false,
                message: 'Invalid or expired token'
            });
        }
        req.user = decoded;
        next();
    });
};

// Routes
// 1. Root & Health Check
app.get('/', (req, res) => {
    res.json({
        service: 'auth-service',
        environment: NODE_ENV,
        status: 'running'
    });
});

app.get('/health', (req, res) => {
    const isDbConnected = mongoose.connection.readyState === 1;
    res.status(isDbConnected ? 200 : 503).json({
        service: 'auth-service',
        status: isDbConnected ? 'healthy' : 'unhealthy',
        database: isDbConnected ? 'connected' : 'disconnected',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

// 2. Register
app.post('/register', async (req, res) => {
    try {
        const { nim, name, email, password, role } = req.body;

        if (!nim || !name || !password) {
            return res.status(400).json({
                success: false,
                message: 'Field nim, name, dan password wajib diisi.'
            });
        }

        const existingUser = await User.findOne({ nim });
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: `Mahasiswa dengan NIM ${nim} sudah terdaftar.`
            });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({
            nim,
            name,
            email: email || `${nim}@mhs.unesa.ac.id`,
            password: hashedPassword,
            role: role || 'student'
        });

        await newUser.save();

        res.status(201).json({
            success: true,
            message: 'Registrasi berhasil!',
            data: {
                id: newUser._id,
                nim: newUser.nim,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role,
                createdAt: newUser.createdAt
            }
        });
    } catch (error) {
        console.error('[Register Error]:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server.',
            error: error.message
        });
    }
});

// 3. Login
app.post('/login', async (req, res) => {
    try {
        const { nim, password } = req.body;

        if (!nim || !password) {
            return res.status(400).json({
                success: false,
                message: 'NIM dan password harus diisi.'
            });
        }

        const user = await User.findOne({ nim });
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'NIM atau password salah.'
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'NIM atau password salah.'
            });
        }

        const token = jwt.sign(
            { id: user._id, nim: user.nim, name: user.name, role: user.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            message: 'Login berhasil!',
            token,
            data: {
                id: user._id,
                nim: user.nim,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('[Login Error]:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan saat login.',
            error: error.message
        });
    }
});

// 4. Get Current User Profile (Protected)
app.get('/me', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User tidak ditemukan.'
            });
        }
        res.json({
            success: true,
            data: user
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Gagal mengambil data profil.',
            error: error.message
        });
    }
});

// 5. List Users
app.get('/users', authenticateToken, async (req, res) => {
    try {
        const users = await User.find().select('-password');
        res.json({
            success: true,
            count: users.length,
            data: users
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Gagal mengambil daftar pengguna.',
            error: error.message
        });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`[auth-service] Service is running on port ${PORT} in ${NODE_ENV} mode`);
});
