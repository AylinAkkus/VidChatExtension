# Testing Instructions for Stale Metadata Bug Fix

## What Was Fixed

### The Bug
When navigating between YouTube videos (A → B → C), the video title stayed stuck on Video A's title, even though the transcript was loading correctly for the current video. This was caused by stale metadata from script tags and window globals that were injected during initial page load and never updated during YouTube's SPA (Single Page Application) navigation.

### The Fix
Three key improvements were implemented:

1. **VideoId Validation**: All metadata extraction methods now validate that the `videoId` in the player response matches the `videoId` from the URL. Stale data is rejected.

2. **Retry Logic**: Added retry mechanism with 500ms delays between attempts to give YouTube's SPA time to update the DOM with new video information.

3. **Comprehensive Logging**: Added detailed console logging to track which extraction method succeeds and identify mismatches.

## How to Test

### Step 1: Load the Extension
1. Open Chrome/Edge browser
2. Go to `chrome://extensions/` (or `edge://extensions/`)
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked"
5. Select the `/Users/aylin/Documents/AskTheVideo/build` folder
6. The VidChat extension should now be loaded

### Step 2: Open DevTools Console
1. Go to any YouTube video (Video A)
2. Press `F12` or right-click → "Inspect" to open DevTools
3. Click on the "Console" tab
4. You should see debug logs prefixed with `[VidChat Debug]`

### Step 3: Test Navigation Flow
1. **Initial Load (Video A)**
   - Load any YouTube video with captions
   - Check console logs for:
     - `STARTING TRANSCRIPT EXTRACTION`
     - `URL VideoId: [video-a-id]`
     - Check which method succeeded (Method 1, 2, or 3)
     - Verify `FINAL RESULT` shows correct title for Video A
   - Open the side panel and verify title matches Video A

2. **Navigate to Video B (SPA)**
   - Click on another video in the sidebar or search results
   - **DO NOT refresh the page** - let YouTube navigate via SPA
   - Check console logs for:
     - New `STARTING TRANSCRIPT EXTRACTION` 
     - `URL VideoId: [video-b-id]`
     - Look for `❌ MISMATCH` messages (this confirms the fix is working)
     - Verify `FINAL RESULT` shows correct title for Video B
   - Open the side panel and verify title now shows Video B (not Video A)

3. **Navigate to Video C (SPA)**
   - Click on another video again
   - **DO NOT refresh the page**
   - Check console logs for correct Video C data
   - Verify side panel shows Video C title (not Video A or B)

4. **Manual Refresh Test**
   - While on Video C, manually refresh the page (`F5` or `Cmd+R`)
   - Check console logs
   - Verify title still shows correctly for Video C

### Expected Console Output

#### When Bug is Fixed (Good)
```
[VidChat Debug] === Extracting Player Response ===
[VidChat Debug] URL VideoId: VIDEO_B_ID
[VidChat Debug] Trying Method 1: Player API...
[VidChat Debug] Method 1: Got response
[VidChat Debug] Method 1: Response VideoId: VIDEO_A_ID
[VidChat Debug] Method 1: ❌ MISMATCH - Rejecting stale data
[VidChat Debug] Trying Method 2: Script Tags...
[VidChat Debug] Method 2: Response VideoId: VIDEO_A_ID
[VidChat Debug] Method 2: ❌ MISMATCH - Rejecting stale data (likely from initial page load)
[VidChat Debug] Trying Method 3: Window Global...
[VidChat Debug] Method 3: Response VideoId: VIDEO_A_ID
[VidChat Debug] Method 3: ❌ MISMATCH - Rejecting stale data
[VidChat Debug] ❌ ALL METHODS FAILED OR RETURNED STALE DATA - returning null
[VidChat Debug] playerResponse.videoDetails not available, falling back to DOM scraping
[VidChat Debug] DOM Scraping - Title: [Correct Video B Title]
[VidChat Debug] ✅ Found valid title from DOM
```

#### When Bug Still Occurs (Bad)
```
[VidChat Debug] Method 2: SUCCESS! Found in script tag
[VidChat Debug] Method 2: Response VideoId: VIDEO_A_ID  # Wrong!
[VidChat Debug] FINAL RESULT:
[VidChat Debug] VideoId: VIDEO_B_ID
[VidChat Debug] VideoTitle: Video A Title  # Wrong!
```

### What to Look For

✅ **Success Indicators:**
- Console shows `❌ MISMATCH` messages when navigating to new videos
- Console shows `✅ Found valid title from DOM`
- Side panel displays correct video title after navigation
- VideoId in final result matches URL VideoId

❌ **Failure Indicators:**
- Console shows Method 2 or 3 succeeding without `MISMATCH` warnings
- Side panel shows wrong video title (stuck on first video)
- VideoId and title mismatch in final result

### Additional Tests

1. **Fast Navigation**: Navigate quickly between 5-6 videos to stress test the retry logic
2. **Slow Network**: Throttle network in DevTools (Network tab → "Slow 3G") and test navigation
3. **No Captions Video**: Try navigating to a video without captions to ensure error handling works
4. **Tab Switching**: Open multiple YouTube video tabs and switch between them

## Reporting Issues

If you encounter any problems, please provide:
1. The full console output (especially `[VidChat Debug]` lines)
2. Which navigation scenario failed (A→B, B→C, etc.)
3. Whether manual refresh fixes it
4. The video IDs involved (visible in console logs)

## Cleanup

After testing, you can remove the debug logging by commenting out the console.log statements if they're too verbose for production use.

