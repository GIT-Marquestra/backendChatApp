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
exports.userRouter = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const db_1 = require("../db");
const zod_1 = require("zod");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const express_1 = require("express");
const express_2 = __importDefault(require("express"));
const user_1 = require("../middlewares/user");
const cloudinary_1 = require("cloudinary");
const app = (0, express_2.default)();
app.use(express_2.default.json()); // Parse JSON body
app.use(express_2.default.urlencoded({ extended: true })); // Parse URL-encoded body
const userRouter = (0, express_1.Router)();
exports.userRouter = userRouter;
userRouter.post("/signup", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // console.log("Hi")
    const userpfp = "";
    // console.log("Request body: ", req.body);
    const requiredBody = zod_1.z.object({
        email: zod_1.z.string().min(3).max(100).email(),
        username: zod_1.z.string().min(3).max(100),
        password: zod_1.z.string().min(3).max(100),
    });
    const parsedDataWithSuccess = requiredBody.safeParse(req.body);
    if (!parsedDataWithSuccess.success) {
        console.error("Validation Error: ", parsedDataWithSuccess.error.issues);
        res.status(400).json({
            message: "Incorrect Format",
            errors: parsedDataWithSuccess.error.issues, // Detailed errors
        });
        return;
    }
    console.log(parsedDataWithSuccess);
    const { email, password, username } = parsedDataWithSuccess.data;
    // const { email, password, roomName } = req.body;
    console.log(email);
    console.log(password);
    console.log(username);
    const hashedPassword = yield bcrypt_1.default.hash(password, 5);
    try {
        yield db_1.userModel.create({
            email,
            hashedPassword,
            username,
            userpfp,
            rooms: []
        });
        console.log("Signed Up");
        res.status(201).json({
            message: "User signed up!",
            nameOfUser: username,
            userpfp
        });
    }
    catch (error) {
        console.log("Error: ", error);
        res.json({
            message: "Cannot sign up"
        });
    }
}));
// SignIn
userRouter.post("/signin", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, password } = req.body;
    try {
        const foundUser = yield db_1.userModel.findOne({
            email: email
        });
        const isPassValid = yield bcrypt_1.default.compare(password, foundUser.hashedPassword);
        // console.log(isPassValid)
        if (!isPassValid) {
            res.status(403).json({
                message: "Incorrect Credentials!"
            });
            return;
        }
        const token = jsonwebtoken_1.default.sign({ id: foundUser._id }, process.env.JWT_USER_PASS, { expiresIn: '7d' } // Token expires in 7 days
        );
        // console.log(token)
        console.log("user signed in");
        res.json({
            token: token,
            roomName: foundUser.roomName,
            username: foundUser.username,
            userpfp: foundUser.userpfp,
            email: foundUser.email,
            password: password
        });
        return;
    }
    catch (error) {
        console.error("Error while signing in: ", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}));
// getting all my chats here
userRouter.get("/myChats", user_1.userMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userID = req.id;
    console.log(userID);
    console.log("in get myChats");
    try {
        const foundUser = yield db_1.userModel.findOne({
            _id: userID
        });
        const chats = foundUser.rooms;
        console.log("Chats: ", chats);
        if (chats) {
            res.status(200).json({
                message: "Chats!",
                chats: chats
            });
            console.log("Done from /myChats");
        }
        else {
            res.status(560).json({
                message: "No chats found, create one!"
            });
        }
    }
    catch (error) {
        console.log("Error: ", error);
    }
}));
userRouter.post("/myMessages", user_1.userMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userID = req.id;
    const { roomID } = req.body;
    console.log(roomID);
    console.log("in get myMessages");
    try {
        const room = yield db_1.roomModel.findOne({
            roomID: roomID
        });
        const { messages } = room;
        if (messages) {
            res.status(200).json({
                message: "Chats!",
                messages: messages
            });
        }
        else {
            res.status(560).json({
                message: "No messages found, send one!"
            });
        }
    }
    catch (error) {
        console.log("Error: ", error);
    }
}));
userRouter.get('/search', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { username } = req.query;
    if (!username) {
        res.status(400).json({ error: 'roomName is required' });
        return;
    }
    try {
        const users = yield db_1.userModel.find({
            username: { $regex: username, $options: 'i' } // Case-insensitive search
        });
        res.status(200).json(users);
    }
    catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
}));
userRouter.put('/changeRoomName', user_1.userMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { username, roomID, roomName } = req.body;
    console.log(username, roomID, roomName);
    console.log("in roomNameChange");
    if (!username) {
        res.status(400).json({ error: 'username is required' });
        return;
    }
    try {
        const user = yield db_1.userModel.findOne({
            username: username
        });
        const rooms = user.rooms;
        const roomIndex = rooms.findIndex((s) => s.includes(`${roomID}`));
        rooms[roomIndex][0] = roomName;
        rooms[roomIndex][1] = roomID;
        yield user.save();
        res.status(200).json(user);
    }
    catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
}));
userRouter.put('/updatePfp', user_1.userMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userID = req.id;
    const username = req.body.username;
    const email = req.body.email;
    const password = req.body.password;
    const userpfp = req.body.userpfp;
    try {
        const user = yield db_1.userModel.findOne({
            _id: userID
        });
        if (username) {
            user.username = username;
        }
        if (email) {
            user.email = email;
        }
        if (password) {
            user.password = password;
        }
        if (userpfp) {
            user.userpfp = userpfp;
        }
        yield user.save();
        res.status(200).json(user);
    }
    catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
}));
userRouter.post('/deleteImg', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { publicId } = req.body;
    cloudinary_1.v2.config({
        cloud_name: "dutrfbtao",
        api_key: '593383229313664',
        api_secret: 'znVKKXJgdaZhWUOEq'
    });
    cloudinary_1.v2.uploader.destroy(publicId, function (result) { console.log(result); });
}));
