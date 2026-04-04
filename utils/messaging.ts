// Extend this interface via declaration merging in each module
export interface MessageMap {
  'get-settings': { payload: undefined; response: Settings };
  'update-settings': { payload: Partial<Settings>; response: void };
  'get-stats': { payload: undefined; response: Stats };
  'increment-blocked': { payload: { hostname: string }; response: void };
  'toggle-extension': { payload: boolean; response: void };
  'toggle-site': { payload: { hostname: string; enabled: boolean }; response: void };
  'toggle-platform': {
    payload: { platform: 'hotstar' | 'prime' | 'netflix'; enabled: boolean };
    response: void;
  };
}

import type { Settings } from '../storage/settings';
import type { Stats } from '../storage/stats';

type MessageType = keyof MessageMap;

interface Message<T extends MessageType> {
  type: T;
  payload: MessageMap[T]['payload'];
}

export function sendMessage<T extends MessageType>(
  type: T,
  payload: MessageMap[T]['payload'],
): Promise<MessageMap[T]['response']> {
  return chrome.runtime.sendMessage({ type, payload });
}

export function onMessage<T extends MessageType>(
  type: T,
  handler: (
    payload: MessageMap[T]['payload'],
  ) => Promise<MessageMap[T]['response']> | MessageMap[T]['response'],
): void {
  chrome.runtime.onMessage.addListener(
    (message: Message<T>, _sender, sendResponse) => {
      if (message.type === type) {
        const result = handler(message.payload);
        if (result instanceof Promise) {
          result.then(sendResponse);
          return true; // keep channel open for async response
        }
        sendResponse(result);
      }
    },
  );
}
