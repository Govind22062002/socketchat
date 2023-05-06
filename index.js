var LocalStorage = require('node-localstorage').LocalStorage;
localStorage = new LocalStorage('./scratch');
const express = require('express')
const app = express()
const fs = require("fs")
const session = require("express-session")
const chatModel = require("./src/model/chat")
const videoModel = require("./src/model/videoCall")

const http = require('http');
const server = http.createServer(app);
const { v4: uuidv4 } = require("uuid");

const { Server } = require("socket.io");
const io = new Server(server);
const { ExpressPeerServer } = require('peer')
const peerServer = ExpressPeerServer(server, {
    debug: true,
});
const path = require("path");
const connection = require("./src/connection/connection")


const router = require('./src/router/route');
const port = 3000;

app.use('/peerjs', peerServer);
app.use(express.static(path.join(__dirname, "./public")))
console.log(path.join(__dirname, "./public"))

app.set("views", path.join(__dirname, "src/views"))
app.set("view engine", 'ejs');

app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: false,
}));

app.use(express.urlencoded({ extended: true }))

const people = [];
const users = []
app.use(router),

    io.on('connection', (socket) => {
        // online offline user
        socket.on('login', (data) => {
            users.push(data)
            console.log(users ,"users");
            socket.to("login", users)
        })
        // join socket on click 
        socket.on('socket join', async (clientid, myid) => {
            try {
                const data = await chatModel.findOne({ _id: clientid })
                if (data) {
                    socket.join(clientid)
                } else {
                    const id = `${clientid}-${myid}-${myid}-${clientid}`
                    const savedData = await chatModel.findOne({ chatId: { $in: `${clientid}-${myid}` } })

                    if (!savedData) {
                        socket.join(id);
                        const data = new chatModel({
                            chatType: "individual",
                            chatId: [`${clientid}-${myid}`, `${myid}-${clientid}`],
                            roomId: `${id}`,
                        })
                        if (clientid != myid) {
                            await data.save()
                        }
                    } else {
                        console.log("join socket");
                        socket.join(savedData.roomId)
                    }
                }
            } catch (error) {
                console.log(error);
            }


        })

        // send image and store 
        socket.on("sendImage", async (data) => {
            try {
                var guess = data[0].base64.match(/^data:image\/(png|jpeg);base64,/)[1];
                var ext = "";
                switch (guess) {
                    case "png": ext = ".png"; break;
                    case "jpeg": ext = ".jpg"; break;
                    default: ext = ".bin"; break; 
                }
                const id = `${data[2]}-${data[1]}`

                const savedData = await chatModel.findOne({ chatId: { $in: id } })
                const groupimage = await chatModel.findOne({ _id: data[1] })
                var savedFilename = "/uploads" + randomString(10) + ext;
                fs.writeFile(__dirname + "/public/uploads" + savedFilename, getBase64Image(data[0].base64), 'base64', function (err) {
                    if (err !== null) {
                    } else {
                        const saveimage = async (req, res) => {
                            if (groupimage) {
                                socket.join(data[1])
                                socket.broadcast.to(data[1]).emit("receiveImage", {
                                    path: savedFilename,
                                },data[1],data[2]);
                                socket.emit("receiveImage", {
                                    path: savedFilename,
                                },data[1],data[2])
                                const user = await chatModel.updateOne({ _id: data[1] }, {
                                    $push: {
                                        chat: {
                                            from: data[2],
                                            // to: msg[1],
                                            // message: groupmsg[0],
                                            image: savedFilename,
                                            date: new Date()
                                        }
                                    },

                                })
                            } else {
                                if (savedData) {
                                    socket.join(savedData.roomId)
                                    io.to(savedData.roomId).emit("receiveImage", {
                                        path: savedFilename,
                                    },data[1],data[2]);
                                    const user = await chatModel.updateOne({
                                        chatId: { $in: id }
                                    },
                                        {
                                            $push: {
                                                chat: {
                                                    from: data[2],
                                                    to: data[1],
                                                    image: savedFilename,
                                                    date: new Date()
                                                }
                                            },
                                        }
                                    )
                                } else {

                                    socket.join(`${id}-${data[1]}-${data[2]}`)
                                    io.to(`${id}-${data[1]}-${data[2]}`).emit("receiveImage", {
                                        path: savedFilename,
                                    },data[1],data[2]);

                                    const user = new chatModel({
                                        chatType: "individual",
                                        chatId: [`${data[2]}-${data[1]}`, `${data[1]}-${data[2]}`],
                                        roomId: `${id}-${data[1]}-${data[2]}`,
                                        chat: [{
                                            from: data[2],
                                            to: data[1],
                                            image: savedFilename,
                                            date: new Date()
                                        }],
                                    })
                                    if (data[2] != data[1]) {
                                        await user.save()
                                    }
                                }
                            }

                        }
                        saveimage()
                    }
                    console.log("Send image success!");
                });
            } catch (error) {
                console.log(error);
            }

        });
        //1to1 single chat
        socket.on('chat message', async (msg) => {
            try {
                const id = `${msg[2]}-${msg[1]}`
                const savedData = await chatModel.findOne({ chatId: { $in: id } })
                const message = async (req, res) => {
                    if (savedData) {
                        io.to(savedData.roomId).emit('chat message', msg[0], msg[1], msg[2]);
                        const data = await chatModel.updateOne({
                            chatId: { $in: id }
                        },
                            {
                                $push: {
                                    chat: {
                                        from: msg[2],
                                        to: msg[1],
                                        message: msg[0],
                                        date: new Date()
                                    }
                                },
                            }
                        )
                    }

                }
                message()
            } catch (error) {
                console.log(error);
            }

        });

        // group messsage 
        socket.on('group chat message', async (groupmsg) => {
            try {
                const data = await chatModel.findOne({ _id: groupmsg[1] })

                if (data) {
                    // socket.join(groupmsg[1])
                    socket.broadcast.to(groupmsg[1]).emit('group chat message', groupmsg[0],groupmsg[1],groupmsg[2]);
                    socket.emit('group chat message', groupmsg[0],groupmsg[1],groupmsg[2])

                    const user = await chatModel.updateOne({ _id: groupmsg[1] }, {
                        $push: {
                            chat: {
                                from: groupmsg[2],
                                message: groupmsg[0],
                                date: new Date()
                            }
                        },

                    })
                }
            } catch (error) {
                console.log(error);
            }

        })
        // make video call 
        socket.on('join-room', async (roomId, userId, userName) => {
            try {
                console.log(roomId, "roomId", userId, "userId", userName, "username");
                socket.join(roomId);
                socket.broadcast.to(roomId).emit('user-connected', userId);

                socket.on('disconnet', () => {
                    console.log("disconnect user");
                    socket.broadcast.to(roomId).emit("user-disconnected", userId);
                })
            } catch (error) {
                console.log(error);
            }
        });
    });

function randomString(length) {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
    for (var i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

function getBase64Image(imgData) {
    return imgData.replace(/^data:image\/(png|jpeg|jpg);base64,/, "");
}

server.listen(port, (req, res) => {
    console.log(`port start at ${port}`);
})
    