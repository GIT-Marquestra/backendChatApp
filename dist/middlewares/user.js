"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.userMiddleware = userMiddleware;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../config");
function userMiddleware(req, res, next) {
    const token = req.headers["authorization"];
    // Check if the token is provided
    if (!token) {
        console.log("Token missing");
        res.status(401).json({ message: "Token is missing" });
        return;
    }
    try {
        // Verify the JWT token
        const decoded = jsonwebtoken_1.default.verify(token, config_1.JWT_USER_PASS);
        // Attach the user ID to the request object
        req.id = decoded.id;
        console.log("Token:", token);
        next();
    }
    catch (error) {
        console.error("JWT Error:", error);
        res.status(401).json({ message: "Invalid token" });
    }
}
