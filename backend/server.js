const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer'); // Import multer for file handling
const path = require('path');
const sharp = require('sharp'); // Import sharp for image optimization
const fs = require('fs'); // Import fs for file handling
require('dotenv').config(); // Load environment variables from .env

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from the public directory and apply caching
app.use(express.static('public', {
    maxAge: '1d', // Cache static files for 1 day
    etag: false
}));

// Serve static files from the uploads directory
app.use('/uploads', express.static('uploads'));

// MongoDB Connection
const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost/myVirtualDatabase'; // Default local DB if no env

mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB connection error:', err));

// Define a Business Schema
const businessSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String, required: true },
    image: { type: String } // Store image URL
});

const Business = mongoose.model('Business', businessSchema);

// Set up storage for Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); // Specify the directory for image uploads
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); // Append timestamp to avoid overwriting
    },
});

// Initialize upload
const upload = multer({ storage });

// API endpoint to submit business details, including image upload and optimization
app.post('/api/business', upload.single('image'), async (req, res) => {
    try {
        let imageUrl = '';

        // Optimize and convert to WebP format if an image is uploaded
        if (req.file) {
            const newFilename = `${Date.now()}.webp`; // Create a new filename for the WebP image
            await sharp(req.file.path)
                .resize(800) // Resize the image to a maximum width of 800px
                .webp({ quality: 80 }) // Convert to WebP format
                .toFile(`uploads/${newFilename}`);

            // Delete the original uploaded image
            fs.unlinkSync(req.file.path);

            // Set the imageUrl to the new WebP file
            imageUrl = `/uploads/${newFilename}`;
        }

        const newBusiness = new Business({
            name: req.body.name,
            description: req.body.description,
            email: req.body.email,
            phone: req.body.phone,
            address: req.body.address,
            image: imageUrl, // Save the optimized image URL if uploaded
        });

        await newBusiness.save();
        res.status(201).send(newBusiness);
    } catch (error) {
        console.error('Error processing the business registration:', error);
        res.status(500).send({ message: 'Error processing the business registration', error });
    }
});

// Contentful Integration
const contentful = require('contentful');

// Initialize Contentful client
const client = contentful.createClient({
    space: process.env.CONTENTFUL_SPACE_ID,
    accessToken: process.env.CONTENTFUL_ACCESS_TOKEN
});

// API endpoint to fetch menu data from Contentful
app.get('/menu', async (req, res) => {
    try {
        const entries = await client.getEntries({
            content_type: 'menuItem'
        });

        // Return menu data to the frontend
        res.json(entries.items);
    } catch (err) {
        console.error('Error fetching menu from Contentful:', err);
        res.status(500).send({ message: 'Error fetching menu', error: err });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

// Export the app for testing
module.exports = app;

