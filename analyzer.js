class ScholarAnalyzer {
    constructor() {
        this.chartManager = null;
        this.baseUrl = 'http://localhost:3000/api';
    }

    async fetchWithRetry(endpoint, options = {}, retries = CONFIG.API.RATE_LIMIT.MAX_RETRIES) {
        const url = `${this.baseUrl}${endpoint}`;
        
        try {
            const response = await fetch(url, {
                ...options,
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                return await response.json();
            }

            if (response.status === 429 && retries > 0) {
                await this.delay(CONFIG.API.RATE_LIMIT.RETRY_DELAY);
                return this.fetchWithRetry(endpoint, options, retries - 1);
            }

            throw new Error(`HTTP error! status: ${response.status}`);
        } catch (error) {
            console.error('Fetch error:', error);
            if (retries > 0) {
                await this.delay(CONFIG.API.RATE_LIMIT.RETRY_DELAY);
                return this.fetchWithRetry(endpoint, options, retries - 1);
            }
            throw error;
        }
    }

    async aggregateAuthorMetrics(authorDetails) {
        const papers = new Map();
        const domains = new Map();
        const venues = new Map();
        const collaborators = new Map();
        const yearlyMetrics = new Map();
        let totalCitations = 0;

        authorDetails.forEach(author => {
            if (!author.papers) return;

            author.papers.forEach(paper => {
                if (!paper || !paper.paperId || papers.has(paper.paperId)) return;
                
                papers.set(paper.paperId, paper);
                totalCitations += paper.citationCount || 0;

                // Track yearly metrics
                const year = paper.year || 'Unknown';
                if (!yearlyMetrics.has(year)) {
                    yearlyMetrics.set(year, { papers: 0, citations: 0 });
                }
                const yearMetric = yearlyMetrics.get(year);
                yearMetric.papers++;
                yearMetric.citations += paper.citationCount || 0;

                // Track domains
                if (Array.isArray(paper.fieldsOfStudy)) {
                    paper.fieldsOfStudy.forEach(field => {
                        if (field) {
                            domains.set(field, (domains.get(field) || 0) + 1);
                        }
                    });
                }

                // Track venues
                if (paper.venue) {
                    venues.set(paper.venue, (venues.get(paper.venue) || 0) + 1);
                }

                // Track collaborators
                if (Array.isArray(paper.authors)) {
                    paper.authors.forEach(coAuthor => {
                        if (!coAuthor || !coAuthor.authorId || 
                            authorDetails.some(a => a.authorId === coAuthor.authorId)) return;
                        
                        if (!collaborators.has(coAuthor.authorId)) {
                            collaborators.set(coAuthor.authorId, {
                                name: coAuthor.name || 'Unknown Author',
                                papers: new Set(),
                                citations: 0
                            });
                        }
                        
                        const collaborator = collaborators.get(coAuthor.authorId);
                        collaborator.papers.add(paper.paperId);
                        collaborator.citations += paper.citationCount || 0;
                    });
                }
            });
        });

        return {
            papers: Array.from(papers.values()),
            totalPapers: papers.size,
            totalCitations,
            yearlyMetrics: Object.fromEntries(yearlyMetrics),
            domains: Object.fromEntries(domains),
            venues: Object.fromEntries(venues),
            collaborators: Array.from(collaborators.entries()).map(([id, data]) => ({
                id,
                name: data.name,
                paperCount: data.papers.size,
                citations: data.citations
            }))
        };
    }

    async fetchWithRetry(endpoint, options = {}, retries = CONFIG.API.RATE_LIMIT.MAX_RETRIES) {
        const url = `${this.baseUrl}${endpoint}`;
        
        try {
            const response = await fetch(url, {
                ...options,
                method: 'GET',
                headers: {
                    ...CONFIG.API.HEADERS
                }
            });

            if (response.ok) {
                return await response.json();
            }

            if (response.status === 429 && retries > 0) {
                await this.delay(CONFIG.API.RATE_LIMIT.RETRY_DELAY);
                return this.fetchWithRetry(endpoint, options, retries - 1);
            }

            throw new Error(`HTTP error! status: ${response.status}`);
        } catch (error) {
            if (retries > 0) {
                await this.delay(CONFIG.API.RATE_LIMIT.RETRY_DELAY);
                return this.fetchWithRetry(endpoint, options, retries - 1);
            }
            throw error;
        }
    }

    async searchAuthors(query) {
        try {
            const searchParams = new URLSearchParams({
                query: query.trim(),
                fields: CONFIG.API.FIELDS.AUTHOR_SEARCH
            });

            const endpoint = `${CONFIG.API.ENDPOINTS.AUTHOR_SEARCH}?${searchParams.toString()}`;
            const searchData = await this.fetchWithRetry(endpoint);
            
            if (!searchData.data || searchData.data.length === 0) {
                throw new Error(CONFIG.ERRORS.NO_RESULTS);
            }

            return searchData.data
                .filter(author => this.validateAuthorData(author))
                .map(author => ({
                    ...author,
                    similarityScore: this.calculateNameSimilarity(query, author.name || '', author.aliases || []),
                    affiliationDetails: this.parseAffiliations(author.affiliations || [])
                }))
                .sort((a, b) => b.similarityScore - a.similarityScore)
                .slice(0, CONFIG.DISPLAY.MAX_AUTHORS);

        } catch (error) {
            console.error('Author search error:', error);
            throw new Error(this.getErrorMessage(error));
        }
    }

    async getAuthorDetails(authorIds) {
        const details = [];
        
        for (const authorId of authorIds) {
            try {
                await this.delay(CONFIG.API.RATE_LIMIT.DELAY);
                
                const searchParams = new URLSearchParams({
                    fields: CONFIG.API.FIELDS.AUTHOR_DETAILS
                });
                
                const endpoint = `${CONFIG.API.ENDPOINTS.AUTHOR}/${encodeURIComponent(authorId)}?${searchParams.toString()}`;
                const data = await this.fetchWithRetry(endpoint);
                
                if (this.validateAuthorDetails(data)) {
                    details.push(data);
                }

            } catch (error) {
                console.error(`Error fetching author ${authorId}:`, error);
            }
        }

        if (details.length === 0) {
            throw new Error(CONFIG.ERRORS.NO_RESULTS);
        }

        return details;
    }

    // async getSecondLevelCitations(papers) {
    //     const citations = [];
    //     const validPapers = papers.filter(paper => paper && paper.paperId);
    //     const batchSize = 5;
        
    //     for (let i = 0; i < validPapers.length; i += batchSize) {
    //         const batch = validPapers.slice(i, i + batchSize);
    //         await this.delay(CONFIG.API.RATE_LIMIT.BATCH_DELAY);
            
    //         const batchPromises = batch.map(async paper => {
    //             const searchParams = new URLSearchParams({
    //                 fields: CONFIG.API.FIELDS.PAPER_CITATIONS
    //             });
                
    //             const endpoint = `${CONFIG.API.ENDPOINTS.PAPER}/${encodeURIComponent(paper.paperId)}/citations?${searchParams.toString()}`;
                
    //             try {
    //                 const data = await this.fetchWithRetry(endpoint);
    //                 return {
    //                     paperId: paper.paperId,
    //                     title: paper.title,
    //                     year: paper.year,
    //                     citations: (data.data || []).filter(citation => 
    //                         citation && citation.citingPaper && citation.citingPaper.paperId
    //                     )
    //                 };
    //             } catch (error) {
    //                 console.error(`Error fetching citations for paper ${paper.paperId}:`, error);
    //                 return null;
    //             }
    //         });
    
    //         const batchResults = await Promise.all(batchPromises);
    //         citations.push(...batchResults.filter(Boolean));
    //     }
    
    //     return citations;
    // }

    async getSecondLevelCitations(papers) {
        console.log('Fetching secondary citations for papers:', papers.length);
        const citations = [];
        const validPapers = papers.filter(paper => paper && paper.paperId);
        const batchSize = 5;
        
        for (let i = 0; i < validPapers.length; i += batchSize) {
            const batch = validPapers.slice(i, i + batchSize);
            await this.delay(CONFIG.API.RATE_LIMIT.BATCH_DELAY);
            
            const batchPromises = batch.map(async paper => {
                const searchParams = new URLSearchParams({
                    fields: CONFIG.API.FIELDS.PAPER_CITATIONS
                });
                
                const endpoint = `${CONFIG.API.ENDPOINTS.PAPER}/${encodeURIComponent(paper.paperId)}/citations?${searchParams.toString()}`;
                
                try {
                    const data = await this.fetchWithRetry(endpoint);
                    console.log(`Citations for paper ${paper.paperId}:`, data);
                    return {
                        paperId: paper.paperId,
                        title: paper.title,
                        year: paper.year,
                        citations: (data.data || []).filter(citation => 
                            citation && citation.citingPaper && citation.citingPaper.paperId
                        )
                    };
                } catch (error) {
                    console.error(`Error fetching citations for paper ${paper.paperId}:`, error);
                    return null;
                }
            });
    
            const batchResults = await Promise.all(batchPromises);
            citations.push(...batchResults.filter(Boolean));
        }
    
        console.log('Total secondary citations fetched:', citations);
        return citations;
    }

    validateAuthorData(author) {
        return author && author.authorId && author.name;
    }

    validateAuthorDetails(data) {
        return data && data.authorId && Array.isArray(data.papers);
    }

    calculateNameSimilarity(query, authorName, aliases) {
        const normalizedQuery = this.normalizeString(query);
        const normalizedName = this.normalizeString(authorName);
        
        let maxScore = this.getLevenshteinSimilarity(normalizedQuery, normalizedName);

        if (Array.isArray(aliases)) {
            aliases.forEach(alias => {
                const aliasScore = this.getLevenshteinSimilarity(
                    normalizedQuery, 
                    this.normalizeString(alias)
                );
                maxScore = Math.max(maxScore, aliasScore);
            });
        }

        if (normalizedQuery === normalizedName) {
            maxScore = 1;
        }

        return Math.round(maxScore * 100);
    }

    normalizeString(str) {
        return (str || '')
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    getLevenshteinSimilarity(s1, s2) {
        if (!s1 || !s2) return 0;
        
        const track = Array(s2.length + 1).fill(null).map(() => 
            Array(s1.length + 1).fill(null));
        
        for (let i = 0; i <= s1.length; i++) track[0][i] = i;
        for (let j = 0; j <= s2.length; j++) track[j][0] = j;

        for (let j = 1; j <= s2.length; j++) {
            for (let i = 1; i <= s1.length; i++) {
                const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1;
                track[j][i] = Math.min(
                    track[j][i - 1] + 1,
                    track[j - 1][i] + 1,
                    track[j - 1][i - 1] + indicator
                );
            }
        }

        const maxLength = Math.max(s1.length, s2.length);
        const distance = track[s2.length][s1.length];
        return 1 - (distance / maxLength);
    }

    parseAffiliations(affiliations) {
        if (!Array.isArray(affiliations)) return [];

        return affiliations.map(affiliation => {
            if (!affiliation) return null;

            const parts = affiliation.split(',').map(part => part.trim());
            return {
                institution: parts[0] || 'Unknown Institution',
                department: parts.length > 1 ? parts[1] : null,
                location: parts.length > 2 ? parts.slice(2).join(', ') : null,
                full: affiliation
            };
        }).filter(Boolean);
    }

    getErrorMessage(error) {
        if (error.message.includes('Failed to fetch')) {
            return CONFIG.ERRORS.NETWORK;
        }
        if (error.message.includes('429')) {
            return CONFIG.ERRORS.RATE_LIMIT;
        }
        return error.message || CONFIG.ERRORS.UNKNOWN;
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}