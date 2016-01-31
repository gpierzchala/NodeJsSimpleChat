function divEscapedContentElement(message) {
    return $('<div class="row" style="margin-top:5px;"></div>').text(getDateAndTime() + ":" + message);
}

function divSystemContentElement(message) {
    return $('<div class="row" style="margin-top: 5px;"></div>').html('<i>' + message + '</i>');
}

function getDateAndTime() {
    var currentTime = new Date()
    var hours = currentTime.getHours()
    var minutes = currentTime.getMinutes()

    if (minutes < 10)
        minutes = "0" + minutes
    /*
    var currentDate = new Date()
        var day = currentDate.getDate()
        var month = currentDate.getMonth() + 1
        var year = currentDate.getFullYear()
    */
    return hours + ":" + minutes;
    //return day + "-" + month + "-" + year + ", " + hours + ":" + minutes;
}

function processUserInput(chatApp, socket) {
    var message = $('#send-message').val();
    var systemMessage;

    if (message.charAt(0) == '/') {
        systemMessage = chatApp.processCommand(message);
        if (systemMessage) {
            $('#messages').append(divSystemContentElement(systemMessage));
        }
    } else {
        chatApp.sendMessage($('#room').text(), message);
        $('#messages').append(divEscapedContentElement(message));
        $('#messages').scrollTop($('#messages').prop('scrollHeight'));
    }

    $('#send-message').val('');
}

var socket = io.connect();

$(document).ready(function () {
    var chatApp = new Chat(socket);

    socket.on('nameResult', function (result) {
        var message;

        if (result.success) {
            message = 'Your nick name was changed to: ' + result.name + '.';
        } else {
            message = result.message;
        }
        $('#messages').append(divSystemContentElement(message));
    });

    socket.on('joinResult', function (result) {
        $('#room').text(result.room);
        $('#messages').append(divSystemContentElement('Room has been changed'));
    });

    socket.on('message', function (message) {
        var newElement = $('<div class="row"></div>').text(message.text);
        $('#messages').append(newElement);
    });

    socket.on('userList', function (message) {        
        var newElement = $('<div class="row"></div>').text(message.text);        
        $("#messages").append(newElement);
    });

    socket.on('rooms', function (rooms) {
        $('#room-list').empty();

        for (var room in rooms) {
            room = room.substring(1, room.length);
            if (room != '') {
                var row = "<tr><td style='cursor:pointer'>" + room + "</td></tr>";
                $('#room-list').append(row);
            }
        }

        $('#room-list td').click(function () {
            chatApp.processCommand('/join ' + $(this).text());
            $('#send-message').focus();
        });
    });

    setInterval(function () {
        socket.emit('rooms');
    }, 1000);

    $('#send-message').focus();

    $('#send-form').submit(function () {
        processUserInput(chatApp, socket);
        return false;
    });
});
