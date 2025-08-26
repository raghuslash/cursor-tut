const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
    constructor() {
        const dbPath = path.join(__dirname, 'scraped_data.db');
        this.db = new sqlite3.Database(dbPath);
        this.initializeTables();
    }

    initializeTables() {
        const createTables = `
            CREATE TABLE IF NOT EXISTS scraping_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                website_url TEXT NOT NULL,
                total_pages INTEGER,
                scraped_at TEXT,
                summary TEXT
            );

            CREATE TABLE IF NOT EXISTS pages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id INTEGER,
                url TEXT NOT NULL,
                title TEXT,
                text_content TEXT,
                FOREIGN KEY (session_id) REFERENCES scraping_sessions (id)
            );

            CREATE TABLE IF NOT EXISTS faqs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                page_id INTEGER,
                question TEXT NOT NULL,
                answer TEXT NOT NULL,
                FOREIGN KEY (page_id) REFERENCES pages (id)
            );

            CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                page_id INTEGER,
                name TEXT,
                description TEXT,
                price TEXT,
                FOREIGN KEY (page_id) REFERENCES pages (id)
            );

            CREATE TABLE IF NOT EXISTS contact_info (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                page_id INTEGER,
                email TEXT,
                phone TEXT,
                address TEXT,
                FOREIGN KEY (page_id) REFERENCES pages (id)
            );

            CREATE TABLE IF NOT EXISTS text_chunks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id INTEGER,
                chunk_text TEXT NOT NULL,
                FOREIGN KEY (session_id) REFERENCES scraping_sessions (id)
            );
        `;

        this.db.exec(createTables, (err) => {
            if (err) {
                console.error('Error creating tables:', err);
            }
        });
    }

    clearAllData() {
        return new Promise((resolve, reject) => {
            const deleteQueries = [
                'DELETE FROM text_chunks',
                'DELETE FROM contact_info',
                'DELETE FROM products',
                'DELETE FROM faqs',
                'DELETE FROM pages',
                'DELETE FROM scraping_sessions'
            ];

            this.db.serialize(() => {
                deleteQueries.forEach(query => {
                    this.db.run(query);
                });
                resolve();
            });
        });
    }

    saveScrapingSession(websiteData) {
        return new Promise((resolve, reject) => {
            const { website_url, total_pages, scraped_at, summary } = websiteData;
            
            this.db.run(
                'INSERT INTO scraping_sessions (website_url, total_pages, scraped_at, summary) VALUES (?, ?, ?, ?)',
                [website_url, total_pages, scraped_at, JSON.stringify(summary)],
                function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(this.lastID);
                    }
                }
            );
        });
    }

    savePage(sessionId, pageData) {
        return new Promise((resolve, reject) => {
            const { url, title, textContent } = pageData;
            
            this.db.run(
                'INSERT INTO pages (session_id, url, title, text_content) VALUES (?, ?, ?, ?)',
                [sessionId, url, title, textContent],
                function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(this.lastID);
                    }
                }
            );
        });
    }

    saveFaqs(pageId, faqs) {
        return new Promise((resolve, reject) => {
            if (!faqs || faqs.length === 0) {
                resolve();
                return;
            }

            const stmt = this.db.prepare('INSERT INTO faqs (page_id, question, answer) VALUES (?, ?, ?)');
            
            faqs.forEach(faq => {
                stmt.run([pageId, faq.question, faq.answer]);
            });
            
            stmt.finalize((err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    saveProducts(pageId, products) {
        return new Promise((resolve, reject) => {
            if (!products || products.length === 0) {
                resolve();
                return;
            }

            const stmt = this.db.prepare('INSERT INTO products (page_id, name, description, price) VALUES (?, ?, ?, ?)');
            
            products.forEach(product => {
                stmt.run([pageId, product.name, product.description, product.price]);
            });
            
            stmt.finalize((err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    saveContactInfo(pageId, contactInfo) {
        return new Promise((resolve, reject) => {
            if (!contactInfo || Object.keys(contactInfo).length === 0) {
                resolve();
                return;
            }

            this.db.run(
                'INSERT INTO contact_info (page_id, email, phone, address) VALUES (?, ?, ?, ?)',
                [pageId, contactInfo.email, contactInfo.phone, contactInfo.address],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }

    saveTextChunks(sessionId, textChunks) {
        return new Promise((resolve, reject) => {
            if (!textChunks || textChunks.length === 0) {
                resolve();
                return;
            }

            const stmt = this.db.prepare('INSERT INTO text_chunks (session_id, chunk_text) VALUES (?, ?)');
            
            textChunks.forEach(chunk => {
                stmt.run([sessionId, chunk]);
            });
            
            stmt.finalize((err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    getLatestSession() {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT * FROM scraping_sessions ORDER BY id DESC LIMIT 1',
                (err, row) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(row);
                    }
                }
            );
        });
    }

    getTextChunks(sessionId) {
        return new Promise((resolve, reject) => {
            this.db.all(
                'SELECT chunk_text FROM text_chunks WHERE session_id = ?',
                [sessionId],
                (err, rows) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(rows.map(row => row.chunk_text));
                    }
                }
            );
        });
    }

    getWebsiteData(sessionId) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT * FROM scraping_sessions WHERE id = ?',
                [sessionId],
                async (err, session) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    if (!session) {
                        resolve(null);
                        return;
                    }

                    try {
                        // Get all pages for this session
                        const pages = await this.getPages(sessionId);
                        
                        const websiteData = {
                            website_url: session.website_url,
                            total_pages: session.total_pages,
                            scraped_at: session.scraped_at,
                            summary: JSON.parse(session.summary),
                            pages: pages
                        };
                        
                        resolve(websiteData);
                    } catch (error) {
                        reject(error);
                    }
                }
            );
        });
    }

    getPages(sessionId) {
        return new Promise((resolve, reject) => {
            this.db.all(
                'SELECT * FROM pages WHERE session_id = ?',
                [sessionId],
                async (err, pages) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    try {
                        // Get FAQs, products, and contact info for each page
                        const enrichedPages = await Promise.all(pages.map(async (page) => {
                            const [faqs, products, contactInfo] = await Promise.all([
                                this.getFaqs(page.id),
                                this.getProducts(page.id),
                                this.getContactInfo(page.id)
                            ]);

                            return {
                                url: page.url,
                                title: page.title,
                                textContent: page.text_content,
                                faqs: faqs,
                                products: products,
                                contactInfo: contactInfo
                            };
                        }));

                        resolve(enrichedPages);
                    } catch (error) {
                        reject(error);
                    }
                }
            );
        });
    }

    getFaqs(pageId) {
        return new Promise((resolve, reject) => {
            this.db.all(
                'SELECT question, answer FROM faqs WHERE page_id = ?',
                [pageId],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });
    }

    getProducts(pageId) {
        return new Promise((resolve, reject) => {
            this.db.all(
                'SELECT name, description, price FROM products WHERE page_id = ?',
                [pageId],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });
    }

    getContactInfo(pageId) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT email, phone, address FROM contact_info WHERE page_id = ?',
                [pageId],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row || {});
                }
            );
        });
    }

    close() {
        return new Promise((resolve) => {
            this.db.close((err) => {
                if (err) {
                    console.error('Error closing database:', err);
                }
                resolve();
            });
        });
    }
}

module.exports = Database;