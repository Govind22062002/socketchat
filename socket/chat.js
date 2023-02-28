var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.get('/', function(req, res){
   res.sendFile(__dirname +'/index.html');});
   const users =[];
   const room =[];
io.on('connection', function(socket){
   socket.on('setUsername',data=>{
console.log(data,"data Room");
if(room.length!=0){
   // const temp = data.room.split('!@!@2@!@!').reverse().join('!@!@2@!@!');
   if(room.includes(socket.id)){
       socket.join(temp)
       console.log('joined room',temp)
       socket.emit('joined',{room:temp})
       console.log(room ,);
   } else if(room.includes(data.room)){
       socket.join(data.room)
       console.log('joined room', data.room)
       socket.emit('joined', { room: data.room})
       console.log(room);

   }
}else{
   socket.join(data.room);
   room.push(data.room)
   console.log('joined room',data.room);
   socket.emit('joined', { room: data.room })
   console.log(room);
}

   })
   console.log('A user connected');
   socket.on('setUsername', function(data){
      console.log(data ,"name");

      if(users.indexOf(data) > -1){
         socket.emit('userExists', data + ' username is taken! Try some other username.');
      } else {
         users.push(data);
         socket.emit('userSet', {username: data});
      }
   });   
   socket.on('msg', function(data){
      //Send message to everyone
      console.log(data ,"data msg");
      io.sockets.emit('newmsg', data);
   })
});
http.listen(3001, function(){
   console.log('listening on localhost:3001');
});