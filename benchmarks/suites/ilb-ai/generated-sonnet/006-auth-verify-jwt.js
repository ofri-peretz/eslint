function verifyToken(token) {
  const jwt = require('jsonwebtoken');
  const secret = process.env.JWT_SECRET || 'your-secret-key';
  
  try {
    const decoded = jwt.verify(token, secret);
    return decoded;
  } catch (error) {
    throw new Error('Invalid token');
  }
}
