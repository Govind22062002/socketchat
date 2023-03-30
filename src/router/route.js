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

const {login,logout,register,registerPost,postLogin,socketIndex,messages,makeGroup,groupId,makeCall,
  makeGroupCall,makeCallRoom,callRemove,searchBar,isAuth} = require("../controler/controler")

router.get("/", login);
router.get("/logout/:id", logout);
router.get("/register", register)
router.post("/postRegister" ,registerPost)
router.post("/postLogin" , postLogin)
router.get("/index",isAuth ,socketIndex )
router.get("/messages/:id",isAuth, messages)
router.get("/makeGroup", isAuth , makeGroup );
router.get("/groupId/:id/:groupName", isAuth , groupId)

router.get("/tryTocall/:id/:userId",isAuth, makeCall )
router.get("/tryToGroupcall/:id/:userId",isAuth, makeGroupCall )

router.get('/videoCall/:id/:room' , makeCallRoom)
router.get("/callRemove/:room", callRemove  )
router.get("/searchBar", searchBar)

module.exports = router ;