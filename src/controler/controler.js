const mongoose = require("mongoose")
const registerModel = require("../model/register");
const chatModel = require("../model/chat")
const bcrypt = require("bcrypt")
const path = require("path");
const { time } = require('console');
let a = path.join(__dirname, "../views/chat.html")


const isAuth = (req, res, next) => {
    if (req.session.username) {
        next()
    } else {
        res.redirect("/")
    }
}

const login = (req, res) => {
    res.render("login")
}

const register = (req, res) => {
    res.render("register")
}

const registerPost = async (req, res) => {
    const { name, email, username, password } = req.body
    const user = await registerModel.findOne({ email })
    if (user) {
        res.redirect("/postRegister")
    } else {
        const hashed = await bcrypt.hash(password, 10)
        const data = new registerModel({
            username,
            email,
            name,
            password: hashed
        })
        await data.save()
        res.redirect("/")
    }
}

const postLogin = async (req, res) => {
    const { email, password } = req.body
    const data = await registerModel.findOne({ email })
    if (!data) {
        res.redirect("/")
    } else {
        const isMatch = await bcrypt.compare(password, data.password);
        if (!isMatch) {
            res.redirect("/")
        } else {
            req.session.username = data
            res.redirect("/index")
        }
    }

}
const socketIndex = async (req, res) => {
    const user = req.session.username;
    if (user) {
        const data = await registerModel.find()
        const group = await chatModel.find({ chatType: "together", chatId :{$in : mongoose.Types.ObjectId(user._id) }}  );
        res.render("chat", { data, user, group })
    } else {
        res.redirect("/")
    }
}

const messages = async (req, res) => {
    const user = req.session.username;
    const select = await registerModel.findOne({ _id: req.params.id })
    const group = await chatModel.findOne({ _id: req.params.id})
    const totalGroup = await chatModel.find({ chatType: "together", chatId :{$in :  mongoose.Types.ObjectId(user._id)}}  );
    const groupmsg = group?.chat
    const agreegateId = await chatModel.aggregate([
        {
          '$match': {
            '_id': mongoose.Types.ObjectId(req.params.id)
          }
        }, {
          '$lookup': {
            'from': 'socketregisters', 
            'let': {
              'usersId': '$chatId'
            }, 
            'pipeline': [
              {
                '$match': {
                  '$expr': {
                    '$in': [
                      '$_id', '$$usersId'
                    ]
                  }
                }
              }
            ], 
            'as': 'result'
          }
        }
      ])

    const groupname = agreegateId[0]?.result
    const data = await registerModel.find()
    const id = `${user?._id}-${req.params.id}`
    const message = await chatModel.findOne({ chatId: { $in: id } })
    const chatting = message?.chat
    res.render("messages", { data, user, select, chatting,group,totalGroup,groupmsg,groupname })
   
}

const makeGroup = async (req, res) => {
    const user = await registerModel.find()
    const admin = req.session.username;

    res.render("makeGroup", { user, admin })
}

const groupId = async (req, res) => {
    const id = req.params.id;
    const groupName = req.params.groupName;
    const admin = req.session.username;
    const arr2 = id.split(",")
    arr2.push(admin._id)
    let arr = arr2.map(s => mongoose.Types.ObjectId(s));
    const adminArr = admin._id.split(",")
    const data = new chatModel({
        GroupName: groupName,
        AdminId: adminArr,
        chatType: "together",
        chatId: arr,
        roomId: ""
    })
    await data.save();

    res.redirect("/index")
}



module.exports = { login, register, registerPost, postLogin, socketIndex, messages, makeGroup, groupId, isAuth }; 