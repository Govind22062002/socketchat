const mongoose = require("mongoose")

mongoose.set('strictQuery', true);

mongoose.connect("mongodb://localhost:27017/socketioChat").then(
    () => {
        console.log("mongodb connection successful");
    }).catch(()=> {
        console.log("not connect mongodb");
    }) 