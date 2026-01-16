import { CursorPosition } from './types';
import createCursorBlock from './cursorBlock';
import { getSuggestion, SuggestionContext, cancelCurrentSuggestionRequest } from '../../utils/llm';
import { editorRegistry } from './editorAdapters';
import { EditorAdapter } from './editorAdapters/types';

const TYPE_DELAY_MS = 300; // Delay after user stops typing

class InputCursorTracker {
  private cursorBlock = createCursorBlock();
  private focusedElement: HTMLElement | null = null;
  private currentAdapter: EditorAdapter | null = null;
  private cursorData: CursorPosition | undefined = undefined;
  private lastPosition = { x: 0, y: 0 };
  private currentSuggestion = '';
  private suggestionTimeout: number | null = null;
  private isLoadingSuggestion = false;
  private isInsertingSuggestion = false;
  private isCommandMode = false;
  private isVisible = false;
  private error: boolean = false;

  constructor() {
    this.render();
    this.setupListeners();

    // Check if there's already a focused input element when initializing
    this.checkForExistingFocusedElement();
  }

  private clearUI() {
    // Clear UI state only (used when hiding without losing focus)
    cancelCurrentSuggestionRequest();
    this.currentSuggestion = '';
    this.isVisible = false;
    this.isCommandMode = false;
    this.error = false;
    this.isLoadingSuggestion = false;
    if (this.suggestionTimeout) {
      window.clearTimeout(this.suggestionTimeout);
      this.suggestionTimeout = null;
    }
    this.render();
  }

  private reset() {
    // Full reset: clear UI state AND element references
    this.clearUI();
    this.focusedElement = null;
    this.currentAdapter = null;
    this.cursorData = undefined;
  }

  private setupListeners() {
    document.addEventListener('focusin', this.onFocusIn);
    document.addEventListener('focusout', this.onFocusOut);
    document.addEventListener('input', this.onUpdate);
    document.addEventListener('click', this.onUpdate);
    document.addEventListener('keydown', this.onKeyDown, true); // Use capture phase for keydown
    document.addEventListener('selectionchange', this.onUpdate);
    window.addEventListener('scroll', this.onUpdate, true);
    window.addEventListener('resize', this.onUpdate);
  }

  private checkForExistingFocusedElement() {
    // Check if there's already a focused input element when the tracker initializes
    const activeElement = document.activeElement as HTMLElement;
    const adapter = activeElement ? editorRegistry.findAdapter(activeElement) : null;

    if (activeElement && adapter) {
      this.focusedElement = activeElement;
      this.currentAdapter = adapter;

      // Use a small delay to ensure the page is fully loaded and styles are applied
      setTimeout(() => {
        this.updateCursor();
      }, 100);
    }
  }

  private onFocusIn = (e: FocusEvent) => {
    const el = e.target as HTMLElement;
    const adapter = editorRegistry.findAdapter(el);

    if (adapter) {
      this.focusedElement = el;
      this.currentAdapter = adapter;
      this.updateCursor();
    }
  };

  private onFocusOut = (e: FocusEvent) => {
    const el = e.target as HTMLElement;

    // Only reset if this is the element we're tracking
    // (In command mode, we keep the reference even when focus is lost)
    if (el === this.focusedElement && !this.isCommandMode) {
      this.reset();
    }
  };

  private onUpdate = (e?: Event) => {
    // Don't update while we're inserting a suggestion or in command mode
    if (this.focusedElement && !this.isInsertingSuggestion && !this.isCommandMode) {
      this.isLoadingSuggestion = false;
      this.isVisible = false;
      this.updateCursor();
      this.render();
    }
  };

  private onKeyDown = (e: KeyboardEvent) => {
    // Handle Cmd+K to toggle command mode
    if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
      if (this.focusedElement) {
        e.preventDefault();
        e.stopPropagation();

        // Capture current cursor/selection position BEFORE entering command mode
        if (!this.isCommandMode && this.currentAdapter) {
          const context = this.currentAdapter.getEditorContext(this.focusedElement);
          const position = this.currentAdapter.getCursorPosition(this.focusedElement);

          // Update cursorData with current position
          this.cursorData = {
            x: position.x,
            y: position.y,
            textBefore: context.textBefore,
            textAfter: context.textAfter,
            textSelected: context.textSelected,
            selectionStart: context.selectionStart,
            selectionEnd: context.selectionEnd,
            fullText: context.fullText,
            pageContentBefore: context.pageContentBefore,
          };
          this.lastPosition = { x: position.x, y: position.y };
        }

        this.isCommandMode = !this.isCommandMode;
        this.isVisible = this.focusedElement !== null;
        this.render();
      }
      return;
    }

    // Handle Escape to exit command mode or hide suggestion
    if (e.key === 'Escape') {
      if (this.isVisible || this.isCommandMode) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        // If in command mode, just exit command mode
        if (this.isCommandMode) {
          this.isCommandMode = false;
          this.isVisible = false;
          this.render();
        } else {
          // Otherwise, hide the suggestion but keep the element focused
          this.clearUI();
        }
      }
    }

    // Check if Tab key is pressed and we have a suggestion (only in suggestion mode)
    if (e.key === 'Tab' && this.focusedElement && this.currentAdapter && this.currentSuggestion && !this.isLoadingSuggestion && !this.isCommandMode) {
      const target = e.target as HTMLElement;

      // Only handle if the focused element is the target
      if (target === this.focusedElement) {
        e.preventDefault();
        e.stopPropagation();

        // Set flag to prevent update events during insertion
        this.isInsertingSuggestion = true;

        // Insert the suggestion using the adapter
        this.currentAdapter.insertText(this.focusedElement, this.currentSuggestion);

        // Clear the suggestion and hide the popup, but keep element focused
        this.clearUI();

        // Reset flag after a short delay to allow events to settle
        setTimeout(() => {
          this.isInsertingSuggestion = false;
        }, 150);
      }
    }
  };


  private updateCursor() {
    console.log('updateCursor', this.focusedElement, this.currentAdapter, document.contains(this.focusedElement), this.focusedElement?.offsetParent);
    try {
      // Check if the element is still in the DOM and visible
      if (!this.focusedElement || !this.currentAdapter || !document.contains(this.focusedElement) ||
        this.focusedElement.offsetParent === null) {
        this.reset();
        return;
      }

      // Use adapter to get cursor position and context
      const position = this.currentAdapter.getCursorPosition(this.focusedElement);
      const context = this.currentAdapter.getEditorContext(this.focusedElement);

      // Combine into our CursorPosition format
      this.cursorData = {
        x: position.x,
        y: position.y,
        textBefore: context.textBefore,
        textAfter: context.textAfter,
        textSelected: context.textSelected,
        selectionStart: context.selectionStart,
        selectionEnd: context.selectionEnd,
        fullText: context.fullText,
        pageContentBefore: context.pageContentBefore,
      };

      this.lastPosition = { x: position.x, y: position.y };
      this.render();

      // Debounce suggestion fetching
      if (this.suggestionTimeout) {
        window.clearTimeout(this.suggestionTimeout);
      }

      // Only fetch suggestions in suggestion mode
      if (!this.isCommandMode) {
        this.suggestionTimeout = window.setTimeout(() => {
          if (this.focusedElement && document.activeElement === this.focusedElement) {
            const domain = window.location.hostname;
            this.fetchSuggestion({
              textBefore: context.textBefore,
              textAfter: context.textAfter,
              textSelected: context.textSelected,
              fullText: context.fullText,
              pageContentBefore: `website: ${domain}\n${context.pageContentBefore}`,
            });
          }
        }, TYPE_DELAY_MS);
      }
    } catch (err) {
      console.warn('Cursor position error:', err);
      // If there's an error getting cursor position, try again after a short delay
      setTimeout(() => {
        if (this.focusedElement && document.activeElement === this.focusedElement) {
          this.updateCursor();
        }
      }, 200);
    }
  }

  private async fetchSuggestion(context: SuggestionContext) {
    try {
      this.isLoadingSuggestion = true;
      this.isVisible = true;
      this.render();

      cancelCurrentSuggestionRequest();
      const response = await getSuggestion(context);
      if (response.cancelled) {
        // There much be another query running - just forget this one
        return;
      }
      this.currentSuggestion = response.suggestion;
      this.isLoadingSuggestion = false;

      // Show popup if we have a valid suggestion OR if there's an error
      const hasValidSuggestion = this.currentSuggestion && this.currentSuggestion.length > 0;
      this.isVisible = !!this.focusedElement && (!!hasValidSuggestion || !!response.error);
      this.error = response.error ?? false;

      // Re-render with new suggestion or error state
      this.render();
    } catch (err) {
      console.error('Error fetching suggestion:', err);
    }
  }

  public render() {
    this.cursorBlock.render({
      position: this.lastPosition,
      isVisible: this.isVisible || this.isCommandMode,
      isLoadingSuggestion: this.isLoadingSuggestion,
      mode: this.isCommandMode ? 'command' : 'suggestion',
      suggestion: this.currentSuggestion,
      error: this.error,
      cursorData: this.cursorData,
      onAccept: (suggestion: string) => {
        if (this.cursorData && this.focusedElement && this.currentAdapter) {
          this.currentAdapter.setCursorAndInsert(
            this.focusedElement,
            this.cursorData.selectionStart,
            this.cursorData.selectionEnd,
            suggestion
          );
        }
        // Clear UI but keep element focused so user can continue typing
        this.clearUI();
      },
      onReject: () => {
        // Clear UI but keep element focused
        this.clearUI();
      }
    });
  }

  public destroy() {
    if (this.suggestionTimeout) {
      window.clearTimeout(this.suggestionTimeout);
    }
    // Cancel any pending request when destroying the tracker
    cancelCurrentSuggestionRequest();
    document.removeEventListener('focusin', this.onFocusIn);
    document.removeEventListener('focusout', this.onFocusOut);
    document.removeEventListener('input', this.onUpdate);
    document.removeEventListener('click', this.onUpdate);
    document.removeEventListener('keydown', this.onKeyDown, true); // Use capture phase for keydown
    document.removeEventListener('selectionchange', this.onUpdate);
    window.removeEventListener('scroll', this.onUpdate, true);
    window.removeEventListener('resize', this.onUpdate);
    this.cursorBlock.destroy();
  }
}

export default InputCursorTracker;
