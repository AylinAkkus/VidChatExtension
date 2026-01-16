import { EditorAdapter, EditorAdapterConstructor } from './types';

class EditorAdapterRegistry {
  private adapters: EditorAdapter[] = [];

  /**
   * Register a new editor adapter
   */
  register(AdapterClass: EditorAdapterConstructor): void {
    const adapter = new AdapterClass();

    // Insert based on priority (higher priority first)
    const index = this.adapters.findIndex(a => a.priority < adapter.priority);
    if (index === -1) {
      this.adapters.push(adapter);
    } else {
      this.adapters.splice(index, 0, adapter);
    }

  }

  /**
   * Find the appropriate adapter for an element
   */
  findAdapter(element: HTMLElement): EditorAdapter | null {
    return this.adapters.find(adapter => adapter.canHandle(element)) || null;
  }

  /**
   * Get all registered adapters
   */
  getAll(): EditorAdapter[] {
    return [...this.adapters];
  }

  /**
   * Clear all registered adapters
   */
  clear(): void {
    this.adapters = [];
  }
}

// Singleton instance
export const editorRegistry = new EditorAdapterRegistry();

