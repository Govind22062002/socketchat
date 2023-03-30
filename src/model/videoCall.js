const mongoose = require("mongoose")

const videoSchema = mongoose.Schema({
    chatType: String,
    videoChatId: Array,
    from: mongoose.Schema.Types.ObjectId,
    to: mongoose.Schema.Types.ObjectId,
    room: String,
    peerId : String,
    date: Date,
}, { timestamps: true })

const video = mongoose.model("socket_videoData", videoSchema);

module.exports = video;