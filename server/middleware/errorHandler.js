const errorHandler = (err, req, res, next) => {
  console.error('\n[Backend Error] Unhandled Exception:');
  console.error(err.stack || err.message || err);

  const statusCode = err.status || 500;
  const errorResponse = {
    success: false,
    error: err.message || 'Internal Server Error',
  };

  if (process.env.NODE_ENV !== 'production') {
    errorResponse.stack = err.stack;
  }

  res.status(statusCode).json(errorResponse);
};

module.exports = errorHandler;
