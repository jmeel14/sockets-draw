const consOuts = {
	log: 'color:black; background:#eeeeee',
	warn: 'color:red; background:#ffdfdf',
	info: 'color:blue; background:#dfefff',
	success: 'color:green; background:#dfffdf'
}
window.addEventListener("load", function () {
	var drawCanv = document.getElementById("drawCanv");
	var drawCtx = drawCanv.getContext("2d");
	if (window.innerHeight < drawCanv.height) {
		drawCanv.height = 400;
	}
	if (window.innerWidth < drawCanv.width) {
		drawCanv.width = 400;
	}


	var noticeZone = document.getElementById("noticeZone");
	var noticeTime = 20;

	function canvasNotice(noticeType, noticeTitle, noticeMessage){
		noticeZone.innerHTML = "";
		let noticeElem = document.createElement('div');
		noticeElem.setAttribute("class", "cNotice " + noticeType);
		
		let titleElem = document.createElement("div");
		titleElem.setAttribute("class", "cNoticeTitle");
		titleElem.innerText = noticeTitle;
		noticeElem.appendChild(titleElem);
		let msgElem = document.createElement("div");
		msgElem.setAttribute("class", "cNoticeMsg");
		msgElem.innerText = noticeMessage;
		noticeElem.appendChild(msgElem);

		noticeZone.appendChild(noticeElem);
		setTimeout(function(){
			noticeElem.removeChild(msgElem);
			noticeElem.removeChild(titleElem);
			noticeZone.removeChild(noticeElem);
			noticeZone.innerHTML = null;
		}, noticeTime * 1000);
	}
	canvasNotice("info", "For non-4k Users",
		"If all you see is white, use browser zoom buttons to zoom out."
	);


	var labels = document.getElementsByClassName("toolLabel");
	for (var lbl = 0; lbl < labels.length; lbl++) {
		var lblElem = labels[lbl];
		var lblArgs = lblElem.className.split(" ");
		lblElem.addEventListener("click", function () {
			for (var arg = 0; arg < lblArgs.length; arg++) {
				if (arg == "active") { lblArgs[arg] = "inactive"; return; }
				else if (arg == "inactive") { lblArgs[arg] = "active"; return; }
			}
		});
	}
	var drawCol = "rgba(0,0,0,1)";
	var bSizeElem = document.getElementById("bSize");
	var bSizeVal = document.getElementById("bSizeVal");
	var bSize = 1;
	var bDraw = document.getElementById("currBrush");
	var bDrawCont = document.getElementsByClassName("currBrushZone")[0];
	var bMode = document.getElementById("mode");

	var zoomElems = {
		slider: document.getElementById("zoomVal"),
		output: document.getElementById("zoomLevel")
	}
	var ignoreScroll = false;
	var panElems = {
		panX: {
			slider: document.getElementById("panX"),
			output: document.getElementById("panValX"),
			ref: 0
		},
		panY: {
			slider: document.getElementById("panY"),
			output: document.getElementById("panValY"),
			ref: 1
		}
	}
	var colElems = {
		red: {
			slider: document.getElementById("colRed"),
			output: document.getElementById("colRedVal")
		},
		green: {
			slider: document.getElementById("colGreen"),
			output: document.getElementById("colGreenVal")
		},
		blue: {
			slider: document.getElementById("colBlue"),
			output: document.getElementById("colBlueVal")
		},
		alpha: {
			slider: document.getElementById("colAlpha"),
			output: document.getElementById("colAlphaVal")
		}
	}

	var blendOpts = {
		"nml": "source-over",
		"ltn": "lighten",
		"dkn": "darken",
		"mtp": "multiply",
		"inv": "difference",
		"bhnd": "destination-over",
		"sub": "source-atop",
		"ers": "destination-out"
	}

	var clrElem = document.getElementById("clrBtn");

	var isFocused = false; var isDrawing = false; var isPanning = false;
	var onCanv = false;
	var isActive = false; var activityCounter = 0; var scriptPaused = false;
	var zoomFactor = 1;
	var zoomOff = [0, 0]; var zoomUDVals = [0, 0];
	var currStroke = false;
	var ownList = []; var selfList = []; var publicList = [];
	var redoList = []; var currsList = []; var currStrokeList = {};
	var userTextStroke = false;

	function setZoom(val){
		zoomFactor = val;
		zoomElems.slider.value = val;
		zoomElems.output.innerText = val.toString() + 'x';
	}
	setZoom(1);
	function zoomMaths(zOff, mOffs, zFactor){
		zoomOffs = [
			zOff[0] / zoomFactor,
			zOff[1] / zoomFactor
		]
		return zoomOffs;
	}

	zoomElems.slider.addEventListener("input", function(){
		zoomElems.output.innerText = zoomElems.slider.value.toString() + 'x'
		zoomFactor = zoomElems.slider.value;
	});
	function setPan(pan, val){ pan.output.innerText = val; }
	for(let panHandle in panElems){
		let currPan = panElems[panHandle]
		currPan.slider.addEventListener("input", function(){
			setPan(currPan, currPan.slider.value);
			zoomUDVals[currPan.ref] = zoomUDVals[currPan.ref] + currPan.slider.value;
		});
		currPan.slider.addEventListener("mouseup", function(){
			currPan.slider.value = 0;
			setPan(currPan, 0);
			zoomUDVals = [0, 0];
		});
	}
	function genSumPix(nums) {
		var initNum = 0;
		for (var num = 0; num < nums.length; num++) {
			initNum += nums[num];
		}
		return initNum + 'px';
	}
	function genSumCols(colsArray) {
		let colsStr = ["rgba("];
		let colVals = [];
		if(colsArray && Array.isArray(colsArray)){
			for(let colCtr = 0; colCtr < colsArray.length - 1; colCtr++){
				colVals.push(colsArray[colCtr]);
			}
			colsStr.push(colVals.join(","));
			return colsStr.join("") + ")";
		}
		else if(colsArray && typeof colsArray == "string"){
			return colsArray;
		}
		for (let colElem in colElems) {
			if (colElem == "alpha") {
				colVals.push(colElems[colElem].slider.value / 100);
			}
			else {
				colVals.push(colElems[colElem].slider.value);
			}
		}
		colsStr.push(colVals.join(","));
		return colsStr.join("") + ")";
	}
	function setCols(colData){
		let ctr = 0;
		if(Array.isArray(colData)){
			for(let col in colElems){
				col.slider.value = colValue[ctr];
				col.output.innerText = colValue[ctr];
				ctr++;
			}
		}
		else {
			if(/rgb\(.*,.*,.*,.*\)/.exec(colData)){
				console.log(/rgb\((.*),().*),(.*),(.*)\)/.exec(colData))
			}
		}
	}
	bDraw.style.backgroundColor = genSumCols([0,0,0,1]);
	function setSize(selfElem, val) {
		if (typeof val != "number") {
			val = parseInt(val);
		}
		bSize = val;
		if (!selfElem) { bSizeElem.value = val; }
		bSizeVal.innerHTML = val;

		bDraw.style.width = genSumPix([bSize]);
		bDraw.style.height = genSumPix([bSize]);

		return val;
	}
	setSize(false, 5);

	function setMode() {
		if (blendOpts.hasOwnProperty(bMode.value)) {
			return blendOpts[bMode.value];
		}
		else {
			return blendOpts["nml"];
		}
	}

	function drawCursor(userData, size, locX, locY, appActive) {
		if (appActive) {
			drawCtx.lineWidth = 1;
			let drawPos = [locX, locY];
			let drawSize = (size / 4) * zoomFactor;

			drawCtx.globalCompositeOperation = "source-over";
			drawCtx.strokeStyle = 'rgba(255,255,255,0.5)';
			drawCtx.beginPath();
			drawCtx.arc(
				drawPos[0],
				drawPos[1],
				drawSize, 0, 2 * Math.PI);
			drawCtx.closePath();

			drawCtx.stroke();

			drawCtx.strokeStyle = 'rgba(0,0,0,0.5)';
			drawCtx.beginPath();
			drawCtx.arc(
				drawPos[0],
				drawPos[1],
				drawSize, 0, 2 * Math.PI);
			drawCtx.closePath();

			drawCtx.stroke();

			if (!userData.isSelf) {
				let fontSize = 20;
				drawCtx.font = `${fontSize}px monospace`;
				drawCtx.globalCompositeOperation = "source-over";

				drawCtx.fillStyle = userData.colour;
				drawCtx.beginPath()
				drawCtx.lineTo(locX, locY);
				drawCtx.lineTo(locX + fontSize, locY - fontSize / 2);
				drawCtx.lineTo(locX + fontSize, locY + fontSize / 2);
				drawCtx.lineTo(locX, locY);
				drawCtx.closePath();
				drawCtx.fill();

				drawCtx.fillStyle = "rgba(0,0,0,0.7)";
				drawCtx.beginPath();
				drawCtx.lineTo(locX + fontSize, locY - fontSize / 2);
				drawCtx.lineTo(
					(locX + fontSize) + ((fontSize / 1.80) * userData.drawID.length),
					locY - fontSize / 2
				);
				drawCtx.lineTo(
					(locX + fontSize) + ((fontSize / 1.80) * userData.drawID.length),
					locY + fontSize / 2
				);
				drawCtx.lineTo(locX + fontSize, locY + fontSize / 2);
				drawCtx.closePath();
				drawCtx.fill();

				drawCtx.fillStyle = "rgba(255,255,255,0.85)";
				drawCtx.fillText(
					userData.drawID,
					locX + fontSize,
					locY + fontSize / 3
				);
				if (userTextStroke) {
					drawCtx.strokeStyle = "rgba(0,0,0,0.5";
					drawCtx.strokeText(userData.drawID, locX + fontSize, locY + fontSize / 3);
				}
			}
		}
	}
	var cursorLast = [0, 0];
	window.addEventListener("mouseup", function () {
		if (isDrawing) {
			isDrawing = false;
		}
	});
	window.addEventListener("mousemove", function () {
		if (!isActive) {
			isActive = true;
			activityCounter = 0;
			console.log("%cActivity continued!", consOuts.log);
		}
	});
	window.addEventListener("wheel", function(){
		if (!isActive) {
			isActive = true;
			activityCounter = 0;
			console.log("%cActivity continued!", consOuts.log);
		}
	})
	window.addEventListener("touchemove", function () {
		if (!isActive) {
			isActive = true;
			activityCounter = 0;
			console.log("%cActivity continued!", consOuts.log);
		}
	});

	window.addEventListener("keydown", function (ev) {
		if(!isActive){
			isActive = true;
			activityCounter = 0;
			console.log("%cActivity continued!", consOuts.log)
		}
		if (ev.which == 32 && onCanv) {
			isFocused = true; isPanning = true;
		}
	});
	window.addEventListener("keyup", function (ev) {
		if (ev.which == 32 && isFocused) {
			isFocused = false;
		}
	})

	function drawAnim(drawPos) {
		drawCtx.lineTo(drawPos[0], drawPos[1]);
	}

	function iterAnim(animData) { //TODO!
		drawCtx.globalCompositeOperation = animData.brushMode;
		drawCtx.strokeStyle = animData.brushCol;
		drawCtx.lineCap = "round";
		drawCtx.lineJoin = "round";
		drawCtx.lineWidth = animData.brushSize * (zoomFactor / 2);
		drawCtx.beginPath();
		for (var i = 0; i < animData.brushStrokes.length; i++) {
			let bStrokeList = animData.brushStrokes[i];
			let drawPos = [
				(bStrokeList[0] + zoomOff[0]) * zoomFactor,
				(bStrokeList[1] + zoomOff[1]) * zoomFactor
			];
			drawAnim(drawPos);
		}

		drawCtx.stroke();
		drawCtx.closePath();
	}


	var savesElem = document.getElementById("saveTool");
	var saveBtnElem = document.getElementById("saveBtn");

	function genSaveElem(imgSave) {
		var saveElem = document.createElement('div');
		saveElem.setAttribute('id', 'save');

		var imgElem = document.createElement('img');
		imgElem.setAttribute('class', 'saveImg');
		imgElem.setAttribute('src', imgSave);
		saveElem.appendChild(imgElem);

		var dateElem = document.createElement('div');
		dateElem.setAttribute('class', 'saveDate');
		let date = new Date();
		let dateArr = [date.getFullYear(), date.getMonth(), date.getDay()];
		dateElem.innerHTML = dateArr.join("/");
		saveElem.appendChild(dateElem);

		saveElem.addEventListener("click", function () {
			ownList = JSON.parse(window.localStorage.lastSave).saveObj;
		});

		savesElem.innerHTML = null;
		savesElem.appendChild(saveElem);

	}
	function createSave(imgDataRaw, saveDataRaw) {
		var imgData = imgDataRaw;
		var saveData = saveDataRaw;

		genSaveElem(imgData);
		localStorage.lastSave = JSON.stringify({
			saveImg: imgData,
			saveObj: saveData
		});
	}
	saveBtnElem.addEventListener("click", function () {
		createSave(drawCanv.toDataURL(), ownList);
	});


	if (window.localStorage.lastSave) {
		try {
			createSave(
				JSON.parse(window.localStorage.lastSave).saveImg,
				JSON.parse(window.localStorage.lastSave).saveObj
			);
		}
		catch (e) {
			ownList = [];
			console.log(e);
		}
	}

	var dlButton = document.getElementById("dlBtn");
	var dlButtonC = document.getElementById("dlBtnCode");
	function createDownload(type) {
		if (type == "img") {
			var dlContent = drawCanv.toDataURL();
			dlButton.setAttribute("href", dlContent);
			dlButton.setAttribute("download", "canvas_image.png");
		}
		else {
			var dlContent = "data:text/plain;charset=utf-8," + JSON.stringify(ownList);
			dlButtonC.setAttribute("href", dlContent);
			dlButton.setAttribute("download", "drawing_code.json");
		}

	}

	dlButton.addEventListener("mouseover", function () {
		createDownload("img");
	});
	dlButtonC.addEventListener("mouseover", function () {
		createDownload();
	});

	function connAction(transmitPsg, transmitMsg, transmitData, responseHandler) {
		if (transmitPsg.connected && !transmitPsg.disconnected) {
			if(responseHandler && typeof responseHandler === "function"){
				transmitPsg.emit(transmitMsg, transmitData, function(responseData){
					responseHandler(responseData);
				});
			}
			else{
				transmitPsg.emit(transmitMsg, transmitData);
			}
		}
	}
	function setDrawing(drawConn, startPos){
		if(isDrawing){
			currStroke = {
				strokes: [[startPos[0], startPos[1]]],
				bSize: bSize,
				bCol: genSumCols(),
				bMode: setMode()
			};
			connAction(drawConn, "strokeStart", currStroke);
		}
	}
	function endStroke(strokeCanv){
		if(currStroke && currStroke.strokes.length > 0){
			ownList.push(currStroke);
			connAction(strokeCanv, "strokeComplete", currStroke, function(data){
				if(data === "Okay."){
					ownList.pop();
				}
			});
			publicList.push({owner: strokeCanv.drawID, data: currStroke});
			currStroke = false;
		}
	}

	function transferCursor(transferColumn, type, typeData, extraData){
		let transmitData = {
			owner: transferColumn.drawID,
			type: type,
			extra: extraData
		}
		let dataTransmittable = false;
		switch(type){
			case 'currSize':
				transmitData[type] = typeData;
				dataTransmittable = true;
				break;
			case 'pos':
				transmitData[type] = {
					locX: typeData[0],
					locY: typeData[1]
				}
				dataTransmittable = true;
				break;
			case 'colour':
				transmitData[type] = typeData;
				dataTransmittable = true;
				break;
			default:
				console.log("Invalid cursor update argument given.");
		}
		if(dataTransmittable){ connAction(transferColumn, "cursor", transmitData); }
		
	}

	console.log("%cAttempting connection to socket server...", consOuts.log);
	getConnectedSocket(function (conn, configData) {
		if(configData){
			console.log("%cWelcome back. Re-applying your last settings...", consOuts.info);
			setSize(false, configData.bSize);
			setCols(configData.col);
			// TODO - Find where to store colour values in an array
			// to store in localStorage and to send to server to be
			// stored.
		}
		bSizeElem.addEventListener("input", function () {
			setSize(true, bSizeElem.value);
		});

		for (let col in colElems) {
			colElems[col].slider.addEventListener("input", function () {
				colElems[col].output.innerText = colElems[col].slider.value;
				let currCols = genSumCols();
				let localStorageData = JSON.parse(localStorage.userData);
				localStorageData["bData"].col = currCols;
				localStorage.userData = JSON.stringify(localStorageData);
				bDraw.style.backgroundColor = currCols;
				if (currStroke) { currStroke.bCol = currCols }
				transferCursor(conn, "colour", currCols, { drawing: isDrawing });
			});
		}
		drawCanv.addEventListener("mousedown", function (ev) {
			ev.preventDefault();
			if (!isFocused && !ev.ctrlKey) {
				isDrawing = true;
				let cursorPos = [
					ev.offsetX / zoomFactor,
					ev.offsetY / zoomFactor
				]
				setDrawing(conn, [
					cursorPos[0],
					cursorPos[1]
				]);
			}
		});

		drawCanv.addEventListener("touchstart", function(ev) {
			if(ev.touches.length < 2){
				ev.preventDefault();
				let canvPos = drawCanv.getBoundingClientRect();
				let canvOffs = [canvPos.x, canvPos.y];
				let canvTouch = ev.touches[0];
				if (!isFocused) {
					isDrawing = true;
					let touchLoc = [
						ev.offsetX,
						ev.offsetY
					];
					setDrawing(conn, [touchLoc[0], touchLoc[1]]);
				}
			}
		});
		drawCanv.addEventListener("mousemove", function(ev) {
			cursorLast = [
				ev.offsetX,
				ev.offsetY
			];
			
			let cursorPos = [
				(cursorLast[0] / zoomFactor) + zoomOff[0],
				(cursorLast[1] / zoomFactor) + zoomOff[1]
			];
			if (isDrawing) {
				ev.preventDefault();
				currStroke.strokes.push([
					cursorPos[0],
					cursorPos[1]
				]);
			}
			transferCursor(conn, "pos", cursorPos, {drawing: isDrawing });
		});

		drawCanv.addEventListener("touchmove", function(ev) {
			if (ev.touches.length < 2) {
				ev.preventDefault();
				let canvPos = drawCanv.getBoundingClientRect();
				let canvOffs = [canvPos.x, canvPos.y];
				let canvTouch = ev.touches[0];
				cursorLast = [
					canvTouch.clientX - canvOffs[0],
					canvTouch.clientY - canvOffs[1]
				];
				if (isDrawing) {
					currStroke.strokes.push(cursorLast);
					transferCursor(conn, "pos", cursorLast, {drawing: isDrawing });
				}
				
			}
		});
		drawCanv.addEventListener('mouseenter', function (ev) {
			onCanv = true;
			cursorLast = [ev.offsetX, ev.offsetY];
			let cursorPos = [
				(cursorLast[0] / zoomFactor) + zoomOff[0],
				(cursorLast[1] / zoomFactor) + zoomOff[1]
			]
			if(!isFocused && isDrawing){
				setDrawing(conn, cursorPos);
			}
		})
		drawCanv.addEventListener("wheel", function (ev) {
			ev.preventDefault();
			if(!ev.ctrlKey){
				if (ev.deltaY < 0 && bSize < 100) {
					setSize(false, bSize + 1);
				}
				else if (ev.deltaY > 0 && bSize > 1) {
					setSize(false, bSize - 1);
				}
				if(isDrawing && currStroke){ currStroke.bSize = bSize; }
				transferCursor(conn, "currSize", bSize, { drawing: isDrawing });
			}
			else {
				if(ignoreScroll){ console.log("Ignoring scroll attempt!"); return;}
				ignoreScroll = true;
				window.setTimeout(function(){
					ignoreScroll = false;
				},25);
				let modZoom = 0.5;
				let currZoom = zoomFactor;
				if(ev.deltaY < 0 && zoomFactor < 25){
					setZoom(zoomFactor + modZoom);
				}
				else if(ev.deltaY > 0 && zoomFactor > 0){
					if(zoomFactor - modZoom <= 0){
						setZoom(1);
						zoomOff = [0, 0];
						return;
					}
					else {
						setZoom(zoomFactor - modZoom);
					}
				}
				zoomOff = zoomMaths(zoomOff, [ev.offsetX, ev.offsetY], zoomFactor)
			}
		});
		drawCanv.addEventListener("mouseleave", function () {
			if(!isFocused) {
				if(isDrawing) {
					endStroke(conn);
				}
				onCanv = false;
			}
		});

		drawCanv.addEventListener("mouseup", function (ev) {
			ev.preventDefault;
			if(isDrawing){
				isDrawing = false;
				endStroke(conn);
			}
		});

		drawCanv.addEventListener("touchend", function (ev) {
			ev.preventDefault;
			if(isDrawing) {
				endStroke(conn);
				isDrawing = false;
			}
		});
		clrElem.addEventListener("click", function () {
			ownList = [];
			connAction(conn, "boardClear", function(response){
				if(response === "clearOkay"){
					noticed = {
						type: "okay",
						title: "Confirmation",
						message: ["Successfully cleared the canvas."]
					}
					canvasNotice(noticed.type, noticed.title, noticed.message);
					setTimeout(function(){
						noticed = false;
					}, noticeTime * 1000);
					return;
				}
				else {
					noticed = {
						type: "fail",
						title: "Failure",
						message: [
							'The board has not been running for long enough!',
							`Please wait ${response} seconds.`
						]
					}
					canvasNotice(noticed.type, noticed.title, noticed.message);
					setTimeout(function(){
						noticed = false;
					}, noticeTime * 1000);
				}
			});
		});
		if(conn.connected && !conn.disconnected) {
			console.log("%cConnection successful.", consOuts.success);
			console.log(
				[
					"%cYou are now connected!",
					`Your connection ID is ${conn.drawID}.`,
					"You should be seeing others drawing now."
				].join(" "),
				consOuts.info
			);
			conn.on("disconnect", function () {
				console.log(
					"%cCONNECTION LOST: Do not reload, as we will try to reconnect...",
					consOuts.warn
				);
				scriptPaused = true;
			});
			conn.on("reconnect", function(){
				console.log(
					"%cWe are connected again! Thank you for your patience.",
					consOuts.success
				);
			})
			connAction(conn, "initiate", {
				curPos: cursorLast,
				bSize: bSize
			});

			conn.on("userList", function (data) {
				currsList = data.conns;
				currStrokeList = data.currStrokes;
			});
			conn.on("userAdd", function (data) {
				currsList[data.owner] = {
					colour: data.colour,
					currSize: data.size,
					pos: {
						locX: data.pos.locX, locY: data.pos.locY
					}
				}
			});
			conn.on("cursorUpdate", function (data) {
				if(currsList[data.connID]){
					currsList[data.connID][data.connUType] = data.connUpdate;
				}
			});
			conn.on("strokeCreate", function(data){
				currStrokeList[data.owner] = data.strokeData;
			});
			conn.on("strokeUpdate", function(data){
				if(currStrokeList[data.owner]){
					switch(data.type){
						case 'strokeInsert':
							currStrokeList[data.owner].strokes.push([
								data.strokeInsert.locX, data.strokeInsert.locY
							]);
							currsList[data.owner].pos = {
								locX: data.strokeInsert.locX,
								locY: data.strokeInsert.locY
							}
							break;
						case 'strokeColour':
							currStrokeList[data.owner].bCol = data[data.type];
							break;
						case 'strokeCurrSize':
							currStrokeList[data.owner].bSize = data[data.type];
							break;
						default:
							console.log("%cInvalid current stroke data given...", consOuts.warn);
							console.log(data.type);
					}
				}
			})
			conn.on("strokeFinish", function (data) {
				if(currStrokeList[data.owner]){
					delete currStrokeList[data.owner];
				}
				publicList.push(data);
			})
			conn.on("boardReply", function (data) {
				if (JSON.stringify(publicList) != JSON.stringify(data)) {
					publicList = data;
				}
			});
			conn.on("clear", function(){
				if(publicList.length > 0){ publicList = []; }
			})
			window.setInterval(function () {
				if (isActive) {
					drawCtx.clearRect(
						drawCanv.width - drawCanv.width,
						drawCanv.height - drawCanv.height,
						drawCanv.width, drawCanv.height
					);
					if (publicList.length > 0) {
						for (let stroke in publicList) {
							let currPStroke = publicList[stroke];
							iterAnim({
								brushCol: currPStroke.data.bCol,
								brushSize: currPStroke.data.bSize,
								brushStrokes: currPStroke.data.strokes,
								brushMode: currPStroke.data.bMode
							});
						}
					}
					for (var i = 0; i < ownList.length; i++) {
						let ownItem = ownList[i];
						iterAnim({
							brushCol: ownItem.bCol,
							brushSize: ownItem.bSize,
							brushStrokes: ownItem.strokes,
							brushMode: ownItem.bMode
						});
					}
					for(var pStroke = 0; pStroke < Object.keys(currStrokeList).length; pStroke++){
						let currPCopy = currStrokeList[Object.keys(currStrokeList)[pStroke]];
						iterAnim({
							brushCol: currPCopy.bCol,
							brushSize: currPCopy.bSize,
							brushStrokes: currPCopy.strokes,
							brushMode: currPCopy.bMode
						});
					}
					if (isDrawing && currStroke) {
						iterAnim({
							brushCol: currStroke.bCol,
							brushSize: currStroke.bSize,
							brushStrokes: currStroke.strokes,
							brushMode: currStroke.bMode
						});
					}
					if (onCanv) {
						drawCursor(
							{
								isSelf: true,
								drawID: null
							},
							bSize,
							cursorLast[0], cursorLast[1],
							true
						);
					}
					for (let cursor in currsList) {
						drawCursor(
							{
								isSelf: false,
								colour: currsList[cursor].colour,
								drawID: cursor
							},
							currsList[cursor].currSize,
							currsList[cursor].pos.locX,
							currsList[cursor].pos.locY
							, true);
					}
					drawCtx.strokeStyle = "rgb(255,0,0)";
					drawCtx.rect(0, 0, drawCanv.width / 4, drawCanv.height / 4);
					drawCtx.stroke();
					drawCtx.strokeStyle = "rgb(255,240,0)";
					drawCtx.rect(
						zoomOff[0] / 4,
						zoomOff[1] / 4,
						(drawCanv.width / 4) / zoomFactor,
						(drawCanv.height / 4) / zoomFactor
					);
					drawCtx.stroke();

					drawCtx.strokeStyle = "rgba(255,0,0,0.25)";
					drawCtx.beginPath();
					drawCtx.lineTo(0, (cursorLast[1] / zoomFactor) / 4);
					drawCtx.lineTo((drawCanv.width / zoomFactor) / 4, (cursorLast[1] / zoomFactor) / 4);
					drawCtx.closePath();
					drawCtx.stroke();
					drawCtx.beginPath();
					drawCtx.lineTo((cursorLast[0] / zoomFactor) / 4, 0);
					drawCtx.lineTo((cursorLast[0] / zoomFactor) / 4, (drawCanv.height / zoomFactor) / 4);
					drawCtx.closePath();
					drawCtx.stroke();
					drawCtx.fillStyle = "rgba(255,0,0,0.25)";
					drawCtx.font = "15px verdana";
					drawCtx.textAlign = "end";
					drawCtx.fillText(
						`OffsetX Percentage: ${Math.floor((cursorLast[0] / drawCanv.width) * 100)}%`,
						drawCanv.width / 4, (drawCanv.height / 4) / 10
					);
				}
				activityCounter++;
				if (activityCounter > 3600) {
					isActive = false;
				}
			}, 15);

			conn.on("userRemove", function (data) {
				if (currsList[data]) {
					delete currsList[data];
				}
			});
		}
	});
});
