# sidebar-boilerplate

> Chrome extension Vite + React + Material UI + Manifest v3

## What problems does the current build solve

### 1. Added sidebar

The sidebar opens in a modal window over the page content.

Closes when clicking the close icon, clicking outside the sidebar, or pressing `Esc` on the keyboard
Sidebar files are located in the `/src/contentScript/Sidebar/` folder

### 2. Sidebar styles are isolated from page styles and don't break on complex resources

Extension style isolation is solved by rendering modal windows and caching styles in ShadowDOM. There they are safe from the main page.
In code this is creating a custom theme `createTheme()` (which can be further extended with other settings) and cache `createCache()` which
are then used in `ThemeProvider` and `CacheProvider` providers.
See more details in the `/src/contentScript/Sidebar/Sidebar.tsx` file

### 3. Added Drag&Drop widget (icon) that opens the sidebar

The DnD widget is a button-icon that can:

- Be moved around the screen and will remember its position on the Y axis
- Be moved to the left or right side of the screen on the X axis
- Be closed (minimized) and opened to full size
- Change the displayed icon and color

Widget files are located in the `/src/contentScript/Sidebar/DraggableWidget/` folder

### 4. Dynamic extension script initialization without page reload

When installing the extension on already open tabs, the sidebar (and other content scripts) will not work without reloading the page.
This can affect user behavioral factors, as this may not be obvious to many.
The user installed the extension, went to the previously opened target page, clicks on the icon of the just-installed
extension and nothing happens... At this moment the user may decide that the extension doesn't work and remove it.

Therefore, this build adds a mechanism for dynamically connecting extension scripts to the "old" page and no reload is required.
Managing the scripts described in the `manifest.json` file can be done quite flexibly.

`contentScript` code files that are added to browser tabs when the extension is active are listed in the `content_scripts` section of the `/src/manifest.json` file.
They are added by the browser to the page when it loads.

Until the page is reloaded, these files are added dynamically in the `/src/background/index.ts` file

You need to specify the file required for work. When using only the sidebar - you need to specify only the ordinal
number of the `src/contentScript/Sidebar/index.tsx` file from the `content_scripts` section of the `/src/manifest.json` file.
If there are several content script files needed for the extension to work, then specify all necessary files for loading as
shown in the screenshot.

See more detailed comments in the `/src/background/index.ts` file

### 5. Added handling of extension calls on service pages (files:///, chrome://settings/, etc.)

Not all pages in the browser allow/are suitable for the sidebar to work in them (service pages), so when calling
the sidebar, a new tab `empty-tab.html` will open with the main extension code `<App />` placed on it

### 6. Added extension installation handling with welcome page opening

To improve behavioral factors, it's necessary to handle at least the extension installation event.
This build adds an installation event handler with opening a third-party website page that needs to be specified.

The necessary code is located in the `src/background/index.ts` file in the `chrome.runtime.onInstalled` handler

### 7. Added basic extension localization

When optimizing the extension for publication or adding multilingual support to the extension itself, a localization mechanism is used.

- Added `getI18nText` helper
- `public/_locales` folder with templates for `en` and `ru` locales
- `appName` and `shortDesc` fields in `public/_locales` are required, as they generate the extension name and short description in the manifest
  when working with extension optimization for CWS, others are optional

### 8. Added rating widget

The widget has 2 states.

1. User hasn't left a review and stars are not filled
2. User left a review and its state is remembered in `chrome.storage`

To configure the widget, it's mandatory to specify the correct values for the `FEEDBACK_FORM_LINK` and `GOOD_REVIEW_LINK` constants

See the `/src/components/Rating/rating-widget.tsx` file

## Installation

1. Check that `Node.js` version >= **14**.
2. Specify the extension name in `public/_locales/**/messages.json`.
3. Run `yarn` to install dependencies.

## Developing

Go to the project directory and run the command `yarn dev`

### Add extension locally

1. Activate developer mode 'Developer mode' in Chrome
2. Click 'Load unpacked', and select the `sidebar-boilerplate/build` folder

## Build

Run the following commands

```shell
$ yarn build
```

Now the contents of the `build` folder are ready to be sent to Chrome Web Store.

You can run the command to get a ready archive from the contents of the `build` folder

```shell
$ yarn zip
```

---
