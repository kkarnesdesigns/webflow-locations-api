# Webflow Locations API

A secure serverless API proxy for fetching Webflow CMS location data. Keeps your Webflow API token safe on the server side while providing CORS-enabled access to location data.

## Features

- Serverless architecture using Vercel Functions
- Secure API token management (never exposed to client)
- CORS-enabled for browser requests
- Supports pagination for large datasets
- Fetch entire collections or individual items
- Works with any Webflow CMS collection (not just locations)
- Automatic error handling and logging

## Quick Start

### Local Development

1. **Clone and install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and add your Webflow API token:
   ```
   WEBFLOW_API_TOKEN=your_actual_token_here
   LOCATION_COLLECTION_ID=67449d55c13cb041357c529f
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Test the API:**
   ```bash
   curl http://localhost:3000/api/locations
   ```

### Deploy to Vercel

1. **Install Vercel CLI (if not already installed):**
   ```bash
   npm install -g vercel
   ```

2. **Deploy:**
   ```bash
   vercel
   ```

3. **Add environment variables in Vercel dashboard:**
   - Go to your project settings
   - Navigate to Environment Variables
   - Add (required):
     - `WEBFLOW_API_TOKEN` = your Webflow API token
     - `LOCATION_COLLECTION_ID` = `67449d55c13cb041357c529f`
   - Add (optional, if you need to fetch state reference data):
     - `STATE_COLLECTION_ID` = your state collection ID

4. **Deploy to production:**
   ```bash
   npm run deploy:prod
   ```

## API Endpoints

### Get All Locations

Fetch all location items with pagination support.

**Endpoint:** `GET /api/locations`

**Query Parameters:**
- `offset` (optional): Pagination offset. Default: `0`
- `limit` (optional): Number of items to return (max 100). Default: `100`

**Example:**
```bash
curl https://your-deployment.vercel.app/api/locations?offset=0&limit=50
```

**Response:**
```json
{
  "items": [
    {
      "id": "...",
      "fieldData": {
        "name": "Location Name",
        "slug": "location-slug",
        "state": "state-id",
        "location-status": "status-id"
      }
    }
  ]
}
```

### Get Specific Item

Fetch a single item by ID from any collection.

**Endpoint:** `GET /api/locations?collectionId=COLLECTION_ID&itemId=ITEM_ID`

**Query Parameters:**
- `collectionId`: The Webflow collection ID
- `itemId`: The specific item ID to fetch

**Example:**
```bash
curl https://your-deployment.vercel.app/api/locations?collectionId=67449d55c13cb041357c529f&itemId=ITEM_ID
```

### Get Items from Any Collection

Fetch items from any Webflow collection (not just locations).

**Endpoint:** `GET /api/locations?collectionId=COLLECTION_ID`

**Example:**
```bash
# Fetch states collection
curl https://your-deployment.vercel.app/api/locations?collectionId=STATE_COLLECTION_ID

# Fetch any other collection
curl https://your-deployment.vercel.app/api/locations?collectionId=YOUR_COLLECTION_ID
```

## Client-Side Integration

Replace direct Webflow API calls with calls to your proxy:

### Before (Insecure - API token exposed):
```javascript
const response = await fetch(
  `https://api.webflow.com/v2/collections/${collectionId}/items`,
  {
    headers: {
      'Authorization': `Bearer ${apiToken}` // Exposed in browser!
    }
  }
);
```

### After (Secure - API token on server):
```javascript
const response = await fetch(
  `https://your-deployment.vercel.app/api/locations?offset=0&limit=100`
);
```

### Example: Fetch All Locations with Pagination

```javascript
async function fetchAllLocations() {
  const allItems = [];
  let offset = 0;
  const limit = 100;
  let hasMore = true;

  while (hasMore) {
    const response = await fetch(
      `https://your-deployment.vercel.app/api/locations?offset=${offset}&limit=${limit}`
    );

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    allItems.push(...data.items);

    hasMore = data.items.length === limit;
    offset += limit;
  }

  return allItems;
}
```

### Example: Fetch State Reference Data

```javascript
async function fetchItemById(collectionId, itemId) {
  const response = await fetch(
    `https://your-deployment.vercel.app/api/locations?collectionId=${collectionId}&itemId=${itemId}`
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch item: ${response.status}`);
  }

  return await response.json();
}

// Usage: Fetch state abbreviation from state collection
const stateData = await fetchItemById('STATE_COLLECTION_ID', '6839e73064325bc87dde3c40');
console.log(stateData.fieldData.abbreviation); // e.g., "TN"

// Note: location-status is an option field, not a reference - its value is directly in the location data
```

## Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `WEBFLOW_API_TOKEN` | Your Webflow API v2 token | Yes | - |
| `LOCATION_COLLECTION_ID` | Default collection ID for locations | Yes | - |
| `STATE_COLLECTION_ID` | Collection ID for state/province data (for reference lookups) | No | - |

**Note:** `location-status` is an option field in the CMS (not a reference collection), so no separate STATUS_COLLECTION_ID is needed.

### Getting Your Webflow API Token

1. Go to https://webflow.com/dashboard/account/integrations
2. Create a new API token
3. Give it read access to CMS collections
4. Copy the token and add it to your environment variables

### Finding Collection IDs

You can find collection IDs in:
- The Webflow Designer URL when viewing a collection
- The Webflow API response when listing collections
- Your existing client-side code (if migrating)

## Security Considerations

This proxy keeps your Webflow API token secure by:

1. **Server-side storage**: Token is only stored in environment variables on the server
2. **No client exposure**: Token never appears in browser code or network requests
3. **CORS protection**: Configure allowed origins in production (update `api/locations.js`)
4. **Environment isolation**: Different tokens for development and production

### Production Hardening (Recommended)

For production deployments, consider adding:

1. **Rate limiting**: Prevent API abuse
2. **API key authentication**: Require API key from clients
3. **Origin restrictions**: Update CORS to only allow your domain
4. **Request validation**: Validate query parameters
5. **Monitoring**: Set up logging and alerts for errors

Example CORS restriction in `api/locations.js`:
```javascript
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://yourdomain.com', // Restrict to your domain
  // ... other headers
};
```

## Monitoring and Debugging

### View Logs (Vercel)

```bash
vercel logs [deployment-url]
```

Or view in the Vercel dashboard under Deployments → Functions tab.

### Local Debugging

The function logs helpful information:
- Request URLs being fetched
- Number of items returned
- Errors with details

Check your terminal when running `npm run dev`.

## Project Structure

```
webflow-locations-api/
├── api/
│   └── locations.js          # Main serverless function
├── .env.example               # Environment variables template
├── .gitignore                 # Git ignore rules
├── package.json               # Dependencies and scripts
├── vercel.json                # Vercel configuration
└── README.md                  # This file
```

## Troubleshooting

### "API token not configured" error

- Make sure `WEBFLOW_API_TOKEN` is set in your environment variables
- For Vercel: Check the Environment Variables in your project settings
- For local: Verify your `.env` file exists and has the token

### CORS errors in browser

- For development: CORS is set to allow all origins (`*`)
- For production: Update `corsHeaders` in `api/locations.js` to allow your specific domain

### 401 Unauthorized from Webflow API

- Your API token may be invalid or expired
- Verify the token has read access to CMS collections
- Generate a new token if needed

### 404 Collection not found

- Verify the `LOCATION_COLLECTION_ID` is correct
- Check that the collection exists in your Webflow project
- Ensure the API token has access to that specific collection

## License

MIT

## Contributing

Feel free to submit issues or pull requests to improve this API proxy.
