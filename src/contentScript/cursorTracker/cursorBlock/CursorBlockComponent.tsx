import React, { useMemo } from 'react';
import SuggestionView from './SuggestionView';
import CommandView from './CommandView';
import { CursorPosition } from '../types';

export interface CursorBlockComponentProps {
  position: { x: number; y: number };
  isVisible: boolean;
  suggestion?: string;
  error?: boolean;
  mode?: 'suggestion' | 'command';
  cursorData?: CursorPosition;
  isLoadingSuggestion?: boolean;
  onAccept: (suggestion: string) => void;
  onReject: () => void;
}

export const CursorBlockComponent: React.FC<CursorBlockComponentProps> = (props) => {
  const isCommandMode = props.mode === 'command';

  if (!props.isVisible) {
    return null;
  }

  // Simple positioning with basic viewport awareness
  const position = useMemo(() => {
    const baseX = props.position.x + 5;
    const baseY = props.position.y + 22;

    if (typeof window === 'undefined') {
      return { x: baseX, y: baseY };
    }

    // Estimate popup dimensions
    const popupWidth = isCommandMode ? 560 : 320;
    const popupHeight = isCommandMode ? 280 : 100;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Adjust X to stay in viewport
    let x = baseX;
    if (x + popupWidth > viewportWidth - 20) {
      x = Math.max(10, viewportWidth - popupWidth - 20);
    }

    // Adjust Y to stay in viewport
    let y = baseY;
    if (y + popupHeight > viewportHeight - 20) {
      // Try above cursor
      const aboveY = props.position.y - popupHeight - 10;
      y = aboveY >= 10 ? aboveY : Math.max(10, viewportHeight - popupHeight - 20);
    }

    return { x: Math.max(10, x), y: Math.max(10, y) };
  }, [props.position.x, props.position.y, isCommandMode]);

  return (
    <div
      className="cursor-block-anchor"
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
    >
      <div
        className={`cursor-block${isCommandMode ? ' cursor-block--command' : ''}${props.error ? ' cursor-block--error' : ''}${props.isLoadingSuggestion ? ' cursor-block--loading' : ''}`}
      >
        {isCommandMode ? (
          <CommandView {...props} />
        ) : (
          <SuggestionView {...props} />
        )}
      </div>
    </div>
  );
};

export default CursorBlockComponent;
