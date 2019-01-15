
$(document).ready(function() {
	
	// --------------------
	// + GLOBAL VARIABLES +
	// --------------------
	var myColor = null;
	var numberOfAvailableTanks = null;
	var map = {'territories': [], 'neighbourhood': [], 'membership': [], 'continents': []};
	var cards = [];
	var jsonResponsePlayPhase = null;
	var historyMessages = [];
	var attackPhaseAlreadyInitialized = false;
	var movementPhaseAlreadyInitialized = false;
	
	
	// ----------------------------------------------------
	// + INIT FUNCTIONS CALLED ONCE THE DOCUMENT IS READY +
	// ----------------------------------------------------
	
	init();	
	
	// this function initializes the web page in order to start the game
	function init() {
		initMap();
		getPlayerInfo();
	}
	
	// this function initializes the variable MAP, visualizes the map on the web page and
	// starts the initial tank placement phase.
	function initMap() {
		$.ajax({
			type : 'GET',
			url : '../game/map',
			success: function(result) {
				if(result.responseCode != -1) {
					map.territories = JSON.parse(result.responseMessage).territories;
					map.neighbourhood = JSON.parse(result.responseMessage).neighbourhood;
					map.membership = JSON.parse(result.responseMessage).membership;
					map.continents = JSON.parse(result.responseMessage).continents;
					fillSVGMapDiv(JSON.parse(result.responseMessage).mapSVG);
					startRequestingMapLoading();
					startTankPlacementPhase();
					updateMyTerritoriesSelect($("#wherePlacementSelect"));
				}
				else
					showModalWindow(result.responseMessage);
			}
		});
	}
	
	// fillSVGMapDiv is used to show the map return by the server on the web page.
	function fillSVGMapDiv(mapSVG){
		$("#mapDiv").html(mapSVG);
		updateSVGMap();
		addMouseoverEventToTerritories();
	}
	
	function getPlayerInfo() {
		$.ajax({
			type : 'GET',
			url : '../game/playerInfo',
			success: function(result) {
				if(result.responseCode != -1) {
					result = JSON.parse(result.responseMessage);
					updatePlayerStatus(result);
					myColor = result.color;
					$("#myColorLabel").html(myColor);
				}
				else
					showModalWindow(result.responseMessage);
			}
		});
	}
	
	function startTankPlacementPhase() {
		$("#availableTanksLabel").html(numberOfAvailableTanks);
		$("#tankPlacementPhaseDiv").show();
	}
	
	
	
	
	// -------------------------------------------------------------------
	// + FUNCTIONS CALLED PERIODICALLY USING SERVER SEND EVENT MECHANISM +
	// -------------------------------------------------------------------
	
	// requestMapLoading creates a link to connect the client to the server, so that the
	// server can send map updates using Server Send Event mechanism.
	function startRequestingMapLoading() {
		var initialTankPlacementPhaseStarted = false;
		var source = new EventSource('../game/territories');
		source.onmessage = function(event) {
			map.territories = JSON.parse(event.data);
			initialTankPlacementPhaseStarted = true;			
			updateSVGMap();
		}
	}
	
	// this function colors the map and updates tanks numbers
	function updateSVGMap() {
		$("path.country").each(function() {
			for (var i = 0; i < map.territories.length; ++i) {
				if (map.territories[i].name == $(this).attr("id")) {
					$(this).removeClass().attr("class", "country").addClass(map.territories[i].owner);
					$("#" + map.territories[i].name + "_text").text(map.territories[i].numberOfTanks);
				}
			}
		});
	}
	
	
	// used to get information of turn status from the server, invoked only one time
	// sse emitter was used by the server to send the json response
	function playerTurnRequest() {
		var allTanksPlacedWarningShown = false;
		var source = new EventSource('../game/turnStatus');
		source.onmessage = function(event) {
			if(!JSON.parse(event.data).hasOwnProperty('currentPlayerColor')) {
				if (!allTanksPlacedWarningShown) {
					allTanksPlacedWarningShown = true;
					showModalWindow("All tanks have been placed! Wait for other players to finish this phase too");
				}
			}
			else {
				updateConsoleText(JSON.parse(event.data).history);
				var currentPlayer = JSON.parse(event.data).currentPlayerColor;
				$("#playersTurnLabel").html(currentPlayer);
				if(myColor != currentPlayer) 
					$("#gameDiv").hide();
				else {
					$("#gameDiv").show();
					$("#nextPhaseButton").show();
					var phaseId = JSON.parse(event.data).currentPhaseId;
					playPhase(phaseId);
				}
			}
		}
	}
	
	function playPhase(phaseId) {
		switch (phaseId) {
		case 1:
			movementPhaseAlreadyInitialized = false;
			getPlayerInfo();
			enableCards(true);
			$("#tankMovementPhaseDiv").hide();
			$("#assignTanksPhaseDiv").show();
			break;
		case 2:
			enableCards(false);
			$("#assignTanksPhaseDiv").hide();
			$("#tankPlacementPhaseDiv").show();
			break;
		case 3:
			if (!attackPhaseAlreadyInitialized) {
				updateMyTerritoriesSelect($("#fromAttackSelect"));
				updateToAttackSelect();
				attackPhaseAlreadyInitialized = true;
			}
			$("#tankPlacementPhaseDiv").hide();
			$("#attackPhaseDiv").show();
			break;
		case 4:
			attackPhaseAlreadyInitialized = false;
			if (!movementPhaseAlreadyInitialized) {
				updateMyTerritoriesSelect($("#fromMovementSelect"));
				updateToMovementSelect();
				movementPhaseAlreadyInitialized = true;
			}
			$("#attackPhaseDiv").hide();
			$("#tankMovementPhaseDiv").show();
			break;
		}
	}
	
	
	// --------------------
	// + UPDATE FUNCTIONS +
	// --------------------
	
	function updateConsoleText(newHistoryMessages) {
		for (var i = historyMessages.length; i < newHistoryMessages.length; ++i)
			$("#consoleText").val(newHistoryMessages[i] + "\n" + $("#consoleText").val());
		historyMessages = newHistoryMessages;
	}
	
	function updateMyTerritoriesSelect(select) {
		select.html("");
		for (var i = 0; i < map.territories.length; ++i) 
			if (map.territories[i].owner == myColor)
				select.append('<option value="' + map.territories[i].name + '">' 
					+ map.territories[i].name + "</option>");
	}
	
	function updateCardsCheckboxes() {
		$("#cardsDiv").html("");
		for (var i = 0; i < cards.length; ++i) 
			$("#cardsDiv").append('<input type="checkbox" id="' + i + '"> (' + cards[i].territory + ', ' + cards[i].symbol +') </input>');	
	}

	function showModalWindow(message) {
		$("div.modal-body").html("<h2>" + message + "</h2>");
		$("#modalWindow").css("display", "block");
	}
	
	// this function is used to updated the gloabal variable CARDS, which is an array of territory names.
	function updateCards(cardsArray) {
		for (var i = 0; i < cardsArray.length; ++i)
			cards[i] = {"territory": cardsArray[i].territory, "symbol": cardsArray[i].symbol};
	}
	
	function enableCards(enabled) {
		$("input:checkbox").each(function() {
			$(this).attr("enabled", enabled);
		});
	}
	
	function updatePlayerStatus(status) {
		$("#missionCardLabel").html(status.missionCard.mission);
		numberOfAvailableTanks = status.availableTanks;
		$("#availableTanksLabel").html(numberOfAvailableTanks);
		updateCards(status.cards);
	}
	
	function updateToAttackSelect() {
		$("#toAttackSelect").html("");
		var neighbours = findNeighboursOf($("#fromAttackSelect"));
		for (var i = 0; i < neighbours.length; ++i) 
			if (neighbours[i].owner != myColor)
				$("#toAttackSelect").append('<option value="' + neighbours[i].name + '">' 
						+ neighbours[i].name + "</option>");	
	}
	
	function updateToMovementSelect() {
		$("#toMovementSelect").html("");
		var neighbours = findNeighboursOf($("#fromMovementSelect"));
		for (var i = 0; i < neighbours.length; ++i) {
			console.log(neighbours[i]);
			console.log(neighbours[i].territories);
			if (neighbours[i].owner == myColor) 
				$("#toMovementSelect").append('<option value="' + neighbours[i].name + '">' 
						+ neighbours[i].name + "</option>");
			
		}
	}
		
	// helper function that returns the list of neighbours of a territory selected in a FROM SELECT
	function findNeighboursOf(fromSelect) {
		var fromTerritory = fromSelect.val();
		var fromTerritoryNeighboursFound = false;
		var neighboursNames = [];
		var i = 0;
		while (!fromTerritoryNeighboursFound) {
			if (map.neighbourhood[i].name == fromTerritory) {
				fromTerritoryNeighboursFound = true;
				neighboursNames = map.neighbourhood[i].territories;
			}
			++i;
		}
		var neighbours = [];
		for (var j = 0, k = 0; j < map.territories.length && k < neighboursNames.length; ++j) 
			if (map.territories[j].name == neighboursNames[k]) {
				neighbours[k] = map.territories[j];
				++k;
				j = 0;
			}
		return neighbours;
	}

	

	// ------------------------------------
	// + FUNCTIONS CALLED BY CLICK EVENTS +
	// ------------------------------------
	
	function sendPhaseData(jsonRequestObject) {
		$.ajax({
			type : 'POST',
			url : '../game/playPhase',
			contentType: 'application/json',
			dataType: 'json',
			data: JSON.stringify(jsonRequestObject), 
			success: function(data) {
				if (data.responseCode == -1)
					showModalWindow(data.responseMessage);
				else {
					updatePlayerStatus(JSON.parse(data.responseMessage));
					updateMyTerritoriesSelect($("#fromAttackSelect"));
					updateToAttackSelect();
					updateCardsCheckboxes();
				}
			}
		});
	}
	
	// function used to place tanks to a territory
	function placeInitialTanks() {
		var territory = $("#wherePlacementSelect").val();
		if (territory == undefined) {
			updateMyTerritoriesSelect($("#wherePlacementSelect"));
			showModalWindow("Something wrong happened... try again!");
			return;
		}
		var numOfTanks = parseInt($('#howManyPlacement').val(), 10);
		$('#howManyPlacement').val(0);
		$.ajax({
			type : 'POST',
			url : '../game/initialTanksPlacement',
			contentType: 'application/json',
			dataType: 'json',
			data: JSON.stringify(placeTanksJson(territory, numOfTanks)), 
			success: function(data) {
				if (data.responseCode == -1)
					showModalWindow(data.responseMessage);
				else {
					if (numOfTanks == numberOfAvailableTanks) {
						$("#tankPlacementPhaseDiv").hide();
						playerTurnRequest();
						$("#placeTanksButton").unbind();
						$("#placeTanksButton").click(function() {
							placeTanks();
						});						
					}
					numberOfAvailableTanks = JSON.parse(data.responseMessage).availableTanks;
					$("#availableTanksLabel").html(numberOfAvailableTanks);
				}
			}
		});
	}
	
	function useTris() {
		var selectedCards = [];
		var i = 0;
		$("input:checkbox").each(function () {
			if (this.checked) 
				selectedCards[i++] = cards[$(this).attr("id")];
		});
		var jsonRequestObject = {"cards": selectedCards};
		sendPhaseData(jsonRequestObject);
	}
	
	function placeTanks() {
		var territory = $("#wherePlacementSelect").val();
		var numOfTanks = parseInt($('#howManyPlacement').val(), 10);
		$('#howManyPlacement').val(0);
		sendPhaseData(placeTanksJson(territory, numOfTanks));
	}
	
	function attack() {
		attackPhaseAlreadyInitialized = false;
		var fromTerritory = $("#fromAttackSelect").val();
		var toTerritory = $("#toAttackSelect").val();
		var numOfTanks = parseInt($('#howManyAttack').val(), 10);
		$('#howManyAttack').val(0);
		
		if (toTerritory == undefined) {
			showModalWindow("You have to select a territory to attack!");
			return;
		}
		sendPhaseData(attackJson(fromTerritory, toTerritory, numOfTanks));
	}
	
	function moveTanks() {
		var fromTerritory = $("#fromMovementSelect").val();
		var toTerritory = $("#toMovementSelect").val();
		var numOfTanks = parseInt($('#howManyMovement').val(), 10);
		$('#howManyMovement').val(0);
		
		if (toTerritory == undefined) {
			showModalWindow("Select a valid territory to move your tanks to!");
			return;
		}
		sendPhaseData(moveJson(fromTerritory, toTerritory, numOfTanks));
	}
	
	function nextPhase() {
		$.getJSON('../game/nextPhase', function(result) {
			if (result.responseCode == -1)
				showModalWindow(result.responseMessage);
			else {
				updatePlayerStatus(JSON.parse(result.responseMessage));
				updateCardsCheckboxes();
			}
		});
	}
	
	// helper function that return json object for placement phase
	function placeTanksJson(territory, numOfTanks) {
		return {'territory' : territory, 'numOfTanks' : numOfTanks};
	}
	
	// helper function that return json object from attacking phase
	function attackJson(fromTerritory, toTerritory, numOfTanks) {
		return {'from' : fromTerritory, 'to' : toTerritory, 'howMany' : numOfTanks};
	}
	
	// helper function that return json object from movement phase
	function moveJson(fromTerritory, toTerritory, numOfTanks) {
		return attackJson(fromTerritory, toTerritory, numOfTanks);
	}
	

	// ----------------
	// + CLICK EVENTS +
	// ----------------
	
	$("#nextPhaseButton").click(function() {
		nextPhase();
	});
	
	$("#useTrisButton").click(function() {
		useTris();
	});
	
	$("span.close").click(function() {
		$("#modalWindow").css("display", "none");
	});
	
	$("#placeTanksButton").click(function() {
		placeInitialTanks();
	});
	
	$("#attackButton").click(function() {
		attack();
	});
	
	$("#moveButton").click(function() {
		moveTanks();
	});
	
	
	// ----------------
	// + OTHER EVENTS +
	// ----------------
	
	$("#fromAttackSelect").change(function() {
		updateToAttackSelect();
	});
	
	$("#fromMovementSelect").change(function() {
		updateToMovementSelect();
	});
	
	function addMouseoverEventToTerritories() {
		$("path.country").each(function() {
			$(this).hover(
					function() {
						$("#territoryNameLabel").html($(this).attr("id"));
					}, 
					function() {
						$("#territoryNameLabel").html("");
					});
		});
	}
	
});