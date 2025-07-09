// server.js
require('dotenv').config(); // Load environment variables from .env
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// --- Middleware ---
app.use(cors()); // Enable CORS for all origins (for development)
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
        req.user = user; // decoded user payload (e.g., { id: 'userId', email: 'user@example.com' })
        next();
    });
};

// --- API Routes ---

// Signup Route
app.post('/api/signup', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        const newUser = new User({ email, password });
        await newUser.save();

        // Generate JWT token for the new user
        const token = jwt.sign({ id: newUser._id, email: newUser.email }, process.env.JWT_SECRET, { expiresIn: '1h' });

        res.status(201).json({ message: 'User registered successfully!', token, userId: newUser._id });
    } catch (error) {
        console.error('Signup error:', error);
        if (error.code === 11000) { // Duplicate key error (email already exists)
            return res.status(409).json({ message: 'Email already registered.' });
        }
        res.status(500).json({ message: 'Server error during signup.', error: error.message });
    }
});

// Login Route
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

        // Generate JWT token
        const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });

        res.status(200).json({ message: 'Logged in successfully!', token, userId: user._id });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error during login.', error: error.message });
    }
});

// Save Survey Response Route (protected by authentication)
app.post('/api/survey-responses', authenticateToken, async (req, res) => {
    try {
        // Ensure the userId from the token matches the userId sent in the body (optional, but good practice)
        // For this simple case, we'll just use the userId from the token as the definitive user ID
        const { fullName, age, gender, education, occupation, aiInterest, hobbies, feedback } = req.body;

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

// Get All Survey Responses Route (protected by authentication - assuming admin access for simplicity)
app.get('/api/survey-responses', authenticateToken, async (req, res) => {
    try {
        // In a real app, you'd check if req.user has an 'admin' role before fetching all data.
        // For this demo, any authenticated user can view all data.
        const responses = await SurveyResponse.find().populate('userId', 'email'); // Populate user email for display
        res.status(200).json(responses);
    } catch (error) {
        console.error('Error fetching survey responses:', error);
        res.status(500).json({ message: 'Failed to fetch survey responses.', error: error.message });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
});