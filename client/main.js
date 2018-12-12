canvas_width = window.innerWidth * window.devicePixelRatio;
canvas_heigth = window.innerHeight * window.devicePixelRatio;

game = new Phaser.Game(2000,2000, Phaser.CANVAS, 'gameDiv');

//list of enemies
var enemies = [];

var gameProperties = {
	gameWidth: 2000,
	gameHeight: 2000,
	game_elemnt: "gameDiv",
	in_game: false,
	player_in_game: false,
	speed: 200
};

var style = {
	font: "30px Arial", fill: "#ffffff" 
}

var main = function (game) {
	//nothing goes here
};

function onSocketConnected(data) {
	console.log("connnected to server");
	gameProperties.in_game = true;
	var username = data.username;
	socket.emit('new_player', {
		username: data.username,
		x: getRndInteger(10, 790),
		y: getRndInteger(10, 790),
		direction_x: getRndInteger(-1, 1),
		direction_y: 0
	});
}

//remove that player when the server says someone is disconnected
function onRemovePlayer(data) {
	var removePlayer = findplayerbyid(data.id);
	// Player not found
	if (!removePlayer) {
		console.log('Player not found: ', data.id)
		return;
	}

	removePlayer.enemy.clear();

	removePlayer.player.destroy();
	enemies.splice(enemies.indexOf(removePlayer), 1);
}

function createPlayer(data) {

	gameProperties.player_in_game = true;

	playerCollisionGroup = game.physics.p2.createCollisionGroup();

	player = game.add.graphics(data.x, data.y);

	//a player have
	player.x = data.x; //x axis position of the player
	player.y = data.y; //y axis position of the player
	player.direction_x = data.start_direction_x; //direction of the player
	player.direction_y = data.start_direction_y;
	player.territory = data.start_territory; //area taken by the player * need to figure out the data structure

	//waypoint
	player.way_point = [];
	player.way_point.push([player.x, player.y]);
	player.lines = [];

	//add code here to create player graphics and values
	game.physics.p2.enableBody(player, false);
	//player.body.setRectangle(50,50);
	player.body.collideWorldBounds = false;
	player.body.fixedRotation = true;
	player.body.damping = 0;
	player.body.mass = 10;
	player.lineStyle(0);
	player.beginFill(0x2366, 0.5);
	console.log(player.x + " " + player.y);
	player.drawRect(0, 0, 0, 0);
	player.endFill();
	game.physics.p2.setBoundsToWorld(true, true, true, true, true);
	player.body.setCollisionGroup(playerCollisionGroup);
	player.body.collides([playerCollisionGroup, game.physics.p2.boundsCollisionGroup]);

	//draw path for the player 
	

	player.line = game.add.graphics(0,0);
	player.line.lineStyle(10, 0x2366);
	player.line.beginFill(0x2366);
	player.line.moveTo(player.x,player.y);
	player.line.lineTo(player.position.x, player.position.y);
	player.line.endFill();

	
	//player.body.setRectangle(50,50);

	//add some label
	//var player_position_string = (player.position.x)|0 + " " + (player.position.y)|0;
	//label_position = game.add.text(player.position.x, player.position.y, player_position_string, style);
	//player.addChild(label_position);

	//enable collision and when it makes a contact with another body, call player_coll


	player.body.createBodyCallback(game.physics.p2.boundsCollisionGroup, play_col, this);
	game.physics.p2.setImpactEvents(true);

	
}

function play_col(body1, body2) {
	console.log("collide");
}

var enemy_player = function (id, startx, starty, start_direction_x, start_direction_y) {
	//set initial values given by the server
	this.x = startx;
	this.y = starty;
	this.id = id;

	//get start directions
	this.direction_x = start_direction_x;
	this.direction_y = start_direction_y;

	//add code here to create enemy player graphics

	this.enemy = game.add.graphics(startx, starty);
	game.physics.p2.enableBody(this.enemy, false);

	this.enemy.way_point = [];
	this.enemy.way_point.push([this.x, this.y]);
	this.enemy.lines = [];

	//don't forget to add body to physics, may need to make modifications
	

	this.enemy.body.collideWorldBounds = false;
	this.enemy.body.fixedRotation = true;
	this.enemy.body.damping = 0;
	this.enemy.body.mass = 10;

	this.enemy.line = game.add.graphics(0,0);
	this.enemy.line.lineStyle(10, 0x2366);
	this.enemy.line.beginFill(0x2366);
	this.enemy.line.moveTo(player.x,player.y);
	this.enemy.line.lineTo(player.position.x, player.position.y);
	this.enemy.line.endFill();

	

}

//Server will tell us when a new enemy player connects to the server.
//We create a new enemy in our game.
function onNewEnemyPlayer(data) {
	//enemy object
	console.log(data);
	var new_enemy = new enemy_player(data.id, data.x, data.y, data.direction_x, data.direction_y);
	enemies.push(new_enemy);
}

//Server tells us there is a new enemy movement. We find the moved enemy
//and sync the enemy movement and territory with the server
function onEnemyMove(data) {
	var movePlayer = findplayerbyid(data.id);

	movePlayer.enemy.body.velocity.x = data.direction_x * gameProperties.speed;
	movePlayer.enemy.body.velocity.y = data.direction_y * gameProperties.speed;

	movePlayer.enemy.way_point.push([movePlayer.enemy.position.x, movePlayer.enemy.position.y]);

	movePlayer.enemy.lines.push(movePlayer.enemy.line);

		var start = {
			x: movePlayer.enemy.way_point[movePlayer.enemy.way_point.length - 1][0],
			y: movePlayer.enemy.way_point[movePlayer.enemy.way_point.length - 1][1]
		}

		//player.line = game.add.graphics(player.position.x, player.position.y);
	
		movePlayer.enemy.line = game.add.graphics(0,0);
		movePlayer.enemy.line.lineStyle(10, 0x2366);
		movePlayer.enemy.line.beginFill(0x2366);
		movePlayer.enemy.line.moveTo(start.x,start.y);
		movePlayer.enemy.line.lineTo(movePlayer.enemy.position.x, movePlayer.enemy.position.y);
		movePlayer.enemy.line.endFill();
		//
	//add code here to update enemy position and territory
}

//This is where we use the socket id. 
//Search through enemies list to find the right enemy of the id.
function findplayerbyid (id) {
	for (var i = 0; i < enemies.length; i++) {
		if (enemies[i].id == id) {
			return enemies[i]; 
		}
	}
}

//receiving the calculated position of this player from the server, make updates
function onInputReceived(data) {
	//we're forming a new pointer with the new position

	//add code here to update player position and territory
	player.body.velocity.x = data.direction_x * gameProperties.speed;
	player.body.velocity.y = data.direction_y * gameProperties.speed;
}

//receiving territory from the server, make updates
function onGainTerritory(data) {
	var add_territory = data.add_territory;

	//add code here to give territory to player
}

//player is dead
function onkilled(data) {
	player.destroy();
}

//cool feature, don't need this for now
function createLeaderBoard() {
	//add code here to create a leaderboard
}

//leader board, don't need this for now
function leader_update(data) {
	//add code here to update leaderboard
}

//define directionData
var directionData = {
	direction_x: 0, direction_y: 0
}

main.prototype = {
	init: function(username) {
		// when the socket connects, call the onsocketconnected and send its information to the server
		socket.emit('logged_in', {username: username});
		// when the player enters the game
		socket.on('enter_game', onSocketConnected);
	},
	preload: function() {
		game.stage.disableVisibilityChange = true;
		game.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;
		//game.world.setBounds(0, 0, gameProperties.gameWidth, gameProperties.gameHeight, true, true, true, true, true);
		game.physics.startSystem(Phaser.Physics.P2JS);
		
		
		game.physics.p2.updateBoundsCollisionGroup();
		game.physics.p2.restitution = 0;
		game.physics.p2.gravity.y = 0;
		game.physics.p2.gravity.x = 0;
		game.physics.p2.applyGravity = false;
		//game.physics.p2.enableBody(game.physics.p2.walls, false);
		game.wallL = game.add.graphics(0,0);
		game.wallL.lineStyle(10, 0x2366);
		game.wallL.beginFill(0x2366);
		game.wallL.moveTo(0,0);
		game.wallL.lineTo(0, gameProperties.gameHeight);
		game.wallL.endFill();

		game.wallBottom = game.add.graphics(0,0);
		game.wallBottom.lineStyle(10, 0x2366);
		game.wallBottom.beginFill(0x2366);
		game.wallBottom.moveTo(0,gameProperties.gameHeight);
		game.wallBottom.lineTo(gameProperties.gameWidth, gameProperties.gameHeight);
		game.wallBottom.endFill();
		game.wallRight = game.add.graphics(0,0);
		game.wallRight.lineStyle(10, 0x2366);
		game.wallRight.beginFill(0x2366);
		game.wallRight.moveTo(gameProperties.gameWidth,0);
		game.wallRight.lineTo(gameProperties.gameWidth, gameProperties.gameHeight);
		game.wallRight.endFill();
		game.wallTop = game.add.graphics(0,0);
		game.wallTop.lineStyle(10, 0x2366);
		game.wallTop.beginFill(0x2366);
		game.wallTop.moveTo(0,0);
		game.wallTop.lineTo(gameProperties.gameWidth, 0);
		game.wallTop.endFill();
		
	},
	create: function() {
		game.stage.backgroundColor = 0xE1A193;

		cursors = game.input.keyboard.createCursorKeys();

		console.log("client started");

		//listen for main player creation
		socket.on('create_player', createPlayer);

		//listen for new enemy connections
		socket.on('new_enemyPlayer', onNewEnemyPlayer);

		//listen for enemy movements
		socket.on('enemy_move', onEnemyMove);

		//when received, remove target player
		socket.on('remove_player', onRemovePlayer);

		//when the player receives new input
		socket.on('input_received', onInputReceived);

		//when player gets killed
		socket.on('player_killed', onkilled);

		//when the player gains territory
		socket.on('gain_territory', onGainTerritory);

		//check for leaderboard
		socket.on('update_leaderboard', leader_update);

		this.game.input.keyboard.onDownCallback = function(e) {
		//for demonstration, next line prints the keyCode to console
			console.log(e.keyCode);
		//here comes your stuff, you might check for certain key, or just trigger a function
			if (e.keyCode == Phaser.Keyboard.UP) {
				goUp();
			} else if (e.keyCode == Phaser.Keyboard.DOWN) {
				goDown();
			} else if (e.keyCode == Phaser.Keyboard.LEFT) {
				goLeft();
			} else if (e.keyCode == Phaser.Keyboard.RIGHT) {
				goRight();
			}
		}
	},
	update: function() {
		if (gameProperties.player_in_game == true) {
			
			//player_position_string = ((player.position.x)|0) + " " + ((player.position.y)|0);
			//label_position.setText(player_position_string);

			if (player.position.x < 0 || player.position.x > 4000) {
				console.log('collide');
				//removePlayer(player.id);
			}
			if (player.position.y < 0 || player.position.y > 4000) {
				console.log('collide');
				//removePlayer(player.id);
			}

			//draw path for the player
			var start_point = {
				x: player.way_point[player.way_point.length - 1][0],
				y: player.way_point[player.way_point.length - 1][1]
			}

			//console.log("line starts" + start_point.x + " " + start_point.y);
			player.line.clear();
			player.line.lineStyle(10, 0x2366);
			player.line.beginFill(0x2366);
			player.line.moveTo(start_point.x, start_point.y);
			player.line.lineTo(player.position.x, player.position.y);
			player.line.endFill();
			
			for (var i = 0; i < enemies.length; i++) {
				enemies[i].enemy.line.clear();
				enemies[i].enemy.line.lineStyle(10, 0x2366);
				enemies[i].enemy.line.beginFill(0x2366);
				var start = {
					x: enemies[i].enemy.way_point[enemies[i].enemy.way_point.length - 1][0],
					y: enemies[i].enemy.way_point[enemies[i].enemy.way_point.length - 1][1]
				}
				enemies[i].enemy.line.moveTo(start.x, start.y);
				enemies[i].enemy.line.lineTo(enemies[i].enemy.position.x, enemies[i].enemy.position.y);
				enemies[i].enemy.line.endFill();
			}
		}
	}
};

function goLeft() {
	console.log('left');
	//Send up direction to the server
	if (directionData.direction_x == -1 && directionData.direction_y == 0) {}
	else {
		directionData = {
			direction_x: -1, direction_y: 0
		}
		player.lines.push(player.line);
		player.way_point.push([player.position.x, player.position.y]);

		var start_point = {
			x: player.way_point[player.way_point.length - 1][0],
			y: player.way_point[player.way_point.length - 1][1]
		}

		//player.line = game.add.graphics(player.position.x, player.position.y);
	
		player.line = game.add.graphics(0,0);
		player.line.lineStyle(10, 0x2366);
		player.line.beginFill(0x2366);
		player.line.moveTo(start_point.x,start_point.y);
		player.line.lineTo(player.position.x, player.position.y);
		player.line.endFill();
		//
		

		socket.emit('input_fired', directionData);
	}
}

function goRight() {
	console.log('right');
	//Send up direction to the server
	if (directionData.direction_x == 1 && directionData.direction_y == 0) {}
	else {
		directionData = {
			direction_x: 1, direction_y: 0
		}
		player.lines.push(player.line);
		player.way_point.push([player.position.x, player.position.y]);

		var start_point = {
			x: player.way_point[player.way_point.length - 1][0],
			y: player.way_point[player.way_point.length - 1][1]
		}
		player.line = game.add.graphics(0,0);
		player.line.lineStyle(10, 0x2366);
		player.line.beginFill(0x2366);
		player.line.moveTo(start_point.x,start_point.y);
		player.line.lineTo(player.position.x, player.position.y);
		player.line.endFill();
		
		socket.emit('input_fired', directionData);
	}
}

function goDown() {
	console.log('down');
	//Send up direction to the server
	if (directionData.direction_x == 0 && directionData.direction_y == 1) {}
	else {
		directionData = {
			direction_x: 0, direction_y: 1
		}
		player.lines.push(player.line);
		player.way_point.push([player.position.x, player.position.y]);

		var start_point = {
			x: player.way_point[player.way_point.length - 1][0],
			y: player.way_point[player.way_point.length - 1][1]
		}

		player.line = game.add.graphics(0,0);
		player.line.lineStyle(10, 0x2366);
		player.line.beginFill(0x2366);
		player.line.moveTo(start_point.x,start_point.y);
		player.line.lineTo(player.position.x, player.position.y);
		player.line.endFill();
		
		socket.emit('input_fired', directionData);
	}
}

function goUp() {
	console.log('up');
	//Send up direction to the server
	if (directionData.direction_x == 0 && directionData.direction_y == -1) {}
	else {
		directionData = {
			direction_x: 0, direction_y: -1
		}
		player.lines.push(player.line);
		player.way_point.push([player.position.x, player.position.y]);

		var start_point = {
			x: player.way_point[player.way_point.length - 1][0],
			y: player.way_point[player.way_point.length - 1][1]
		}
		player.line = game.add.graphics(0,0);
		player.line.lineStyle(10, 0x2366);
		player.line.beginFill(0x2366);
		player.line.moveTo(start_point.x,start_point.y);
		player.line.lineTo(player.position.x, player.position.y);
		player.line.endFill();
		
		socket.emit('input_fired', directionData);
	}
}

var gameBootstrapper = {
    init: function(gameContainerElementId){
		game.state.add('main', main);
		game.state.add('login', login);
		game.state.start('login');
    }
};

function getRndInteger(min, max) {
	return Math.floor(Math.random() * (max - min + 1) ) + min;
}

gameBootstrapper.init("gameDiv");
