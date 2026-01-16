import { editorRegistry } from './registry';
import { HtmlInputAdapter } from './HtmlInputAdapter';
import { OverleafAdapter } from './OverleafAdapter';
import { GmailAdapter } from './GmailAdapter';
// import { GoogleDocsAdapter } from './GoogleDocsAdapter';

/**
 * Initialize all editor adapters
 * Call this once when the content script loads
 */
export const initializeEditorAdapters = () => {
  // Register adapters (order doesn't matter, priority is handled internally)
  editorRegistry.register(HtmlInputAdapter);
  editorRegistry.register(OverleafAdapter);
  editorRegistry.register(GmailAdapter);
  // Add more adapters here as they are created:
  // editorRegistry.register(GoogleDocsAdapter);

  console.log('✅ Editor adapters initialized');
};

export { editorRegistry };
export * from './types';

