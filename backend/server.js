// server.js
// This file sets up an Express.js backend server with MongoDB (Mongoose),
// user authentication (signup, login) using JWTs, and role-based access control
// for an admin panel. It also handles CORS based on environment variables.

// --- 1. Load Environment Variables ---
// This line loads variables from your .env file into process.env.
// It should be at the very top of your file.
require('dotenv').config();

// --- 2. Import Required Modules ---
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs'); // For password hashing
const jwt = require('jsonwebtoken'); // For JSON Web Tokens
const cors = require('cors');       // For Cross-Origin Resource Sharing

// --- 3. Initialize Express App ---
const app = express();
// Define the port for the server. It will use the PORT from .env,
// or default to 3000 if not specified (e.g., in local development).
const PORT = process.env.PORT || 3000;

// --- 4. CORS Configuration ---
// This section configures CORS to allow requests only from specified origins.
// The list of allowed origins is read from the ALLOWED_ORIGINS environment variable,
// which should be a comma-separated string (e.g., "url1,url2,url3").
const allowedOriginsString = process.env.ALLOWED_ORIGINS || '';
const allowedOrigins = allowedOriginsString
    .split(',') // Split the string by commas
    .map(origin => origin.trim()) // Remove leading/trailing whitespace from each origin
    .filter(origin => origin.length > 0); // Filter out any empty strings

// Apply the CORS middleware with the custom origin logic
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (e.g., from mobile apps, Postman, curl,
        // or same-origin requests if frontend and backend are on the same base domain).
        if (!origin) return callback(null, true);

        // Check if the requesting origin is in our list of allowed origins.
        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
            console.warn(`CORS Error: Blocked request from origin: ${origin}`); // Log blocked origins for debugging
            return callback(new Error(msg), false); // Deny access
        }
        return callback(null, true); // Allow access
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Explicitly allow these HTTP methods
    credentials: true, // Allow sending of HTTP cookies and authorization headers
    optionsSuccessStatus: 204 // Respond with 204 for preflight OPTIONS requests (standard practice)
}));

// --- 5. Express Middleware for JSON Body Parsing ---
// This middleware is essential to parse incoming request bodies that are in JSON format.
app.use(express.json());

// --- 6. MongoDB Connection ---
// Connect to MongoDB using the connection string from environment variables.
// process.env.MONGO_URI should be set in your .env file (locally) and Vercel (deployed).
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('Connected to MongoDB!')) // Success message
    .catch(err => console.error('MongoDB connection error:', err)); // Error message

// --- 7. Mongoose Schemas and Models ---

// User Schema: Defines the structure for user documents in MongoDB.
const UserSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true }, // User's email, must be unique
    password: { type: String, required: true },           // Hashed password
    role: { type: String, enum: ['user', 'admin'], default: 'user' }, // User's role (either 'user' or 'admin'), defaults to 'user'
    createdAt: { type: Date, default: Date.now }          // Timestamp of user creation
});

// Mongoose Pre-save Hook: Hashes the password before saving a new user or updating a password.
UserSchema.pre('save', async function(next) {
    // Only hash if the password field has been modified (e.g., new user or password change)
    if (this.isModified('password')) {
        this.password = await bcrypt.hash(this.password, 10); // Hash with a salt round of 10
    }
    next(); // Proceed to the next middleware/save operation
});

// Mongoose Instance Method: Compares a candidate password with the stored hashed password.
UserSchema.methods.comparePassword = function(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

// Create the User Model from the schema
const User = mongoose.model('User', UserSchema);

// Survey Response Schema: Defines the structure for survey response documents.
const SurveyResponseSchema = new mongoose.Schema({
    // Links this response to a specific user via their ObjectId
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    fullName: { type: String, required: true },
    age: { type: Number, required: true },
    gender: String,
    education: String,
    occupation: String,
    aiInterest: String,
    hobbies: [String], // Stores an array of strings for hobbies
    feedback: String,
    timestamp: { type: Date, default: Date.now } // Timestamp of response submission
});

// Create the SurveyResponse Model from the schema
const SurveyResponse = mongoose.model('SurveyResponse', SurveyResponseSchema);

// --- 8. JWT Authentication Middleware ---
// This middleware verifies the JWT token sent in the Authorization header.
const authenticateToken = (req, res, next) => {
    // Get the Authorization header (e.g., "Bearer YOUR_TOKEN_HERE")
    const authHeader = req.headers['authorization'];
    // Extract the token part (the actual TOKEN string)
    const token = authHeader && authHeader.split(' ')[1];

    // If no token is provided, return 401 Unauthorized
    if (!token) return res.status(401).json({ message: 'Authentication token required' });

    // Verify the token using the JWT_SECRET from environment variables
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        // If verification fails (e.g., invalid token, expired token), return 403 Forbidden
        if (err) return res.status(403).json({ message: 'Invalid or expired token' });
        // If valid, attach the decoded user payload (id, email, role) to the request object
        req.user = user;
        next(); // Proceed to the next middleware or route handler
    });
};

// --- 9. Admin Authorization Middleware ---
// This middleware checks if the authenticated user has the 'admin' role.
const authorizeAdmin = (req, res, next) => {
    // Check if req.user exists (meaning authenticateToken ran successfully)
    // AND if the user's role is 'admin'
    if (req.user && req.user.role === 'admin') {
        next(); // User is an admin, allow access
    } else {
        // If not an admin, return 403 Forbidden
        res.status(403).json({ message: 'Access denied: Admin role required.' });
    }
};

// --- 10. API Routes ---

// POST /api/signup: Registers a new user.
app.post('/api/signup', async (req, res) => {
    try {
        const { email, password } = req.body;
        // Basic validation for email and password presence
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        // Create a new user with the default 'user' role
        const newUser = new User({ email, password, role: 'user' });
        await newUser.save(); // Save the user to MongoDB (password will be hashed by pre-save hook)

        // Generate a JWT token for the newly registered user, including their role
        const token = jwt.sign({ id: newUser._id, email: newUser.email, role: newUser.role }, process.env.JWT_SECRET, { expiresIn: '1h' });

        // Send success response with token, user ID, and role
        res.status(201).json({ message: 'User registered successfully!', token, userId: newUser._id, role: newUser.role });
    } catch (error) {
        console.error('Signup error:', error);
        // Handle duplicate email error (MongoDB error code 11000)
        if (error.code === 11000) {
            return res.status(409).json({ message: 'Email already registered.' });
        }
        // Generic server error
        res.status(500).json({ message: 'Server error during signup.', error: error.message });
    }
});

// POST /api/login: Authenticates an existing user.
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        // Basic validation for email and password presence
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        // Find the user by email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials.' });
        }

        // Compare the provided password with the hashed password in the database
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials.' });
        }

        // Generate a JWT token for the authenticated user, including their role
        const token = jwt.sign({ id: user._id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });

        // Send success response with token, user ID, and role
        res.status(200).json({ message: 'Logged in successfully!', token, userId: user._id, role: user.role });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error during login.', error: error.message });
    }
});

// POST /api/survey-responses: Saves a new survey response.
// This route is protected by `authenticateToken` (only logged-in users can submit).
app.post('/api/survey-responses', authenticateToken, async (req, res) => {
    try {
        // Destructure necessary fields from the request body
        const { fullName, age, gender, education, occupation, aiInterest, hobbies, feedback } = req.body;

        // Optional: Prevent admin accounts from submitting survey data through this endpoint
        if (req.user.role === 'admin') {
            return res.status(403).json({ message: 'Admin accounts cannot submit user survey data through this endpoint.' });
        }

        // Create a new SurveyResponse document
        const newResponse = new SurveyResponse({
            userId: req.user.id, // Use the userId from the authenticated token (ensures data integrity)
            fullName, age, gender, education, occupation, aiInterest, hobbies, feedback
        });
        await newResponse.save(); // Save the response to MongoDB

        res.status(201).json({ message: 'Survey response saved successfully!', data: newResponse });
    } catch (error) {
        console.error('Error saving survey response:', error);
        res.status(500).json({ message: 'Failed to save survey response.', error: error.message });
    }
});

// GET /api/survey-responses: Fetches all survey responses.
// This route is protected by `authenticateToken` AND `authorizeAdmin` (only admins can view all data).
app.get('/api/survey-responses', authenticateToken, authorizeAdmin, async (req, res) => {
    try {
        // Find all survey responses and populate the 'userId' field
        // to get the associated user's email for display in the admin panel.
        const responses = await SurveyResponse.find().populate('userId', 'email');
        res.status(200).json(responses);
    } catch (error) {
        console.error('Error fetching all survey responses:', error);
        res.status(500).json({ message: 'Failed to fetch survey responses.', error: error.message });
    }
});

// POST /api/create-admin: Creates an initial admin user.
// This route is intended for development/setup purposes only.
// In a production environment, you would likely remove or heavily secure this endpoint
// after the initial admin user is created.
app.post('/api/create-admin', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required.' });
        }

        // Check if an admin user with this email already exists to prevent duplicates
        const existingAdmin = await User.findOne({ email, role: 'admin' });
        if (existingAdmin) {
            return res.status(409).json({ message: 'Admin user with this email already exists.' });
        }

        // Create a new user with the 'admin' role
        const newAdmin = new User({ email, password, role: 'admin' });
        await newAdmin.save(); // Save to MongoDB

        res.status(201).json({ message: 'Admin user created successfully!', userId: newAdmin._id });
    } catch (error) {
        console.error('Error creating admin user:', error);
        res.status(500).json({ message: 'Failed to create admin user.', error: error.message });
    }
});


// --- 11. Start the Server ---
// Listen for incoming requests on the specified port.
app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
});
