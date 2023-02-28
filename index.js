var LocalStorage = require('node-localstorage').LocalStorage;
localStorage = new LocalStorage('./scratch');
const express = require('express')
const app = express()
const multer = require("multer")

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './public/uploads')
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        cb(null, uniqueSuffix + '-' + file.originalname)
    }
})

const upload = multer({ storage: storage })
const fs = require("fs")
const session = require("express-session")
const chatModel = require("./src/model/chat")

const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

const path = require("path");
const connection = require("./src/connection/connection")
const router = require('./src/router/route');
const port = 3000;

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

app.use(router),

    io.on('connection', (socket) => {
        socket.on("sendImage", async (data) => {
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
            fs.writeFile(__dirname + "/public" + savedFilename, getBase64Image(data[0].base64), 'base64', function (err) {
                if (err !== null) {
                } else {
                    const saveimage = async (req, res) => {
                        if (groupimage) {
                            socket.join(data[1])
                            socket.broadcast.to(data[1]).emit("receiveImage", {
                                path: savedFilename,
                            });
                            socket.emit("receiveImage", {
                                path: savedFilename,
                            })
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
                        }else {
                            if (savedData) {
                                socket.join(savedData.roomId)
                                io.to(savedData.roomId).emit("receiveImage", {
                                    path: savedFilename,
                                });
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
                                });
    
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
        });

        socket.on('chat message', async (msg) => {

            const id = `${msg[2]}-${msg[1]}`
            const savedData = await chatModel.findOne({ chatId: { $in: id } })
            const message = async (req, res) => {
                if (savedData) {
                    socket.join(savedData.roomId)
                    io.to(savedData.roomId).emit('chat message', msg[0]);
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
                } else {
                    socket.join(`${id}-${msg[1]}-${msg[2]}`)
                    io.to(`${id}-${msg[1]}-${msg[2]}`).emit('chat message', msg[0]);

                    const data = new chatModel({
                        chatType: "individual",
                        chatId: [`${msg[2]}-${msg[1]}`, `${msg[1]}-${msg[2]}`],
                        roomId: `${id}-${msg[1]}-${msg[2]}`,
                        chat: [{
                            from: msg[2],
                            to: msg[1],
                            message: msg[0],
                            date: new Date()
                        }],
                    })
                    if (msg[2] != msg[1]) {
                        await data.save()
                    }
                }
            }
            message()
        });


        socket.on('group chat message', async (groupmsg) => {
            const data = await chatModel.findOne({ _id: groupmsg[1] })

            if (data) {
                socket.join(groupmsg[1])
                socket.broadcast.to(groupmsg[1]).emit('group chat message', groupmsg[0]);
                socket.emit('group chat message', groupmsg[0])

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
        })
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
