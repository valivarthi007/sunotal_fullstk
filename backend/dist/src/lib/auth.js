import jwt from "jsonwebtoken";
const JWT_SECRET = process.env.SESSION_SECRET || "sunotal-secret-key";
export function signToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}
export function verifyToken(token) {
    return jwt.verify(token, JWT_SECRET);
}
export function requireAuth(req, res, next) {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }
    const token = header.slice(7);
    try {
        const payload = verifyToken(token);
        req.user = payload;
        next();
    }
    catch {
        res.status(401).json({ error: "Invalid or expired token" });
    }
}
export function requireAdmin(req, res, next) {
    requireAuth(req, res, () => {
        const user = req.user;
        if (user.role !== "admin") {
            res.status(403).json({ error: "Forbidden" });
            return;
        }
        next();
    });
}
