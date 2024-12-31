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
exports.startWebSocketServer = startWebSocketServer;
const ws_1 = require("ws");
const uuid_1 = require("uuid");
const db_1 = require("./db"); // Adjust the import based on your folder structure
const WS_PORT = process.env.WS_PORT || 8080;
const allSockets = {};
const socketToRoomMap = new Map();
const socketToUsernameMap = new Map();
function startWebSocketServer() {
    const wss = new ws_1.WebSocketServer({ port: Number(WS_PORT) });
    wss.on("connection", (socket) => {
        console.log("hi")
        socket.on("message", (message) => __awaiter(this, void 0, void 0, function* () {
            const parsedMessage = JSON.parse(message.toString());
            const { type, payload } = parsedMessage;
            const { username, roomID: clientRoomID, message: clientMessage, usernames, imgUrl } = payload;
            if (type === "startChat") {
                const roomID = clientRoomID || (0, uuid_1.v4)();
                const foundUsername = yield db_1.userModel.findOne({ username });
                let currentRooms = [];
                if (foundUsername) {
                    currentRooms = foundUsername.rooms;
                    if (!foundUsername.rooms.flat().includes(roomID)) {
                        const arr = ["roomName", roomID];
                        currentRooms.push(arr);
                        yield foundUsername.save();
                    }
                    else {
                        foundUsername.rooms = currentRooms;
                        yield foundUsername.save();
                    }
                }
                usernames.forEach((p) => __awaiter(this, void 0, void 0, function* () {
                    const foundUser = yield db_1.userModel.findOne({ username: p });
                    if (foundUser) {
                        const arr = ["roomName", roomID];
                        foundUser.rooms.push(arr);
                        yield foundUser.save();
                    }
                }));
                const room = yield db_1.roomModel.findOne({ roomID });
                if (!room) {
                    yield db_1.roomModel.create({
                        roomID,
                        participants: [username, ...usernames],
                        messages: [],
                    });
                }
                else {
                    if (!room.participants.includes(username)) {
                        room.participants.push(username);
                    }
                    usernames.forEach((user) => {
                        if (!room.participants.includes(user)) {
                            room.participants.push(user);
                        }
                    });
                    yield room.save();
                }
                const roomAck = {
                    type: "roomAck",
                    payload: {
                        text: "Room is created",
                        roomID: roomID,
                    },
                };
                usernames.forEach((p) => {
                    var _a;
                    const participantSocket = (_a = Array.from(socketToUsernameMap.entries()).find(([_, user]) => user === p)) === null || _a === void 0 ? void 0 : _a[0];
                    if (participantSocket) {
                        participantSocket.send(JSON.stringify(roomAck));
                    }
                });
                socket.send(JSON.stringify(roomAck));
            }
            if (type === "chat") {
                const currentUserRoom = yield db_1.roomModel.findOne({ roomID: clientRoomID });
                if (!currentUserRoom)
                    return;
                const messageObject = {
                    sender: username,
                    message: clientMessage,
                    imgUrl: imgUrl,
                    timestamp: new Date().toISOString(),
                };
                if (clientMessage !== "") {
                    currentUserRoom.messages.push(messageObject);
                    yield currentUserRoom.save();
                }
                currentUserRoom.participants.forEach((p) => {
                    var _a;
                    const participantSocket = (_a = Array.from(socketToUsernameMap.entries()).find(([_, user]) => user === p)) === null || _a === void 0 ? void 0 : _a[0];
                    if (participantSocket && participantSocket.readyState === ws_1.WebSocket.OPEN) {
                        participantSocket.send(JSON.stringify({
                            type: "chat",
                            payload: { username, roomID: clientRoomID },
                            messageObject,
                        }));
                    }
                });
            }
        }));
        socket.on("close", () => __awaiter(this, void 0, void 0, function* () {
            const username = socketToUsernameMap.get(socket);
            if (!username)
                return;
            const rooms = yield db_1.roomModel.find({ participants: username });
            socketToUsernameMap.delete(socket);
            if (rooms) {
                for (const room of rooms) {
                    room.participants = room.participants.filter((p) => p !== username);
                    if (room.participants.length === 0) {
                        yield room.delete();
                    }
                    else {
                        room.save();
                    }
                }
            }
        }));
    });
    console.log(`WebSocket Server is running on port ${WS_PORT}`);
}
startWebSocketServer()