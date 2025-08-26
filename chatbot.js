const Anthropic = require('@anthropic-ai/sdk');
const natural = require('natural');
const BusinessWebsiteScraper = require('./scraper');
const Database = require('./database');
require('dotenv').config();

class BusinessChatbot {
    constructor(anthropicApiKey = null) {
        // Use provided API key or fall back to environment variable
        const apiKey = anthropicApiKey || process.env.ANTHROPIC_API_KEY;
        
        if (!apiKey) {
            throw new Error('Anthropic API key is required. Please set ANTHROPIC_API_KEY in your .env file or pass it to the constructor.');
        }
        
        this.anthropic = new Anthropic({
            apiKey: apiKey
        });
        
        this.websiteData = null;
        this.textChunks = [];
        this.tfidf = new natural.TfIdf();
        this.db = new Database();
        this.sessionId = null;
    }

    async loadWebsiteData(websiteUrl, maxPages = 10) {
        console.log('🌐 Scraping website...');
        const scraper = new BusinessWebsiteScraper(websiteUrl, maxPages);
        this.websiteData = await scraper.scrapeWebsite();
        
        // Get the latest session from database
        const session = await this.db.getLatestSession();
        if (session) {
            this.sessionId = session.id;
            console.log(`📚 Loading data from database (session ${this.sessionId})`);
            
            // Load text chunks from database
            this.textChunks = await this.db.getTextChunks(this.sessionId);
            
            // Initialize TF-IDF search with database chunks
            this.tfidf = new natural.TfIdf();
            this.textChunks.forEach(chunk => {
                this.tfidf.addDocument(chunk);
            });
            
            console.log(`✅ Loaded ${this.textChunks.length} text chunks from database`);
        } else {
            console.log('⚠️ No session found in database, using in-memory data');
            // Fallback to in-memory processing
            this.textChunks = this.prepareTextChunks(this.websiteData);
            this.tfidf = new natural.TfIdf();
            this.textChunks.forEach(chunk => {
                this.tfidf.addDocument(chunk);
            });
            console.log(`✅ Loaded ${this.textChunks.length} text chunks from memory`);
        }
        
        return this.websiteData;
    }

    prepareTextChunks(websiteData) {
        const chunks = [];
        
        for (const page of websiteData.pages) {
            // Add page title
            if (page.title) {
                chunks.push(`Page Title: ${page.title}`);
            }
            
            // Add main text content
            if (page.textContent) {
                const textChunks = this.splitText(page.textContent, 1000);
                chunks.push(...textChunks);
            }
            
            // Add FAQs
            for (const faq of page.faqs || []) {
                chunks.push(`FAQ Question: ${faq.question} Answer: ${faq.answer}`);
            }
            
            // Add products
            for (const product of page.products || []) {
                chunks.push(`Product: ${product.name} Description: ${product.description} Price: ${product.price || 'N/A'}`);
            }
            
            // Add contact info
            const contact = page.contactInfo || {};
            if (Object.keys(contact).length > 0) {
                chunks.push(`Contact Information: Email: ${contact.email || 'N/A'} Phone: ${contact.phone || 'N/A'} Address: ${contact.address || 'N/A'}`);
            }
        }
        
        return chunks;
    }

    splitText(text, maxLength) {
        const words = text.split(' ');
        const chunks = [];
        let currentChunk = '';
        
        for (const word of words) {
            if ((currentChunk + ' ' + word).length > maxLength) {
                if (currentChunk) {
                    chunks.push(currentChunk.trim());
                    currentChunk = word;
                } else {
                    chunks.push(word);
                }
            } else {
                currentChunk += (currentChunk ? ' ' : '') + word;
            }
        }
        
        if (currentChunk) {
            chunks.push(currentChunk.trim());
        }
        
        return chunks;
    }

    async answerQuestion(question, maxResults = 5) {
        if (!this.tfidf || !this.textChunks.length) {
            return 'I don\'t have any website data loaded yet. Please scrape a website first.';
        }

        try {
            // Search for relevant content using TF-IDF
            const searchResults = [];
            this.tfidf.tfidfs(question, (docIndex, score) => {
                if (score > 0) {
                    searchResults.push({ index: docIndex, score: score });
                }
            });
            
            // Sort by score and get top results
            searchResults.sort((a, b) => b.score - a.score);
            const topResults = searchResults.slice(0, maxResults);
            
            // Get relevant text chunks
            const relevantChunks = topResults.map(result => this.textChunks[result.index]);
            const context = relevantChunks.join('\n\n');
            
            // Create system prompt
            const systemPrompt = this.createSystemPrompt(context);
            
            // Generate response using Anthropic Claude
            const completion = await this.anthropic.messages.create({
                model: 'claude-3-haiku-20240307',
                max_tokens: 500,
                temperature: 0.7,
                messages: [
                    { 
                        role: 'user', 
                        content: `${systemPrompt}\n\nUser question: ${question}` 
                    }
                ]
            });
            
            return completion.content[0].text;
            
        } catch (error) {
            console.error('Error generating response:', error);
            return `I encountered an error while processing your question: ${error.message}`;
        }
    }

    createSystemPrompt(context) {
        return `You are a customer service representative for this business. Respond as if you work directly for the company and have access to company information. Here is your knowledge base:

${context}

Answer customer questions naturally using this information, speaking as "we" and "our company." Never mention that you got this information from a website or external source - present it as your direct knowledge of the business.

Guidelines:
1. Speak as a company employee ("We offer...", "Our hours are...", "Our products include...")
2. Be helpful, professional, and friendly
3. Provide accurate information from your knowledge base
4. If you don't have specific information, say "I don't have that information available right now" and offer to help them contact the appropriate department
5. Keep responses concise but informative
6. When sharing contact info, present it as "You can reach us at..." or "Our contact information is..."
7. When discussing pricing, present it as "Our prices are..." or "We charge..."

Act as a knowledgeable, helpful employee who genuinely represents this business.`;
    }

    async getWebsiteSummary() {
        // Try to get data from database first
        if (this.sessionId) {
            try {
                const websiteData = await this.db.getWebsiteData(this.sessionId);
                if (websiteData) {
                    return {
                        website_url: websiteData.website_url,
                        total_pages: websiteData.total_pages,
                        scraped_at: websiteData.scraped_at,
                        summary: websiteData.summary,
                        chunks_loaded: this.textChunks.length,
                        data_source: 'database'
                    };
                }
            } catch (error) {
                console.error('Error loading from database:', error);
            }
        }
        
        // Fallback to in-memory data
        if (!this.websiteData) {
            return { error: 'No website data loaded' };
        }
        
        return {
            website_url: this.websiteData.website_url,
            total_pages: this.websiteData.total_pages,
            scraped_at: this.websiteData.scraped_at,
            summary: this.websiteData.summary,
            chunks_loaded: this.textChunks.length,
            data_source: 'memory'
        };
    }

    suggestQuestions() {
        const suggestions = [
            'What are your business hours?',
            'How can I contact you?',
            'What products/services do you offer?',
            'Do you have any FAQs?',
            'What are your prices?',
            'Where are you located?',
            'Do you offer customer support?'
        ];
        
        // Add specific suggestions based on available data
        if (this.websiteData?.summary?.total_faqs > 0) {
            suggestions.push('Can you answer some frequently asked questions?');
        }
        
        if (this.websiteData?.summary?.total_products > 0) {
            suggestions.push('Can you tell me more about your products?');
        }
        
        return suggestions;
    }
}

// Example usage
async function main() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
        console.log('❌ Please set ANTHROPIC_API_KEY environment variable');
        console.log('Example: export ANTHROPIC_API_KEY=your_key_here');
        return;
    }
    
    const chatbot = new BusinessChatbot(apiKey);
    
    // Example: Load website data and ask questions
    try {
        console.log('🚀 Loading website data...');
        await chatbot.loadWebsiteData('https://example.com', 5);
        
        console.log('\n💬 Chatbot ready! Ask questions:');
        console.log('Type "quit" to exit\n');
        
        // Example questions
        const questions = [
            'What products do you offer?',
            'How can I contact you?',
            'What are your business hours?'
        ];
        
        for (const question of questions) {
            console.log(`👤 You: ${question}`);
            const response = await chatbot.answerQuestion(question);
            console.log(`🤖 Bot: ${response}\n`);
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = BusinessChatbot;
