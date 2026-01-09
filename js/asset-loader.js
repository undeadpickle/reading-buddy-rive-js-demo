// js/asset-loader.js
// OOB (out-of-band) asset preloading and Rive asset loader callback

import { CONFIG, BUDDIES, BODY_PARTS } from './config.js';
import { log } from './main.js';

// Cache for preloaded image bytes (Uint8Array per body part)
const imageCache = new Map();

/**
 * Preload all images for a specific buddy variant
 * Fetches PNGs and stores raw bytes for later decoding by Rive
 * @param {string} buddyId - e.g., 'catdog-orange'
 * @returns {Promise<Map>} - Map of bodyPart -> Uint8Array
 */
export async function preloadBuddyAssets(buddyId) {
    const buddy = BUDDIES[buddyId];
    if (!buddy) {
        log(`Unknown buddy: ${buddyId}`, 'error');
        throw new Error(`Unknown buddy: ${buddyId}`);
    }

    // Return cached if available
    if (imageCache.has(buddyId)) {
        log(`Using cached assets for ${buddyId}`);
        return imageCache.get(buddyId);
    }

    log(`Preloading assets for ${buddyId}...`);
    const assets = new Map();
    const basePath = `${CONFIG.ASSETS_BASE}/${buddyId}`;

    // Filter body parts based on buddy type
    const partsToLoad = BODY_PARTS.filter(part => {
        if (part === 'tail' && !buddy.hasTail) return false;
        return true;
    });

    // Parallel load all images as raw bytes
    const loadPromises = partsToLoad.map(async (part) => {
        const url = `${basePath}/${part}.png`;
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const buffer = await response.arrayBuffer();
            const bytes = new Uint8Array(buffer);
            assets.set(part, bytes);
        } catch (err) {
            log(`  Failed to load ${part}: ${err.message}`, 'warn');
        }
    });

    await Promise.all(loadPromises);
    imageCache.set(buddyId, assets);
    log(`Preloaded ${assets.size} assets for ${buddyId}`);

    return assets;
}

/**
 * Preload ALL buddy variants (call on page load for instant switching)
 */
export async function preloadAllBuddies() {
    log('Preloading all buddy variants...');
    const buddyIds = Object.keys(BUDDIES);

    // Load all in parallel
    await Promise.all(buddyIds.map(id => preloadBuddyAssets(id)));
    log(`All ${buddyIds.length} buddies preloaded`);
}

/**
 * Create the assetLoader callback for Rive
 * This is called by Rive when it encounters OOB (referenced) assets
 * @param {string} buddyId - Current buddy variant
 * @param {object} rive - The rive runtime module (for decodeImage)
 * @returns {Function} - assetLoader callback
 */
export function createAssetLoader(buddyId, rive) {
    return async (asset, bytes) => {
        // If asset has bytes (embedded) or CDN UUID (hosted), let Rive handle it
        if (bytes.length > 0 || asset.cdnUuid?.length > 0) {
            return false;
        }

        // Only handle image assets
        if (asset.isImage) {
            const assetName = asset.name;
            log(`Rive requesting asset: ${assetName}`);

            const buddyAssets = imageCache.get(buddyId);
            if (buddyAssets && buddyAssets.has(assetName)) {
                try {
                    const imageBytes = buddyAssets.get(assetName);

                    // Use Rive's decodeImage to create a RenderImage
                    const image = await rive.decodeImage(imageBytes);

                    // Set the image on the asset
                    asset.setRenderImage(image);

                    // CRITICAL: unref to prevent memory leak
                    image.unref();

                    log(`  Set image for: ${assetName}`);
                    return true; // Asset handled
                } catch (err) {
                    log(`  Error decoding ${assetName}: ${err.message}`, 'error');
                    return false;
                }
            } else {
                log(`  Missing asset in cache: ${assetName}`, 'warn');
                return false; // Let Rive handle fallback
            }
        }

        return false; // Not an image, let Rive handle it
    };
}

/**
 * Get cached assets for a buddy (for debugging)
 */
export function getCachedAssets(buddyId) {
    return imageCache.get(buddyId);
}

/**
 * Clear cache (for memory management if needed)
 */
export function clearAssetCache() {
    imageCache.clear();
    log('Asset cache cleared');
}

/**
 * Check if a buddy's assets are cached
 */
export function isBuddyCached(buddyId) {
    return imageCache.has(buddyId);
}
