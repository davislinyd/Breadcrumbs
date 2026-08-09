import { defineBackground } from 'wxt/utils/define-background';
import { toAppError } from '../src/background/errors';
import { handleRequest, listCookies, refreshDueRestores } from '../src/background/handlers';
import type { BgRequest } from '../src/messaging/protocol';

export default defineBackground(() => {
  void refreshDueRestores();
  chrome.runtime.onStartup.addListener(() => void refreshDueRestores());

  // Debounced snapshot happens inside listCookies; avoid tight loops on rapid cookie churn.
  let changeTimer: ReturnType<typeof setTimeout> | null = null;
  chrome.cookies.onChanged.addListener(() => {
    if (changeTimer) clearTimeout(changeTimer);
    changeTimer = setTimeout(() => {
      changeTimer = null;
      void listCookies();
    }, 500);
  });

  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name.startsWith('restore:')) void refreshDueRestores();
  });

  chrome.runtime.onMessage.addListener((message: BgRequest, _sender, sendResponse) => {
    void handleRequest(message)
      .then((value) => sendResponse({ ok: true, value }))
      .catch((error) => sendResponse({ ok: false, error: toAppError(error) }));
    return true;
  });
});
