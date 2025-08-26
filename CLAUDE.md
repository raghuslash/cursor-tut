# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a business website chatbot application built with Node.js that combines web scraping and AI to answer customer questions based on scraped website content. The system has three main components that work together:

1. **Web Scraper** (`scraper.js`) - Crawls business websites and extracts structured data
2. **AI Chatbot** (`chatbot.js`) - Uses OpenAI GPT with BM25 search to answer questions
3. **Express Server** (`server.js`) - Provides REST API and serves web interface

## Development Commands

```bash
# Start the server
npm start

# Development mode with auto-reload
npm run dev

# Run web scraper directly
npm run scrape
# or: node scraper.js <url> [max-pages]

# Run chatbot directly
npm run chat
# or: node chatbot.js

# Test environment variables
npm run test-env
```

## Environment Setup

The application requires an OpenAI API key. Copy `env.example` to `.env` and set:
```
OPENAI_API_KEY=your_key_here
PORT=3000
```

## Architecture

### Data Flow
1. **Scraping Phase**: `BusinessWebsiteScraper` crawls website → extracts content, FAQs, products, contact info
2. **Indexing Phase**: `BusinessChatbot` processes scraped data → creates text chunks → builds BM25 search index
3. **Query Phase**: User question → BM25 retrieval → OpenAI GPT generation with context

### Key Classes
- `BusinessWebsiteScraper`: Handles web crawling with cheerio, respects rate limits, extracts structured data
- `BusinessChatbot`: Manages OpenAI client, BM25 search, text chunking, and response generation
- Express server: Coordinates scraper and chatbot, provides REST API

### Error Handling
The server provides helpful error messages for missing API keys and guides users through setup. Each component has try-catch blocks and graceful degradation.

### API Endpoints
- `POST /scrape` - Initialize chatbot with website data
- `POST /chat` - Ask questions (requires scraping first)
- `GET /summary` - Get scraped data summary
- `GET /suggestions` - Get suggested questions
- `GET /health` - Health check

## Development Notes

- The chatbot instance is created on first scrape request, not server startup
- BM25 search algorithm finds relevant content before sending to OpenAI
- Text is chunked into 1000-character segments for better retrieval
- Server includes comprehensive logging for debugging scraping and chat issues
- No database - all data is stored in memory for the session