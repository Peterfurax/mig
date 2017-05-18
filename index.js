// Setup basic express server
var express = require('express');
var app = express();
var server = require('http').createServer(app);
var chokidar = require('chokidar');
var io = require('socket.io')(server);
var port = process.env.PORT || 3000;
var fs = require('fs');
var moment = require('moment');
var date = moment().format("dddd Do MMMM YYYY - H:mm:ss");

server.listen(port, function() {
    console.log('Server listening at port %d', port);
    console.log(date);
});

// Routing
app.use(express.static(__dirname + '/view'));

// Chatroom


var numUsers = 0;

io.on('connection', function(socket) {
    var addedUser = false;


    var watcher = chokidar.watch('tmp/', {
        ignored: /[\/\\]\./,
        persistent: true
    });

    var log = console.log.bind(console);

    function logWrite(path, type) {
        fs.appendFile("/tmp/test.log", "<div>" + date + " " + path + "</div>" +"\n", function(err) {
            if (err) {
                return console.log(err);
            }
            console.log("Le fichier est sauvegardé!");
        });
    }

    function logBroadcast(path, type) {
        socket.broadcast.emit('File Update', {
            username: "admin",
            message: date + " " + type + " " + path
        });
        io.emit('path', { for: 'everyone' });

    }

    function logOld(data) {
        socket.broadcast.emit('File Update', {
            username: "admin",
            message: data
        });
    }

    function recupold () {
        fs.readFile('/tmp/test.log', 'utf8', function(err, data) {
                if (err) {
                    return console.log(err);
                }
                logOld(data);
            });
    }

      recupold();
            // fs.readFile('/tmp/test.log', 'utf8', function(err, data) {
            //     if (err) {
            //         return console.log(err);
            //     }
            //     console.log(data);
            //     logOld("data");
            // });

    watcher
        .on('add', function(path) {
            log('File', path, 'has been added');
            var type = "Récuperation";
            logBroadcast(path, type);
            logWrite(path, type);
        })
        .on('addDir', function(path) {
            log('Directory', path, 'has been added');
            var type = "Ajout Dossier";
            logBroadcast(path, type);
            logWrite(path, type);
        })
        .on('change', function(path) {
            log('File', path, 'has been changed');
            var type = "Changement etat";
            logBroadcast(path, type);
            logWrite(path, type);
        })
        .on('unlink', function(path) {
            log('File', path, 'has been removed');
            var type = "Suppression";
            logBroadcast(path, type);
            logWrite(path, type);
        })
        .on('unlinkDir', function(path) {
            log('Directory', path, 'has been removed');
            var type = "Drestruction dossier";
            logBroadcast(path, type);
            logWrite(path, type);
        })
        .on('error', function(error) {
            log('Error happened', error);
            var type = "ERROR";
            logBroadcast(path, type);
            logWrite(path, type);
        })
        .on('ready', function() {
            log('Initial scan complete. Ready for changes.');
            var type = "Sccc";
            logBroadcast("path", type);
            logWrite("path", type);

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
