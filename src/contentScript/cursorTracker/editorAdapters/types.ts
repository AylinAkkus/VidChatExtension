export interface EditorContext {
  element: HTMLElement;
  textBefore: string;
  textAfter: string;
  textSelected: string;
  fullText: string;
  selectionStart: number;
  selectionEnd: number;
  pageContentBefore: string;
}

export interface CursorPositionCoords {
  x: number;
  y: number;
}

export interface EditorAdapter {
  /**
   * Unique identifier for this adapter (e.g., 'html-input', 'google-docs', 'overleaf')
   */
  readonly id: string;

  /**
   * Priority for adapter selection (higher = checked first)
   * Useful when multiple adapters might match the same element
   */
  readonly priority: number;

  /**
   * Check if this adapter can handle the given element
   */
  canHandle(element: HTMLElement): boolean;

  /**
   * Get the cursor position (x, y coordinates on screen)
   */
  getCursorPosition(element: HTMLElement): CursorPositionCoords;

  /**
   * Get the full editor context (text, selection, etc.)
   */
  getEditorContext(element: HTMLElement): EditorContext;

  /**
   * Insert text at current cursor position
   */
  insertText(element: HTMLElement, text: string): void;

  /**
   * Set cursor position and insert text
   */
  setCursorAndInsert(element: HTMLElement, selectionStart: number, selectionEnd: number, text: string): void;

  /**
   * Optional: Setup any adapter-specific event listeners
   */
  setupListeners?(element: HTMLElement, onChange: () => void): () => void;
}

export interface EditorAdapterConstructor {
  new(): EditorAdapter;
}
