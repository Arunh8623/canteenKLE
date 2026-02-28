// middleware/errorHandler.js
const errorHandler = (err, req, res, next) => {
  console.error('❌ Error:', err.stack || err.message);
  const statusCode = err.status || 500;
  res.status(statusCode).render('error', {
    title:   'Something went wrong',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred.',
    user:    req.user || null,
  });
};

const notFound = (req, res) => {
  res.status(404).render('error', {
    title:   '404 — Page Not Found',
    message: 'The page you are looking for does not exist.',
    user:    req.user || null,
  });
};

module.exports = { errorHandler, notFound };