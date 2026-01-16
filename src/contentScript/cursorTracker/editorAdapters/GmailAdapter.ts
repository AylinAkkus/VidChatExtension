import { EditorAdapter, EditorContext, CursorPositionCoords } from './types';

export class GmailAdapter implements EditorAdapter {
  readonly id = 'gmail';
  readonly priority = 10; // Higher priority than basic HTML

  canHandle(element: HTMLElement): boolean {
    // Only activate on mail.google.com
    if (!window.location.hostname.includes('mail.google.com')) {
      return false;
    }

    // Must be contenteditable
    if (!element.isContentEditable) {
      return false;
    }

    // Check if we're in the Gmail compose/reply editor
    // Gmail uses divs with specific structure for email composition
    // Pattern: [data-message-id] [jslog] > div[id^=":"]
    // Or compose areas that are contenteditable with specific ancestry

    // Check if element is in a compose or reply area
    const isInComposeArea = this._isInGmailComposeArea(element);

    // Exclude simple form inputs by checking if this is actually
    // part of Gmail's rich text editor structure
    if (!isInComposeArea) {
      return false;
    }

    return true;
  }

  getCursorPosition(element: HTMLElement): CursorPositionCoords {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      const rect = element.getBoundingClientRect();
      return { x: rect.left, y: rect.top };
    }

    const range = selection.getRangeAt(0);

    // Clone and collapse the range to get the actual cursor position
    // (not the selection bounds)
    const clonedRange = range.cloneRange();
    clonedRange.collapse(true); // Collapse to start (cursor position)

    // Try to get rect from the collapsed range
    let rect = clonedRange.getBoundingClientRect();

    // If rect has no dimensions, try inserting a temporary marker
    if (rect.width === 0 && rect.height === 0) {
      // Create a temporary span to measure position
      const marker = document.createElement('span');
      marker.textContent = '\u200B'; // Zero-width space

      try {
        clonedRange.insertNode(marker);
        rect = marker.getBoundingClientRect();

        // Clean up the marker
        marker.parentNode?.removeChild(marker);

        // If we got a valid rect, use it
        if (rect.width > 0 || rect.height > 0) {
          return {
            x: rect.left,
            y: rect.top,
          };
        }
      } catch (e) {
        // If insertion failed, clean up if marker exists
        if (marker.parentNode) {
          marker.parentNode.removeChild(marker);
        }
      }
    }

    // If we have a valid rect, use it
    if (rect.width > 0 || rect.height > 0) {
      return {
        x: rect.left,
        y: rect.top,
      };
    }

    // Last resort: try to get position from the start container
    const container = range.startContainer;
    if (container.nodeType === Node.TEXT_NODE && container.parentElement) {
      const parentRect = container.parentElement.getBoundingClientRect();
      return { x: parentRect.left, y: parentRect.top };
    }

    // Final fallback: element's position
    const elementRect = element.getBoundingClientRect();
    return { x: elementRect.left, y: elementRect.top };
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
        pageContentBefore: this._getEmailContext(element),
      };
    }

    const range = selection.getRangeAt(0);

    // Get the editable root (the contenteditable div)
    const editableRoot = this._getEditableRoot(element);
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
    const lastNode = this._getLastTextNode(editableRoot);
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
      pageContentBefore: this._getEmailContext(element),
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

    // Handle newlines by creating text nodes and <br> elements
    if (text.includes('\n')) {
      const lines = text.split('\n');
      const fragment = document.createDocumentFragment();

      lines.forEach((line, index) => {
        // Add text node for the line content
        if (line.length > 0) {
          fragment.appendChild(document.createTextNode(line));
        }

        // Add <br> for line break (except after the last line)
        if (index < lines.length - 1) {
          fragment.appendChild(document.createElement('br'));
        }
      });

      range.insertNode(fragment);

      // Move cursor to end of inserted content
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    } else {
      // Simple case: no newlines
      const textNode = document.createTextNode(text);
      range.insertNode(textNode);

      // Move cursor to end of inserted text
      range.setStartAfter(textNode);
      range.setEndAfter(textNode);
      selection.removeAllRanges();
      selection.addRange(range);
    }

    // Trigger input event for Gmail to detect change
    element.dispatchEvent(new InputEvent('input', {
      bubbles: true,
      cancelable: true,
      inputType: 'insertText',
      data: text
    }));

    // Gmail might need additional events
    element.dispatchEvent(new Event('textInput', { bubbles: true }));
  }

  setCursorAndInsert(
    element: HTMLElement,
    selectionStart: number,
    selectionEnd: number,
    text: string
  ): void {
    element.focus();

    // Set selection to the specified range, then insert
    if (this._setSelection(element, selectionStart, selectionEnd)) {
      this.insertText(element, text);
    } else {
      console.warn('Failed to set selection, inserting at current position');
      this.insertText(element, text);
    }
  }

  private _isInGmailComposeArea(element: HTMLElement): boolean {
    // Check for compose window: typically has a floating table structure
    // or is inside a form with draft input
    const hasComposeAncestor = element.closest('table[role="presentation"]');
    if (hasComposeAncestor) {
      const form = hasComposeAncestor.querySelector('form');
      if (form && form.querySelector('input[name="draft"]')) {
        return true;
      }
    }

    // Check for reply area: typically inside [data-message-id] structure
    const messageContainer = element.closest('[data-message-id]');
    if (messageContainer) {
      // Make sure we're in the actual compose area, not just any contenteditable
      // in the message (like subject line in some cases)
      const jslogParent = element.closest('[jslog]');
      if (jslogParent && element.id && element.id.startsWith(':')) {
        return true;
      }
    }

    // Check for compose in reply context
    const isInListItem = element.closest('[role="listitem"]');
    if (isInListItem && element.isContentEditable) {
      // Additional check: ensure it's not a simple input but a rich editor
      const hasRichTextStructure = element.querySelector('div, span, br');
      if (hasRichTextStructure || element.childNodes.length > 0) {
        return true;
      }
    }

    return false;
  }

  private _getEditableRoot(element: HTMLElement): HTMLElement {
    // Walk up to find the contenteditable root
    let current: HTMLElement | null = element;
    while (current) {
      if (current.isContentEditable && current.parentElement && !current.parentElement.isContentEditable) {
        return current;
      }
      current = current.parentElement;
    }
    return element;
  }

  private _getEmailContext(element: HTMLElement): string {
    const context: string[] = [];

    // Try to get email subject
    const subjectInput = document.querySelector('input[name="subjectbox"]');
    if (subjectInput && subjectInput instanceof HTMLInputElement) {
      const subject = subjectInput.value.trim();
      if (subject) {
        context.push(`Subject: ${subject}`);
      }
    }

    // Try to get recipients (To field)
    const toField = document.querySelector('input[name="to"]');
    if (toField && toField instanceof HTMLInputElement) {
      const recipients = toField.value.trim();
      if (recipients) {
        context.push(`To: ${recipients}`);
      }
    }

    // Fallback to page title
    if (context.length === 0) {
      context.push(document.title);
    }

    return context.join(' - ');
  }

  private _getLastTextNode(element: Node): Node | null {
    // Recursively find the last text node
    if (element.nodeType === Node.TEXT_NODE) {
      return element;
    }

    const children = element.childNodes;
    for (let i = children.length - 1; i >= 0; i--) {
      const lastNode = this._getLastTextNode(children[i]);
      if (lastNode) {
        return lastNode;
      }
    }

    return null;
  }

  /**
   * Set selection to specific character offsets in the contenteditable element
   * Returns true if successful, false otherwise
   */
  private _setSelection(element: HTMLElement, start: number, end: number): boolean {
    try {
      const selection = window.getSelection();
      if (!selection) return false;

      const editableRoot = this._getEditableRoot(element);

      // Find the nodes and offsets for start and end positions
      const startPos = this._findNodeAndOffset(editableRoot, start);
      const endPos = this._findNodeAndOffset(editableRoot, end);

      if (!startPos || !endPos) {
        console.warn('Could not find node positions for selection', { start, end });
        return false;
      }

      const range = document.createRange();
      range.setStart(startPos.node, startPos.offset);
      range.setEnd(endPos.node, endPos.offset);

      selection.removeAllRanges();
      selection.addRange(range);

      return true;
    } catch (error) {
      console.error('Error setting selection in Gmail editor:', error);
      return false;
    }
  }

  /**
   * Find the text node and offset for a given character position
   * Walks through all text nodes counting characters until we reach the target position
   */
  private _findNodeAndOffset(
    root: HTMLElement,
    targetOffset: number
  ): { node: Node; offset: number } | null {
    let currentOffset = 0;

    // Walk through all text nodes in the tree
    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
      null
    );

    let node: Node | null = walker.nextNode();

    while (node) {
      const nodeLength = node.textContent?.length || 0;

      // Check if target position is within this text node
      if (currentOffset + nodeLength >= targetOffset) {
        return {
          node,
          offset: targetOffset - currentOffset
        };
      }

      currentOffset += nodeLength;
      node = walker.nextNode();
    }

    // If we've gone past the end, return the last position
    if (currentOffset > 0) {
      // Go back to the last text node
      walker.currentNode = root;
      let lastNode: Node | null = null;
      while ((node = walker.nextNode())) {
        lastNode = node;
      }

      if (lastNode) {
        return {
          node: lastNode,
          offset: lastNode.textContent?.length || 0
        };
      }
    }

    // No text nodes found, try to use the root element
    return {
      node: root,
      offset: 0
    };
  }
}

