const CONFIG = {
    API: {
        BASE_URL: 'https://api.semanticscholar.org/graph/v1',
        HEADERS: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        ENDPOINTS: {
            AUTHOR_SEARCH: '/author/search',
            AUTHOR: '/author',
            PAPER: '/paper'
        },
        FIELDS: {
            AUTHOR_SEARCH: 'authorId,name,paperCount,citationCount,hIndex,affiliations,homepage',
            AUTHOR_DETAILS: 'papers.paperId,papers.title,papers.year,papers.citationCount,papers.fieldsOfStudy,papers.venue,papers.authors',
            PAPER_CITATIONS: 'citingPaper.paperId,citingPaper.title,citingPaper.year,citingPaper.citationCount,citingPaper.fieldsOfStudy,citingPaper.venue,citingPaper.authors'
        },
        RATE_LIMIT: {
            DELAY: 1000,
            BATCH_DELAY: 2000,
            MAX_RETRIES: 3,
            RETRY_DELAY: 3000
        }
    },

    DISPLAY: {
        MAX_AUTHORS: 20,
        TOP_DOMAINS: 8,
        TOP_VENUES: 5,
        TOP_COLLABORATORS: 10
    },

    CHART_DEFAULTS: {
        COLORS: {
            PRIMARY: '#2196F3',
            SECONDARY: '#FFC107',
            SUCCESS: '#4CAF50',
            INFO: '#00BCD4',
            WARNING: '#FF9800',
            DANGER: '#F44336',
            GRADIENTS: [
                ['rgba(33, 150, 243, 0.8)', 'rgba(33, 150, 243, 0.2)'],
                ['rgba(255, 193, 7, 0.8)', 'rgba(255, 193, 7, 0.2)'],
                ['rgba(76, 175, 80, 0.8)', 'rgba(76, 175, 80, 0.2)']
            ]
        },
        OPTIONS: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20
                    }
                },
                tooltip: {
                    enabled: true,
                    mode: 'index',
                    intersect: false
                }
            }
        }
    },

    ERRORS: {
        NETWORK: 'Network error occurred. Please check your connection.',
        API_ERROR: 'Error fetching data from the server.',
        NO_RESULTS: 'No results found for your search.',
        RATE_LIMIT: 'Too many requests. Please wait a moment and try again.',
        VALIDATION: 'Invalid input data provided.',
        UNKNOWN: 'An unexpected error occurred.'
    }
};