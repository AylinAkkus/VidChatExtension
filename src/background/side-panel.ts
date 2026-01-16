// handle side panel opening event from content script

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'openSidePanel') {
    chrome.windows.getCurrent((window) => {
      if (window && window.id) {
        // To open sidePanel manually, you should avoid async/await usage. This is a bug
        // @See https://groups.google.com/a/chromium.org/g/chromium-extensions/c/d5ky9SiZlqQ
        chrome.sidePanel.open({ windowId: window.id })
      }
    })
  }
})

// set action button behavior in extension menu to open side panel on click
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
