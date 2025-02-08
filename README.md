# Project Impact Statistics Analyzer

## Overview
Project Impact Statistics Analyzer is a web-based tool designed to analyze and visualize the impact of academic research papers using citation and author data from the **Semantic Scholar API**. It processes and presents insights using interactive charts while leveraging **MongoDB caching** for performance optimization.

## Features
- **Data Analysis**: Fetches citation and author data from Semantic Scholar.
- **Visualization**: Generates interactive charts to present research impact.
- **Rate Limiting**: Implements request throttling to prevent excessive API usage.
- **Batch Processing**: Requests data in batches to optimize API calls.
- **Caching**: Uses **MongoDB for caching** API responses to reduce redundant requests and improve performance.
- **Real-time Insights**: Provides up-to-date citation statistics.
- **Levenshtein Similarity**: Calculates name similarity for author matching.
- **User-Friendly Interface**: Offers an intuitive web UI for interacting with analytics.

## Data Sources
The project fetches data from **Semantic Scholar's API**, including:
- **Author Information**: Author ID, publication count, citation count, affiliations.
- **Paper Details**: Title, year, citation count, fields of study, and venue.
- **Citations**: Retrieves first and second-level citation networks.

## Tech Stack
- **Backend**: Node.js, Express.js
- **Frontend**: HTML, CSS, JavaScript
- **Database**: MongoDB (for caching API responses)
- **Visualization**: Chart.js for rendering impact reports
- **API Integration**: Semantic Scholar API

## Installation

### Prerequisites
- [Node.js](https://nodejs.org/) (Latest LTS version recommended)
- npm (Comes with Node.js)
- MongoDB (Ensure it is installed and running locally or provide a connection string)

### Setup
1. Clone the repository:
   ```sh
   git clone https://github.com/sriram-iiith-24/project-impact-statistics-analyzer.git
   cd project-impact-statistics-analyzer
   ```
2. Install dependencies:
   ```sh
   npm install
   ```
3. Set up environment variables:
   - Rename `.env.example` to `.env`.
   - Configure the MongoDB connection string inside `.env`.

4. Start the application:
   ```sh
   node app.js
   ```

## Usage
1. Open the browser and go to `http://localhost:3000/`.
2. Enter an **Author Name** to fetch citation and author details.
3. View interactive charts and insights about research impact.

## File Structure
```
project-impact-statistics-analyzer/
│── public/                 # Frontend assets
│── views/                  # HTML views
│── analyzer.js             # Fetches and processes API data
│── app.js                  # Main server script
│── charts.js               # Visualization logic
│── config.js               # Configuration settings (rate limiting, API endpoints)
│── styles.css              # Stylesheet
│── package.json            # Node.js dependencies
│── README.md               # Project documentation
│── .env                    # Environment variables (MongoDB connection string)
```

## Contributing
We welcome contributions! Feel free to fork the repository and submit pull requests.
