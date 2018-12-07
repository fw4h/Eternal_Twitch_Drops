$('document').ready(function() {
	var contextData = "";
	var dataResult = "";
	var hanger_display = "on";
	var regexBR = /<br\s*[\/]?>/gi;
	var fadeOutCard = "";

	var rootDeck = $(".decks");
	var rootMain = $("main");
	var rootBody = $("body");

	var rootDeckWidth = "250";

	var interval;

if(window.Twitch.ext) {

	var webSocket = "";
	var channelID = "";
	var twitchID = "";
	var twitchToken = "";
	var serverVersion = "";
	var canAcceptDrops = false;
	var dropsOn = true;
	var dropQueue = [];
	var reconnectAttempts = 0;
	//hangers
	var hanger = "";
	var hangerOutput = "";

	var n = 0;

	if (dwd.debug === "on") {
		rootMain.addClass("debug");
	}

	function setChannelID(auth) {
		channelID = auth.channelId;
	}

	function setToken(auth) {
		var decodedToken = JSON.parse(window.atob(auth.token.split(".")[1]));
	  
		if(!!decodedToken.user_id) {
			canAcceptDrops = true;
			$(".drops-notification").addClass("hide");
			dwd.log("They're authorized and can get drops");
		}

		twitchToken = auth.token;
	}

	function setTwitchID(data) {
		twitchID = data.twitchID;
	}

	function setServerVersion(data) {
		serverVersion = data['version'];
		if (dwd.debug === "on") { $("#serverVersion").text("Server Version: " + serverVersion); }
	}

	function getChannelID() {
		return channelID;
	}

	function socketConnect() {
		return new WebSocket(dwd.url + "/" + getChannelID());
	}

	function heartbeat() {
		webSocket.send(JSON.stringify({"messageType" : "Ping"}));
		dwd.log("heartbeat");
		setTimeout(heartbeat, 10000);
	}

	function reconnectWebSocket(event){
		dwd.log("Attempting to reconnectWebSocket. Attempts: " + reconnectAttempts);
		webSocket = null;
		reconnectAttempts += 1;
		setTimeout(setupWebSocket, reconnectAttempts * 2000);
	}

	function setupWebSocket() {
		dwd.log("Attempting to setup webSocket " + reconnectAttempts);
		webSocket = socketConnect();

		webSocket.onopen = function(event) {
			reconnectAttempts = 0;
			dwd.log("Connection established");

			if(twitchToken !== "") {
				dwd.log(twitchToken);
				var message = JSON.stringify({"messageType" : "ViewerLogin", "jwt" : twitchToken });
				webSocket.send(message);
				dwd.log(message);
			}

			for(var i = 0; i < dropQueue.length; i++) {
				webSocket.send(dropQueue[i]);
			}
			dropQueue = [];

			var serverVersionMsg = JSON.stringify({"messageType" : "VersionRequest"});
			webSocket.send(serverVersionMsg);
		};

		webSocket.onclose = reconnectWebSocket;

		webSocket.onmessage = function(event) {
			dataResult = JSON.parse(event.data);

			dwd.log(dataResult);

			if(dataResult.messageType === "Pong") {
				var gameOfPong = dataResult.messsageType;
				dwd.log("gameOfPong ==> " + gameOfPong);

				if (gameOfPong === "Ping") {
					dwd.log("gameOfPong catch! ==> " + gameOfPong);
				}
			} else if (dataResult.messageType === "LoginAccepted")   {
				setTwitchID(dataResult);
				dwd.log("login accepted for twitch id: " + twitchID + " and channel ID: " + channelID);
			} else if (dataResult.messageType === "DropNotification")   {
				dwd.log("DropNotification JSON:");
				dwd.log(dataResult);
				if(dropsOn) {
					dropNotification(dataResult.nonce, dataResult.timeout, dataResult.upgrades, dataResult.accountId, dataResult.currencyGranted);
				}
			} else if (dataResult.messageType === "ServerVersion")   {
				setServerVersion(dataResult);
				dwd.log("server version: " + serverVersion);
			} else { //it's the actual game information 
				var gameStatus = dataResult.gameStatus;
				dwd.log("gameStatus ==> " + gameStatus);

				if (gameStatus !== "unitialized") {

					var delayAmount = $("main.viewer").attr("data-hlsLatencyBroadcaster");
					var delayInMiliSec = parseInt(delayAmount)*1000;
					dwd.log("delay is "+delayInMiliSec);
					setTimeout(function(){
						dwd.log("Executing draw!!!!!!!!!");
						var firstEntry = event.data;
						dwd.log(firstEntry);
						redrawPlaymat(firstEntry);
						redrawHand(firstEntry);
						redrawDeck(firstEntry);
						n++;
					}, delayInMiliSec ); // end delay
				}

				if (gameStatus === "unitialized" || gameStatus === "uninitialized") {
					offlineDeckUI();
					hidePlayhand();
					hidePlaymatUI();
					cleanCards();
				}

			} 

			if (dataResult.length === 0) {
				offlineDeckUI();
			}

		};
	}

	window.Twitch.ext.onAuthorized(function(auth) {
		dwd.log("auth");
		dwd.log(auth);
		setChannelID(auth);
		setToken(auth);

		setTimeout(function(){ heartbeat(); }, 10000 );
		setupWebSocket();

	});

	var previousNonce = "";
	var currentTimeout;

	function dropNotification(nonce, timeout, upgrades, accountId, currencyGranted) {

		if(previousNonce !== nonce) {
			randomPlacement(nonce, upgrades, accountId, currencyGranted);
		}

		previousNonce = nonce;

		setChestTimeout(timeout);
	}

	function setChestTimeout(timeout) {
		currentTimeout = setTimeout(function(){
			$(".newDrop").each(function() {
				$(this).addClass("dropHide");
				stopVideo($(this).children("video").attr("id"), interval);
			});
		}, timeout * 1000 );
	}

	function randomPlacement(nonce, upgrades, accountId, currencyGranted) {
		var divsize = 256;
		var posx = Math.round((Math.random() * ($(document).width() - divsize)));
		var posy = Math.round(Math.random() * ($(document).height() - divsize - 180) + 100);
		dwd.log("position x: " + posx + " position y: " + posy);

		$(".newDrop").each(function() {
			$(this).attr("data-nonce", nonce).attr("data-upgrades", upgrades).attr("data-account", accountId).attr("data-clicked", false).attr("data-currencyGranted", currencyGranted);
			$(this).css({
				'left': posx + 'px',
				'top': posy + 'px'
			});
		});

		chestAnimation("bronzeIntro");
	}

	$(document).on("mousedown", ".newDrop.bronzeIdle", function(e){
		e.preventDefault();

		var hasClicked = $(this).attr("data-clicked") == "true" ? true : false;
		var numberOfClicks = $(this).attr("data-upgrades");

		if(!hasClicked) {
			var json = {
				"nonce": $(this).attr("data-nonce"),
				"twitchId": twitchID,
				"accountId": $(this).attr("data-account"),
				"messageType": "DropAccepted"
			}

			sendDrop(JSON.stringify(json));

			$(this).attr("data-clicked", true);
		}

		$(".newDrop.bronzeIdle").addClass("dropHide");
		stopVideo("bronzeIdle-video", interval);
		clearTimeout(currentTimeout);

		if(numberOfClicks > 0) {
			$(this).attr("data-upgrades", numberOfClicks - 1);
			chestAnimation("bronzeUpgrade");
			setChestTimeout(30);
		} else {
			chestAnimation("bronzeOpen");
		}
	});

	function sendDrop(message) {
		if(webSocket.readyState === webSocket.OPEN) {
			webSocket.send(message);
		} else {
			dropQueue.push(message);
		}
	}

	$(document).on("mousedown", ".newDrop.silverIdle", function(e){
		e.preventDefault();

		$(".newDrop.silverIdle").addClass("dropHide");
		stopVideo("silverIdle-video", interval);
		clearTimeout(currentTimeout);
		chestAnimation("silverOpen");
	});

	function chestAnimation(thisVideo) {
		var outputCanvas = document.getElementById(thisVideo + "-output"),
			output = outputCanvas.getContext('2d'),
			bufferCanvas = document.getElementById(thisVideo + "-buffer"),
			buffer = bufferCanvas.getContext('2d'),
			videoName = thisVideo + "-video",
			video = document.getElementById(videoName),
			width = outputCanvas.width,
			height = outputCanvas.height;

		var thisDrop = $("#" + videoName).parent(".newDrop");

		if(videoName === "bronzeOpen-video" || videoName === "silverOpen-video") {
			thisDrop.find(".currencyGranted").addClass("showCurrency").removeClass("hideCurrency").html("<span><img src='assets/StreamerPoints_Icon.png' alt='Streamer Point'> <h1> +" + thisDrop.attr("data-currencyGranted") + "</h1></span>");
		}

		function processFrame() {
			buffer.drawImage(video, 0, 0);
			
			var image = buffer.getImageData(0, 0, width, height),
				imageData = image.data,
				alphaData = buffer.getImageData(0, height, width, height).data;
			
			for (var i = 3, len = imageData.length; i < len; i = i + 4) {
				imageData[i] = alphaData[i-1];
			}
			
			output.putImageData(image, 0, 0, 0, 0, width, height);
			dwd.log(videoName + " is running");
		}

		video.currentTime = 0;
		video.play();

		video.addEventListener('play', function() {
			clearInterval(interval);
			video.currentTime = 0;
			interval = setInterval(processFrame, 40);
			thisDrop.removeClass("dropHide");
		}, false);

		video.addEventListener('ended', function() {
			stopVideo(videoName, interval);

			//Idle videos do not need to be hidden since they are still idling
			if(videoName !== "bronzeIdle-video" || videoName !== "silverIdle-video") {
				thisDrop.addClass("dropHide");
			}

			if(videoName === "bronzeOpen-video" || videoName === "silverOpen-video") {
				document.getElementById("bronzeIntro-output").getContext('2d').clearRect(0, 0, 1024, 1024);
				document.getElementById("bronzeIntro-buffer").getContext('2d').clearRect(0, 0, 1024, 2048);
				thisDrop.find(".currencyGranted").removeClass("showCurrency").addClass("hideCurrency");
			}

			switch(videoName) {
				case "bronzeIntro-video":
				case "bronzeIdle-video":
					chestAnimation("bronzeIdle");
					break;
				case "bronzeUpgrade-video":
				case "silverIdle-video":
					chestAnimation("silverIdle");
					break;
			}

		}, false);

	}

	function stopVideo(videoName, interval) {
		var video = document.getElementById(videoName);

		video.pause();
		clearInterval(interval);
		video.currentTime = 0;
		video.load();
	}

	function cleanCards() {
		$(".card_template").find(".frame").css("background", "none");
		$(".avatar_template").find(".frame").css("background", "none");
		$(".deckpile_template").find(".frame").text("");
		removeDataIntoCard( $(".card_template_deck") );
	}

	function hideDeckUI() {
		rootDeck.css("display", "none");
		$(".pheader .pheaderContainer li .tabs_text").html("0");
	}

	function offlineDeckUI() {
		rootDeck.css("display", "block");
		$(".deck_cont").removeClass("enabled").animate({ height: '0px', opacity: 0 }, 300);
		//disabled active state per hotspots
		$(".plPlayHand").attr("data-status", "inactive");
		$(".playmatCards").attr("data-status", "inactive");
		rootMain.attr("data-active", "inactive");
		//remove export
		$("button#export").animate({ opacity: 0 }, 300).css("top", -999).css("left", -999);
		$("button#menume").animate({ opacity: 0 }, 300).css("top", -999).css("right", -999);
		//show deck_title
		$(".deck_title").animate({ height: '0px', opacity: 1, padding: '2px 0px 2px 0px' }, 300);
		//change deck display mode
		rootDeck.attr("data-displayDeckMode", "1");
		rootDeck.find(".pheader .pheaderContainer div.offline").removeClass("hide");
		$(".offline").removeClass("hide");
		$(".icon_tabs, .deck_title").addClass("hide");
		//hide dd
		hideDropDown();
	}

	function hidePlaymatUI() {
		$(".playmatCont").css("display", "none");
	}

	function hidePlayhand() {
		$(".playhandCont").css("display", "none");
	}

  function redrawPlaymat(dataResult) {
	  $(".playmatCont").css("display", "block").html("");
	  var jsonData = JSON.parse(dataResult);
	  var dataPlaymat = jsonData.playmatItems;
	  var main_status = rootMain.attr("data-active");
	  var output = "";
	  dwd.log(dataPlaymat);

	  for (var i=0; i < dataPlaymat.length; i++) {

		  if (dataPlaymat[i].type === "deckPile") {

			  output = '<div class="playmatCards pl_deckPile" style="top:'+dataPlaymat[i].y*100+'%;left:'+dataPlaymat[i].x*100+'%;width:'+dataPlaymat[i].width*100+'%;height:'+dataPlaymat[i].height*100+'%;" data-status="'+main_status+'" data-type="'+dataPlaymat[i].type+'" data-cardCount="'+dataPlaymat[i].cardCount+'"></div>';

		  } else if (dataPlaymat[i].type === "avatar") {

			  output = '<div class="playmatCards pl_avatar" style="top:'+dataPlaymat[i].y*100+'%;left:'+dataPlaymat[i].x*100+'%;width:'+dataPlaymat[i].width*100+'%;height:'+dataPlaymat[i].height*100+'%;" data-status="'+main_status+'" data-cdn="'+dataPlaymat[i].fullCardImgCDN+'" data-type="'+dataPlaymat[i].type+'"></div>';

		  } else if (dataPlaymat[i].type === "unit") {

			  if ("hangers" in dataPlaymat[i]) {
				  hangerOutput = '<ul class="hangers">';
				  for (var j=0; j < dataPlaymat[i].hangers.length; j++) {
					  hangerOutput += "<li>"+dataPlaymat[i].hangers[j].text+"</li>";
				  }
				  hangerOutput += '</ul>';
			  }

			  output = '<div class="playmatCards pl_unit" style="top:'+dataPlaymat[i].y*100+'%;left:'+dataPlaymat[i].x*100+'%;width:'+dataPlaymat[i].width*100+'%;height:'+dataPlaymat[i].height*100+'%;" data-status="'+main_status+'" data-cdn="'+dataPlaymat[i].fullCardImgCDN+'" data-type="'+dataPlaymat[i].type+'" data-hovercardside="right">'+hangerOutput+'</div>';

		  } else if (dataPlaymat[i].type === "card") {

			  if ("hangers" in dataPlaymat[i]) {
				  hangerOutput = '<ul class="hangers">';
				  for (var j=0; j < dataPlaymat[i].hangers.length; j++) {
					  hangerOutput += "<li>"+dataPlaymat[i].hangers[j].text+"</li>";
				  }
				  hangerOutput += '</ul>';
			  }

			  output = '<div class="playmatCards pl_unit" style="top:'+dataPlaymat[i].y*100+'%;left:'+dataPlaymat[i].x*100+'%;width:'+dataPlaymat[i].width*100+'%;height:'+dataPlaymat[i].height*100+'%;" data-status="'+main_status+'" data-cdn="'+dataPlaymat[i].fullCardImgCDN+'" data-type="'+dataPlaymat[i].type+'" data-hovercardside="right">'+hangerOutput+'</div>';

		  } else if (dataPlaymat[i].type === "relic") {

			  if ("hangers" in dataPlaymat[i]) {
				  hangerOutput = '<ul class="hangers">';
				  for (var j=0; j < dataPlaymat[i].hangers.length; j++) {
					  hangerOutput += "<li>"+dataPlaymat[i].hangers[j].text+"</li>";
				  }
				  hangerOutput += '</ul>';
			  }

			  output = '<div class="playmatCards pl_relic" style="top:'+dataPlaymat[i].y*100+'%;left:'+dataPlaymat[i].x*100+'%;width:'+dataPlaymat[i].width*100+'%;height:'+dataPlaymat[i].height*100+'%;" data-status="'+main_status+'" data-cdn="'+dataPlaymat[i].fullCardImgCDN+'" data-type="'+dataPlaymat[i].type+'">'+hangerOutput+'</div>';

		  }

		  $(".playmatCont").append(output);
	  }

  }

// Display Modes:
//   Fallback = -1,    //pile fallback to default setting
//   Disabled = 0,     //no deck displayed
//   DrawnOnly = 1,    //only show cards drawn this game
//   FullStatic = 2,   //only show original decklist (as in deckbuilder)
//   FullLive = 3,     //show cards remaining in deck (including any added during play)
//   ComboLive = 4,    //show entire deck as (remaining of total)


  function cycleDeck(pileName, pile, displayMode) {
	var output = "";
	var totalAmountOfCards = 0;
	var placement = -1;

	//Decides where each pile should go on the tabs
	if(pileName === "main") {
	  placement = 0;
	} else if(pileName === "market") {
	  placement = 1;
	} else if(pileName === "draftCollection") {
	  placement = 2;
	}

	if(placement > -1) {
	  if(pile.length > 0) {

		$(".icons_tabs_" + placement).removeClass("hide");

		for (var i = 0; i < pile.length; i++) {
			var amount = 0;
			var costValue = pile[i].type === "Power" ? "" : pile[i].cost;


			if(displayMode === 2 || pileName === "draftCollection" || pileName === "market") {
			  totalAmountOfCards = totalAmountOfCards + parseInt(pile[i].initialCount);
			  amount = pile[i].initialCount;
			} else if(displayMode === 3) {
			  totalAmountOfCards = totalAmountOfCards + parseInt(pile[i].currentCount);
			  amount = pile[i].currentCount;
			} else if(displayMode === 1) {
			  totalAmountOfCards = pile.length;
			  amount = pile[i].removedCount;
			}

			if (typeof amount === 'undefined' || amount === null) {
			  amount = 0;
			}

			output += '<li class="noselect card_sleeve ' + pile[i].type + ' ' + pile[i].faction[0] + '" data-index="' + i + '" data-cdn="' + pile[i].fullCardImgCDN + '">' +
				'<div class="card_cost noselect">' + costValue + '</div>' +
				'<div class="card_name noselect"><div class="centered"><span>' + pile[i].name + '</span></div><div class="cap"></div></div>' +
				'<div class="card_amount noselect">' + amount + '</div>' +
				'</li>';
		}

	  } else {
		if(pileName === "market" || pileName === "draftCollection") {
		  $(".icons_tabs_" + placement).addClass("hide");

		  if($(".icons_tabs_" + placement).hasClass("active")) {
			$(".icons_tabs_0").click();
		  }
		} else {
		  output = "";
		}
	  }

	  $(".pheader .pheaderContainer .icons_tabs_" + placement + " .tabs_text").html(totalAmountOfCards);
	  $(".deck_cont .deck_" + placement + " .cardsContainer ul").html(output);
	}

  }

	function redrawDeck(dataResult) {
		var jsonData = JSON.parse(dataResult);
		var dataDeck = jsonData.deck;
		var deckPiles = dataDeck.piles;

		$(".decks").css("display", "block");

		if(typeof dataDeck.cards !== "undefined") {
			deckPiles = {
				"main": dataDeck.cards,
				"market": [],
				"draftCollection": []
			};
		}

		var output = '';

		if (!dataDeck || ((deckPiles.main === undefined || deckPiles.main.length <= 0) && (deckPiles.market === undefined || deckPiles.market.length <= 0) && (deckPiles.draftCollection === undefined || deckPiles.draftCollection.length <= 0))) {
			hideDeckUI();
		} else {

			$(".icon_tabs, .deck_title").removeClass("hide");
			$(".offline").addClass("hide");
			$(".deck_title .deck_art").css("background", "url(" + dataDeck.deckImage + ") 0 0 / cover no-repeat");
			$(".pheader .pheaderContainer li .tabs_text").html("0");

			for(var key in deckPiles) {
				cycleDeck(key, deckPiles[key], dataDeck.displayMode);
			}

			if(deckPiles["market"].length < 1 && deckPiles["draftCollection"].length < 1) {
				$(".icons_tabs_0").addClass("only_tab");
			} else {
				$(".icons_tabs_0").removeClass("only_tab");
			}

			if (dataDeck.displayMode === 1) {
				$("#current_export").text("");
				$(".decks .pheader button#export").css("display", "none");
			}

			if (dataDeck.displayMode === 2 || dataDeck.displayMode === 3) {
				if (dataDeck.stats.exportInfo !== "") {
					$(".decks .pheader button#export").css("display", "block");
					$("#current_export").text("");
					var convertSource = dataDeck.stats.exportInfo;
					$("#current_export").text(convertSource.replace(regexBR, "\n"));
				}
			}

		}
	}

  function redrawHand(dataResult) {

	  $(".playhandCont").css("display", "block").html("");
	  var jsonData = JSON.parse(dataResult);
	  var dataPlayhand = jsonData.handItems;
	  var main_status = rootMain.attr("data-active");

	  dwd.log(dataPlayhand);

	  for (var i=0; i < dataPlayhand.length; i++) {

		  if ("hangers" in dataPlayhand[i]) {
			  hangerOutput = '<ul class="hangers">';
			  for (var j=0; j < dataPlayhand[i].hangers.length; j++) {
				  hangerOutput += "<li>"+dataPlayhand[i].hangers[j].text+"</li>";
			  }
			  hangerOutput += '</ul>';
		  }

		  var output = '<div class="plPlayHand" style="top:'+dataPlayhand[i].y*100+'%;left:'+dataPlayhand[i].x*100+'%;width:'+dataPlayhand[i].width*100+'%;height:'+dataPlayhand[i].height*100+'%;z-index:' + (1000+i) + ';" data-status="'+main_status+'" data-cdn="'+dataPlayhand[i].fullCardImgCDN+'">'+hangerOutput+'</div>';
		  $(".playhandCont").append(output);
	  }

  }

  function hideDropDown() {
	  $(".pheader_ddown").css("display", "none");
	  $("button#menume").attr("data-status", "show");
  }

  window.Twitch.ext.onContext(function(context, contextFields) {
	  dwd.log("context");
	  dwd.log(context);
	contextData = context;
	  dwd.log("contextFields");
	  dwd.log(contextFields);
	var windowSize = contextData.displayResolution;
	var windowSideArr = windowSize.split("x"); //[0] = width, [1] = height
	  dwd.log("windowSize: "+windowSideArr);
	$("main.viewer").attr("data-width", windowSideArr[0]).attr("data-height", windowSideArr[1]).attr("data-hlsLatencyBroadcaster", contextData.hlsLatencyBroadcaster);
	  if (dwd.debug === "on") { $("#timer").text(contextData.hlsLatencyBroadcaster+" sec."); }
	  if (dwd.debug === "on") { $("#version").text(dwd.version); }
	  //when screen resize let's reset the deck position so it wont be offscreen
	  var posDeck = rootDeck.position();
	  var widthDeck = rootDeck.width();
	  if ( parseInt(posDeck.left+widthDeck) > parseInt(windowSideArr[0]) ) {
		  rootDeck.css("transform", "translate(16px, -58px)");
		  rootDeck.attr("data-x", "16").attr("data-y", "-58").attr("data-hovercardside", "right");
		  rootDeck.find(".card_template_deck").css("left", "250px");
	  }
  });

  window.Twitch.ext.onError(function(err) {
	  dwd.log(err);
  });
  
}

$(window).resize(function() {
	var drop = $(".newDrop:first");
	
	var xPosition = Math.min($(".viewer").width() - drop.width(), parseInt(drop.css("left"), 10));
	var yPosition = Math.min($(".viewer").height() - drop.height(), parseInt(drop.css("top"), 10));
	$(".newDrop").each(function() {
		$(this).css({
			'left': xPosition + 'px',
			'top': yPosition + 'px'
		});
	});
});

	$(".cardsContainer").mCustomScrollbar({ setWidth: true, mouseWheel: true});
	//offset card to right
	var offsetCard = 30;
	var dragableRoot = $(".draggable");

	//target elements with the "draggable" class
	interact('.draggable')
		.draggable({
			// enable inertial throwing
			inertia: true,
			// keep the element within the area of it's parent
			restrict: {
				restriction: "parent",
				endOnly: false,
				elementRect: { top: 0, left: 0, bottom: 1, right: 1 }
			},
			// enable autoScroll
			autoScroll: false,

			// call this function on every dragmove event
			onmove: dragMoveListener,
			// call this function on every dragend event
			onend: function (event) {
				var xgLoc = dragableRoot.attr("data-x");
				var ygLoc = dragableRoot.attr("data-y");

				localStorage.setItem('x-position', xgLoc);
				localStorage.setItem('y-position', ygLoc);

				var screenWidth = $(".viewer").width();

				$(".deck_title").find('span.x').text( parseInt(xgLoc).toFixed(2) );
				$(".deck_title").find('span.y').text( parseInt(ygLoc).toFixed(2) );

				//Switches card to the left if it's moved to anywhere on the right side of the screen
				if (parseInt(xgLoc) > parseInt(screenWidth/2)) {
					dragableRoot.attr("data-hovercardside", "left");
					dragableRoot.find(".card_template_deck").css("left", "-230px");
				} else if (parseInt(xgLoc) < 0) {
					rootDeck.css("transform", "translate(0px, -58px)");
					rootDeck.attr("data-x", "0").attr("data-y", "-58");
					localStorage.setItem('x-position', '0');
					localStorage.setItem('y-position', '-58');
				} else {
					dragableRoot.attr("data-hovercardside", "right");
					dragableRoot.find(".card_template_deck").css("left", "250px");
				}
			}
		});

	function dragMoveListener (event) {
		var target = event.target,
			// keep the dragged position in the data-x/data-y attributes
			x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx,
			y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;

		//logic for keeping draggable into twitch zone
		// y axis should not be between 0 -> 100px top and (page height - 80px) for bottom
		var pageWidth = parseInt( $("main.viewer").attr("data-width") );
		var pageHeight = parseInt( $("main.viewer").attr("data-height") );
		if (y < -55 && y > -99 && pageWidth < 1900) {
			y = -58;
		}else if (y < 0 && y > -99 && pageWidth > 1900) {
			y = 0;
		}
		//offset of 123px????
		if ( y > (pageHeight - 80 - 123) && y < (pageHeight - 123) ) {
			y = pageHeight - 80 - 123;
		}

		// translate the element
		moveDeck(x, y);

		hideDropDown();
	}

	if("x-position" in localStorage && "y-position" in localStorage){
	  var deckWidth = $(".decks").width();
	  var deckHeight = $(".decks").height();

	  var viewerWidth = $(".viewer").width();
	  var viewerHeight = $(".viewer").height();

	  var xPosition = Math.min(viewerWidth - deckWidth, localStorage.getItem("x-position"));
	  var yPosition = Math.min(viewerHeight - deckHeight, localStorage.getItem("y-position"));

	  xPosition = xPosition > 0 ? xPosition : 0;
	  yPosition = yPosition > 100 ? yPosition : 0;

	  dwd.log("Deck placement: x=" + xPosition + " y=" + yPosition);

	  moveDeck(xPosition, yPosition);
	}

	function moveDeck(x, y) {
	  $(".decks").attr("data-x", x);
	  $(".decks").attr("data-y", y);
	  $(".decks").css("transform", "translate(" + x + "px, " + y + "px)");
	  $(".decks").css("webkitTransform", "translate(" + x + "px, " + y + "px)");
	}


	// this is used later in the resizing and gesture demos
	window.dragMoveListener = dragMoveListener;


	function removeDataIntoCard(template) {
		template.find(".frame").css("background", "none");
		template.find(".hanger").html("");
	}

	function getDataIntoCard(source, template) {
		//cards data
		var cardCDN = source.attr("data-cdn");
		template.find(".frame").css("background", "url("+cardCDN+") top center no-repeat").css("background-size", "cover");
	}

	function stopCardFadeOutTimer(timerVar) {
		clearTimeout(timerVar);
	}

	//hover decklist card name
	$(".deck_body ul").on("mouseover", "li.card_sleeve", function(){
		stopCardFadeOutTimer(fadeOutCard);
		$(".card_template_deck").css("opacity", "1");

		var index = $(this).attr("data-index");

		getDataIntoCard( $(this), $(".card_template_deck") );
		$(".card_template_deck").css("display", "block");

		//hide dd
		hideDropDown();

		//start timer for fading out card on hover - 10s
		fadeOutCard = setTimeout(function(){
			$(".card_template_deck").animate({ opacity: 0 }, 300);
		}, 10000 ); // end delay
	});

	$(".deck_body ul").on("mouseleave", "li.card_sleeve", function(){
		//mouseleave
		//hide card back to 0px
		removeDataIntoCard( $(".card_template_deck") );
		$(".card_template_deck").css("display", "none").css("right", "auto");
	});

	//PLAYMAT OVER - UNIT CARDS
	$(".playmatCont").on('mouseenter', '.pl_unit', function(){
		$(".card_template").find(".hanger").removeClass("flip");
		stopCardFadeOutTimer(fadeOutCard);
		$(".card_template").css("opacity", "1");
		var position = $(this).position();
		var widthThis = $(this).width();
		var display = $(this).attr("data-status");
		var frameWidth = parseInt( $(".card_template").find(".frame").width() );
		var gheight = parseInt( $("main.viewer").attr("data-height") );
		var gwidth = parseInt( $("main.viewer").attr("data-width") );
		//check each hanger LI for font size
		$(this).find("ul.hangers li").each(function(){
			var liContent = $(this).html();
			var liContentCount = $.trim(liContent).split(" ");
			$(this).attr("data-height", liContentCount.length);
			if (liContentCount.length >= 10 && gwidth < 800) {
				$(this).css("font-size", "75%");
			} else if (liContentCount.length >= 30) {
				$(this).css("font-size", "85%");
			} else {
				$(this).css("font-size", "90%");
			}
		});
		if (hanger_display === "on") {
			var hangers = $(this).html();
		}
		//display card for player
		if (display === "active") {
			var cardCDN = $(this).attr("data-cdn");
			var cardTop = position.top - 43;
			var cardLeft = position.left + widthThis + offsetCard;
			if (cardTop < 0) {
				cardTop = position.top + 43;
			} else if (cardTop > (gheight - 350)) {
				cardTop = gheight - 350;
			}
			//check for negative values
			if (cardTop < 0) {
				cardTop = 80;
			}
			//flip card if hangers are out of frame
			if (position.left > (gwidth/2)) {
				cardLeft = position.left - frameWidth - offsetCard;
				$(".card_template").find(".hanger").addClass("flip");
			}

			//populate hangers
			if (hanger_display === "on") { $(".card_template .hanger").html(hangers); }
			$(".card_template").find(".frame").css("background", "url("+cardCDN+") top center no-repeat").css("background-size", "cover");
			$(".card_template").css("display", "block").css("top", "40%" ).css("left", cardLeft);
			//hide dd
			hideDropDown();

			//start timer for fading out card on hover - 10s
			fadeOutCard = setTimeout(function(){
				$(".card_template").animate({ opacity: 0 }, 300);
			}, 10000 ); // end delay
		}
	});

	$(".playmatCont").on('mouseleave', '.pl_unit', function(){
		//hide card back to -58px
		$(".card_template").css("display", "none").css("opacity", "1").css("top", "0").css("left", "0");
		$(".card_template").find(".frame").css("background", "none");
	});

	//PLAYMAT OVER - RELIC
	$(".playmatCont").on('mouseenter', '.pl_relic', function(){
		var position = $(this).position();
		var display = $(this).attr("data-status");
		stopCardFadeOutTimer(fadeOutCard);
		$(".card_template").css("opacity", "1");
		//display card for player
		if (display === "active") {
			var cardCDN = $(this).attr("data-cdn");
			var cardTop = parseInt(position.top) - 250;
			if(cardTop < 80) { cardTop = 80; }
			//populate hangers
			//$(".card_template .hanger").html(hangers);
			$(".card_template .hanger").html("");
			$(".card_template").find(".frame").css("background", "url("+cardCDN+") top center no-repeat").css("background-size", "cover");
			$(".card_template").css("display", "block").css("top", cardTop ).css("left", position.left - 240);
			//hide dd
			hideDropDown();

			//start timer for fading out card on hover - 10s
			fadeOutCard = setTimeout(function(){
				$(".card_template").animate({ opacity: 0 }, 300);
			}, 10000 ); // end delay
		}
	});

	$(".playmatCont").on('mouseleave', '.pl_relic', function(){
		//hide card back to -58px
		$(".card_template").css("display", "none").css("top", "0").css("left", "0");
		$(".card_template").find(".frame").css("background", "none");
	});

	//PLAYMAT OVER - AVATARS
	$(".playmatCont").on('mouseenter', '.pl_avatar', function(){
		stopCardFadeOutTimer(fadeOutCard);
		$(".avatar_template").css("opacity", "1");
		var position = $(this).position();
		var widthThis = $(this).width();
		var display = $(this).attr("data-status");
		var height = $("main.viewer").attr("data-height");
		//display card for player
		if (display === "active") {
			var cardCDN = $(this).attr("data-cdn");
			$(".avatar_template").find(".frame").css("background", "url("+cardCDN+") top center no-repeat").css("background-size", "cover");

			var posTop = Math.max(position.top - 300, 0);

			$(".avatar_template").css("display", "block").css("top", posTop).css("left", position.left - 40);

			//hide dd
			hideDropDown();

			//start timer for fading out card on hover - 10s
			fadeOutCard = setTimeout(function(){
				$(".avatar_template").animate({ opacity: 0 }, 300);
			}, 10000 ); // end delay
		}
	});

	$(".playmatCont").on('mouseleave', '.pl_avatar', function(){
		//hide card back to -58px
		$(".avatar_template").css("display", "none").css("top", "0").css("left", "0");
		$(".avatar_template").find(".frame").css("background", "none");
	});

	//PLAYMAT OVER - DECKPILE
	$(".playmatCont").on('mouseenter', '.pl_deckPile', function(){
		var position = $(this).position();
		var cardCount = $(this).attr("data-cardCount");
		var widthThis = $(this).width();
		var heightThis = $(this).height();
		var display = $(this).attr("data-status");
		var height = $("main.viewer").attr("data-height");
		//display card for player
		if (display === "active") {
			var cardTop = position.top;
			var cardLeft = position.left;
			if (cardTop < 100) {
				cardTop = position.top + heightThis;
				cardLeft = position.left + 10;
			} else if (cardTop > 100) {
				cardTop = position.top - 50;
				cardLeft = position.left - 10;
			}
			$(".deckpile_template").find(".frame").text(cardCount);
			$(".deckpile_template").css("display", "block").css("width", widthThis).css("top", cardTop ).css("left", cardLeft);
			//hide dd
			hideDropDown();
		}
	});

	$(".playmatCont").on('mouseleave', '.pl_deckPile', function(){
		//hide card back to -58px
		$(".deckpile_template").css("display", "none").css("top", "0").css("left", "0");
		$(".deckpile_template").find(".frame").text("");
	});

	//PLAYMAT OVER - DISCARD PILE
	$(".playmatCont").on('mouseenter', '.pl_discard', function(){
		stopCardFadeOutTimer(fadeOutCard);
		$(".card_template").css("opacity", "1");
		var position = $(this).position();
		var widthThis = $(this).width();
		var heightThis = $(this).height();
		var display = $(this).attr("data-status");
		var height = $("main.viewer").attr("data-height");
		if (hanger_display === "on") { var hangers = $(this).html(); }
		//display card for player
		if (display === "active") {
			var cardCDN = $(this).attr("data-cdn");
			var cardTop = position.top;
			if (cardTop < 0) {
				cardTop = position.top + 80;
			} else if ( (cardTop + heightThis) > height) {
				cardTop = position.top - heightThis;
			}
			//populate hangers
			if (hanger_display === "on") { $(".card_template .hanger").html(hangers); }
			$(".card_template").find(".frame").css("background", "url("+cardCDN+") top center no-repeat").css("background-size", "cover");
			$(".card_template").css("display", "block").css("top", cardTop ).css("left", position.left + widthThis + offsetCard);
			//hide dd
			hideDropDown();

			//start timer for fading out card on hover - 10s
			fadeOutCard = setTimeout(function(){
				$(".card_template").animate({ opacity: 0 }, 300);
			}, 10000 ); // end delay
		}
	});

	$(".playmatCont").on('mouseleave', '.pl_discard', function(){
		//hide card back to -58px
		$(".card_template").css("display", "none").css("top", "0").css("left", "0");
		$(".card_template").find(".frame").css("background", "none");
	});

	//hover player Hand
	$(".playhandCont").on('mouseenter', '.plPlayHand', function(){
		stopCardFadeOutTimer(fadeOutCard);
		$(".card_template").css("opacity", "1");
		var position = $(this).position();
		var display = $(this).attr("data-status");
		var frameWidth = parseInt( $(".card_template").find(".frame").width() );
		var gheight = parseInt( $("main.viewer").attr("data-height") );
		var gwidth = parseInt( $("main.viewer").attr("data-width") );
		if (hanger_display === "on") { var hangers = $(this).html(); }
		//display card for player
		if (display === "active") {
			var cardCDN = $(this).attr("data-cdn");
			if (hanger_display === "on") { $(".card_template .hanger").html(hangers); }
			$(".card_template").find(".frame").css("background", "url("+cardCDN+") top center no-repeat").css("background-size", "cover");
			if(position.top - 350 > 0) {
				$(".card_template").css("display", "block").css("top", "40%" ).css("left", position.left);
			} else {
				var widthThis = $(this).width();
				var heightThis = $(this).height();
				var height = $("main.viewer").attr("data-height");
				var cardTop = position.top;
				var cardLeft = position.left + (widthThis/2);
				if (cardTop < 0) {
					cardTop = position.top + 80;
					cardLeft = position.left + widthThis + offsetCard;
				} else if ( (cardTop + heightThis) > height) {
					cardTop = position.top - heightThis;
				}
				//flip card if hangers are out of frame
				if (position.left > (gwidth/2)) {
					cardLeft = position.left - widthThis;
					$(".card_template").find(".hanger").addClass("flip");
				}
				$(".card_template").css("display", "block").css("top", "40%" ).css("left", cardLeft);
				//hide dd
				hideDropDown();
			}

			//start timer for fading out card on hover - 10s
			fadeOutCard = setTimeout(function(){
				$(".card_template").animate({ opacity: 0 }, 300);
			}, 10000 ); // end delay
		}
	});

	$(".playhandCont").on('mouseleave', '.plPlayHand', function(){
		//hide card back to -58px
		$(".card_template").css("display", "none").css("top", "0" ).css("left", "0");
		$(".card_template").find(".frame").css("background", "none");
	});

	rootBody.click(function(e){
		e.preventDefault();
	});

	//fadein or fadeout collapse deck in mode 1 only
	rootBody.on('mouseenter', rootMain, function() {
		var deckState = rootDeck.attr("data-displayDeckMode");
		if (deckState === '1' || $(".deck_title").hasClass("closed")) {
			rootDeck.fadeIn(300);
		}
	});

	rootBody.on('mouseleave', rootMain, function() {
		var deckState = rootDeck.attr("data-displayDeckMode");
		if (deckState === '1' || $(".deck_title").hasClass("closed")) {
			rootDeck.fadeOut(300);
		}
	});

	var copy = function(data) {
		dwd.log("About to copy deck list: " + data);
		var temp = document.createElement("textarea");
		$(temp).text(data);
		document.body.appendChild(temp);
		temp.select();
		document.execCommand("copy");
		document.body.removeChild(temp);
	};

	$("button#export").click(function(e){
		var status = $(this).attr("data-status");
		$(".pheaderContainer.tabs ul li").removeClass("active");
		if (status === "hide") {
			//restart drag
			interact('.draggable')
				.draggable({
					enabled: true
				});
			//animate close export
			$(".deck_0").animate({ top: '0px', left: '0px' }, 300);
			$(".deck_1").animate({ top: '0px', left: '-999px' }, 300);
			$(".deck_2").animate({ top: '0px', left: '-999px' }, 300);
			$(".deck_export").animate({ top: '0px', left: '-999px' }, 200);
			$(this).attr("data-status", "show");
			//trigger first tab
			$(".pheaderContainer.tabs ul li.icons_tabs_0").addClass("active");
		} else if (status === "show") {
			//stop drag - removed for now so that you can move and still use select all button
			// interact('.draggable')
			//     .draggable({
			//         enabled: false
			// });
			//animate show export
			copy($("#current_export").text());
			$(".deck_0").animate({ top: '0px', left: '-999px' }, 300);
			$(".deck_1").animate({ top: '0px', left: '-999px' }, 300);
			$(".deck_2").animate({ top: '0px', left: '-999px' }, 300);
			$(".deck_export").animate({ top: '0px', left: '0px' }, 200);
			$(this).attr("data-status", "hide");
		}
		e.preventDefault();
		//hide dd
		hideDropDown();
	});

	$("button.deck_export_sall").click(function(e){
		$("#current_export").select();
		document.execCommand("copy");
		e.preventDefault();

		hideDropDown();
	});

	//menuMe event
	/*
	Display Deck Mode:
	1 = overlay off
	2 = decklist off
	3 = full mode
	 */
	$("button#menume").click(function(e){
		var status = $(this).attr("data-status");
		//logic for left or right display
		var deckPosition = rootDeck.position();
		var documentWidth = parseInt( $("main.viewer").width() );
		var ddWidth = parseInt( $(".pheader_ddown").width() );
		if ( (deckPosition.left + rootDeck.width() + ddWidth) > documentWidth) {
			$(".pheader_ddown").removeClass("right").addClass("left");
		} else {
			$(".pheader_ddown").removeClass("left").addClass("right");
		}
		if (status === "hide") {
			//animate close
			$(".pheader_ddown").css("display", "none");
			$(this).attr("data-status", "show");
		} else if (status === "show") {
			//animate show
			$(".pheader_ddown").css("display", "block");
			$(this).attr("data-status", "hide");
		}
		e.preventDefault();
	});

	//trigger overlay off
	$("#btnOverlayOnOff").click(function(){
		var status = $(this).attr("data-status");
		$(".pheaderContainer.tabs ul li").removeClass("active");
		if (status === "show") {
			$(".deck_cont").addClass("enabled").animate({ height: '50vh', opacity: 1 }, 300);
			$(this).attr("data-status", "hide");
			$(this).find(".chk").addClass("on");
			$(".plPlayHand").attr("data-status", "active");
			$(".playmatCards").attr("data-status", "active");
			rootMain.attr("data-active", "active");
			//enabled btns in menu
			$("#btnHangersOnOff").removeClass("disabled").addClass("enabled").attr("data-status", "hide").find(".chk").addClass("on");
			$("#btnDecklistOnOff").removeClass("disabled").addClass("enabled").attr("data-status", "hide").find(".chk").addClass("on");
			//bring back export
			$("button#export").css("top", 0).css("left", 5).animate({ opacity: 1 }, 300);
			//show deck_title
			//$(".deck_title").animate({ height: '15vh', opacity: 1 }, 300);
			//change deck display mode
			rootDeck.attr("data-displayDeckMode", "3");
			//trigger first tab
			$(".pheaderContainer.tabs ul li.icons_tabs_0").addClass("active");
			$(".pheaderContainer.tabs").attr("data-status", "active");
		} else if (status === "hide") {
			$(".deck_cont").removeClass("enabled").animate({ height: '0px', opacity: 0 }, 300);
			$(this).attr("data-status", "show");
			$(this).find(".chk").removeClass("on");
			//disabled active state per hotspots
			$(".plPlayHand").attr("data-status", "inactive");
			$(".playmatCards").attr("data-status", "inactive");
			rootMain.attr("data-active", "inactive");
			//disabled btns in menu
			$("#btnHangersOnOff").removeClass("enabled").addClass("disabled").attr("data-status", "disabled").find(".chk").removeClass("on");
			$("#btnDecklistOnOff").removeClass("enabled").addClass("disabled").attr("data-status", "disabled").find(".chk").removeClass("on");
			//remove export
			$("button#export").animate({ opacity: 0 }, 300).css("top", -999).css("left", -999);
			//show deck_title
			//$(".deck_title").animate({ height: '0px', opacity: 1, padding: '2px 0px 2px 0px' }, 300);
			//change deck display mode
			rootDeck.attr("data-displayDeckMode", "1");
			//rootDeck.animate({ width: '55px' }, 300);
			//hide dd
			hideDropDown();
			$(".pheaderContainer.tabs").attr("data-status", "notactive");
		}

	});

	//trigger hangers off on playmat and deck
	$("#btnHangersOnOff").click(function(){
		var status = $(this).attr("data-status");
		if (status === "show") {
			hanger_display = "on";
			$(this).find(".chk").addClass("on");
			$(this).attr("data-status", "hide");
		} else if (status === "hide") {
			hanger_display = "off";
			$(".card_template .hanger").html("");
			$(this).find(".chk").removeClass("on");
			$(this).attr("data-status", "show");
		}

	});

	//trigger decklist off  but playmat hover on
	$("#btnDecklistOnOff").click(function(){
		var status = $(this).attr("data-status");
		$(".pheaderContainer.tabs ul li").removeClass("active");
		if (status === "show") {
			$(this).find("div.chk").addClass("on");
			$(".deck_cont").addClass("enabled").animate({ height: '50vh', opacity: 1 }, 300);
			$("button#export").css("top", 0).css("left", 5).animate({ opacity: 1 }, 300);
			$(this).attr("data-status", "hide");
			//change deck display mode
			$(".decks").attr("data-displayDeckMode", "3");
			//trigger first tab
			$(".pheaderContainer.tabs ul li.icons_tabs_0").addClass("active");
			$(".pheaderContainer.tabs").attr("data-status", "active");
			$(".pheader, .deck_art").removeClass("hide");
			$(".deck_title").removeClass("closed");
		} else if (status === "hide") {
			$(this).find("div.chk").removeClass("on");
			$(".deck_cont").removeClass("enabled").animate({ height: '0px', opacity: 0 }, 300);
			$("button#export").animate({ opacity: 0 }, 300).css("top", -999).css("left", -999);
			$(this).attr("data-status", "show");
			//change deck display mode
			$(".decks").attr("data-displayDeckMode", "2");
			$(".pheaderContainer.tabs").attr("data-status", "notactive");
			$(".pheader, .deck_art").addClass("hide");
			$(".deck_title").addClass("closed");
		}
	});

	//trigger drops on/off
	$("#btnDropsOnOff").click(function(){
		var status = $(this).attr("data-status");
		$(".pheaderContainer.tabs ul li").removeClass("active");
		if (status === "show") {
			$(this).find("div.chk").addClass("on");
			$(this).attr("data-status", "hide");

			if(canAcceptDrops) {
				dropsOn = true;
			} else {
				$(".drops-notification").removeClass("hide"); 
			}

		} else if (status === "hide") {
			$(this).find("div.chk").removeClass("on");
			$(this).attr("data-status", "show");
			$(".drops-notification").addClass("hide");
			dropsOn = false;
		}
	});

	$(".js-initializeDrops").click(function(){
		window.Twitch.ext.actions.requestIdShare();
	});


	//click event for tabs
	$(".pheaderContainer.tabs li").click(function(){
		var tabsStatus = $(".pheaderContainer.tabs").attr("data-status");
		var status = $(this).hasClass("active");
		var tab = $(this).attr("data-tab");
		if (status === false && tabsStatus === "active") {
			$("button#export").attr("data-status", "show");
			$(".pheaderContainer.tabs ul li").removeClass("active");
			$(this).addClass("active");
			//restart drag
			interact('.draggable')
				.draggable({
					enabled: true
				});
			//show tab
			if (tab === "0") {
				$(".deck_0").animate({ top: '0px', left: '0px' }, 200);
				$(".deck_1").animate({ top: '0px', left: '-999px' }, 300);
				$(".deck_2").animate({ top: '0px', left: '-999px' }, 300);
				$(".deck_export").animate({ top: '0px', left: '-999px' }, 300);
			}
			if (tab === "1") {
				$(".deck_0").animate({ top: '0px', left: '-999px' }, 300);
				$(".deck_1").animate({ top: '0px', left: '0px' }, 200);
				$(".deck_2").animate({ top: '0px', left: '-999px' }, 300);
				$(".deck_export").animate({ top: '0px', left: '-999px' }, 300);
			}
			if (tab === "2") {
				$(".deck_0").animate({ top: '0px', left: '-999px' }, 300);
				$(".deck_1").animate({ top: '0px', left: '-999px' }, 300);
				$(".deck_2").animate({ top: '0px', left: '0px' }, 200);
				$(".deck_export").animate({ top: '0px', left: '-999px' }, 300);
			}
		}
	});

});