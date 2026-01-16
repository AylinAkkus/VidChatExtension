import { EditorAdapter, EditorContext, CursorPositionCoords } from './types';

/**
 * Adapter for Overleaf's CodeMirror 6 editor
 * 
 * Overleaf uses CodeMirror 6 which has:
 * - Main editor container: .cm-editor
 * - Editable content: .cm-content (contenteditable)
 * - Lines: .cm-line elements
 */
export class OverleafAdapter implements EditorAdapter {
  readonly id = 'overleaf';
  readonly priority = 15; // Higher priority than Google Docs

  canHandle(element: HTMLElement): boolean {
    // Check if we're on Overleaf
    if (!window.location.hostname.includes('overleaf.com')) {
      return false;
    }

    // Check if element is the CodeMirror content area
    // The focusable element is .cm-content (contenteditable)
    return element.classList.contains('cm-content') && element.isContentEditable;
  }

  getCursorPosition(element: HTMLElement): CursorPositionCoords {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      const rect = element.getBoundingClientRect();
      return { x: rect.left, y: rect.top };
    }

    const range = selection.getRangeAt(0);

    // Clone the range to avoid modifying the actual selection
    const clonedRange = range.cloneRange();
    clonedRange.collapse(true); // Collapse to start (cursor position)

    // Try to insert a temporary marker for accurate positioning
    const rect = clonedRange.getBoundingClientRect();

    // If rect has no dimensions, use the range's start container
    if (rect.width === 0 && rect.height === 0) {
      // Try getting the parent element's rect
      const container = range.startContainer;
      const parentElement = container.nodeType === Node.TEXT_NODE
        ? container.parentElement
        : container as HTMLElement;

      if (parentElement) {
        const parentRect = parentElement.getBoundingClientRect();
        // Use parent's position but offset slightly
        return { x: parentRect.left + 2, y: parentRect.top + 2 };
      }

      // Last resort: use element rect
      const elementRect = element.getBoundingClientRect();
      return { x: elementRect.left, y: elementRect.top };
    }

    return {
      x: rect.left,
      y: rect.top,
    };
  }

  getEditorContext(element: HTMLElement): EditorContext {
    const selection = window.getSelection();

    // Get full text with proper newlines from CodeMirror
    const fullText = this.getFullTextWithNewlines(element);

    if (!selection || selection.rangeCount === 0) {
      return {
        element,
        textBefore: '',
        textAfter: fullText,
        textSelected: '',
        fullText,
        selectionStart: 0,
        selectionEnd: 0,
        pageContentBefore: this.getPageTitle(),
      };
    }

    const range = selection.getRangeAt(0);

    // Calculate character offsets by walking through text nodes
    const { start, end } = this.getSelectionOffsets(element, range);

    return {
      element,
      textBefore: fullText.slice(0, start),
      textAfter: fullText.slice(end),
      textSelected: fullText.slice(start, end),
      fullText,
      selectionStart: start,
      selectionEnd: end,
      pageContentBefore: this.getPageTitle(),
    };
  }

  /**
   * Get full text with newlines preserved from CodeMirror structure
   */
  private getFullTextWithNewlines(element: HTMLElement): string {
    const lines = Array.from(element.querySelectorAll('.cm-line'));
    if (lines.length === 0) {
      // Fallback if no .cm-line elements found
      return element.textContent || '';
    }
    return lines.map(line => line.textContent || '').join('\n');
  }

  /**
   * Calculate selection start/end offsets accounting for newlines between .cm-line elements
   * Simplified: Walk through lines once, tracking offsets as we go
   */
  private getSelectionOffsets(
    element: HTMLElement,
    range: Range
  ): { start: number; end: number } {
    const lines = Array.from(element.querySelectorAll('.cm-line'));
    let offset = 0;
    let start = -1;
    let end = -1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineStartOffset = offset;
      const walker = document.createTreeWalker(line, NodeFilter.SHOW_TEXT);
      let node: Node | null;

      while ((node = walker.nextNode())) {
        const length = node.textContent?.length || 0;

        // Check if this text node contains the start position
        if (node === range.startContainer) {
          start = offset + range.startOffset;
        }

        // Check if this text node contains the end position
        if (node === range.endContainer) {
          end = offset + range.endOffset;
        }

        if (start >= 0 && end >= 0) {
          return { start, end };
        }

        offset += length;
      }

      // Handle case where range container is the line element itself (empty line or cursor at line start)
      if (start === -1 && line === range.startContainer) {
        start = lineStartOffset;
      }
      if (end === -1 && line === range.endContainer) {
        end = lineStartOffset;
      }

      if (start >= 0 && end >= 0) {
        return { start, end };
      }

      // Add newline between lines (not after the last line)
      if (i < lines.length - 1) {
        offset += 1;
      }
    }

    return { start: Math.max(0, start), end: Math.max(0, end >= 0 ? end : start) };
  }

  insertText(element: HTMLElement, text: string): void {
    // Focus element first
    if (document.activeElement !== element) {
      element.focus();
    }

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      console.warn('No selection available for insertion in Overleaf');
      return;
    }

    // Try execCommand first - simplest and most compatible approach
    const success = document.execCommand('insertText', false, text);

    if (success) {
      return; // execCommand handles everything including events
    }

    // Fallback: Manual insertion for browsers that deprecated execCommand
    const range = selection.getRangeAt(0);
    range.deleteContents();

    const textNode = document.createTextNode(text);
    range.insertNode(textNode);

    // Move cursor to end of inserted text
    range.setStartAfter(textNode);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);

    // Dispatch input event for CodeMirror
    element.dispatchEvent(new InputEvent('input', {
      bubbles: true,
      cancelable: true,
      inputType: 'insertText',
      data: text
    }));
  }

  setCursorAndInsert(
    element: HTMLElement,
    selectionStart: number,
    selectionEnd: number,
    text: string
  ): void {
    element.focus();

    // Restore cursor/selection position, then insert text
    this.setSelection(element, selectionStart, selectionEnd);
    this.insertText(element, text);
  }

  /**
   * Set selection to specific character offsets
   * Works for both cursor positions (start === end) and selections (start < end)
   */
  private setSelection(element: HTMLElement, start: number, end: number): boolean {
    try {
      const selection = window.getSelection();
      if (!selection) return false;

      const lines = Array.from(element.querySelectorAll('.cm-line'));
      if (lines.length === 0) return false;

      let offset = 0;
      let startNode: Node | null = null;
      let startOffset = 0;
      let endNode: Node | null = null;
      let endOffset = 0;
      let lastTextNode: Node | null = null;
      let lastTextNodeEnd = 0;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineStartOffset = offset;
        const walker = document.createTreeWalker(line, NodeFilter.SHOW_TEXT);
        let node: Node | null;
        let hasTextNodes = false;

        while ((node = walker.nextNode())) {
          hasTextNodes = true;
          const length = node.textContent?.length || 0;
          const nodeEnd = offset + length;

          // Find start position
          // Use <= because position nodeEnd (after last char) is valid in this node
          if (startNode === null && start >= offset && start <= nodeEnd) {
            startNode = node;
            startOffset = start - offset;
          }

          // Find end position
          if (endNode === null && end >= offset && end <= nodeEnd) {
            endNode = node;
            endOffset = end - offset;
          }

          if (startNode && endNode) {
            const range = document.createRange();
            range.setStart(startNode, startOffset);
            range.setEnd(endNode, endOffset);
            selection.removeAllRanges();
            selection.addRange(range);
            return true;
          }

          lastTextNode = node;
          lastTextNodeEnd = nodeEnd;
          offset += length;
        }

        // Handle empty line: line element is the container
        if (!hasTextNodes) {
          if (startNode === null && start === lineStartOffset) {
            startNode = line;
            startOffset = 0;
          }
          if (endNode === null && end === lineStartOffset) {
            endNode = line;
            endOffset = 0;
          }

          if (startNode && endNode) {
            const range = document.createRange();
            range.setStart(startNode as Node, startOffset);
            range.setEnd(endNode as Node, endOffset);
            selection.removeAllRanges();
            selection.addRange(range);
            return true;
          }
        }

        // Handle newline position (between lines)
        // If position falls on the newline, map it to the end of the last text node
        // of the previous line (or start of next line)
        if (i < lines.length - 1) {
          const newlinePos = offset;

          // If start/end position is exactly on the newline
          if (startNode === null && start === newlinePos && lastTextNode) {
            startNode = lastTextNode;
            startOffset = lastTextNode.textContent?.length || 0;
          }
          if (endNode === null && end === newlinePos && lastTextNode) {
            endNode = lastTextNode;
            endOffset = lastTextNode.textContent?.length || 0;
          }

          if (startNode && endNode) {
            const range = document.createRange();
            range.setStart(startNode, startOffset);
            range.setEnd(endNode, endOffset);
            selection.removeAllRanges();
            selection.addRange(range);
            return true;
          }

          offset += 1; // Add newline
        }
      }

      console.warn('Could not set selection:', {
        start,
        end,
        foundStart: !!startNode,
        foundEnd: !!endNode,
        totalLength: offset
      });
      return false;
    } catch (error) {
      console.error('Error setting selection:', error);
      return false;
    }
  }

  private getPageTitle(): string {
    // Try to get the project/document name from Overleaf's UI
    const titleElement = document.querySelector('.project-name') ||
      document.querySelector('.entity-name') ||
      document.querySelector('h1');

    if (titleElement?.textContent) {
      return titleElement.textContent.trim();
    }

    // Fallback to page title
    return document.title;
  }
}
