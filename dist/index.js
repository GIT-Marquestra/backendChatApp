"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startHttpServer = startHttpServer;
const express_1 = __importDefault(require("express"));
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
const user_1 = require("./routes/user"); // Adjust the import based on your folder structure
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use(express_1.default.json());
const corsOptions = {
    origin: "http://localhost:5173", // Replace with your frontend URL
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true,
};
app.use((0, cors_1.default)(corsOptions));
// API Routes
app.use("/user", user_1.userRouter);
// Database Connection and Server Start
const PORT = process.env.HTTP_PORT || 3000;
function startHttpServer() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log("Connecting to MongoDB...");
            yield mongoose_1.default.connect(process.env.MONGO_URL, {
                // @ts-ignore
                useNewUrlParser: true,
                useUnifiedTopology: true,
            });
            console.log("MongoDB connected successfully.");
            app.listen(PORT, () => {
                console.log(`HTTP Server is running on port ${PORT}`);
            });
        }
        catch (error) {
            console.error("Error connecting to MongoDB:", error);
        }
    });
}

startHttpServer()
