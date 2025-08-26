const axios = require('axios');
const cheerio = require('cheerio');
const { URL } = require('url');
const Database = require('./database');

class BusinessWebsiteScraper {
    constructor(baseUrl, maxPages = 10) {
        this.baseUrl = baseUrl;
        this.domain = new URL(baseUrl).hostname;
        this.maxPages = maxPages;
        this.visitedUrls = new Set();
        this.session = axios.create({
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
                'DNT': '1',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1'
            },
            timeout: 15000,
            httpsAgent: new (require('https').Agent)({
                rejectUnauthorized: false
            })
        });
        this.db = new Database();
    }

    async scrapeWebsite() {
        console.log(`🚀 Starting to scrape: ${this.baseUrl}`);
        
        // Clear existing data before starting new scraping session
        await this.db.clearAllData();
        console.log('🗑️ Cleared existing scraped data');
        
        const pagesData = [];
        const urlsToVisit = [this.baseUrl];
        
        while (urlsToVisit.length > 0 && this.visitedUrls.size < this.maxPages) {
            const currentUrl = urlsToVisit.shift();
            
            if (this.visitedUrls.has(currentUrl)) {
                continue;
            }
            
            try {
                console.log(`📄 Scraping page ${this.visitedUrls.size + 1}/${this.maxPages}: ${currentUrl}`);
                const pageData = await this.scrapePage(currentUrl);
                if (pageData) {
                    console.log(`✅ Successfully scraped: ${pageData.title || 'No title'}`);
                    pagesData.push(pageData);
                    this.visitedUrls.add(currentUrl);
                    
                    // Find more URLs to visit
                    const newUrls = this.extractInternalLinks(pageData.html);
                    console.log(`🔗 Found ${newUrls.length} internal links`);
                    for (const url of newUrls) {
                        if (!this.visitedUrls.has(url) && !urlsToVisit.includes(url)) {
                            urlsToVisit.push(url);
                        }
                    }
                } else {
                    console.log(`⚠️ No data extracted from ${currentUrl}`);
                }
                
                // Be respectful to the server
                await this.delay(1000);
                
            } catch (error) {
                console.error(`❌ Error scraping ${currentUrl}:`, error.message);
                continue;
            }
        }
        
        const compiledData = this.compileData(pagesData);
        console.log(`✅ Scraping completed. Processed ${pagesData.length} pages.`);
        
        // Save to database
        await this.saveToDatabase(compiledData, pagesData);
        console.log('💾 Data saved to database');
        
        return compiledData;
    }

    async scrapePage(url) {
        try {
            console.log(`🌐 Fetching ${url}...`);
            
            // Add some additional headers for this specific request
            const response = await this.session.get(url, {
                headers: {
                    'Referer': url,
                    'Sec-Fetch-Dest': 'document',
                    'Sec-Fetch-Mode': 'navigate',
                    'Sec-Fetch-Site': 'none',
                    'Sec-Fetch-User': '?1'
                }
            });
            
            console.log(`📡 Response status: ${response.status}, Content-Type: ${response.headers['content-type']}`);
            
            const $ = cheerio.load(response.data);
            
            const pageData = {
                url: url,
                title: this.extractTitle($),
                textContent: this.extractTextContent($),
                faqs: this.extractFaqs($),
                products: this.extractProducts($),
                contactInfo: this.extractContactInfo($),
                html: $.html()
            };
            
            console.log(`📊 Extracted - Title: "${pageData.title}", Text: ${pageData.textContent?.length || 0} chars, FAQs: ${pageData.faqs?.length || 0}, Products: ${pageData.products?.length || 0}`);
            
            return pageData;
            
        } catch (error) {
            console.error(`❌ Error fetching ${url}:`, error.message);
            if (error.response) {
                console.error(`   Status: ${error.response.status} ${error.response.statusText}`);
            }
            return null;
        }
    }

    extractTitle($) {
        const titleTag = $('title');
        return titleTag.length ? titleTag.text().trim() : '';
    }

    extractTextContent($) {
        // Remove script, style, nav, footer, header elements
        $('script, style, nav, footer, header').remove();
        
        // Look for main content areas
        const contentSelectors = [
            'main', 'article', '.content', '.main-content', 
            '#content', '#main', '.post-content', '.entry-content'
        ];
        
        let mainContent = '';
        
        for (const selector of contentSelectors) {
            const elements = $(selector);
            if (elements.length > 0) {
                mainContent = elements.map((i, el) => $(el).text().trim()).get().join(' ');
                break;
            }
        }
        
        // If no main content found, get text from body
        if (!mainContent) {
            mainContent = $('body').text();
        }
        
        // Clean up the text
        return mainContent.replace(/\s+/g, ' ').trim();
    }

    extractFaqs($) {
        const faqs = [];
        
        // Common FAQ patterns
        const faqSelectors = [
            'h2:contains("FAQ"), h3:contains("FAQ"), .faq, .faqs',
            'h2:contains("Frequently Asked"), h3:contains("Frequently Asked")',
            '.accordion, .faq-item, .faq-question'
        ];
        
        for (const selector of faqSelectors) {
            try {
                const elements = $(selector);
                elements.each((i, element) => {
                    const $el = $(element);
                    const question = $el.find('h3, h4, h5, strong').first();
                    const answer = $el.next('p, div').first();
                    
                    if (question.length && answer.length) {
                        faqs.push({
                            question: question.text().trim(),
                            answer: answer.text().trim()
                        });
                    }
                });
            } catch (error) {
                continue;
            }
        }
        
        return faqs;
    }

    extractProducts($) {
        const products = [];
        
        const productSelectors = [
            '.product', '.item', '.card', '.product-card',
            '.product-item', '.product-box', '.service'
        ];
        
        for (const selector of productSelectors) {
            try {
                const elements = $(selector);
                elements.each((i, element) => {
                    const $el = $(element);
                    const product = {};
                    
                    const nameElem = $el.find('h3, h4, h5, .product-name, .title').first();
                    if (nameElem.length) {
                        product.name = nameElem.text().trim();
                    }
                    
                    const descElem = $el.find('p, .description, .desc').first();
                    if (descElem.length) {
                        product.description = descElem.text().trim();
                    }
                    
                    const priceElem = $el.find('.price, .cost, .amount').first();
                    if (priceElem.length) {
                        product.price = priceElem.text().trim();
                    }
                    
                    if (Object.keys(product).length > 0) {
                        products.push(product);
                    }
                });
            } catch (error) {
                continue;
            }
        }
        
        return products;
    }

    extractContactInfo($) {
        const contactInfo = {};
        
        const contactSelectors = [
            '.contact', '.contact-info', '.contact-details',
            '#contact', '.address', '.phone', '.email'
        ];
        
        for (const selector of contactSelectors) {
            try {
                const elements = $(selector);
                elements.each((i, element) => {
                    const text = $(element).text().trim();
                    
                    // Extract email
                    const emailMatch = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
                    if (emailMatch && !contactInfo.email) {
                        contactInfo.email = emailMatch[0];
                    }
                    
                    // Extract phone
                    const phoneMatch = text.match(/(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
                    if (phoneMatch && !contactInfo.phone) {
                        contactInfo.phone = phoneMatch[0];
                    }
                    
                    // Extract address
                    if (!contactInfo.address && text.length > 20) {
                        contactInfo.address = text;
                    }
                });
            } catch (error) {
                continue;
            }
        }
        
        return contactInfo;
    }

    extractInternalLinks(html) {
        const $ = cheerio.load(html);
        const links = [];
        
        $('a[href]').each((i, element) => {
            const href = $(element).attr('href');
            try {
                const fullUrl = new URL(href, this.baseUrl).href;
                if (new URL(fullUrl).hostname === this.domain) {
                    links.push(fullUrl);
                }
            } catch (error) {
                // Invalid URL, skip
            }
        });
        
        return [...new Set(links)];
    }

    compileData(pagesData) {
        return {
            website_url: this.baseUrl,
            total_pages: pagesData.length,
            scraped_at: new Date().toISOString(),
            pages: pagesData,
            summary: {
                total_faqs: pagesData.reduce((sum, page) => sum + (page.faqs?.length || 0), 0),
                total_products: pagesData.reduce((sum, page) => sum + (page.products?.length || 0), 0),
                contact_info_found: pagesData.some(page => Object.keys(page.contactInfo || {}).length > 0)
            }
        };
    }

    async saveToDatabase(compiledData, pagesData) {
        try {
            // Save scraping session
            const sessionId = await this.db.saveScrapingSession(compiledData);
            
            // Save each page and its data
            for (const pageData of pagesData) {
                const pageId = await this.db.savePage(sessionId, pageData);
                
                // Save FAQs, products, and contact info for this page
                await Promise.all([
                    this.db.saveFaqs(pageId, pageData.faqs),
                    this.db.saveProducts(pageId, pageData.products),
                    this.db.saveContactInfo(pageId, pageData.contactInfo)
                ]);
            }
            
            // Save text chunks for search
            const textChunks = this.prepareTextChunks(compiledData);
            await this.db.saveTextChunks(sessionId, textChunks);
            
        } catch (error) {
            console.error('Error saving to database:', error);
            throw error;
        }
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

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Example usage
async function main() {
    if (process.argv.length < 3) {
        console.log('Usage: node scraper.js <website-url> [max-pages]');
        console.log('Example: node scraper.js https://example.com 5');
        return;
    }
    
    const url = process.argv[2];
    const maxPages = process.argv[3] ? parseInt(process.argv[3]) : 10;
    
    const scraper = new BusinessWebsiteScraper(url, maxPages);
    const data = await scraper.scrapeWebsite();
    
    console.log('\n📊 Scraping Results:');
    console.log(`Website: ${data.website_url}`);
    console.log(`Pages scraped: ${data.total_pages}`);
    console.log(`FAQs found: ${data.summary.total_faqs}`);
    console.log(`Products found: ${data.summary.total_products}`);
    console.log(`Contact info found: ${data.summary.contact_info_found}`);
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = BusinessWebsiteScraper;
