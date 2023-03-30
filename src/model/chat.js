const mongoose = require("mongoose")

const chatSchema = mongoose.Schema({
    createdBy : String ,
    name : String,
    AdminId : Array ,
    chatType : String,
    chatId : Array,
    roomId : String ,
    chat : [{
        from :  mongoose.Schema.Types.ObjectId,
        to  :  mongoose.Schema.Types.ObjectId,
        message : String,
        image : String ,
        date : Date
    }],
},{ timestamps: true })

const chat = mongoose.model("socket_Chat",chatSchema);

module.exports = chat ;