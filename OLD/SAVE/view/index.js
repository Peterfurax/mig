// Setup basic express server
var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('../..')(server);
var port = process.env.PORT || 3000;
var fs = require('fs');
var chokidar = require('chokidar');
server.listen(port, function() {
    console.log('Server listening at port %d', port);
});

// Routing
app.use(express.static(__dirname + '/public'));

// Chatroom

var numUsers = 0;

io.on('connection', function(socket) {
    var addedUser = false;


    var watcher = chokidar.watch('tmp/', {
        ignored: /[\/\\]\./,
        persistent: true
    });

    var log = console.log.bind(console);

    watcher
        .on('add', function(path) {
            log('File', path, 'has been added');
            socket.broadcast.emit('new message', {
                username: "admin",
                message: "fichier " + path + " recuperé"
            });
            fs.appendFile("/tmp/test.log", path + "\n", function(err) {
                if (err) {
                    return console.log(err);
                }

                console.log("Le fichier est sauvegardé!");
            });
        })
        .on('addDir', function(path) {
            log('Directory', path, 'has been added');
        })
        .on('change', function(path) {
            log('File', path, 'has been changed');
        })
        .on('unlink', function(path) {
            log('File', path, 'has been removed');
        })
        .on('unlinkDir', function(path) {
            log('Directory', path, 'has been removed');
        })
        .on('error', function(error) {
            log('Error happened', error);
        })
        .on('ready', function() {
            log('Initial scan complete. Ready for changes.');
        })
        //.on('raw', function(event, path, details) { log('Raw event info:', event, path, details); })

    // 'add', 'addDir' and 'change' events also receive stat() results as second
    // argument when available: http://nodejs.org/api/fs.html#fs_class_fs_stats
    watcher.on('change', function(path, stats) {
        if (stats) console.log('File', path, 'changed size to', stats.size);
    });

    // when the client emits 'new message', this listens and executes
    socket.on('new message', function(data) {
        // we tell the client to execute 'new message'
        socket.broadcast.emit('new message', {
            username: socket.username,
            message: data
        });
    });

    // when the client emits 'add user', this listens and executes
    socket.on('add user', function(username) {
        if (addedUser) return;

        // we store the username in the socket session for this client
        socket.username = username;
        ++numUsers;
        addedUser = true;
        socket.emit('login', {
            numUsers: numUsers
        });
        // echo globally (all clients) that a person has connected
        socket.broadcast.emit('user joined', {
            username: socket.username,
            numUsers: numUsers
        });
    });

    // when the client emits 'typing', we broadcast it to others
    socket.on('typing', function() {
        socket.broadcast.emit('typing', {
            username: socket.username
        });
    });

    // when the client emits 'stop typing', we broadcast it to others
    socket.on('stop typing', function() {
        socket.broadcast.emit('stop typing', {
            username: socket.username
        });
    });

    // when the user disconnects.. perform this
    socket.on('disconnect', function() {
        if (addedUser) {
            --numUsers;

            // echo globally that this client has left
            socket.broadcast.emit('user left', {
                username: socket.username,
                numUsers: numUsers
            });
        }
    });
});
