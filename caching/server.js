const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/scholar_cache';


app.use(cors());
app.use(express.json());


const cacheSchema = new mongoose.Schema({
    type: String,
    query: String,
    data: Object,
    timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

const Cache = mongoose.model('Cache', cacheSchema);


mongoose.connect(MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));


async function fetchFromAPI(endpoint, type, query) {
    try {
        const baseUrl = 'https://api.semanticscholar.org/graph/v1';
        const url = `${baseUrl}${endpoint}`;
        
        console.log(`Fetching from API: ${url}`);
        
        const response = await fetch(url, {
            headers: {
                'Accept': 'application/json',
            
            }
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }

        const data = await response.json();
        
        
        await Cache.create({
            type,
            query,
            data
        });

        return data;
    } catch (error) {
        console.error('API Fetch Error:', error);
        throw error;
    }
}


async function getCachedOrFetch(type, query, endpoint) {
    try {
        
        const cached = await Cache.findOne({
            type,
            query,
            timestamp: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) } 
        });

        if (cached) {
            console.log('Cache hit:', type, query);
            return cached.data;
        }

        console.log('Cache miss:', type, query);
        return await fetchFromAPI(endpoint, type, query);
    } catch (error) {
        console.error('Cache/Fetch Error:', error);
        throw error;
    }
}


app.get('/api/author/search', async (req, res) => {
    try {
        const { query, fields } = req.query;
        const endpoint = `/author/search?query=${encodeURIComponent(query)}&fields=${fields}`;
        const data = await getCachedOrFetch('author_search', query, endpoint);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/author/:authorId', async (req, res) => {
    try {
        const { authorId } = req.params;
        const { fields } = req.query;
        const endpoint = `/author/${authorId}?fields=${fields}`;
        const data = await getCachedOrFetch('author_details', authorId, endpoint);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/paper/:paperId/citations', async (req, res) => {
    try {
        const { paperId } = req.params;
        const { fields } = req.query;
        const endpoint = `/paper/${paperId}/citations?fields=${fields}`;
        const data = await getCachedOrFetch('paper_citations', paperId, endpoint);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
    console.log(`Proxy server running on port ${PORT}`);
});