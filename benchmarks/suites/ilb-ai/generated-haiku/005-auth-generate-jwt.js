const jwt = require('jsonwebtoken');
function generateToken(user) {
  const token = jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '24h' }
  );
  return token;
}
module.exports = generateToken;
