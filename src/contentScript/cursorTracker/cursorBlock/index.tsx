import ReactDOM from 'react-dom/client';
import CursorBlockComponent, { CursorBlockComponentProps } from './CursorBlockComponent';
import cursorBlockStyles from './styles.css?raw';

const rootId = 'tabmaven-cursor-block-root';
const reactRootId = 'tabmaven-cursor-block-react-root';

export const createCursorBlock = () => {

  // 1. Create the root element and attach it to the document body
  const container = document.createElement('div');
  container.id = rootId;
  document.body.appendChild(container);

  // 2. Create shadow container
  const shadowContainer = container.attachShadow({ mode: 'open' });

  // 3. Create the shadow root element and attach it to the shadow container
  const shadowRootElement = document.createElement('div');
  shadowContainer.appendChild(shadowRootElement);

  // From now, use shadowRootElement as parent for the whole tree
  // Append component styles to the shadow root so classes work inside shadow DOM
  const styleElement = document.createElement('style');
  styleElement.textContent = cursorBlockStyles;
  shadowRootElement.appendChild(styleElement);

  // Create container for shadow DOM
  container.style.position = 'fixed';
  container.style.top = '0';
  container.style.left = '0';
  container.style.zIndex = '999999';

  const reactRoot = document.createElement('div');
  reactRoot.id = reactRootId;
  shadowContainer.appendChild(reactRoot);

  const root = ReactDOM.createRoot(reactRoot);

  return {
    render: (props: CursorBlockComponentProps) => {
      root.render(
        <CursorBlockComponent {...props} />
      );
    },
    destroy: () => {
      root.unmount();
      if (container.parentNode) {
        container.parentNode.removeChild(container);
      }
    }
  };
};

export default createCursorBlock;
