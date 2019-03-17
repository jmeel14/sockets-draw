const httpLib = require('http')
const socketIO = require("socket.io");

const appScript = require('./scripts/app.js');
const ph = require("./scripts/pageHandler.js");
const ch = require('./scripts/connHandler.js');

const httpServer = httpLib.createServer(handler);
httpServer.listen('1988');

function handler(req, resp){
    ph.pageConfirm(req.url, function(noFind, status, find){
        if(noFind){
            resp.writeHead(status);
            resp.write(noFind);
            resp.end();
            return;
        }
        ph.pageBuild(find, function(err, status, pass){
            if(err){
                resp.writeHead(status)
                resp.write(err);
                resp.end();
                return;
            }
            resp.write(pass)
            resp.end();
        });
    })
}

var connsList = [];

const sIO = socketIO(httpServer);
sIO.on("connection", function(socket){
    var connReturned = false;
    var socketID = null
    socket.on("connReturn", function(returnID){
        ch.getUser(returnID, function(err, user){
            if(err){
                console.log(err);
                return;
            }
            socket.emit("welcome", {
                userData: {
                    bData: user.bData,
                    userName: user.name
                },
                message: "Welcome back. Your previous settings have been applied."
            });
            connReturned = true;
            socketID = returnID;
        });
    });
    if(typeof socketID != "string"){
        let date = new Date();
        let timeStamp = [
            date.getFullYear().toString(),
            date.getMonth().toString(),
            date.getDay().toString(),
            date.getMilliseconds().toString()
        ]
        let tempID = timeStamp.join("") + Math.random();
        let addOn = "";
        if(connsList.includes(tempID)){
            addOn = {
                "0": "a", "1": "b", "2": "c",
                "3": "d", "4": "e", "5": "f",
                "6": "g", "7": "h", "8": "i",
                "9": "j","10": "k"
            }
            while(connsList.includes(tempID)){
                tempID = tempID + addOn[Math.floor(Math.random() * 10).toString()];
            }
        }
        socketID = tempID + addOn;
        socket.emit("connectionReply", {
            connID: socketID,
            code: 200,
            message: "Connection established"
        });
    }
    socket.on("reconnect", function(){
        console.log("reconnected... somehow");
    })
    socket.on("initiate", function(data){appScript.add(socketID, socket, data); });
    socket.on("boardStatus", function(data){ appScript.board(socketID, socket, data); });
    socket.on("boardClear", function(handler){ appScript.clearBoard(socket, handler); });
    socket.on("strokeStart", function(data){ appScript.startStroke(socketID, socket, data); });
    socket.on("strokeComplete", function(data, ack){ appScript.addStroke(socketID, socket, data, ack); });
    socket.on("cursor", function(data){ appScript.cursor(socketID, socket, data); });
    socket.on("disconnect", function(){ appScript.userRemove(socketID, socket); });
});