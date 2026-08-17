const errorHandler = (err, req, res, next) => {
  const isDev = process.env.NODE_ENV !== 'production';

  // Sanitize internal server logging
  const safeMessage = err.message ? String(err.message).replace(/([a-zA-Z0-9_-]{25,})/g, '[REDACTED_SECRET]') : 'Unknown error';
  console.error(`\n[Backend Error] ${req.method} ${req.originalUrl}:`, safeMessage);
  if (isDev && err.stack) {
    console.error(err.stack);
  }

  const statusCode = Number.isInteger(err.status) && err.status >= 400 && err.status < 600 ? err.status : 500;
  
  // Clean client response: never leak internal stack or sensitive database details
  const errorResponse = {
    success: false,
    error: statusCode >= 500 && !isDev 
      ? 'An unexpected error occurred. Please try again later.' 
      : safeMessage,
  };

  if (isDev && err.stack) {
    errorResponse.stack = err.stack;
  }

  res.status(statusCode).json(errorResponse);
};

module.exports = errorHandler;
