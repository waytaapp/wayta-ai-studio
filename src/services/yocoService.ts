/**
 * Yoco API Service Configuration & Handler
 * Built to safely interact with Yoco's Live Online API environment.
 */

const YOCO_SECRET_KEY = import.meta.env.VITE_YOCO_SECRET_KEY || '';
const YOCO_BASE_URL = 'https://online.yoco.com/v1';

export interface YocoSyncResult {
  itemId: string;
  success: boolean;
  message: string;
}

/**
 * Synchronizes an inventory item with the Yoco API.
 * @param {Object} item - The internal product/item data object.
 * @returns {Promise<Object|null>} - Returns the Yoco API JSON response, or null if aborted.
 */
export async function syncItemToYoco(item: any): Promise<any | null> {
  // 1. DEFENSIVE PATH SANITIZATION
  if (!item) {
    console.warn("⚠️ [Yoco Sync] Aborted: No item payload provided.");
    return null;
  }

  const itemId = item.id || item._id;
  if (!itemId || itemId === 'undefined' || itemId === 'null') {
    console.error("❌ [Yoco Sync] Aborted: Item is missing a valid, unique ID identifier.");
    return null;
  }

  const targetUrl = `${YOCO_BASE_URL}/products/${itemId}`;

  // 4. DATA MAPPING VALIDATION
  const yocoPayload = {
    name: item.name || 'Yoco Stick Item',
    description: item.description || 'Inventory Item Sync',
    sku: item.sku || `SKU-${itemId}`,
    amount: Math.round((item.price || 0) * 100),
    currency: item.currency || 'ZAR'
  };

  console.log(`🌐 [Yoco Sync] Calling live Yoco API endpoint: ${targetUrl}...`);

  try {
    // 3. HEADER STABILIZATION
    const response = await fetch(targetUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${YOCO_SECRET_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(yocoPayload)
    });

    // 2. SECURE RESPONSE PARSING (HTML BREAKOUT)
    if (!response.ok) {
      const contentType = response.headers.get('content-type') || '';

      // Check if the server returned HTML instead of JSON
      if (contentType.includes('text/html')) {
        const htmlText = await response.text();
        console.error(`❌ [Yoco API Error] HTTP ${response.status} returned HTML page instead of JSON!`);
        console.error(`📋 Snippet of server response: ${htmlText.substring(0, 250)}...`);
        throw new Error(`Yoco API failed with status ${response.status} and returned an HTML page.`);
      }

      // If it's a regular JSON error payload from Yoco's server
      const errorJson = await response.json().catch(() => ({}));
      throw new Error(`Yoco API Error [${response.status}]: ${JSON.stringify(errorJson)}`);
    }

    // Safe to parse as JSON because response.ok is true
    const resultJson = await response.json();
    console.log("✅ [Yoco Sync] Successful live sync response received:", resultJson);
    return resultJson;

  } catch (error) {
    console.error("❌ [Yoco Sync] Critical invocation failure:", (error as Error).message);
    throw error;
  }
}

/**
 * Batch sync inventory items to Yoco
 */
export async function syncInventoryToYoco(items: any[]): Promise<YocoSyncResult[]> {
  const results: YocoSyncResult[] = [];
  let successCount = 0;
  let failedCount = 0;

  for (const item of items) {
    try {
      await syncItemToYoco(item);
      results.push({
        itemId: item.id || item._id,
        success: true,
        message: 'Successfully synced to Yoco'
      });
      successCount++;
    } catch (error) {
      results.push({
        itemId: item.id || item._id,
        success: false,
        message: (error as Error).message
      });
      failedCount++;
    }
  }

  console.log(`📊 [Yoco Batch Sync] Completed: ${successCount} succeeded, ${failedCount} failed`);
  return results;
}