const MIN_PASSWORD_LENGTH = 8;

function validatePassword(password) {
  const value = String(password || '');
  if (value.length < MIN_PASSWORD_LENGTH) {
    return `password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  }
  if (value.length > 128) {
    return 'password must be at most 128 characters';
  }
  return null;
}

module.exports = { MIN_PASSWORD_LENGTH, validatePassword };
