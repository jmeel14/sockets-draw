var drawData = [];
var clearTimed = 150;
const connList = {};
const currsList = {};

const ch = require('./connHandler.js');

function checkConn(conn){ return conn == undefined; }

function userRemove(connID, conn){
    for(let stroke in drawData){
        if(drawData[stroke].owner === connID){
            drawData.splice(stroke, 1);
        };
    }
    if(connList[connID]){
        let clone = connList[connID];
        ch.storeUser({
            userID: connID,
            bData: {
                bCol: clone.colour,
                bSize: clone.currSize
            }
        }, function(err){
            if(err){
                console.log(err);
                return;
            }
        });
        delete connList[connID];
    }
    if(currsList[connID]){ delete currsList[connID]; }
    conn.broadcast.emit("userRemove", connID);
}

function sendBoard(connID, conn, boardData){
    if(checkConn(conn)){ userRemove(connID, conn); return; }
    if(drawData.length > 0){
        if(boardData != JSON.stringify(drawData)){
            conn.emit("boardReply", drawData);
        }
    }
}

setInterval(function(){
    if(clearTimed > 0){
        clearTimed--;
    }
}, 1000);

function clearBoard(conn, connHandler){
    if(clearTimed === 0){
        drawData = [];
        conn.emit("clear", "board");
        conn.broadcast.emit("clear", "board");
        clearTimed = 150;
        if(typeof connHandler === "function"){
            connHandler("clearOkay");
        }
        return;
    }
    else {
        if(typeof connHandler === "function"){
            connHandler(clearTimed);
        }
    }
}
function add(connID, conn, connConfig){
    if(checkConn(conn)){ userRemove(connID, conn); return; }
    if(!connList[connID]){
        sendBoard(connID, conn, JSON.stringify([]));
        conn.emit("userList", {conns: connList, currStrokes: currsList});
        connList[connID] = {
            currSize: connConfig.bSize, colour: "rgba(0,0,0,1)",
            pos: { locX: connConfig.curPos[0], locY: connConfig.curPos[1] }
        }
        conn.broadcast.emit("userAdd", {
            owner: connID,
            size: connConfig.bSize,
            colour: connList[connID].colour,
            pos: { locX: connConfig.curPos[0], locY: connConfig.curPos[1] }
        });
    }
}

function startStroke(connID, conn, currStroke){
    if(checkConn(conn)){ userRemove(connID, conn); return; }
    if(!currsList[connID]){
        currsList[connID] = currStroke;
        conn.broadcast.emit("strokeCreate", {owner: connID, strokeData: currsList[connID]});
    }
}

function cursorUpdate(connID, conn, cursorData){
    if(checkConn(conn)){ userRemove(connID, conn); return; }
    let cursorCopy = cursorData;
    if(cursorCopy.extra.drawing && currsList[connID]){
        if(cursorCopy[cursorCopy.type].locX){
            var posVals = [
                [cursorCopy[cursorCopy.type].locX, cursorCopy[cursorCopy.type].locY],
                currsList[connID].strokes[currsList[connID].strokes.length - 1]
            ];
            let posJSON = [
                JSON.stringify(posVals[0]),
                JSON.stringify(posVals[1])
            ];
            if(posJSON[0] != posJSON[1]){
                conn.broadcast.emit("strokeUpdate", {
                    owner: connID,
                    type: 'strokeInsert',
                    strokeInsert: cursorCopy[cursorCopy.type]
                });
            }
        }
        else {
            if(cursorCopy.type == "size"){
                if(cursorCopy[cursorCopy.type] > 100 || cursorCopy[cursorCopy.type] < 1){
                    cursorCopy[cursorCopy.type] = 0;
                }
            }
            let typeStr = "stroke" + cursorCopy.type[0].toUpperCase() + cursorCopy.type.slice(1);
            let transmitData = {
                owner: connID,
                type: typeStr
            }
            transmitData[typeStr] = cursorCopy[cursorCopy.type];
            conn.broadcast.emit("strokeUpdate", transmitData);
        }
    }
    else{
        conn.broadcast.emit("cursorUpdate", {
            connID: cursorCopy.owner,
            connUType: cursorCopy.type,
            connUpdate: cursorCopy[cursorCopy.type]
        });
    }
}

function addStroke(connID, conn, connStroke, acknowledgement){
    if(checkConn(conn)){ userRemove(connID, conn); return; }
    acknowledgement("Okay.");
    let strokeCopy = {owner: connID, data: connStroke};
    if(currsList[connID]){
        delete currsList[connID];
    }
    drawData.push(strokeCopy);
    conn.broadcast.emit("strokeFinish", strokeCopy);
}

module.exports = {
    add: add,
    board: sendBoard,
    clearBoard: clearBoard,
    startStroke: startStroke,
    addStroke: addStroke,
    cursor: cursorUpdate,
    userRemove: userRemove
}