const notFound = (req, res) => {
  res.status(404).json({ message: `Route not found: ${req.originalUrl}` });
};

const errorHandler = (err, req, res, next) => {
  const status = err.status && err.status >= 400 && err.status < 600 ? err.status : 500;
  console.error('[error]', err.message);

  let message = err.message || 'Request failed';
  if (status >= 500 && process.env.NODE_ENV === 'production') {
    message = 'Internal server error';
  }

  res.status(status).json({ message });
};

module.exports = { notFound, errorHandler };
