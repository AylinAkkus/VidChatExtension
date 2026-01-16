/**
 * Simple controller for working with browser tabs
 */
class TabsController {
  /**
   * Hash table for remembering loaded contentScripts
   * Key - browser tab id. If tab id is present in this table, we conclude
   * that contentScript has loaded on this tab
   */
  tabsWithLoadedSidebar: { [key: number]: boolean } = {}

  /**
   * List of contentScripts that need to be dynamically loaded on the page
   */
  targetContentScriptFiles: string[] = []

  /**
   * Mark the tab where contentScript was loaded
   * @param tabId - browser tab id
   */
  setTabContentScriptLoaded = (tabId: number | undefined) => {
    if (!tabId) return
    this.tabsWithLoadedSidebar[tabId] = true
  }

  /**
   * Check if contentScript was loaded on this tab
   * @param tabId - browser tab id
   */
  isTabContentScriptLoaded = (tabId: number): boolean => {
    if (!tabId) return false

    return this.tabsWithLoadedSidebar[tabId]
  }

  /**
   * Set contentScript files that will be loaded on the page
   * @param files - list (or single) of contentScript files
   */
  setContentScriptFiles = (files: string[] | undefined): void => {
    if (!files) return
    this.targetContentScriptFiles = [...this.targetContentScriptFiles, ...files]
  }

  /**
   * Load contentScript files on a specific tab
   * @param tabId - browser tab id
   */
  injectContentScriptFilesToTab = async (tabId: number): Promise<void> => {
    if (!tabId || this.targetContentScriptFiles.length == 0) return Promise.reject()

    return chrome.scripting
      .executeScript({
        target: { tabId: tabId },
        files: [...this.targetContentScriptFiles],
      })
      .then(() => {
        this.setTabContentScriptLoaded(tabId)
      })
  }
}

const tabsController: TabsController = new TabsController()

/**
 * Get the name of the contentScript file that will be dynamically loaded on the page when
 * the extension is already installed, but the current tab hasn't been reloaded.
 *
 * We use the file order from manifest.json to get the needed one, since during development and
 * production build, file names in manifests won't match.
 *
 * For example:
 *  - during development js: ['src/contentScript/Sidebar/index.tsx']
 *  - during build "js": ["assets/index.tsx-loader-ef2a399d.js"]
 *
 */
const contentScriptFile1 = chrome.runtime.getManifest()?.content_scripts?.[0].js
// const contentScriptFile2 = chrome.runtime.getManifest()?.content_scripts?.[1].js
tabsController.setContentScriptFiles(contentScriptFile1)
// tabsController.setContentScriptFiles(contentScriptFile2)

/**
 * Handle browser tab activation.
 * If TabsController doesn't know anything about the browser tab that was activated, it means
 * that it hasn't sent messages from contentScript. This situation occurs when the extension is installed,
 * but not all "old tabs" are updated. Therefore, so that the user doesn't worry, we dynamically load
 * the necessary contentScript files on the activated tab, except for tabs where we can't do this,
 * for example chromewebstore.google.com, chrome://settings/, etc.
 */
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tab = await chrome.tabs.get(activeInfo.tabId)

  if (tab.url && tab.url.includes('http') && !tab.url.includes('chromewebstore.google.com')) {
    const tabId: number = activeInfo.tabId

    if (!tabsController.isTabContentScriptLoaded(tabId)) {
      await tabsController.injectContentScriptFilesToTab(tabId)
    }
  }
})
