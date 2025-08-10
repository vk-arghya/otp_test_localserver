const express = require('express');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const path = require('path');
const bcrypt = require('bcryptjs');
const sequelize = require('./config/database');
const User = require('./models/User');

// Load environment variables from .env file
dotenv.config();

const app = express();
const port = 3000;

// Middleware to parse JSON request bodies and serve static files
app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));

// --- Nodemailer Transporter ---
// This object handles the email sending process
const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// A temporary in-memory store for OTPs. In a real application,
// a database with an expiration time (e.g., Redis) is a better choice.
const otpStore = {};

// Sync Sequelize models with the database
// This will create the 'users' table if it doesn't exist
sequelize.sync()
    .then(() => {
        console.log('Database and tables synced successfully!');
    })
    .catch(err => {
        console.error('Failed to sync database:', err);
    });

// ==============================
//   Backend API Endpoints
// ==============================

// API 1: Check if an email exists in the database
app.post('/api/check-email', async (req, res) => {
    const { email } = req.body;
    try {
        const user = await User.findOne({ where: { email } });
        const userExists = !!user;
        res.json({ userExists });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Database error.' });
    }
});

// API 2: Send OTP to the user's email
app.post('/api/send-otp', (req, res) => {
    const { email } = req.body;
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore[email] = { code: otp, timestamp: Date.now() };

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: ' Arghya Online Service : Your Verification Code',
        html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6;">
                <h2 style="color: #333;">Hello from  Arghya Online Service,</h2>
                <p>Thank you for starting the verification process for your account. Please use the following code to complete your registration:</p>
                <div style="text-align: center; margin: 20px 0; padding: 10px; background-color: #f0f0f0; border-radius: 8px;">
                    <strong style="font-size: 24px; color: #007bff;">${otp}</strong>
                </div>
                <p>This code is valid for 5 minutes. Please do not share this code with anyone.</p>
                <p>If you did not request this, please ignore this email.</p>
                <p>Best regards ,<br>Arghya Online Service Team</p>
            </div>
        `
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error(error);
            return res.status(500).json({ message: 'Failed to send OTP.' });
        }
        res.status(200).json({ message: 'OTP sent successfully.' });
    });
});

// API 3: Verify the OTP
app.post('/api/verify-otp', (req, res) => {
    const { email, otp } = req.body;
    const storedOtp = otpStore[email];

    // Check if the OTP is valid and not expired (5 minutes)
    if (!storedOtp || storedOtp.code !== otp || (Date.now() - storedOtp.timestamp > 300000)) {
        return res.status(400).json({ message: 'Invalid or expired OTP.' });
    }

    delete otpStore[email]; // OTP is used, so delete it
    res.status(200).json({ message: 'OTP verified successfully.' });
});

// API 4: Sign up a new user and store in MySQL
app.post('/api/signup', async (req, res) => {
    const { email, password } = req.body;
    try {
        // The password will be hashed automatically by the hook in the User model
        const newUser = await User.create({ email, password });
        res.status(201).json({ message: 'Account created successfully.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to create account.' });
    }
});

// API 5: Sign in a user
app.post('/api/signin', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ where: { email } });

        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password.' });
        }

        // Compare the provided password with the stored hash
        const isMatch = await bcrypt.compare(password, user.password);

        if (isMatch) {
            res.status(200).json({ message: 'Login successful.' });
        } else {
            res.status(401).json({ message: 'Invalid email or password.' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Database error.' });
    }
});

// Start the server and listen for requests
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
