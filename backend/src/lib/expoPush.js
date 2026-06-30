/** Expo device tokens from expo-notifications (ExponentPushToken[…] or ExpoPushToken[…]). */
const EXPO_PUSH_TOKEN_RE = /^Expo(nent)?PushToken\[[^\]]+\]$/;

function isValidExpoPushToken(token) {
  if (typeof token !== 'string') return false;
  const trimmed = token.trim();
  if (!trimmed || trimmed.length > 200) return false;
  return EXPO_PUSH_TOKEN_RE.test(trimmed);
}

/**
 * Send push notifications via Expo Push API (works when mobile app is backgrounded).
 */
async function sendExpoPushBatch(messages) {
  if (!Array.isArray(messages) || !messages.length) return 0;

  const chunks = [];
  for (let i = 0; i < messages.length; i += 100) {
    chunks.push(messages.slice(i, i + 100));
  }

  let sent = 0;
  for (const chunk of chunks) {
    try {
      const res = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(chunk),
      });
      if (!res.ok) continue;
      const data = await res.json();
      const tickets = data?.data || [];
      sent += tickets.filter((t) => t.status === 'ok').length;
    } catch (err) {
      console.warn('Expo push send failed:', err.message);
    }
  }
  return sent;
}

module.exports = { isValidExpoPushToken, sendExpoPushBatch };
