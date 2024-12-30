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
Object.defineProperty(exports, "__esModule", { value: true });
const ws_1 = require("ws");
const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const app = express();
const uuid_1 = require("uuid");
const db_1 = require("./db");
app.use(express.json());
dotenv.config();
const { userRouter } = require("./routes/user");
const corsOptions = {
    // origin: "https://blog-website-car.netlify.app", 
    origin: "http://localhost:5173",
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE", // Specify allowed methods
    credentials: true,
};
app.use(cors(corsOptions));
const port = 3000;
app.use("/user", userRouter);
console.log(process.env.MONGO_URL);
function listen() {
    return __awaiter(this, void 0, void 0, function* () {
        yield mongoose.connect(process.env.MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true });
        app.listen(port, () => {
            console.log(`Listening on port: ${port}`);
        });
    });
}
const wss = new ws_1.WebSocketServer({ port: 8080 });
let allSockets = {};
let socketToRoomMap = new Map();
let socketToUsernameMap = new Map();
// const currentRooms: string[] = [] // this should'nt be here
wss.on("connection", (socket) => {
    socket.on("message", (message) => __awaiter(void 0, void 0, void 0, function* () {
        const parsedMessage = JSON.parse(message.toString());
        const { type, payload } = parsedMessage;
        const { username, roomID: clientRoomID, message: clientMessage, usernames, imgUrl } = payload;
        if (type === "startChat") { // as this is a startChat message, the user will send the roomID he wants to join.
            const roomID = clientRoomID || (0, uuid_1.v4)();
            const foundUsername = yield db_1.userModel.findOne({
                username
            });
            let currentRooms = []; // for every ws connection we will first initialize this array and then check ki username pehle se hai ki nahi.
            if (foundUsername) { // if user found in this data, it means it has some prior rooms, hence we need ot update(put)
                currentRooms = foundUsername.rooms;
                if (!foundUsername.rooms.flat().includes(roomID)) {
                    const arr = ["roomName", roomID];
                    currentRooms.push(arr);
                    yield foundUsername.save();
                }
                else {
                    // console.log("After Updation: ", currentRooms)
                    foundUsername.rooms = currentRooms;
                    yield foundUsername.save();
                }
            }
            // it will update all the rooms of the already entried users, and if any of them isnt created yet, it will create with the room.
            console.log(usernames);
            usernames.forEach((p) => __awaiter(void 0, void 0, void 0, function* () {
                console.log(p);
                const foundUser = yield db_1.userModel.findOne({
                    username: p
                });
                console.log(foundUser);
                if (foundUser) {
                    const arr = ["roomName", roomID];
                    foundUser.rooms.push(arr);
                    yield foundUser.save();
                }
                else {
                    console.log("Unexpected error, can't find the user in db");
                }
            }));
            const room = yield db_1.roomModel.findOne({ roomID });
            if (!room) {
                console.log("Room doesn't exist, creating room...");
                console.log(usernames);
                yield db_1.roomModel.create({
                    roomID, // this participants array will include the user himself who created the group and the other members whom he clicked on he wanted in his group 
                    participants: [username, ...usernames],
                    messages: []
                });
            }
            else {
                console.log(`Room: ${roomID} already exists, updating it and saving...`);
                console.log(usernames);
                if (!room.participants.includes(username)) {
                    // console.log("Pushing...")
                    room.participants.push(username);
                }
                usernames.forEach((user) => {
                    if (!room.participants.includes(user)) {
                        room.participants.push(user);
                    }
                });
                yield room.save();
                // console.log("Room: ", room)
            }
            const requestMessage = {
                type: "requestMessage",
                payload: {
                    text: "User1 wants you to join their chatRoom",
                    roomID: roomID,
                    usernames: parsedMessage.payload.usernames
                }
            };
            const roomAck = {
                type: "roomAck",
                payload: {
                    text: "Room is created",
                    roomID: roomID
                }
            };
            usernames.forEach((p) => {
                var _a;
                const participantSocket = (_a = Array.from(socketToUsernameMap.entries()).find(([_, user]) => user === p)) === null || _a === void 0 ? void 0 : _a[0];
                console.log("part: ", participantSocket);
                if (participantSocket) {
                    participantSocket.send(JSON.stringify(requestMessage));
                    participantSocket.send(JSON.stringify(roomAck));
                    console.log("Request sent");
                }
            });
            socket.send(JSON.stringify(roomAck));
        }
        if (type === "chat") { // as soon as the sender sends the message 
            console.log("Users wants to chat"); // we will need the current user room 
            const currentUserRoom = yield db_1.roomModel.findOne({ roomID: clientRoomID });
            if (!currentUserRoom) {
                console.log("Room not found");
                return;
            }
            if (imgUrl) {
                console.log(imgUrl);
            }
            const messageObject = {
                sender: username,
                message: clientMessage,
                imgUrl: imgUrl,
                timestamp: new Date().toISOString()
            };
            if (clientMessage !== "") {
                currentUserRoom.messages.push(messageObject);
                yield currentUserRoom.save();
            }
            console.log(messageObject);
            currentUserRoom.participants.forEach((p) => {
                var _a;
                const participantSocket = (_a = Array.from(socketToUsernameMap.entries()).find(([_, user]) => user === p)) === null || _a === void 0 ? void 0 : _a[0];
                if (participantSocket && participantSocket.readyState === ws_1.WebSocket.OPEN) {
                    const messagePayload = {
                        type: "chat",
                        payload: {
                            username: username,
                            roomID: clientRoomID,
                        },
                        messageObject: {
                            sender: username,
                            message: clientMessage,
                            imgUrl: imgUrl,
                            timestamp: new Date().toISOString(),
                        }
                    };
                    participantSocket.send(JSON.stringify(messagePayload));
                }
            });
        }
        if (type === "Nothing") {
            socketToUsernameMap.set(socket, username);
        }
        // if(type === "online"){
        //     const onlineArray = []
        //     const user = userModel.findOne({
        //         username
        //     })
        //     for(let i = 0; i < user.rooms.length; i++){
        //         const roomID = user.rooms[i][1]
        //         const room = await roomModel.findOne({
        //             roomID
        //         })
        //         room.participants.forEach((p: string)=>{
        //             const participantSocket = Array.from(socketToUsernameMap.entries()).find(([_, user]) => user === p)?.[0];
        //             if (participantSocket && participantSocket.readyState === WebSocket.OPEN) {
        //                 const messToSend = {
        //                     type: "online",
        //                     payload: {
        //                     }
        //                 }
        //             }
        //         })
        //     }
        // }
    }));
    socket.on("close", () => __awaiter(void 0, void 0, void 0, function* () {
        console.log("cleaned up");
        const username = socketToUsernameMap.get(socket);
        if (!username) {
            console.log("Username not found to be deleted");
            return;
        }
        const rooms = db_1.roomModel.find({ participants: username });
        socketToUsernameMap.delete(socket);
        try {
            if (rooms) {
                for (const room of rooms) {
                    room.participants = room.participants.filter((p) => p !== username);
                    if (room.participants.length === 0) {
                        yield room.delete();
                        console.log(`Room ${room.roomID} deleted as it is empty.`);
                    }
                    else {
                        room.save();
                    }
                }
            }
        }
        catch (error) {
            console.log("Error: ", error);
        }
        console.log(`${username} disconnected`);
    }));
});
listen();
