const https = require('https');
const fs = require('fs');

const DATA_GOV_URL = 'https://data.gov.il/api/3/action/datastore_search';

// Searching for the dataset named "תחנות טיפת חלב" or similar
const searchDataset = () => {
    const url = 'https://data.gov.il/api/3/action/package_search?q=' + encodeURIComponent('טיפת חלב');
    
    https.get(url, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
            try {
               const data = JSON.parse(body);
               const packages = data.result.results || [];
               
               for (const pkg of packages) {
                   console.log(`Title: ${pkg.title}`);
                   if (pkg.resources && pkg.resources.length > 0) {
                       console.log(`Resource ID: ${pkg.resources[0].id}`);
                   }
               }
            } catch (e) {
                console.error("Error parsing Packages", e);
            }
        });
    }).on('error', console.error);
};

searchDataset();
