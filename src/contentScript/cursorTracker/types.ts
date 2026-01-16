// Main cursor position interface used throughout the app
export interface CursorPosition {
  x: number;
  y: number;
  textBefore: string;
  textAfter: string;
  textSelected: string;
  selectionStart: number;
  selectionEnd: number;
  fullText: string;
  pageContentBefore: string;
}

// Re-export adapter types for convenience
export type { EditorAdapter, EditorContext, CursorPositionCoords, EditorAdapterConstructor } from './editorAdapters/types';
