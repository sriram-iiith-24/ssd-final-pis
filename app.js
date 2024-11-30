class ScholarDashboard {
    constructor() {
        this.analyzer = new ScholarAnalyzer();
        this.chartManager = new ChartManager();
        this.analyzer.chartManager = this.chartManager;
        this.elements = this.getElements();
        this.selectedAuthors = new Set();
        this.searchDebounceTimer = null;
        this.bindEvents();
    }

    getElements() {
        const elements = {
            searchInput: document.getElementById('authorSearch'),
            searchButton: document.getElementById('searchButton'),
            analyzeButton: document.getElementById('analyzeSelectedButton'),
            selectedCount: document.getElementById('selectedCount'),
            authorsList: document.getElementById('authorsList'),
            affiliationFilter: document.getElementById('affiliationFilter'),
            selectionPanel: document.getElementById('authorSelectionPanel'),
            analysisResults: document.getElementById('analysisResults'),
            authorProfile: document.getElementById('authorProfile'),
            statsContainer: document.getElementById('statsContainer'),
            citationBreakdown: document.getElementById('citationBreakdown'),
            domainBreakdown: document.getElementById('domainBreakdown'),
            loading: document.getElementById('loading'),
            error: document.getElementById('error')
        };

        // Validate required elements
        Object.entries(elements).forEach(([key, element]) => {
            if (!element) {
                console.error(`Required element not found: ${key}`);
            }
        });

        return elements;
    }

    bindEvents() {
        this.elements.searchButton?.addEventListener('click', () => this.searchAuthors());
        this.elements.searchInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.searchAuthors();
        });
        this.elements.analyzeButton?.addEventListener('click', () => this.analyzeSelected());
        this.elements.affiliationFilter?.addEventListener('input', (e) => 
            this.debounce(() => this.filterAuthors(e.target.value), 300));
        this.elements.searchInput?.addEventListener('input', () => {
            if (this.elements.error) {
                this.elements.error.style.display = 'none';
            }
        });

        // Handle window resize for charts
        window.addEventListener('resize', () => 
            this.debounce(() => this.chartManager?.updateCharts(), 250));
    }

    debounce(func, wait) {
        clearTimeout(this.searchDebounceTimer);
        this.searchDebounceTimer = setTimeout(() => func(), wait);
    }

    async searchAuthors() {
        const query = this.elements.searchInput?.value.trim();
        if (!query) {
            this.showError('Please enter an author name');
            return;
        }

        this.setLoading(true);
        this.clearResults();

        try {
            console.log('Searching for:', query);
            const authors = await this.analyzer.searchAuthors(query);
            
            if (!authors || authors.length === 0) {
                this.showError('No matching authors found');
                return;
            }

            this.displayAuthorResults(authors);
            if (this.elements.selectionPanel) {
                this.elements.selectionPanel.style.display = 'block';
            }
        } catch (error) {
            console.error('Search error:', error);
            this.showError(error.message || 'Error searching authors');
        } finally {
            this.setLoading(false);
        }
    }

    async analyzeSecondLevelCitations(papers) {
        const citations = await this.analyzer.getSecondLevelCitations(papers);
        const secondaryCitations = {};
        let totalSecondary = 0;

        citations.forEach(paper => {
            if (paper && paper.citations) {
                paper.citations.forEach(citation => {
                    if (citation.citingPaper) {
                        totalSecondary+=citation.citingPaper.citationCount;
                        citation.citingPaper.fieldsOfStudy?.forEach(field => {
                            secondaryCitations[field] = (secondaryCitations[field] || 0) + 1;
                        });
                    }
                });
            }
        });

        console.log('Secondary citations:', totalSecondary);

        return {
            totalCitations: totalSecondary,
            domainBreakdown: secondaryCitations
        };
    }

    displayAuthorResults(authors) {
        if (!this.elements.authorsList) return;

        this.elements.authorsList.innerHTML = authors.map(author => this.createAuthorCard(author)).join('');

        // Add event listeners to checkboxes
        this.elements.authorsList.querySelectorAll('.author-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => this.handleAuthorSelection(e));
        });
    }

    createAuthorCard(author) {
        return `
            <div class="author-card" data-author-id="${this.escapeHtml(author.authorId)}">
                <div class="author-select">
                    <input type="checkbox" 
                           class="author-checkbox" 
                           id="author-${this.escapeHtml(author.authorId)}"
                           ${this.selectedAuthors.has(author.authorId) ? 'checked' : ''}>
                </div>
                <div class="author-info">
                    <div class="author-name">${this.escapeHtml(author.name)}</div>
                    ${this.renderAffiliations(author.affiliationDetails)}
                    <div class="author-metrics">
                        <span class="metric">Papers: ${author.paperCount || 0}</span>
                        <span class="metric">Citations: ${author.citationCount || 0}</span>
                        <span class="metric">h-index: ${author.hIndex || 0}</span>
                    </div>
                </div>
                <div class="match-score" title="Name similarity score">
                    <span class="score-value">${author.similarityScore}%</span>
                    <span class="score-label">match</span>
                </div>
            </div>
        `;
    }

    renderAffiliations(affiliations) {
        if (!affiliations || affiliations.length === 0) return '';
        
        return `
            <div class="affiliations">
                ${affiliations.map(aff => `
                    <div class="affiliation">
                        <span class="institution">${this.escapeHtml(aff.institution)}</span>
                        ${aff.department ? `<span class="department">${this.escapeHtml(aff.department)}</span>` : ''}
                        ${aff.location ? `<span class="location">${this.escapeHtml(aff.location)}</span>` : ''}
                    </div>
                `).join('')}
            </div>
        `;
    }

    handleAuthorSelection(event) {
        const authorCard = event.target.closest('.author-card');
        if (!authorCard) return;

        const authorId = authorCard.dataset.authorId;
        
        if (event.target.checked) {
            this.selectedAuthors.add(authorId);
        } else {
            this.selectedAuthors.delete(authorId);
        }

        this.updateSelectionCount();
    }

    updateSelectionCount() {
        const count = this.selectedAuthors.size;
        if (this.elements.selectedCount) {
            this.elements.selectedCount.textContent = count;
        }
        if (this.elements.analyzeButton) {
            this.elements.analyzeButton.disabled = count === 0;
        }
    }

    filterAuthors(filterText) {
        const cards = this.elements.authorsList?.querySelectorAll('.author-card');
        if (!cards) return;

        const searchText = filterText.toLowerCase();
        
        cards.forEach(card => {
            const affiliationText = card.querySelector('.affiliations')?.textContent.toLowerCase() || '';
            const authorText = card.querySelector('.author-name')?.textContent.toLowerCase() || '';
            const matches = affiliationText.includes(searchText) || authorText.includes(searchText);
            card.style.display = searchText === '' || matches ? 'flex' : 'none';
        });
    }

    async analyzeSelected() {
        if (this.selectedAuthors.size === 0) return;
    
        this.setLoading(true);
        try {
            const authorDetails = await this.analyzer.getAuthorDetails(Array.from(this.selectedAuthors));
            const metrics = await this.analyzer.aggregateAuthorMetrics(authorDetails);
            
            // Get secondary citations analysis
            const secondaryImpact = await this.analyzeSecondLevelCitations(metrics.papers);
            
            // Add to metrics
            metrics.secondaryCitations = secondaryImpact.totalCitations;
            metrics.secondaryDomains = secondaryImpact.domainBreakdown;
    
            this.displayAnalysis(authorDetails[0], metrics);
            
            if (this.elements.analysisResults) {
                this.elements.analysisResults.style.display = 'block';
            }
            if (this.elements.selectionPanel) {
                this.elements.selectionPanel.style.display = 'none';
            }
    
        } catch (error) {
            console.error('Analysis error:', error);
            this.showError(error.message || 'Error analyzing authors');
        } finally {
            this.setLoading(false);
        }
    }

    displayAnalysis(authorInfo, metrics) {
        this.updateAuthorProfile(authorInfo);
        this.updateStats(metrics);
        this.updateCitationBreakdown(metrics);
        this.updateDomainBreakdown(metrics);
        this.chartManager.updateCharts(metrics);
    }

    updateAuthorProfile(author) {
        if (!this.elements.authorProfile) return;

        this.elements.authorProfile.innerHTML = `
            <div class="profile-header">
                <h2>${this.escapeHtml(author.name)}</h2>
                ${author.affiliations ? `
                    <div class="affiliations">
                        ${author.affiliations.map(aff => this.escapeHtml(aff)).join(' • ')}
                    </div>
                ` : ''}
            </div>
            ${author.homepage ? `
                <div class="profile-links">
                    <a href="${this.escapeHtml(author.homepage)}" 
                       target="_blank" 
                       rel="noopener noreferrer">Homepage</a>
                </div>
            ` : ''}
        `;
    }

    updateStats(metrics) {
        if (!this.elements.statsContainer) return;
    
        this.elements.statsContainer.innerHTML = `
            <div class="stat-card">
                <h3>Total Publications</h3>
                <div class="stat-value">${metrics.totalPapers}</div>
            </div>
            <div class="stat-card">
                <h3>Direct Citations</h3>
                <div class="stat-value">${metrics.totalCitations}</div>
            </div>
            <div class="stat-card">
                <h3>Secondary Citations</h3>
                <div class="stat-value">${metrics.secondaryCitations || 0}</div>
            </div>
            <div class="stat-card">
                <h3>Avg. Citations Per Paper</h3>
                <div class="stat-value">${metrics.totalCitations/metrics.totalPapers}</div>
            </div>
        `;
    }

    updateCitationBreakdown(metrics) {
        if (!this.elements.citationBreakdown) return;

        const secondaryCitations = {};
        metrics.citations?.forEach(paper => {
            paper.citations?.forEach(citation => {
                citation.citingPaper.fieldsOfStudy?.forEach(field => {
                    if (field) {
                        secondaryCitations[field] = (secondaryCitations[field] || 0) + 1;
                    }
                });
            });
        });

        const sortedDomains = Object.entries(secondaryCitations)
            .sort((a, b) => b[1] - a[1])
            .slice(0, CONFIG.DISPLAY.TOP_DOMAINS);

        this.elements.citationBreakdown.innerHTML = `
            <div class="breakdown-grid">
                ${sortedDomains.map(([domain, count]) => `
                    <div class="breakdown-item">
                        <div class="domain-name">${this.escapeHtml(domain)}</div>
                        <div class="citation-count">${count} citations</div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    updateDomainBreakdown(metrics) {
        if (!this.elements.domainBreakdown) return;

        const totalPapers = metrics.totalPapers || 1;
        const sortedDomains = Object.entries(metrics.domains || {})
            .sort((a, b) => b[1] - a[1])
            .slice(0, CONFIG.DISPLAY.TOP_DOMAINS);

        this.elements.domainBreakdown.innerHTML = `
            <div class="breakdown-grid">
                ${sortedDomains.map(([domain, count]) => `
                    <div class="breakdown-item" data-domain="${this.escapeHtml(domain)}">
                        <div class="domain-header">
                            <div class="domain-name">${this.escapeHtml(domain)}</div>
                            <div class="paper-count">
                                ${count} papers (${((count / totalPapers) * 100).toFixed(1)}%)
                            </div>
                        </div>
                        <div class="domain-papers" id="papers-${domain.replace(/\s+/g, '-').toLowerCase()}" style="display: none;">
                            ${this.getDomainPapers(metrics.papers, domain)}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        // Add click handlers for domain items
        this.elements.domainBreakdown.querySelectorAll('.breakdown-item').forEach(item => {
            item.querySelector('.domain-header').addEventListener('click', () => {
                const domain = item.dataset.domain;
                const papersDiv = item.querySelector('.domain-papers');
                papersDiv.style.display = papersDiv.style.display === 'none' ? 'block' : 'none';
            });
        });
    }

    getDomainPapers(papers, domain) {
        return papers
            .filter(paper => paper.fieldsOfStudy?.includes(domain))
            .map(paper => `
                <div class="paper-item">
                    <div class="paper-title">${this.escapeHtml(paper.title)}</div>
                    <div class="paper-meta">
                        Year: ${paper.year || 'N/A'} | Citations: ${paper.citationCount || 0}
                        ${paper.venue ? ` | Venue: ${this.escapeHtml(paper.venue)}` : ''}
                    </div>
                </div>
            `).join('');
    }

    setLoading(isLoading) {
        if (this.elements.loading) {
            this.elements.loading.style.display = isLoading ? 'flex' : 'none';
        }
        if (this.elements.searchButton) {
            this.elements.searchButton.disabled = isLoading;
        }
        if (this.elements.searchInput) {
            this.elements.searchInput.disabled = isLoading;
        }
        if (this.elements.analyzeButton) {
            this.elements.analyzeButton.disabled = isLoading || this.selectedAuthors.size === 0;
        }
    }

    showError(message) {
        if (this.elements.error) {
            this.elements.error.textContent = message;
            this.elements.error.style.display = 'block';
        }
        console.error('Error:', message);
    }

    clearResults() {
        if (this.elements.error) {
            this.elements.error.style.display = 'none';
        }
        if (this.elements.selectionPanel) {
            this.elements.selectionPanel.style.display = 'none';
        }
        if (this.elements.analysisResults) {
            this.elements.analysisResults.style.display = 'none';
        }
        if (this.elements.authorsList) {
            this.elements.authorsList.innerHTML = '';
        }
        this.selectedAuthors.clear();
        this.updateSelectionCount();
    }

    escapeHtml(unsafe) {
        if (!unsafe) return '';
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}

// Initialize the dashboard
document.addEventListener('DOMContentLoaded', () => {
    window.scholarDashboard = new ScholarDashboard();
});