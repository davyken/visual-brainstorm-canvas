import jwt from 'jsonwebtoken';
import User from '../libs/userSchema.js';

const SECRET_KEY = process.env.JWT_SECRET || 'your_jwt_secret_key';

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'Authentication failed: No token provided.' });
    }

    const decodedToken = jwt.verify(token, SECRET_KEY);
    const user = await User.findById(decodedToken.id);
    if (!user) {
      return res.status(401).json({ message: 'Authentication failed: User not found.' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Authentication failed: Invalid token.' });
  }
};

export default authMiddleware;