const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server'); // Adjust based on your file structure

// MongoDB connection string for testing
const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/test'; // Use a test database

beforeAll(async () => {
    await mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true });
});

afterAll(async () => {
    await mongoose.connection.close();
});

// Define a clean-up function for the database
const clearDatabase = async () => {
    await mongoose.connection.db.dropDatabase();
};

describe('POST /api/business', () => {
    beforeEach(async () => {
        await clearDatabase();
    });

    it('should register a new business and return status 201', async () => {
        const res = await request(app)
            .post('/api/business')
            .send({
                name: 'Test Business',
                description: 'Test Description',
                email: 'test@example.com',
                phone: '0123456789',
                address: 'Test Address'
            });
        expect(res.statusCode).toEqual(201);
        expect(res.body).toHaveProperty('name', 'Test Business');
    });

    it('should return 400 for missing required fields', async () => {
        const res = await request(app)
            .post('/api/business')
            .send({
                description: 'Test Description',
                email: 'test@example.com',
                phone: '0123456789',
                address: 'Test Address'
            });
        expect(res.statusCode).toEqual(400);
        expect(res.body).toHaveProperty('message');
    });
});
