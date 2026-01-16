# Editor Adapters System

This directory contains the plugin architecture for supporting different text editors in the TabMaven extension.

## Architecture Overview

The system uses a **plugin pattern** where each editor type has its own adapter that implements a common interface. The adapters are registered in a central registry that automatically selects the appropriate adapter for any focused element.

## File Structure

```
editorAdapters/
├── types.ts                 # Core interfaces (EditorAdapter, EditorContext, etc.)
├── registry.ts              # Central adapter registry with priority-based selection
├── HtmlInputAdapter.ts      # Default adapter for HTML input/textarea elements
├── GoogleDocsAdapter.ts     # Adapter for Google Docs (example)
├── index.ts                 # Initialization and exports
└── README.md               # This file
```

## Core Interfaces

### EditorAdapter

The main interface that all adapters must implement:

```typescript
interface EditorAdapter {
  readonly id: string;           // Unique identifier
  readonly priority: number;     // Selection priority (higher = checked first)
  
  canHandle(element: HTMLElement): boolean;
  getCursorPosition(element: HTMLElement): CursorPositionCoords;
  getEditorContext(element: HTMLElement): EditorContext;
  insertText(element: HTMLElement, text: string): void;
  setCursorAndInsert(element: HTMLElement, start: number, end: number, text: string): void;
  setupListeners?(element: HTMLElement, onChange: () => void): () => void;
}
```

### EditorContext

Complete context about the current editor state:

```typescript
interface EditorContext {
  element: HTMLElement;
  textBefore: string;
  textAfter: string;
  textSelected: string;
  fullText: string;
  selectionStart: number;
  selectionEnd: number;
  pageContentBefore: string;
}
```

## Creating a New Adapter

### Step 1: Create the Adapter File

Create a new file in this directory (e.g., `OverleafAdapter.ts`):

```typescript
import { EditorAdapter, EditorContext, CursorPositionCoords } from './types';

export class OverleafAdapter implements EditorAdapter {
  readonly id = 'overleaf';
  readonly priority = 10; // Higher than HTML (0), same as Google Docs
  
  canHandle(element: HTMLElement): boolean {
    // Implement detection logic
    return window.location.hostname.includes('overleaf.com') &&
           element.classList.contains('ace_text-input');
  }
  
  getCursorPosition(element: HTMLElement): CursorPositionCoords {
    // Implement cursor position detection
    // Return { x, y } screen coordinates
  }
  
  getEditorContext(element: HTMLElement): EditorContext {
    // Implement context extraction
    // Return full editor context
  }
  
  insertText(element: HTMLElement, text: string): void {
    // Implement text insertion at cursor
  }
  
  setCursorAndInsert(
    element: HTMLElement,
    selectionStart: number,
    selectionEnd: number,
    text: string
  ): void {
    // Implement cursor positioning + insertion
  }
}
```

### Step 2: Register the Adapter

Add your adapter to `index.ts`:

```typescript
import { OverleafAdapter } from './OverleafAdapter';

export const initializeEditorAdapters = () => {
  editorRegistry.register(HtmlInputAdapter);
  editorRegistry.register(GoogleDocsAdapter);
  editorRegistry.register(OverleafAdapter);  // Add this line
  
  console.log('✅ Editor adapters initialized');
};
```

That's it! The system will automatically use your adapter when appropriate.

## Priority System

Adapters are checked in order of priority (highest first):

- **Priority 10+**: Rich text editors (Google Docs, Overleaf, etc.)
- **Priority 0**: Basic HTML inputs/textareas
- **Priority < 0**: Fallback adapters

When multiple adapters can handle an element, the one with highest priority wins.

## Built-in Adapters

### HtmlInputAdapter (Priority: 0)

Handles standard HTML form inputs:
- `<input type="text|email|password|search|url|tel">`
- `<textarea>`

Features:
- Precise cursor positioning using mirror element technique
- React-compatible insertion with native property setters
- Undo/redo support via `execCommand` and `setRangeText`

### OverleafAdapter (Priority: 15)

Handles Overleaf's CodeMirror 6 editor:
- Detects `.cm-content` (contenteditable) on overleaf.com
- Extracts text directly from CodeMirror's DOM structure
- Uses Selection API for cursor positioning
- Triggers CodeMirror-specific events for change detection

**Status:** ✅ Implemented and active

### GoogleDocsAdapter (Priority: 10)

Handles Google Docs contenteditable elements:
- Detects Google Docs editor structure
- Uses Selection API for cursor positioning
- Handles contenteditable text insertion

**Status:** ⚠️ Implemented but commented out (enable in `index.ts` to activate)

## Best Practices

1. **Unique Detection**: Ensure `canHandle()` is specific enough to avoid conflicts
2. **Priority Selection**: Use higher priority only when you truly need to override
3. **Error Handling**: Wrap adapter methods in try-catch to prevent breaking the tracker
4. **Performance**: Keep `canHandle()` fast - it's called frequently
5. **Testing**: Test on actual target sites to ensure compatibility

## Examples

### Notion Adapter (Conceptual)

```typescript
export class NotionAdapter implements EditorAdapter {
  readonly id = 'notion';
  readonly priority = 10;
  
  canHandle(element: HTMLElement): boolean {
    return window.location.hostname.includes('notion.so') &&
           element.getAttribute('role') === 'textbox';
  }
  
  // ... implement other methods
}
```

### Monaco Editor Adapter (Conceptual)

```typescript
export class MonacoAdapter implements EditorAdapter {
  readonly id = 'monaco';
  readonly priority = 15;
  
  canHandle(element: HTMLElement): boolean {
    return element.classList.contains('monaco-editor') ||
           element.closest('.monaco-editor') !== null;
  }
  
  // ... implement other methods
}
```

## Debugging

Enable detailed logging:

```javascript
// In browser console
localStorage.setItem('DEBUG_ADAPTERS', 'true');
```

The registry logs which adapter is selected for each element.

## Migration from Legacy Code

The old `inputCursorDetector.ts` functions have been refactored into `HtmlInputAdapter`. The legacy file remains for backward compatibility but is no longer used by the main tracker.

## Future Extensions

Potential adapters to implement:
- ✅ ~~Overleaf (LaTeX editor)~~ - Implemented!
- CodeMirror (generic - for other sites using CM6)
- Monaco Editor (VS Code editor - GitHub, StackBlitz, etc.)
- Notion
- Slack message input
- Discord message input
- Medium editor
- Confluence editor
- Figma text fields
- Linear (issue editor)

