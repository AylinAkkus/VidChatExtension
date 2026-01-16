import React, { useState, useRef, useEffect } from 'react';
import { CursorBlockComponentProps } from './CursorBlockComponent';
import { getGuidedSuggestion, SuggestionContext } from '../../../utils/llm';

export const CommandView: React.FC<CursorBlockComponentProps> = ({
  suggestion,
  cursorData,
  onAccept,
  onReject,
}) => {
  const { textSelected, textBefore, textAfter } = cursorData || {};
  const [currentSuggestion, setCurrentSuggestion] = useState(() => textSelected || suggestion || '');
  const [iterationPrompt, setIterationPrompt] = useState('');
  const [isIterating, setIsIterating] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Focus the input when component mounts
    inputRef.current?.focus();
  }, []);

  const handleIterate = async () => {
    if (!iterationPrompt.trim()) return;

    setIsIterating(true);
    try {
      const context: SuggestionContext = {
        textBefore: textBefore || '',
        textSelected: textSelected || '',
        textAfter: textAfter || '',
        fullText: `${textBefore || ''}${textSelected || ''}${textAfter || ''}`,
        pageContentBefore: '', // Could be populated from page context if available
      };

      const result = await getGuidedSuggestion(context, currentSuggestion, iterationPrompt);

      if (result.suggestion && !result.error) {
        setCurrentSuggestion(result.suggestion);
      }
      setIterationPrompt('');
    } catch (error) {
      console.error('Error iterating suggestion:', error);
    } finally {
      setIsIterating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleIterate();
    }
  };

  // const handleGlobalKeyDown = (e: React.KeyboardEvent) => {
  //   // Cmd+Enter to accept
  //   if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
  //     e.preventDefault();
  //     onAccept(currentSuggestion);
  //   }
  // };

  const hasContent = currentSuggestion && currentSuggestion.trim().length > 0;

  return (
    <div className="command-container"
    // onKeyDown={handleGlobalKeyDown}
    >
      {/* Suggested text - monospace with scroll */}
      {hasContent ? (
        <div className="suggested-text-container">
          <pre className="suggested-text">{currentSuggestion}</pre>
        </div>
      ) : (
        <div className="suggested-text-empty">
          <span className="empty-state-icon">✨</span>
          <span className="empty-state-text">No suggestion yet</span>
        </div>
      )}

      {/* Iteration input - simplified */}
      <div className="iteration-input-wrapper">
        <textarea
          ref={inputRef}
          className="iteration-input"
          placeholder="Refine with AI..."
          value={iterationPrompt}
          onChange={(e) => setIterationPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isIterating}
          rows={1}
        />
        <button
          onClick={handleIterate}
          className="btn-iterate"
          disabled={!iterationPrompt.trim() || isIterating}
          title="Enter to refine"
        >
          {isIterating ? (
            <span className="spinner"></span>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v20m0-20l4 4m-4-4L8 6" />
            </svg>
          )}
        </button>
      </div>

      {/* Action buttons */}
      <div className="action-buttons">
        <button
          onClick={() => onAccept(currentSuggestion)}
          className="btn btn-accept"
          disabled={!hasContent || isIterating}
        >
          <span>Accept</span>
          {/* <span className="kbd">⌘↵</span> */}
        </button>
        <button onClick={onReject} className="btn btn-reject">
          Reject
        </button>
      </div>
    </div>
  );
};

export default CommandView;
