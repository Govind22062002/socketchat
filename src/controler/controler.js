const mongoose = require("mongoose")
const registerModel = require("../model/register");
const chatModel = require("../model/chat")
const videoModel = require("../model/videoCall")
const bcrypt = require("bcrypt")
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const { time } = require('console');
const { Script } = require("vm");
const moment = require('moment')

const isAuth = async (req, res, next) => {
  if (req.session.username) {
    next()
  } else {
    req.session.groupParamsId = req.params
  
    res.redirect("/")
  }
}

const login = (req, res) => {
 if (req.session.username) {
  res.redirect("/index")
 } else {
   res.render("login")
 }
}

const logout = async(req,res) => {
  req.session.destroy();
  console.log(req.params.id ,"logout id");
  const status = await registerModel.updateOne({_id : req.params.id },{
    status : "offline"
  })
  res.redirect("/")
}

const register = (req, res) => {
  if (req.session.username) {
    res.redirect("/index")
   } else {
    res.render("register")
  
  }
}

const registerPost = async (req, res) => {
  try {
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
  } catch (error) {
    console.log(error);
  }
}

const postLogin = async (req, res) => {
  try {
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
        const user = await chatModel.findOne({ _id: req.session.groupParamsId?.id })
        if (user) {
          const chatid = user?.chatId
          const filter = chatid.filter(id => id.toString() === data._id.toString())
          if (!filter.length) {
            chatid.push(data._id)
            const updtId = await chatModel.updateOne({ _id: req.session.groupParamsId?.id }, {
              $push: {
                chatId: data._id
              }
            })
          }
        }
       const status = await registerModel.updateOne({email},{
        status : "online"
       })
       console.log(status ,"status");
        res.redirect("/index")
      }
    }
  } catch (error) {
    console.log(error);
  }


}
const socketIndex = async (req, res) => {
  try {
    const user = req.session.username;
    if (user) {
      const aggregate = [
        {
          '$sort': {
            'chat.date': -1
          }
        }, {
          '$match': {
            '$or': [
              {
                'chat.from': mongoose.Types.ObjectId(user._id)
              }, {
                'chat.to': mongoose.Types.ObjectId(user._id)
              }
            ]
          }
        }, {
          '$addFields': {
            'newField': {
              '$arrayElemAt': [
                '$chat', -1
              ]
            }
          }
        }, {
          '$addFields': {
            'dataId': {
              '$cond': {
                'if': {
                  '$eq': [
                    mongoose.Types.ObjectId(user._id), '$newField.from'
                  ]
                }, 
                'then': '$newField.to', 
                'else': '$newField.from'
              }
            }
          }
        }, {
          '$lookup': {
            'from': 'socketregisters', 
            'let': {
              'userId': '$dataId'
            }, 
            'pipeline': [
              {
                '$match': {
                  '$expr': {
                    '$eq': [
                      '$_id', '$$userId'
                    ]
                  }
                }
              }
            ], 
            'as': 'result'
          }
        }, {
          '$unwind': {
            'path': '$result', 
            'preserveNullAndEmptyArrays': true
          }
        }, {
          '$project': {
            'newdata': {
              '$cond': {
                'if': {
                  '$eq': [
                    '$chatType', 'individual'
                  ]
                }, 
                'then': {
                  '_id': '$result._id', 
                  'name': '$result.name', 
                  'message': '$newField.message', 
                  'image': '$newField.image', 
                  'date': '$newField.date', 
                  'status': '$result.status'
                }, 
                'else': {
                  '_id': '$_id', 
                  'name': '$name', 
                  'message': '$newField.message', 
                  'image': '$newField.image', 
                  'date': '$newField.date'
                }
              }
            }
          }
        }, {
          '$replaceRoot': {
            'newRoot': '$newdata'
          }
        }
      ]
      const data = await chatModel.aggregate(aggregate)
      const group = await chatModel.find({ chatType: "together", chatId: { $in: mongoose.Types.ObjectId(user._id) } });
      
      const calling = await videoModel.findOne({ videoChatId: { $in: `${user._id}-${req.params.id}` } })
      res.render("chat", { data, user, group, calling })
    } else {
      res.redirect("/")
    }
  } catch (error) {
    console.log(error);
  }

}

const messages = async (req, res) => {
  try {
    const user = req.session.username;
    const select = await registerModel.findOne({ _id: req.params.id })
    const group = await chatModel.findOne({ _id: req.params.id })
    const totalGroup = await chatModel.find({ chatType: "together", chatId: { $in: mongoose.Types.ObjectId(user._id) } });
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
    console.log(agreegateId, "agreegateId");
    const groupname = agreegateId[0]?.result
    const data = await registerModel.find()
    const id = `${user?._id}-${req.params.id}`
    const message = await chatModel.findOne({ chatId: { $in: id } })
    const chatting = message?.chat
    const calling = await videoModel.findOne({ videoChatId: { $in: `${user._id}-${req.params.id}` } })
    const GroupCall = await videoModel.findOne({ videoChatId: { $in: req.params.id } })
    res.render("messages", { data, user, select, chatting, group, totalGroup, groupmsg, groupname, calling, GroupCall })

  } catch (error) {
    console.log(error);
  }

}

const makeGroup = async (req, res) => {
  try {
    const user = await registerModel.find()
    const admin = req.session.username;

    res.render("makeGroup", { user, admin })
  } catch (error) {
    console.log(error);
  }

}

const groupId = async (req, res) => {
  try {
    const id = req.params.id;
    const groupName = req.params.groupName;
    const admin = req.session.username;
    const arr2 = id.split(",")
    arr2.push(admin._id)
    let arr = arr2.map(s => mongoose.Types.ObjectId(s));
    const adminArr = admin._id.split(",")
    const data = new chatModel({
      name: groupName,
      AdminId: adminArr,
      chatType: "together",
      chatId: arr,
      roomId: ""
    })
    await data.save();

    res.redirect("/index")
  } catch (error) {
    console.log(error);
  }

}

const makeCall = async (req, res) => {
  try {
    const room = uuidv4()
    const find = await videoModel.findOne({ videoChatId: { $in: `${req.params.userId}-${req.params.id}` } })
    if (!find) {
      const uservideo = new videoModel({
        chatType: "videoChat",
        videoChatId: [`${req.params.userId}-${req.params.id}`, `${req.params.id}-${req.params.userId}`],
        from: req.params.userId,
        to: req.params.id,
        room: room,
        date: Date.now() + 1000 * 60
      })
      await uservideo.save()
    } else {
      const updateVideo = await videoModel.updateOne({ videoChatId: { $in: `${req.params.userId}-${req.params.id}` } }, {
        from: req.params.userId,
        to: req.params.id,
        room: room,
        date: Date.now() + 1000 * 60
      })

    }
    res.redirect(`/videoCall/${req.params.id}/${room}`)
  } catch (error) {
    console.log(error);
  }

}
const makeGroupCall = async (req, res) => {
  try {
    const room = uuidv4()
    const group = await videoModel.findOne({ videoChatId: { $in: req.params.id } })
    if (!group) {
      const uservideo = new videoModel({
        chatType: "videoChat",
        videoChatId: [req.params.id],
        from: req.params.userId,
        to: req.params.id,
        room: room,
        date: Date.now() + 1000 * 60 * 60
      })
      await uservideo.save()
    } else {
      const updateVideo = await videoModel.updateOne({ videoChatId: { $in: req.params.id } }, {
        from: req.params.userId,
        to: req.params.id,
        room: room,
        date: Date.now() + 1000 * 60 * 60
      })

    }
    res.redirect(`/videoCall/${req.params.id}/${room}`)
  } catch (error) {
    console.log(error);
  }


}
const makeCallRoom = async (req, res) => {
  try {
    const find = await videoModel.findOne({ room: req.params.room })
    if (find?.date > Date.now()) {
      const data = await registerModel.findOne({ _id: req.params.id })
      if (data) {
        res.render('room', { roomId: req.params.room, client: data });
      } else {
        const groupId = await chatModel.findOne({ _id: req.params.id })
        res.render('room', { roomId: req.params.room, client: groupId });
      }
    } else {
      const update = await videoModel.updateOne({ room: req.params.room }, {
        room: null,
        date: null
      })
      res.redirect(`/index`)
    }
  } catch (error) {
    console.log(error);
  }

}

const callRemove = async (req, res) => {
  try {
    const update = await videoModel.updateOne({ room: req.params.room }, {
      room: null,
      date: null
    })
    res.redirect(`/index`)
  } catch (error) {
    console.log(error);
  }

}

const searchBar = async (req,res) => {
  const data = await registerModel.aggregate()
}

module.exports = {
  login,logout,register, registerPost, postLogin, socketIndex, messages, makeGroup,
  makeCall, makeGroupCall, makeCallRoom, groupId, callRemove,searchBar ,isAuth
}; 