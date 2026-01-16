chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.type && message.type === 'openPopup') {
    chrome.action.openPopup()
  }
})
