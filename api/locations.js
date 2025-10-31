/**
 * Webflow Locations API Proxy
 * Serverless function that proxies requests to Webflow CMS API v2
 * Keeps API token secure and handles CORS
 */

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
  'Content-Type': 'application/json'
};

/**
 * Main handler for the serverless function
 */
module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.setHeader('Content-Type', 'application/json');

  // Handle OPTIONS request (CORS preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method not allowed. Only GET requests are supported.'
    });
  }

  try {
    // Get configuration from environment variables
    const WEBFLOW_API_TOKEN = process.env.WEBFLOW_API_TOKEN;
    const LOCATION_COLLECTION_ID = process.env.LOCATION_COLLECTION_ID;
    const WEBFLOW_API_BASE = 'https://api.webflow.com/v2';

    // Validate required environment variables
    if (!WEBFLOW_API_TOKEN) {
      console.error('WEBFLOW_API_TOKEN environment variable is not set');
      return res.status(500).json({
        error: 'Server configuration error. API token not configured.'
      });
    }

    if (!LOCATION_COLLECTION_ID) {
      console.error('LOCATION_COLLECTION_ID environment variable is not set');
      return res.status(500).json({
        error: 'Server configuration error. Collection ID not configured.'
      });
    }

    // Parse query parameters
    const {
      collectionId = LOCATION_COLLECTION_ID,
      itemId,
      offset = '0',
      limit = '100'
    } = req.query;

    // Build Webflow API URL
    let webflowUrl;
    if (itemId) {
      // Fetch specific item
      webflowUrl = `${WEBFLOW_API_BASE}/collections/${collectionId}/items/${itemId}`;
    } else {
      // Fetch collection items with pagination
      webflowUrl = `${WEBFLOW_API_BASE}/collections/${collectionId}/items?offset=${offset}&limit=${limit}`;
    }

    console.log(`Fetching from Webflow API: ${webflowUrl}`);

    // Make request to Webflow API
    const webflowResponse = await fetch(webflowUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${WEBFLOW_API_TOKEN}`,
        'accept-version': '1.0.0'
      }
    });

    // Handle non-OK responses
    if (!webflowResponse.ok) {
      const errorText = await webflowResponse.text();
      console.error(`Webflow API error: ${webflowResponse.status} - ${errorText}`);

      return res.status(webflowResponse.status).json({
        error: `Webflow API error: ${webflowResponse.status} ${webflowResponse.statusText}`,
        details: errorText
      });
    }

    // Parse and return the successful response
    const data = await webflowResponse.json();

    // Log success for monitoring
    if (itemId) {
      console.log(`Successfully fetched item ${itemId} from collection ${collectionId}`);
    } else {
      const itemCount = data.items ? data.items.length : 0;
      console.log(`Successfully fetched ${itemCount} items from collection ${collectionId}`);
    }

    return res.status(200).json(data);

  } catch (error) {
    // Handle unexpected errors
    console.error('Unexpected error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};
