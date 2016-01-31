var socketio = require('socket.io');
var io;
var guestNumber = 1;
var nickNames = {};
var namesUsed = [];
var currentRoom = {};

exports.listen = function (server) {
    io = socketio.listen(server);
    io.set('log level', 1);

    io.sockets.on('connection', function (socket) {
        guestNumber = assignGuestName(socket, guestNumber, nickNames, namesUsed);

        joinRoom(socket, 'Lobby');
        handleMessageBroadcasting(socket, nickNames);
        handleNameChangeAttempts(socket, nickNames, namesUsed);
        handlRoomJoining(socket);
        handleUserList(socket);
        socket.on('rooms', function () {
            socket.emit('rooms', io.sockets.manager.rooms)
        });

        handleClientDisconnection(socket, nickNames, namesUsed);
    });
}


function assignGuestName(socket, guestNumber, nickNames, namesUsed) {
    var name = "Guest" + guestNumber;
    nickNames[socket.id] = name;
    socket.emit('nameResult',
        {
            success: true,
            name: name
        });

    namesUsed.push(name);
    return guestNumber + 1;
}

function joinRoom(socket, room) {
    socket.join(room);
    currentRoom[socket.id] = room;
    socket.emit('joinResult', { room: room });
    socket.broadcast.to(room).emit('message', { text: nickNames[socket.id] + ' join to the ' + room + ' room' });

    var usersInRoom = io.sockets.clients(room);

    if (usersInRoom.length > 1) {
        var usersInRoomSummary = 'User list in room ' + room + ": ";

        for (var index in usersInRoom) {
            var userSocketId = usersInRoom[index].id;

            if (userSocketId != socket.id) {
                if (index > 0) {
                    usersInRoomSummary += ', ';
                }
                usersInRoomSummary += nickNames[userSocketId];
            }
            usersInRoomSummary += ' ';
            
        }
socket.emit('message', { text: usersInRoomSummary });
    }
}

function handleMessageBroadcasting(socket) {
    socket.on('message', function(message){
        socket.broadcast.to(message.room).emit('message',{
            text: nickNames[socket.id] + ': ' + message.text});
    });
 }

function handleNameChangeAttempts(socket, nickNames, namesUsed) {
    socket.on('nameAttempt', function (name) {
        if (name.indexOf('Guest') == 0) {
            socket.emit('nameResult', {
                success: false,
                message: 'User name cannot start with Guest'
            });
        } else {
            if (namesUsed.indexOf(name) == -1) {
                var previousName = nickNames[socket.id];
                var previousNameIndex = namesUsed.indexOf(previousName);
                namesUsed.push(name);
                nickNames[socket.id] = name;
                delete namesUsed[previousNameIndex];
                socket.emit('nameResult', {
                    success: true,
                    name: name
                });
                socket.broadcast.to(currentRoom[socket.id]).emit('message', {
                    test: previousName + ' changed name to ' + name
                });
            } else {
                socket.emit('nameResult', {
                    success: false,
                    message: 'This name is already taken by someone else'
                })
            }
        }
    });
}

function handleUserList(socket) {
    socket.on('userList', function (room) {
        var roomName = currentRoom[socket.id];

        var usersInRoom = io.sockets.clients(roomName);

        if (usersInRoom.length > 1) {
            var usersInRoomSummary = 'User list in room ' + roomName + ": ";

            for (var index in usersInRoom) {
                var userSocketId = usersInRoom[index].id;

                
                    if (index > 0) {
                        usersInRoomSummary += ', ';
                    }
                    usersInRoomSummary += nickNames[userSocketId];
                
                usersInRoomSummary += ' ';
               
            }
             socket.emit('message', { text: usersInRoomSummary });
        }
    });
}


function handlRoomJoining(socket) { 
    socket.on('join',function(room){
       socket.leave(currentRoom[socket.id]);
       joinRoom(socket, room.newRoom); 
    });
}

function handleClientDisconnection(socket) { 
    socket.on('disconnect',function(){
       var nameIndex = namesUsed.indexOf(nickNames[socket.id]);
       delete namesUsed[nameIndex];
       delete nickNames[socket.id]; 
    });
}