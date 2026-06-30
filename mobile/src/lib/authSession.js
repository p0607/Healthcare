/** Lets the API client clear in-memory auth when a 401 arrives. */
let unauthorizedHandler = null;

export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler;
}

export function notifyUnauthorized() {
  unauthorizedHandler?.();
}
