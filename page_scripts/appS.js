window.addEventListener("load", function(){
	function getConnectedSocket(callback){
		if(typeof callback != "function"){
			console.error("SyntaxError: Expected a callback, received " + typeof callback);
			return;
		}
		var socket = io();
		if (localStorage.userData){
			let storeData = JSON.parse(localStorage.userData);
			socket.emit("connReturn", storeData.userID);
			socket.on("welcome", function(connData){
				console.log(
					`%cSERVER MESSAGE: ${connData.message}`,
					'color:blue; background:#dfefff'
				);
				socket.drawID = storeData.userID;
				if(storeData.userName){socket.drawName = storeData.userName; }
				else if(connData.userData.userName){ socket.drawName = connData.userData.userName; }
				if(storeData.brushData){ callback(socket, storeData.bData); }
				else { callback(socket, connData.userData.bData); }
				return;
			});
			socket.on("error", function(errData){
				console.log(
					"%cCONNECTION ERROR: An error occurred with the connection to the server...",
					"color:red; background:#ffdfdf"
				);
				console.log(errData);
			});
		}
		socket.on("connectionReply", function(data){
			let uConfig = {
				bData: {
					col: "rgba(0,0,0,1)",
					bSize: "5"
				}
			}
			if(data.code === 200){
				console.log(
					`%cSERVER MESSAGE: ${data.message}`,
					'color:blue; background:#dfefff'
				);
				socket.drawID = data.connID;
				uConfig.userID = data.connID;
				callback(socket, uConfig.bData);
			}
			localStorage.userData = JSON.stringify(uConfig);
		});
	}
	window.getConnectedSocket = getConnectedSocket;
});