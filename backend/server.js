// server.js
require('dotenv').config(); // Load environment variables from .env
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000; // Use PORT from .env or default to 3000

// --- CORS Configuration ---
// Read allowed origins from environment variables
// Expects a comma-separated string, e.g., "https://userapplication-eight.vercel.app,https://sowmiyabackend.vercel.app,http://localhost:5500"
const allowedOriginsString = process.env.ALLOWED_ORIGINS || '';
const allowedOrigins = allowedOriginsString.split(',').map(origin => origin.trim()).filter(origin => origin.length > 0);

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps, Postman, curl, or same-origin requests)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
            console.warn(`CORS Error: Blocked request from origin: ${origin}`); // Log blocked origins
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Specify allowed HTTP methods
    credentials: true, // Allow cookies to be sent (though we're using JWTs, good practice)
    optionsSuccessStatus: 204 // Some legacy browsers (IE11, various SmartTVs) choke on 200 for OPTIONS preflight
}));

app.use(express.json()); // To parse JSON request bodies

// --- MongoDB Connection ---
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('Connected to MongoDB!'))
    .catch(err => console.error('MongoDB connection error:', err));

// --- Mongoose Schemas and Models ---

// User Schema for authentication
const UserSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' }, // Added role field
    createdAt: { type: Date, default: Date.now }
});

// Hash password before saving
UserSchema.pre('save', async function(next) {
    if (this.isModified('password')) {
        this.password = await bcrypt.hash(this.password, 10);
    }
    next();
});

// Method to compare passwords
UserSchema.methods.comparePassword = function(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', UserSchema);

// Survey Response Schema
const SurveyResponseSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Link to User
    fullName: { type: String, required: true },
    age: { type: Number, required: true },
    gender: String,
    education: String,
    occupation: String,
    aiInterest: String,
    hobbies: [String], // Array of strings
    feedback: String,
    timestamp: { type: Date, default: Date.now }
});

const SurveyResponse = mongoose.model('SurveyResponse', SurveyResponseSchema);

// --- JWT Authentication Middleware ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) return res.status(401).json({ message: 'Authentication token required' });

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ message: 'Invalid or expired token' });
        req.user = user; // decoded user payload (e.g., { id: 'userId', email: 'user@example.com', role: 'user' })
        next();
    });
};

// Middleware to authorize admin role
const authorizeAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next(); // User is an admin, proceed
    } else {
        res.status(403).json({ message: 'Access denied: Admin role required.' });
    }
};

// --- API Routes ---

// Signup Route (for regular users, defaults to 'user' role)
app.post('/api/signup', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        const newUser = new User({ email, password, role: 'user' }); // Default role is 'user'
        await newUser.save();

        // Generate JWT token for the new user, including their role
        const token = jwt.sign({ id: newUser._id, email: newUser.email, role: newUser.role }, process.env.JWT_SECRET, { expiresIn: '1h' });

        res.status(201).json({ message: 'User registered successfully!', token, userId: newUser._id, role: newUser.role });
    } catch (error) {
        console.error('Signup error:', error);
        if (error.code === 11000) { // Duplicate key error (email already exists)
            return res.status(409).json({ message: 'Email already registered.' });
        }
        res.status(500).json({ message: 'Server error during signup.', error: error.message });
    }
});

// General Login Route (handles both user and admin logins based on role)
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials.' });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials.' });
        }

        // Generate JWT token, including the user's role
        const token = jwt.sign({ id: user._id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });

        res.status(200).json({ message: 'Logged in successfully!', token, userId: user._id, role: user.role });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error during login.', error: error.message });
    }
});

// Save Survey Response Route (protected by authentication)
app.post('/api/survey-responses', authenticateToken, async (req, res) => {
    try {
        // Ensure the userId from the token is used as the definitive user ID
        const { fullName, age, gender, education, occupation, aiInterest, hobbies, feedback } = req.body;

        // Optional: Prevent admin from submitting survey data through the user form
        if (req.user.role === 'admin') {
            return res.status(403).json({ message: 'Admin accounts cannot submit user survey data through this endpoint.' });
        }

        const newResponse = new SurveyResponse({
            userId: req.user.id, // Use userId from the authenticated token
            fullName, age, gender, education, occupation, aiInterest, hobbies, feedback
        });
        await newResponse.save();
        res.status(201).json({ message: 'Survey response saved successfully!', data: newResponse });
    } catch (error) {
        console.error('Error saving survey response:', error);
        res.status(500).json({ message: 'Failed to save survey response.', error: error.message });
    }
});

// Get ALL Survey Responses Route (protected by authentication AND admin authorization)
app.get('/api/survey-responses', authenticateToken, authorizeAdmin, async (req, res) => {
    try {
        // Fetch all survey responses and populate the 'userId' field to get user email
        const responses = await SurveyResponse.find().populate('userId', 'email');
        res.status(200).json(responses);
    } catch (error) {
        console.error('Error fetching all survey responses:', error);
        res.status(500).json({ message: 'Failed to fetch survey responses.', error: error.message });
    }
});

// Route to create an initial admin user (FOR DEVELOPMENT ONLY - REMOVE IN PRODUCTION)
// You can hit this endpoint once to create an admin user:
// Method: POST
// URL: https://sowmiyabackend.vercel.app/api/create-admin
// Body: { "email": "admin@example.com", "password": "adminpassword" }
app.post('/api/create-admin', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required.' });
        }

        const existingAdmin = await User.findOne({ email, role: 'admin' });
        if (existingAdmin) {
            return res.status(409).json({ message: 'Admin user with this email already exists.' });
        }

        const newAdmin = new User({ email, password, role: 'admin' });
        await newAdmin.save();
        res.status(201).json({ message: 'Admin user created successfully!', userId: newAdmin._id });
    } catch (error) {
        console.error('Error creating admin user:', error);
        res.status(500).json({ message: 'Failed to create admin user.', error: error.message });
    }
});


// Start the server
app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
});
