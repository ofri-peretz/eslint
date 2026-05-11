const https = require('https');
function callExternalApi(endpoint, options = {}) {
  return new Promise((resolve, reject) => {
    const {
      method = 'GET',
      headers = {},
      body = null,
      apiKey = process.env.API_KEY,
      timeout = 5000
    } = options;
    const requestHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      ...headers
    };
    const requestOptions = {
      method,
      headers: requestHeaders,
      timeout
    };
    const req = https.request(endpoint, requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch (err) {
            resolve(data);
          }
        } else {
          reject(new Error(`API Error: ${res.statusCode} - ${data}`));
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}
module.exports = callExternalApi;
