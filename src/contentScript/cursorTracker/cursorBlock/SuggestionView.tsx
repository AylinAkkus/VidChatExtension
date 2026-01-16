import React from 'react';
import { CursorBlockComponentProps } from './CursorBlockComponent';

export const SuggestionView: React.FC<CursorBlockComponentProps> = ({ isVisible, isLoadingSuggestion, suggestion, error }) => {
  if (isLoadingSuggestion) {
    return (
      <div className="loading-container">
        <svg className="ai-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="#3b82f6" fillOpacity="0.8" />
        </svg>
        <span className="loading-text">Thinking...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="row-6">
        <span className="error-text">AI suggestion failed</span>
      </div>
    );
  }

  return (
    <div className="row-8">
      <span className="suggestion-text">{suggestion}</span>
      <span className="divider" />
      <span className="kbd">Tab</span>
      <span className="divider" />
      <span className="kbd kbd-mono">⌘K</span>
    </div>
  );
};

export default SuggestionView;
