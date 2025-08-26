const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

// Load environment variables from .env file
const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
    console.log(`📁 Loading environment from: ${envPath}`);
    require('dotenv').config({ path: envPath });
} else {
    console.log(`⚠️  .env file not found at: ${envPath}`);
    console.log(`📁 Current working directory: ${process.cwd()}`);
    require('dotenv').config();
}

const BusinessChatbot = require('./chatbot');
const BusinessWebsiteScraper = require('./scraper');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Global chatbot instance
let chatbot = null;

// Routes
app.get('/', (req, res) => {
    res.json({
        message: 'Business Website Chatbot API',
        endpoints: {
            'POST /scrape': 'Scrape a website',
            'POST /chat': 'Ask a question',
            'GET /summary': 'Get website summary',
            'GET /suggestions': 'Get suggested questions'
        }
    });
});

// Scrape website endpoint
app.post('/scrape', async (req, res) => {
    try {
        const { websiteUrl, maxPages = 10 } = req.body;
        
        if (!websiteUrl) {
            return res.status(400).json({ error: 'Website URL is required' });
        }
        
        console.log(`🚀 Scraping website: ${websiteUrl}`);
        
        // Initialize chatbot if not exists
        if (!chatbot) {
            try {
                chatbot = new BusinessChatbot(); // Will use .env file automatically
            } catch (error) {
                return res.status(500).json({ 
                    error: 'Anthropic API key not configured',
                    details: 'Please create a .env file with ANTHROPIC_API_KEY=your_key_here'
                });
            }
        }
        
        // Load website data
        const websiteData = await chatbot.loadWebsiteData(websiteUrl, maxPages);
        
        res.json({
            success: true,
            message: `Successfully scraped ${websiteData.total_pages} pages`,
            data: websiteData
        });
        
    } catch (error) {
        console.error('Scraping error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Chat endpoint
app.post('/chat', async (req, res) => {
    try {
        const { question } = req.body;
        
        if (!question) {
            return res.status(400).json({ error: 'Question is required' });
        }
        
        if (!chatbot) {
            return res.status(400).json({ error: 'Please scrape a website first' });
        }
        
        console.log(`💬 Question: ${question}`);
        
        const response = await chatbot.answerQuestion(question);
        
        res.json({
            success: true,
            question,
            response
        });
        
    } catch (error) {
        console.error('Chat error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get website summary
app.get('/summary', async (req, res) => {
    try {
        if (!chatbot) {
            return res.status(400).json({ error: 'No website data loaded' });
        }
        
        const summary = await chatbot.getWebsiteSummary();
        res.json({ success: true, data: summary });
        
    } catch (error) {
        console.error('Summary error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get suggested questions
app.get('/suggestions', (req, res) => {
    try {
        if (!chatbot) {
            return res.status(400).json({ error: 'No website data loaded' });
        }
        
        const suggestions = chatbot.suggestQuestions();
        res.json({ success: true, data: suggestions });
        
    } catch (error) {
        console.error('Suggestions error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        chatbot_loaded: chatbot !== null
    });
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Business Website Chatbot server running on port ${PORT}`);
    console.log(`📱 API available at http://localhost:${PORT}`);
    
    // Check if .env file exists and API key is configured
    if (fs.existsSync(envPath)) {
        console.log(`✅ .env file found at: ${envPath}`);
        if (process.env.ANTHROPIC_API_KEY) {
            console.log(`🔑 Anthropic API Key: ✅ Configured`);
        } else {
            console.log(`🔑 Anthropic API Key: ❌ Missing from .env file`);
        }
    } else {
        console.log(`❌ .env file not found at: ${envPath}`);
    }
    
    if (!process.env.ANTHROPIC_API_KEY) {
        console.log('\n⚠️  Please set your Anthropic API key:');
        console.log('   1. Copy env.example to .env: cp env.example .env');
        console.log('   2. Edit .env file and add: ANTHROPIC_API_KEY=your_key_here');
        console.log('   3. Get your API key from: https://console.anthropic.com/');
        console.log('   4. Restart the server');
        console.log('');
        console.log('   Or set environment variable:');
        console.log('   Windows: set ANTHROPIC_API_KEY=your_key_here');
        console.log('   Mac/Linux: export ANTHROPIC_API_KEY=your_key_here');
    } else {
        console.log(`\n🎉 Ready to use! The chatbot will initialize when you first scrape a website.`);
    }
});

module.exports = app;
