class ChartManager {
    constructor() {
        this.charts = {};
        this.initializeChartDefaults();
    }

    initializeChartDefaults() {
        Chart.defaults.font.family = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        Chart.defaults.font.size = 13;
    }

    destroyAllCharts() {
        Object.values(this.charts).forEach(chart => {
            if (chart instanceof Chart) {
                chart.destroy();
            }
        });
        this.charts = {};
    }

    updateCharts(metrics) {
        if (!this.validateMetricsData(metrics)) {
            console.error('Invalid metrics data provided');
            return;
        }

        this.destroyAllCharts();
        
        try {
            if (document.getElementById('yearlyTrendChart')) {
                this.createYearlyTrendChart(metrics);
            }
            if (document.getElementById('domainImpactChart')) {
                this.createDomainImpactChart(metrics);
            }
            if (document.getElementById('citationNetworkChart')) {
                this.createCitationNetworkChart(metrics);
            }
            if (document.getElementById('collaborationNetworkChart')) {
                this.createCollaborationNetworkChart(metrics);
            }
            if (document.getElementById('secondLevelCitationChart')) {
                this.createSecondLevelCitationChart(metrics.citations || []);
            }
        } catch (error) {
            console.error('Error updating charts:', error);
        }
    }

    validateMetricsData(metrics) {
        return metrics && 
               typeof metrics === 'object' &&
               metrics.yearlyMetrics &&
               metrics.domains &&
               metrics.totalPapers > 0;
    }

    createYearlyTrendChart(metrics) {
        const ctx = document.getElementById('yearlyTrendChart');
        if (!ctx) return;

        const years = Object.keys(metrics.yearlyMetrics)
            .filter(year => year !== 'Unknown')
            .sort();
            
        if (years.length === 0) return;

        this.charts.yearlyTrend = new Chart(ctx, {
            type: 'line',
            data: {
                labels: years,
                datasets: [
                    {
                        label: 'Publications',
                        data: years.map(year => metrics.yearlyMetrics[year].papers),
                        borderColor: CONFIG.CHART_DEFAULTS.COLORS.PRIMARY,
                        backgroundColor: this.createGradient(ctx, CONFIG.CHART_DEFAULTS.COLORS.PRIMARY),
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: 'Citations',
                        data: years.map(year => metrics.yearlyMetrics[year].citations),
                        borderColor: CONFIG.CHART_DEFAULTS.COLORS.SECONDARY,
                        backgroundColor: this.createGradient(ctx, CONFIG.CHART_DEFAULTS.COLORS.SECONDARY),
                        tension: 0.4,
                        fill: true,
                        yAxisID: 'citations'
                    }
                ]
            },
            options: {
                ...CONFIG.CHART_DEFAULTS.OPTIONS,
                scales: {
                    x: {
                        title: { display: true, text: 'Year' }
                    },
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'Publications' }
                    },
                    citations: {
                        position: 'right',
                        beginAtZero: true,
                        title: { display: true, text: 'Citations' },
                        grid: { drawOnChartArea: false }
                    }
                }
            }
        });
    }

    createDomainImpactChart(metrics) {
        const ctx = document.getElementById('domainImpactChart');
        if (!ctx) return;

        const domains = Object.entries(metrics.domains)
            .sort((a, b) => b[1] - a[1])
            .slice(0, CONFIG.DISPLAY.TOP_DOMAINS);

        this.charts.domainImpact = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: domains.map(([domain]) => this.truncateLabel(domain, 20)),
                datasets: [{
                    label: 'Papers',
                    data: domains.map(([, count]) => count),
                    backgroundColor: CONFIG.CHART_DEFAULTS.COLORS.PRIMARY,
                    borderRadius: 4
                }]
            },
            options: {
                ...CONFIG.CHART_DEFAULTS.OPTIONS,
                indexAxis: 'y',
                scales: {
                    x: {
                        beginAtZero: true,
                        title: { display: true, text: 'Number of Papers' }
                    }
                }
            }
        });
    }

    createCitationNetworkChart(metrics) {
        const ctx = document.getElementById('citationNetworkChart');
        if (!ctx) return;

        const domains = Object.entries(metrics.domains)
            .sort((a, b) => b[1] - a[1])
            .slice(0, CONFIG.DISPLAY.TOP_DOMAINS);

        this.charts.citationNetwork = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: domains.map(([domain]) => this.truncateLabel(domain, 20)),
                datasets: [{
                    data: domains.map(([, count]) => count),
                    backgroundColor: CONFIG.CHART_DEFAULTS.COLORS.GRADIENTS.map(([color]) => color)
                }]
            },
            options: {
                ...CONFIG.CHART_DEFAULTS.OPTIONS,
                cutout: '60%'
            }
        });
    }

    createCollaborationNetworkChart(metrics) {
        const ctx = document.getElementById('collaborationNetworkChart');
        if (!ctx || !metrics.collaborators || metrics.collaborators.length === 0) return;

        const collaborators = metrics.collaborators
            .sort((a, b) => b.paperCount - a.paperCount)
            .slice(0, CONFIG.DISPLAY.TOP_COLLABORATORS);

        this.charts.collaboration = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: collaborators.map(c => this.truncateLabel(c.name, 20)),
                datasets: [
                    {
                        label: 'Joint Publications',
                        data: collaborators.map(c => c.paperCount),
                        backgroundColor: CONFIG.CHART_DEFAULTS.COLORS.PRIMARY,
                        borderRadius: 4
                    },
                    {
                        label: 'Citations',
                        data: collaborators.map(c => c.citations),
                        backgroundColor: CONFIG.CHART_DEFAULTS.COLORS.SECONDARY,
                        borderRadius: 4,
                        yAxisID: 'citations'
                    }
                ]
            },
            options: {
                ...CONFIG.CHART_DEFAULTS.OPTIONS,
                scales: {
                    x: {
                        title: { display: true, text: 'Collaborators' }
                    },
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'Publications' }
                    },
                    citations: {
                        position: 'right',
                        beginAtZero: true,
                        title: { display: true, text: 'Citations' },
                        grid: { drawOnChartArea: false }
                    }
                }
            }
        });
    }

    createSecondLevelCitationChart(citationData) {
        const ctx = document.getElementById('secondLevelCitationChart');
        if (!ctx || !citationData || citationData.length === 0) return;

        const domainCounts = this.aggregateSecondLevelCitations(citationData);
        const domains = Object.entries(domainCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, CONFIG.DISPLAY.TOP_DOMAINS);

        this.charts.secondLevel = new Chart(ctx, {
            type: 'polarArea',
            data: {
                labels: domains.map(([domain]) => this.truncateLabel(domain, 20)),
                datasets: [{
                    data: domains.map(([, count]) => count),
                    backgroundColor: CONFIG.CHART_DEFAULTS.COLORS.GRADIENTS.map(([color]) => color)
                }]
            },
            options: {
                ...CONFIG.CHART_DEFAULTS.OPTIONS,
                scales: {
                    r: {
                        ticks: {
                            beginAtZero: true
                        }
                    }
                }
            }
        });
    }

    aggregateSecondLevelCitations(citationData) {
        const domainCounts = {};
        citationData.forEach(paper => {
            (paper.citations || []).forEach(citation => {
                (citation.citingPaper.fieldsOfStudy || []).forEach(field => {
                    if (field) {
                        domainCounts[field] = (domainCounts[field] || 0) + 1;
                    }
                });
            });
        });
        return domainCounts;
    }

    createGradient(ctx, color) {
        if (!ctx || !ctx.getContext) return color + '40';

        const context = ctx.getContext('2d');
        if (!context || !context.createLinearGradient) return color + '40';

        try {
            const gradient = context.createLinearGradient(0, 0, 0, 400);
            gradient.addColorStop(0, `${color}40`);
            gradient.addColorStop(1, `${color}10`);
            return gradient;
        } catch (error) {
            return color + '40';
        }
    }

    truncateLabel(label, maxLength) {
        if (!label) return 'Unknown';
        return label.length > maxLength ? 
            label.substring(0, maxLength - 3) + '...' : 
            label;
    }
}