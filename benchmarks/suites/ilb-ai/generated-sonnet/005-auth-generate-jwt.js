const jwt = require('jsonwebtoken');
function generateToken(user) {
  return jwt.sign(user, process.env.JWT_SECRET || 'your-secret-key', {
    expiresIn: '24h'
  });
}
module.exports = generateToken;
