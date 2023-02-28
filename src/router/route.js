const { Socket } = require("dgram");
const express = require("express");
const multer = require("multer")

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, './public/uploads')
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
      cb(null,  uniqueSuffix + '-' + file.originalname )
    }
  })
  const upload = multer({ storage: storage })
const router = express.Router() ;

const {login,register,registerPost,postLogin,socketIndex,messages,makeGroup,groupId ,isAuth} = require("../controler/controler")

router.get("/" , login);
router.get("/register", register)
router.post("/postRegister" ,registerPost)
router.post("/postLogin" , postLogin)
router.get("/index",isAuth ,socketIndex )
router.get("/messages/:id",isAuth, messages)
router.get("/makeGroup", isAuth , makeGroup );
router.get("/groupId/:id/:groupName", isAuth , groupId)
module.exports = router ;