const mongoose = require("mongoose")

const registerSchema = mongoose.Schema({
    username : String,
    email : String,
    name : String,
    password : String
})

const register = mongoose.model("socketRegister",registerSchema);

module.exports =register;