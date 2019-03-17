const fs = require('fs');

function checkUser(userID, callback){
    fs.readFile('./data/conns.json', function(err, data){
        if(err){
            callback(err);
            return;
        }
        let usersData = JSON.parse(data.toString("utf-8"));
        callback(null, usersData, userID in usersData);
    });
}

function storeUser(userInfo, callback){
    checkUser(userInfo.userID, function(err, userData){
        if(err){
            console.log(err);
            callback(err);
            return;
        }
        userData[userInfo.userID] = userInfo.bData;
        fs.writeFile('./data/conns.json', JSON.stringify(userData), function(err){
            if(err){
                console.log(err);
                callback(err);
                return;
            }
            callback(null, true);
        });
    });
}

function getData(userID, callback){
    checkUser(userID, function(err, data, userExists){
        if(err){
            callback(err);
            return;
        }
        if(userExists){
            let userData = data[userID];
            callback(null, userData);
            console.log(userData);
            return;
        }
        console.log("I/O ERROR: Attempted to access non-existent user data of " + userID); 
    });
}

module.exports = {
    checkUser: checkUser,
    storeUser: storeUser,
    getUser: getData
}