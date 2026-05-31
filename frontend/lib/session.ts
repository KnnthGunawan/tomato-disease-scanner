const SESSION_STORAGE_KEY = "tomato_scanner_session_id";

export function getSessionId() {
  const existing = window.localStorage.getItem(SESSION_STORAGE_KEY);
  if (existing) {
    return existing;
  }

  const nextSessionId = window.crypto.randomUUID();
  window.localStorage.setItem(SESSION_STORAGE_KEY, nextSessionId);
  return nextSessionId;
}
