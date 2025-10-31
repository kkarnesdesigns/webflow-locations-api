# Webflow Integration Guide

This guide shows you how to integrate the secure Locations API into your Webflow site.

## Option 1: Quick Setup (Recommended)

### Step 1: Add HTML Elements to Your Webflow Page

In Webflow Designer, add these three elements to your page:

1. **Loading Indicator** (Div Block or Text)
   - Element ID: `loading`
   - Content: "Loading locations..."
   - Style as desired

2. **Error Container** (Div Block)
   - Element ID: `error`
   - Display: Hidden (by default)
   - Style: Red background, padding, etc.

3. **Locations Container** (Div Block)
   - Element ID: `collection-container`

### Step 1.5: Add Required CSS

Add an **Embed** element to your page and paste this CSS:

```html
<style>
  /* Ensure grid items are equal height and text wraps inline */
  #collection-container {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
    grid-auto-rows: 1fr;
  }

  #collection-container > a {
    display: flex;
    min-width: 0;
  }

  #collection-container .block {
    min-width: 0;
    width: 100%;
  }

  #collection-container .location-name-text {
    white-space: normal !important;
    word-wrap: break-word !important;
    overflow-wrap: break-word !important;
    word-break: break-word !important;
    hyphens: auto;
    min-width: 0;
  }
</style>
```

### Step 2: Add the Script

1. Go to **Page Settings** (or Project Settings for site-wide)
2. Click **Custom Code**
3. In **Before </body> tag** section, add:

```html
<script src="https://webflow-locations-api.vercel.app/webflow-script-only.js"></script>
```

**OR** copy the entire contents of `webflow-script-only.js` and paste it inside `<script>` tags.

### Step 3: Publish and Test

Publish your Webflow site and test the locations display!

---

## Option 2: Custom Integration

If you want full control, use the code in `webflow-embed-code.html` as a starting point and customize:

### Key Configuration

Edit these values in the script:

```javascript
const CONFIG = {
  apiBaseUrl: 'https://webflow-locations-api.vercel.app/api/locations',
  stateCollectionId: '6839e701b39a27ad1010cd7c', // Your state collection ID
  baseUrl: '/locations' // Your location page URL pattern
};
```

### Status Mapping

The script maps Webflow status option field hashes to display values:

```javascript
const STATUS_MAP = {
  '623f78aa0b815e595a83562106dfe2d0': { text: "We're Open", cssClass: 'text-color-secondary' },
  '7f99e27cfc0c3dc09883a32ceadb4acf': { text: 'Coming Soon', cssClass: 'text-green' }
};
```

**To find your status hashes:**
1. Open browser console on a page with the script running
2. Check the API response for `location-status` field values
3. Add/update mappings as needed

---

## HTML Structure Generated

The script generates this HTML structure for each location:

```html
<a data-w-id="[location-id]" href="/locations/[slug]" class="navigation-link-small menu-dropdown w-inline-block">
  <div class="block">
    <div class="label-regular location-name-text">[Location Name], [State Abbr]</div>
    <div class="paragraph-small [status-css-class]">[Status Text]</div>
  </div>
</a>
```

### CSS Classes Used

Make sure these classes are defined in your Webflow styles:
- `.navigation-link-small`
- `.menu-dropdown`
- `.w-inline-block`
- `.block`
- `.label-regular`
- `.paragraph-small`
- `.text-green` (for "Coming Soon" status)
- `.text-color-secondary` (for "We're Open" status)

---

## Customization Examples

### Change Grid Layout to 2 Columns

Update the `#collection-container` CSS:

```css
#collection-container {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}
```

### Sort Locations Alphabetically

**Note:** Locations are already sorted alphabetically by default! If you want to change the sort order, modify the `fetchAllItems()` function:

```javascript
async function fetchAllItems() {
  const allItems = [];
  // ... existing fetch code ...

  // Sort by state instead of name
  allItems.sort((a, b) => {
    const stateA = a.fieldData.state || '';
    const stateB = b.fieldData.state || '';
    return stateA.localeCompare(stateB);
  });

  return allItems;
}
```

### Filter Locations by Status

Show only open locations:

```javascript
async function fetchAllItems() {
  const allItems = [];
  // ... existing fetch code ...

  // Filter to only show open locations
  const openStatusHash = '623f78aa0b815e595a83562106dfe2d0';
  return allItems.filter(item => item.fieldData['location-status'] === openStatusHash);
}
```

### Custom Location HTML Template

Modify the `renderLocationItem()` function:

```javascript
function renderLocationItem(item, stateAbbr, statusInfo) {
  const name = item.fieldData.name || 'Unnamed Location';
  const slug = item.fieldData.slug || '';
  const address = item.fieldData.address || '';
  const phone = item.fieldData['phone-number'] || '';

  return `
    <div class="location-card">
      <h3>${escapeHtml(name)}, ${escapeHtml(stateAbbr)}</h3>
      <p class="status ${statusInfo.cssClass}">${escapeHtml(statusInfo.text)}</p>
      ${address ? `<p class="address">${escapeHtml(address)}</p>` : ''}
      ${phone ? `<p class="phone">${escapeHtml(phone)}</p>` : ''}
      <a href="/locations/${slug}" class="btn">Learn More</a>
    </div>
  `;
}
```

---

## Troubleshooting

### Locations Not Showing

1. **Check browser console for errors**
   - Open DevTools (F12) and check Console tab

2. **Verify element IDs exist**
   - Ensure `#loading`, `#error`, and `#collection-container` are on the page

3. **Check API endpoint**
   - Open: https://webflow-locations-api.vercel.app/api/locations
   - Should return JSON with location data

### State Abbreviations Not Showing

- Verify `stateCollectionId` is correct in CONFIG
- Check that state field names match (`abbreviation`, `abbr`, `code`, or `name`)

### Status Not Displaying Correctly

1. Check the actual hash values from API response
2. Update `STATUS_MAP` with correct mappings
3. Ensure CSS classes (`.text-green`, `.text-color-secondary`) exist

### CORS Errors

The API should have CORS enabled. If you see CORS errors:
- Verify you're using the correct API URL
- Check Vercel deployment logs for issues

---

## Performance Optimization

### Reduce API Calls

The script automatically caches state lookups. For better performance:

1. **Preload all states** at initialization
2. **Use static state mapping** instead of API calls:

```javascript
const STATE_MAP = {
  '6839e73064325bc87dde3c40': 'TN',
  '6839e72feab2131bf2f9171e': 'NJ',
  // ... add all your states
};

function getStateAbbreviation(stateId) {
  return STATE_MAP[stateId] || '';
}
```

### Lazy Loading

For better initial page load, defer script execution:

```html
<script defer src="https://webflow-locations-api.vercel.app/webflow-script-only.js"></script>
```

---

## Security Notes

- ✅ API token is **never exposed** to the browser
- ✅ All user input is **escaped** to prevent XSS
- ✅ CORS is enabled for browser requests
- ✅ API is read-only (no write/delete operations)

---

## Need Help?

- **API Docs:** See `README.md` in the repository
- **API Endpoint:** https://webflow-locations-api.vercel.app/api/locations
- **GitHub Repository:** https://github.com/kkarnesdesigns/webflow-locations-api
