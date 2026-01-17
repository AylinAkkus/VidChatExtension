const isChromeExtension = () =>
  typeof chrome !== 'undefined' && !!chrome.storage?.local

export const storageSetJson = <T>(key: string, value: T): Promise<void> => {
  return new Promise((resolve) => {
    if (isChromeExtension()) {
      chrome.storage.local.set({ [key]: value }, resolve)
    } else {
      localStorage.setItem(key, JSON.stringify(value))
      resolve()
    }
  })
}

export const storageGetJson = <T>(key: string): Promise<T | null> => {
  return new Promise((resolve) => {
    if (isChromeExtension()) {
      chrome.storage.local.get(key, (result) => {
        resolve(result[key] ?? null)
      })
    } else {
      const value = localStorage.getItem(key)
      resolve(value ? JSON.parse(value) : null)
    }
  })
}
