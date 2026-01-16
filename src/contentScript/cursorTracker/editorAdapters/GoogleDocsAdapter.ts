import { EditorAdapter, EditorContext, CursorPositionCoords } from './types';

export class GoogleDocsAdapter implements EditorAdapter {
  readonly id = 'google-docs';
  readonly priority = 10; // Higher priority than basic HTML

  canHandle(element: HTMLElement): boolean {
    // Google Docs uses contenteditable divs with specific structure
    if (!element.isContentEditable) return false;

    // Check if we're in a Google Docs document
    return (
      window.location.hostname.includes('docs.google.com') &&
      element.closest('.kix-appview-editor') !== null
    );
  }

  getCursorPosition(element: HTMLElement): CursorPositionCoords {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      const rect = element.getBoundingClientRect();
      return { x: rect.left, y: rect.top };
    }

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    // If rect has no dimensions, try to get the element's rect
    if (rect.width === 0 && rect.height === 0) {
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
    if (!selection || selection.rangeCount === 0) {
      return {
        element,
        textBefore: '',
        textAfter: '',
        textSelected: '',
        fullText: element.textContent || '',
        selectionStart: 0,
        selectionEnd: 0,
        pageContentBefore: this.getPageTitle(),
      };
    }

    const range = selection.getRangeAt(0);

    // Get the editable root
    const editableRoot = element.closest('.kix-appview-editor') || element;
    const textContent = editableRoot.textContent || '';

    // Get text before cursor
    const beforeRange = document.createRange();
    beforeRange.setStart(editableRoot, 0);
    beforeRange.setEnd(range.startContainer, range.startOffset);
    const textBefore = beforeRange.toString();

    // Get text after cursor
    const afterRange = document.createRange();
    afterRange.setStart(range.endContainer, range.endOffset);

    // Find the last child node to set the end
    const lastNode = this.getLastTextNode(editableRoot);
    if (lastNode) {
      afterRange.setEnd(lastNode, lastNode.textContent?.length || 0);
    } else {
      afterRange.setEndAfter(editableRoot);
    }

    const textAfter = afterRange.toString();

    return {
      element,
      textBefore,
      textAfter,
      textSelected: range.toString(),
      fullText: textContent,
      selectionStart: textBefore.length,
      selectionEnd: textBefore.length + range.toString().length,
      pageContentBefore: this.getPageTitle(),
    };
  }

  insertText(element: HTMLElement, text: string): void {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      console.warn('No selection available for insertion');
      return;
    }

    const range = selection.getRangeAt(0);
    range.deleteContents();

    const textNode = document.createTextNode(text);
    range.insertNode(textNode);

    // Move cursor to end of inserted text
    range.setStartAfter(textNode);
    range.setEndAfter(textNode);
    selection.removeAllRanges();
    selection.addRange(range);

    // Trigger input event for Google Docs to detect change
    element.dispatchEvent(new InputEvent('input', {
      bubbles: true,
      cancelable: true,
      inputType: 'insertText',
      data: text
    }));

    // Google Docs might need additional events
    element.dispatchEvent(new Event('textInput', { bubbles: true }));
  }

  setCursorAndInsert(
    element: HTMLElement,
    selectionStart: number,
    selectionEnd: number,
    text: string
  ): void {
    // For contenteditable, setting cursor position by offset is complex
    // It requires traversing text nodes and calculating positions
    // For now, just insert at current position
    // A full implementation would use this.setCursorPosition(element, selectionStart, selectionEnd)
    this.insertText(element, text);
  }

  private getPageTitle(): string {
    // Try to get the document title from Google Docs specific element
    const titleElement = document.querySelector('.docs-title-input');
    if (titleElement?.textContent) {
      return titleElement.textContent;
    }

    // Fallback to page title
    return document.title;
  }

  private getLastTextNode(element: Node): Node | null {
    // Recursively find the last text node
    if (element.nodeType === Node.TEXT_NODE) {
      return element;
    }

    const children = element.childNodes;
    for (let i = children.length - 1; i >= 0; i--) {
      const lastNode = this.getLastTextNode(children[i]);
      if (lastNode) {
        return lastNode;
      }
    }

    return null;
  }
}

