import jwt from 'jsonwebtoken';
import User from '../schemas/userSchema.js';
import { tokenBlacklist } from '../routes/users.js'; // import blacklist

const SECRET_KEY = process.env.JWT_SECRET || 'your_jwt_secret_key';

const authMiddleware = async (req, res, next) => {
  try {
    // Expect the header format: Authorization: Bearer <token>
    const authHeader = req.headers.authorization || '';
    const parts = authHeader.split(' ').filter(Boolean);

    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res
        .status(401)
        .json({ message: 'Authentication failed: Invalid authorization header.' });
    }

    const token = parts[1];

    if (!token) {
      return res
        .status(401)
        .json({ message: 'Authentication failed: No token provided.' });
    }

    // 🔥 Check if token has been blacklisted (user logged out)
    if (tokenBlacklist.has(token)) {
      return res.status(401).json({ message: 'Authentication failed: Token has been logged out.' });
    }

    // Verify the token
    const decoded = jwt.verify(token, SECRET_KEY);

    // Decode should contain user id (adjust if you use a different claim)
    const userId = decoded?.id;
    if (!userId) {
      return res
        .status(401)
        .json({ message: 'Authentication failed: Invalid token payload.' });
    }

    // Fetch the user (optional: you can skip DB lookup if you only need payload)
    const user = await User.findById(userId).select('_id name email'); // pick fields as needed
    if (!user) {
      return res.status(401).json({ message: 'Authentication failed: User not found.' });
    }

    // Attach lightweight user info to the request
    req.user = {
      _id: user._id,
      name: user.name,
      email: user.email,
    };

    // If you want to pass the raw token along (e.g., for blacklist checks later)
    req.token = token;

    next();
  } catch (error) {
    // Distinguish between token expiration and other errors
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Authentication failed: Token expired.' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Authentication failed: Invalid token.' });
    }
    // For any other error
    res.status(401).json({ message: 'Authentication failed: Unable to authenticate.' });
  }
};

export default authMiddleware;
