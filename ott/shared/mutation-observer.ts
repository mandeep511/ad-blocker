import { logger } from '../../utils/logger';

export interface DOMObserverOptions {
  selector: string;
  onMatch: (element: Element) => void;
  target?: Node;
  subtree?: boolean;
}

export function observeDOM(options: DOMObserverOptions): () => void {
  const { selector, onMatch, target = document.body, subtree = true } = options;

  if (target instanceof Element) {
    const existing = target.querySelectorAll(selector);
    existing.forEach((el) => onMatch(el));
  }

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (!(node instanceof Element)) continue;
        if (node.matches(selector)) {
          onMatch(node);
        }
        const children = node.querySelectorAll(selector);
        children.forEach((el) => onMatch(el));
      }
    }
  });

  observer.observe(target, { childList: true, subtree });

  return () => {
    logger.debug(`Disconnecting MutationObserver for "${selector}"`);
    observer.disconnect();
  };
}
