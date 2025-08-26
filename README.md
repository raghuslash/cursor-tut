# 🤖 Business Website Chatbot (Node.js)

A powerful AI-powered chatbot that can answer customer questions using data scraped from business websites. Built with Node.js for easy installation and deployment.

## ✨ Features

- **🌐 Web Scraping**: Automatically extracts content from business websites
- **🤖 AI Chatbot**: Uses OpenAI GPT to understand and answer questions
- **🔍 Smart Search**: BM25 algorithm for finding relevant information
- **💻 Web Interface**: Beautiful, responsive web UI
- **📱 REST API**: Full API for integration with other systems
- **⚡ Fast & Lightweight**: Pure JavaScript, no compilation needed

## 🚀 Quick Start

### Prerequisites

- **Node.js 18+** - [Download Node.js](https://nodejs.org/)
- **OpenAI API Key** - [Get your API key](https://platform.openai.com/api-keys)

### Installation

1. **Clone or download the project**
   ```bash
   git clone <repository-url>
   cd business-website-chatbot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up your OpenAI API key**
   
   **Option 1: Using .env file (Recommended)**
   ```bash
   # Copy the example environment file
   cp env.example .env
   
   # Edit .env file and add your API key
   OPENAI_API_KEY=your_actual_api_key_here
   ```
   
   **Option 2: Environment variable**
   ```bash
   # Windows
   set OPENAI_API_KEY=your_api_key_here
   
   # Mac/Linux
   export OPENAI_API_KEY=your_api_key_here
   ```

4. **Start the server**
   ```bash
   npm start
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000`

## 🔑 Environment Configuration

The application automatically loads configuration from a `.env` file. Create this file in your project root:

```bash
# .env
OPENAI_API_KEY=sk-your_actual_api_key_here
PORT=3000  # Optional, defaults to 3000
```

**Important:** Never commit your `.env` file to version control. It's already included in `.gitignore`.

## 📖 Usage

### Web Interface

1. **Scrape a website**: Enter the business website URL and click "Scrape Website"
2. **Ask questions**: Use the chat interface to ask customer-related questions
3. **Get AI-powered answers**: The chatbot provides accurate responses based on website data

### Command Line

```bash
# Scrape a website
node scraper.js https://example.com 5

# Run the chatbot directly
node chatbot.js
```

### API Endpoints

- `POST /scrape` - Scrape a website
- `POST /chat` - Ask a question
- `GET /summary` - Get website summary
- `GET /suggestions` - Get suggested questions
- `GET /health` - Health check

## 🛠️ Development

```bash
# Install dependencies
npm install

# Run in development mode (with auto-reload)
npm run dev

# Run specific components
npm run scrape
npm run chat
```

## 📁 Project Structure

```
business-website-chatbot/
├── scraper.js          # Web scraping logic
├── chatbot.js          # AI chatbot implementation
├── server.js           # Express web server
├── package.json        # Dependencies and scripts
├── public/
│   └── index.html     # Web interface
├── env.example        # Environment variables template
├── .env               # Your actual environment variables (create this)
└── README.md          # This file
```

## 🔧 Configuration

### Environment Variables

- `OPENAI_API_KEY` - Your OpenAI API key (required)
- `PORT` - Server port (default: 3000)

### Customization

- **Scraping behavior**: Modify `scraper.js`
- **Chatbot responses**: Edit `chatbot.js`
- **Web interface**: Customize `public/index.html`
- **API endpoints**: Extend `server.js`

## 🌟 Why Node.js?

- **✅ No compilation issues** - Pure JavaScript
- **✅ Better Windows support** - Native Node.js
- **✅ Faster installation** - npm is more reliable
- **✅ Rich ecosystem** - Tons of packages available
- **✅ Easy deployment** - Works everywhere

## 🚀 Deployment

### Local Development
```bash
npm run dev
```

### Production
```bash
npm start
```

### Docker (Optional)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## 📊 Performance

- **Scraping**: 5-20 pages in 1-3 minutes
- **Response time**: 1-3 seconds per question
- **Memory usage**: ~50-100MB
- **CPU usage**: Minimal during idle

## 🔒 Security

- **Rate limiting** built-in
- **Input validation** on all endpoints
- **CORS protection** enabled
- **No sensitive data** stored
- **Environment variables** for sensitive configuration

## 🐛 Troubleshooting

### Common Issues

1. **"OpenAI API key not configured"**
   - Create a `.env` file with `OPENAI_API_KEY=your_key_here`
   - Or set the environment variable directly
   - Make sure the `.env` file is in the project root

2. **"Port already in use"**
   - Change the port: `PORT=3001 npm start`
   - Or kill the process using the port

3. **Scraping fails**
   - Check if the website allows scraping
   - Verify the URL is accessible
   - Try reducing the number of pages

### Getting Help

1. Check the console for error messages
2. Verify your OpenAI API key is valid
3. Ensure the website URL is correct
4. Check your internet connection
5. Make sure your `.env` file is properly formatted

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- OpenAI for the GPT models
- Cheerio for HTML parsing
- Natural for text processing
- Express.js for the web framework

---

**Need help?** Check the console output and error messages. Most issues are related to API key configuration or network connectivity.
