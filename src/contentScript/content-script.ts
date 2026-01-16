import { WorkerMessageTypes } from '../background/types'
import { findInputFields } from './findInputFields'
import InputCursorTracker from './cursorTracker/inputCursorTracker'
import { initializeEditorAdapters } from './cursorTracker/editorAdapters'

// Initialize the input cursor tracker
let cursorTracker: InputCursorTracker | null = null

/**
 * We are sending a message to the background script to let it know that the content script has loaded
 */
const initializeContentScript = () => {
  chrome.runtime.sendMessage({ type: WorkerMessageTypes.sidebarLoaded, payload: true })

  // Initialize editor adapters first
  initializeEditorAdapters()

  // Initialize cursor tracking after content script loads
  try {
    cursorTracker = new InputCursorTracker()
    console.log('🎯 Cursor tracker initialized successfully')
  } catch (error) {
    console.warn('Failed to initialize cursor tracker:', error)
  }
};

// Initialize immediately if DOM is ready, otherwise wait for it
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeContentScript)
} else {
  // DOM is already ready, but add a small delay to ensure all scripts are loaded
  setTimeout(initializeContentScript, 100)
}

// Listen for requests to get page data
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.type === 'findInputFields') {
    const data = await findInputFields()
    chrome.runtime.sendMessage({ type: 'findInputFieldsResponse', payload: data })
    return true
  }
})

// Clean up when page unloads
window.addEventListener('beforeunload', () => {
  if (cursorTracker) {
    cursorTracker.destroy()
    cursorTracker = null
  }
})
