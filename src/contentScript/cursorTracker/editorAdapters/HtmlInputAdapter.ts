import { EditorAdapter, EditorContext, CursorPositionCoords } from './types';

export class HtmlInputAdapter implements EditorAdapter {
  readonly id = 'html-input';
  readonly priority = 0; // Base priority

  canHandle(element: HTMLElement): boolean {
    return (
      element.tagName === 'TEXTAREA' ||
      (element.tagName === 'INPUT' &&
        ['text', 'email', 'password', 'search', 'url', 'tel'].includes(
          (element as HTMLInputElement).type
        ))
    );
  }

  getCursorPosition(element: HTMLElement): CursorPositionCoords {
    const input = element as HTMLInputElement | HTMLTextAreaElement;
    const rect = input.getBoundingClientRect();
    const style = window.getComputedStyle(input);
    const s = input.selectionStart ?? 0;

    // Early return if no selection info available
    if (input.selectionStart == null) {
      return {
        x: rect.left + parseFloat(style.paddingLeft),
        y: rect.top + parseFloat(style.paddingTop),
      };
    }

    // Create mirror element to measure cursor position
    const mirror = document.createElement('div');
    mirror.style.cssText = `
      position: absolute; visibility: hidden; top: 0; left: 0;
      width: ${style.width}; height: auto; font: ${style.font};
      font-size: ${style.fontSize}; font-family: ${style.fontFamily};
      font-weight: ${style.fontWeight}; letter-spacing: ${style.letterSpacing};
      word-spacing: ${style.wordSpacing}; line-height: ${style.lineHeight};
      white-space: ${input.tagName === 'TEXTAREA' ? 'pre-wrap' : 'pre'};
      word-wrap: break-word; overflow-wrap: break-word;
      padding: ${style.padding}; border: ${style.border}; box-sizing: ${style.boxSizing};
    `;

    mirror.textContent = input.value.slice(0, s);
    const marker = document.createElement('span');
    marker.textContent = '|';
    mirror.appendChild(marker);
    document.body.appendChild(mirror);

    const [markerRect, mirrorRect] = [
      marker.getBoundingClientRect(),
      mirror.getBoundingClientRect()
    ];
    document.body.removeChild(mirror);

    const scrollTop = input.scrollTop || 0;
    const x = rect.left + (markerRect.left - mirrorRect.left);
    const y = rect.top + (markerRect.top - mirrorRect.top) - scrollTop;

    return { x, y };
  }

  getEditorContext(element: HTMLElement): EditorContext {
    const input = element as HTMLInputElement | HTMLTextAreaElement;
    const [s, e] = [input.selectionStart ?? 0, input.selectionEnd ?? 0];
    const hasSelection = s !== e;

    return {
      element,
      textBefore: input.value.slice(0, s),
      textAfter: input.value.slice(hasSelection ? e : s),
      textSelected: hasSelection ? input.value.slice(s, e) : '',
      fullText: input.value,
      selectionStart: s,
      selectionEnd: e,
      pageContentBefore: this.getPageContentBefore(element),
    };
  }

  insertText(element: HTMLElement, text: string): void {
    const input = element as HTMLInputElement | HTMLTextAreaElement;
    input.focus();

    // 1) Best: participates in undo + site handlers
    if (document.execCommand && document.execCommand('insertText', false, text)) {
      return;
    }

    // 2) Also participates in undo
    if (typeof input.setRangeText === 'function') {
      const { selectionStart: s, selectionEnd: e } = input;
      if (s !== null && e !== null) {
        input.setRangeText(text, s, e, 'end');
        input.dispatchEvent(new InputEvent('input', {
          bubbles: true,
          inputType: 'insertReplacementText',
          data: text
        }));
        return;
      }
    }

    // 3) Last-resort (may not add to undo, but works); use native setter for React-controlled inputs
    const proto = input instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
    const s = input.selectionStart, e = input.selectionEnd;

    if (s !== null && e !== null) {
      const next = input.value.slice(0, s) + text + input.value.slice(e);
      setter ? setter.call(input, next) : (input.value = next);
      const pos = s + text.length;
      input.setSelectionRange(pos, pos);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  setCursorAndInsert(
    element: HTMLElement,
    selectionStart: number,
    selectionEnd: number,
    text: string
  ): void {
    const input = element as HTMLInputElement | HTMLTextAreaElement;
    input.focus();
    input.setSelectionRange(selectionStart, selectionEnd);
    this.insertText(element, text);
  }

  private getPageContentBefore(element: HTMLElement, maxLength: number = 1000): string {
    // Get all text nodes that appear before the input element in the DOM
    const allText: string[] = [];

    // Function to collect text from element and its children
    const collectText = (node: Node): void => {
      if (node === element) {
        // Stop when we reach the input element
        return;
      }

      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent?.trim();
        if (text && text.length > 0) {
          allText.push(text);
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const elem = node as HTMLElement;

        // Skip script, style, and hidden elements
        if (
          elem.tagName === 'SCRIPT' ||
          elem.tagName === 'STYLE' ||
          elem.tagName === 'NOSCRIPT' ||
          window.getComputedStyle(elem).display === 'none' ||
          window.getComputedStyle(elem).visibility === 'hidden'
        ) {
          return;
        }

        // Recursively collect text from children
        Array.from(node.childNodes).forEach(collectText);
      }
    };

    // Start from body and collect text until we hit our element
    collectText(document.body);

    // Join all text and truncate to maxLength, keeping the most recent text
    const fullText = allText.join(' ');
    if (fullText.length > maxLength) {
      return '...' + fullText.slice(-maxLength);
    }
    return fullText;
  }
}

