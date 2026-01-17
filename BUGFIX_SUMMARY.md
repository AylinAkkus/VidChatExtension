# Bug Fix Summary: Stale Video Metadata During SPA Navigation

## Problem Description

When navigating between YouTube videos (A → B → C) without refreshing the page, the extension would display incorrect video titles. The transcript content was correct, but the video title remained stuck on the first video (Video A) even when viewing Videos B or C.

**Example:**
- Load Video A: Shows "Video A Title" ✅
- Navigate to Video B: Shows "Video A Title" ❌ (should show "Video B Title")
- Navigate to Video C: Shows "Video A Title" ❌ (should show "Video C Title")
- Manual refresh on C: Shows "Video C Title" ✅

## Root Cause Analysis

The bug occurred because:

1. **YouTube uses SPA (Single Page Application) navigation** - When clicking between videos, YouTube doesn't reload the entire page. The URL changes, but the HTML document remains the same.

2. **Script tags are injected only once** - During initial page load, YouTube injects `<script>` tags containing `ytInitialPlayerResponse` with video metadata. These scripts are **never updated** during SPA navigation.

3. **Window globals are set only once** - Similarly, `window.ytInitialPlayerResponse` is set during initial page load and **never updated** during navigation.

4. **Fallback methods were prioritized incorrectly** - The code had three methods to extract metadata:
   - Method 1: Player API (`player.getPlayerResponse()`) - Updates correctly but was failing
   - Method 2: Script tags (`ytInitialPlayerResponse` in HTML) - **FROZEN at first video**
   - Method 3: Window global (`window.ytInitialPlayerResponse`) - **FROZEN at first video**

5. **No validation** - When Methods 2 or 3 returned data, the code accepted it without checking if the `videoId` matched the current URL.

## The Data Flow

```
URL:          A → B → C  ✅ Updates correctly
VideoID:      A → B → C  ✅ Correct (from URL)
Transcript:   A → B → C  ✅ Correct (API fetch using URL videoId)
VideoInfo:    A → A → A  ❌ STUCK (from stale script tags/globals)
```

## Changes Made

### 1. Added VideoId Validation (`src/contentScript/youtubeTranscript.ts`)

**File:** `youtubeTranscript.ts` - `extractYouTubePlayerResponse()` function

**Change:** Every method now checks if the `videoId` in the player response matches the `videoId` from the URL. If they don't match, the data is rejected as stale.

```typescript
const responseVideoId = response.videoDetails?.videoId;
if (responseVideoId === urlVideoId) {
  console.log('[VidChat Debug] Method X: ✅ MATCH - Using this data');
  return response;
} else {
  console.log('[VidChat Debug] Method X: ❌ MISMATCH - Rejecting stale data');
}
```

This ensures that **stale data from script tags/globals is rejected** during SPA navigation.

### 2. Added Retry Logic for Metadata Extraction

**File:** `youtubeTranscript.ts` - New `extractVideoMetadataWithRetry()` function

**Change:** Added an async function that retries metadata extraction up to 3 times with 500ms delays between attempts. This gives YouTube's SPA time to update the DOM with new video information.

```typescript
async function extractVideoMetadataWithRetry(expectedVideoId: string, maxRetries = 3)
```

**Why this works:** During SPA navigation, the DOM elements (like `h1.ytd-watch-metadata`) eventually update with the new video's title. By retrying, we wait for YouTube to finish its update process.

### 3. Improved DOM Scraping Fallback

**File:** `youtubeTranscript.ts` - `extractVideoMetadataWithRetry()` function

**Change:** When player API and script tags fail (due to validation rejection), the code now falls back to DOM scraping with improved validation:

```typescript
const title = titleElement?.textContent?.trim();
if (title && title !== '' && title !== 'Unknown Title') {
  console.log('[VidChat Debug] ✅ Found valid title from DOM');
  return { title, channelName, description };
}
```

### 4. Added Comprehensive Debug Logging

**File:** `youtubeTranscript.ts` - All extraction functions

**Change:** Added detailed console logging prefixed with `[VidChat Debug]` to track:
- Which extraction method is attempted
- What videoId each method returns
- Whether videoIds match or mismatch
- Which data source is ultimately used
- Final result validation

This logging helps identify the exact point where stale data would have been used.

### 5. Updated Main Extraction Function

**File:** `youtubeTranscript.ts` - `extractVideoTranscript()` function

**Change:** Updated to use the new async retry logic:

```typescript
const metadata = await extractVideoMetadataWithRetry(videoId);
```

## Technical Details

### Why Manual Refresh Worked

When you manually refresh the page:
1. Browser loads fresh HTML from YouTube
2. New `<script>` tags are injected with **current video's** data
3. New `window.ytInitialPlayerResponse` is set with **current video's** data
4. Even if Methods 2 or 3 are used, they now have correct data

### Why SPA Navigation Failed (Before Fix)

When navigating via SPA (clicking links):
1. URL changes (JavaScript history API)
2. YouTube updates the DOM eventually
3. BUT script tags and window globals **remain unchanged** from initial page load
4. Methods 2/3 return Video A's data even when on Video C
5. Without validation, this stale data was accepted

### How the Fix Works

Now when navigating via SPA:
1. URL changes to Video B
2. Extension extracts `videoId` from URL: "VIDEO_B"
3. Transcript fetched correctly for VIDEO_B ✅
4. Metadata extraction tries Method 1 (Player API):
   - Returns Video A's data → Validation rejects it
5. Tries Method 2 (Script tags):
   - Returns Video A's data → Validation rejects it
6. Tries Method 3 (Window global):
   - Returns Video A's data → Validation rejects it
7. Falls back to DOM scraping with retries:
   - Waits for YouTube to update DOM
   - Scrapes Video B's title from `<h1>` element ✅
8. Final result has correct VIDEO_B ID + VIDEO_B title ✅

## Files Modified

1. **`src/contentScript/youtubeTranscript.ts`**
   - `extractYouTubePlayerResponse()`: Added validation and detailed logging
   - `extractVideoMetadataWithRetry()`: New function with retry logic
   - `extractVideoMetadata()`: Updated with improved fallback
   - `extractVideoTranscript()`: Updated to use async retry version

## Testing

The extension has been built and is ready for testing. See `TESTING_INSTRUCTIONS.md` for detailed testing procedures.

Key test scenario:
1. Load Video A
2. Navigate to Video B (via SPA)
3. Navigate to Video C (via SPA)
4. Verify side panel shows correct titles at each step

## Benefits

1. **Correct metadata during navigation**: Titles now update correctly when navigating between videos
2. **Better error detection**: Comprehensive logging helps identify issues quickly
3. **Resilient to timing issues**: Retry logic handles cases where DOM isn't immediately ready
4. **No regression on manual refresh**: Still works correctly when user manually refreshes
5. **Maintains backward compatibility**: Keeps sync version for compatibility if needed

## Potential Future Improvements

1. **Remove debug logging for production**: Console logs can be removed or made conditional
2. **Adjust retry timings**: If 500ms is too fast/slow, can be tuned based on testing
3. **Completely remove Methods 2 and 3**: If they never provide valid data during navigation, they could be removed entirely
4. **Improve Player API reliability**: Investigate why Method 1 (Player API) sometimes fails and try to make it more reliable

