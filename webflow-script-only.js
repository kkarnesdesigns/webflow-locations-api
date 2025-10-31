/**
 * Webflow Collection Fetcher for Locations
 * Fetches location items from secure Vercel API proxy
 *
 * USAGE:
 * 1. Add HTML elements with these IDs to your Webflow page:
 *    - #loading (loading indicator)
 *    - #error (error message container)
 *    - #collection-container (location items container)
 * 2. Add CSS for proper grid layout (see below)
 * 3. Paste this script in Webflow Page Settings > Custom Code > Before </body> tag
 *
 * REQUIRED CSS (add to Webflow Embed element or custom CSS):
 * <style>
 *   #collection-container {
 *     display: grid;
 *     grid-template-columns: repeat(3, 1fr);
 *     gap: 1rem;
 *     grid-auto-rows: 1fr;
 *   }
 *   #collection-container > a {
 *     display: flex;
 *     min-width: 0;
 *   }
 *   #collection-container .block {
 *     min-width: 0;
 *     width: 100%;
 *   }
 *   #collection-container .location-name-text {
 *     white-space: normal !important;
 *     word-wrap: break-word !important;
 *     overflow-wrap: break-word !important;
 *     word-break: break-word !important;
 *     hyphens: auto;
 *     min-width: 0;
 *   }
 * </style>
 */

(function() {
  // Configuration
  const CONFIG = {
    apiBaseUrl: 'https://webflow-locations-api.vercel.app/api/locations',
    stateCollectionId: '6839e701b39a27ad1010cd7c', // State collection ID
    baseUrl: '/locations' // Base path for location pages
  };

  // Known status hash mappings (Webflow option field values)
  const STATUS_MAP = {
    '623f78aa0b815e595a83562106dfe2d0': { text: "We're Open", cssClass: 'text-color-secondary' },
    '7f99e27cfc0c3dc09883a32ceadb4acf': { text: 'Coming Soon', cssClass: 'text-green' }
  };

  // Cache for reference data
  const cache = {
    states: new Map()
  };

  // DOM element references
  const elements = {
    container: document.getElementById('collection-container'),
    loading: document.getElementById('loading'),
    error: document.getElementById('error')
  };

  /**
   * Fetches collection items from Vercel API proxy
   * @param {number} offset - Pagination offset
   * @param {number} limit - Number of items to fetch (max 100)
   * @returns {Promise<Object>} Response containing items and pagination info
   */
  async function fetchCollectionItems(offset = 0, limit = 100) {
    try {
      const url = new URL(CONFIG.apiBaseUrl);
      url.searchParams.append('offset', offset);
      url.searchParams.append('limit', limit);

      const response = await fetch(url, {
        method: 'GET'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `API request failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching collection items:', error);
      throw error;
    }
  }

  /**
   * Fetches a single item by ID from any collection via Vercel API
   * @param {string} collectionId - Collection ID
   * @param {string} itemId - Item ID to fetch
   * @returns {Promise<Object>} Item data
   */
  async function fetchItemById(collectionId, itemId) {
    if (!collectionId || !itemId) return null;

    try {
      const url = new URL(CONFIG.apiBaseUrl);
      url.searchParams.append('collectionId', collectionId);
      url.searchParams.append('itemId', itemId);

      const response = await fetch(url, {
        method: 'GET'
      });

      if (!response.ok) {
        console.warn(`Failed to fetch item ${itemId}: ${response.status}`);
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error(`Error fetching item ${itemId}:`, error);
      return null;
    }
  }

  /**
   * Fetches state abbreviation for a given state ID
   * @param {string} stateId - State reference ID
   * @returns {Promise<string>} State abbreviation
   */
  async function getStateAbbreviation(stateId) {
    if (!stateId) return '';

    // Return from cache if available
    if (cache.states.has(stateId)) {
      return cache.states.get(stateId);
    }

    try {
      const stateData = await fetchItemById(CONFIG.stateCollectionId, stateId);

      if (stateData && stateData.fieldData) {
        // Try common field names for state abbreviation
        const abbr = stateData.fieldData.abbreviation ||
                     stateData.fieldData.abbr ||
                     stateData.fieldData.code ||
                     stateData.fieldData.name ||
                     '';

        cache.states.set(stateId, abbr);
        return abbr;
      }
    } catch (error) {
      console.error(`Error fetching state ${stateId}:`, error);
    }

    return '';
  }

  /**
   * Gets status info for a given status hash
   * @param {string} statusHash - Status option field hash
   * @returns {Object} Object with status text and CSS class
   */
  function getStatusInfo(statusHash) {
    if (!statusHash) {
      return { text: '', cssClass: 'text-color-secondary' };
    }

    // Return mapped status or default
    return STATUS_MAP[statusHash] || {
      text: 'Coming Soon',
      cssClass: 'text-color-secondary'
    };
  }

  /**
   * Escapes HTML special characters to prevent XSS
   * @param {string} text - Text to escape
   * @returns {string} Escaped text safe for HTML insertion
   */
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Renders a single location item as HTML
   * @param {Object} item - Location item from API
   * @param {string} stateAbbr - State abbreviation
   * @param {Object} statusInfo - Status info with text and cssClass
   * @returns {string} HTML string for the item
   */
  function renderLocationItem(item, stateAbbr, statusInfo) {
    const name = item.fieldData.name || 'Unnamed Location';
    const slug = item.fieldData.slug || '';
    const itemUrl = slug ? `${CONFIG.baseUrl}/${slug}` : '#';

    // Escape all text content for security
    const safeName = escapeHtml(name);
    const safeState = escapeHtml(stateAbbr);
    const safeStatus = escapeHtml(statusInfo.text);

    return `
      <a data-w-id="${item.id}" href="${itemUrl}" class="navigation-link-small menu-dropdown w-inline-block">
        <div class="block">
          <div class="label-regular location-name-text">${safeName}, ${safeState}</div>
          <div class="paragraph-small ${statusInfo.cssClass}">${safeStatus}</div>
        </div>
      </a>
    `;
  }

  /**
   * Processes and renders all location items
   * @param {Array} items - Array of location items from API
   */
  async function renderAllLocations(items) {
    if (!items || items.length === 0) {
      elements.container.innerHTML = '<p style="grid-column: 1 / -1; text-align: center;">No locations found.</p>';
      return;
    }

    // Process all items and fetch their reference data
    const processedItems = await Promise.all(
      items.map(async (item) => {
        const stateId = item.fieldData.state;
        const statusHash = item.fieldData['location-status'];

        // Fetch state data
        const stateAbbr = await getStateAbbreviation(stateId);
        const statusInfo = getStatusInfo(statusHash);

        return renderLocationItem(item, stateAbbr, statusInfo);
      })
    );

    // Join all HTML and insert into container
    elements.container.innerHTML = processedItems.join('');
  }

  /**
   * Shows error message to user
   * @param {string} message - Error message to display
   */
  function showError(message) {
    elements.error.textContent = message;
    elements.error.style.display = 'block';
    elements.loading.style.display = 'none';
  }

  /**
   * Fetches all items from collection (handles pagination automatically)
   * @returns {Promise<Array>} All collection items sorted alphabetically
   */
  async function fetchAllItems() {
    const allItems = [];
    let offset = 0;
    const limit = 100;
    let hasMore = true;

    while (hasMore) {
      const response = await fetchCollectionItems(offset, limit);
      allItems.push(...response.items);

      // Check if there are more items to fetch
      hasMore = response.items.length === limit;
      offset += limit;

      // Safety limit: stop after 1000 items
      if (allItems.length >= 1000) {
        console.warn('Reached maximum item limit of 1000');
        break;
      }
    }

    // Sort alphabetically by location name
    allItems.sort((a, b) => {
      const nameA = (a.fieldData.name || '').toLowerCase();
      const nameB = (b.fieldData.name || '').toLowerCase();
      return nameA.localeCompare(nameB);
    });

    return allItems;
  }

  /**
   * Main initialization function
   * Fetches and renders location items when page loads
   */
  async function init() {
    try {
      // Fetch all location items
      const items = await fetchAllItems();

      // Hide loading indicator
      elements.loading.style.display = 'none';

      // Render items with their reference data
      await renderAllLocations(items);

      // Log success for debugging
      console.log(`Successfully loaded ${items.length} location(s)`);

    } catch (error) {
      // Handle and display errors
      showError(`Failed to load locations. ${error.message}`);
      console.error('Initialization error:', error);
    }
  }

  // Initialize when DOM is fully loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
