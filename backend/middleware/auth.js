const authenticateJWT = (req, res, next) => {
  req.user = {
    id: 'guest',
    name: 'Guest User',
    email: 'guest@salesflow.com',
    role: 'admin'
  };
  next();
};

const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    // Since authentication is removed and guest is admin, always authorized.
    next();
  };
};

module.exports = {
  authenticateJWT,
  authorizeRoles
};
