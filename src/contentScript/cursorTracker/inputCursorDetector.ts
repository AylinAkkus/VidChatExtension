import { CursorPosition } from './types';

const getPageContentBefore = (element: HTMLElement, maxLength: number = 1000): string => {
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
      if (elem.tagName === 'SCRIPT' ||
        elem.tagName === 'STYLE' ||
        elem.tagName === 'NOSCRIPT' ||
        window.getComputedStyle(elem).display === 'none' ||
        window.getComputedStyle(elem).visibility === 'hidden') {
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
};

export const getCursorPosition = (element: HTMLInputElement | HTMLTextAreaElement): CursorPosition => {
  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);
  const [s, e] = [element.selectionStart ?? 0, element.selectionEnd ?? 0];
  const hasSelection = s !== e;

  const textBefore = element.value.slice(0, s);
  const textAfter = element.value.slice(hasSelection ? e : s);
  const textSelected = hasSelection ? element.value.slice(s, e) : '';
  const pageContentBefore = getPageContentBefore(element);

  // Early return if no selection info available
  if (element.selectionStart == null) {
    return {
      x: rect.left + parseFloat(style.paddingLeft),
      y: rect.top + parseFloat(style.paddingTop),
      textBefore,
      textAfter,
      textSelected,
      selectionStart: s,
      selectionEnd: e,
      fullText: element.value,
      pageContentBefore,
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
    white-space: ${element.tagName === 'TEXTAREA' ? 'pre-wrap' : 'pre'};
    word-wrap: break-word; overflow-wrap: break-word;
    padding: ${style.padding}; border: ${style.border}; box-sizing: ${style.boxSizing};
  `;

  mirror.textContent = element.value.slice(0, s);
  const marker = document.createElement('span');
  marker.textContent = '|';
  mirror.appendChild(marker);
  document.body.appendChild(mirror);

  const [markerRect, mirrorRect] = [marker.getBoundingClientRect(), mirror.getBoundingClientRect()];
  document.body.removeChild(mirror);

  const scrollTop = element.scrollTop || 0;
  const x = rect.left + (markerRect.left - mirrorRect.left);
  const y = rect.top + (markerRect.top - mirrorRect.top) - scrollTop;

  return {
    x, y, textBefore, textAfter, textSelected,
    selectionStart: s, selectionEnd: e, fullText: element.value, pageContentBefore,
  };
};

export const insertSuggestionAtCursor = (
  element: HTMLInputElement | HTMLTextAreaElement,
  suggestion: string
): void => {
  element.focus();

  // 1) Best: participates in undo + site handlers
  if (document.execCommand && document.execCommand('insertText', false, suggestion)) return;

  // 2) Also participates in undo
  if (typeof element.setRangeText === 'function') {
    const { selectionStart: s, selectionEnd: e } = element;
    if (s !== null && e !== null) {
      element.setRangeText(suggestion, s, e, 'end');
      element.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertReplacementText', data: suggestion }));
      return;
    }
  }

  // 3) Last-resort (may not add to undo, but works); use native setter for React-controlled inputs
  const proto = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  const s = element.selectionStart, e = element.selectionEnd;
  if (s !== null && e !== null) {
    const next = element.value.slice(0, s) + suggestion + element.value.slice(e);
    setter ? setter.call(element, next) : (element.value = next);
    const pos = s + suggestion.length;
    element.setSelectionRange(pos, pos);
    element.dispatchEvent(new Event('input', { bubbles: true }));
  }
};

export const setCursorPositionAndInsertSuggestion = (
  element: HTMLInputElement | HTMLTextAreaElement,
  position: CursorPosition,
  suggestion: string
): void => {
  element.focus();
  element.setSelectionRange(position.selectionStart, position.selectionEnd);
  insertSuggestionAtCursor(element, suggestion);
}
