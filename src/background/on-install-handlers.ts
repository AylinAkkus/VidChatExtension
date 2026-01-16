/**
 * Add extension installation handlers here
 *
 * For example:
 * - after extension installation, open a thank you page with brief explanations of how
 * the extension works
 */
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === chrome.runtime.OnInstalledReason.INSTALL) {
    chrome.tabs.create({
      url: 'https://yourwebsite.com/welcome',
    })
  } else if (details.reason === chrome.runtime.OnInstalledReason.UPDATE) {
  } else if (details.reason === chrome.runtime.OnInstalledReason.CHROME_UPDATE) {
  } else if (details.reason === chrome.runtime.OnInstalledReason.SHARED_MODULE_UPDATE) {
  }

  chrome.runtime?.setUninstallURL?.('https://forms.gle/<<your-uninstall-form-link>>')
})
