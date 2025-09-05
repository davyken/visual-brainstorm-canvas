// --- In-memory token blacklist (for demonstration purposes) ---
// NOTE: This will reset when the server restarts.
// Use Redis or another persistent store in production.
const tokenBlacklist = new Set();

export { tokenBlacklist };
