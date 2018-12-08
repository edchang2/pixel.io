canvas_width = window.innerWidth * window.devicePixelRatio;
canvas_heigth = window.innerHeight * window.devicePixelRatio;

game = new Phaser.Game(canvas_width, canvas_heigth, Phaser.CANVAS, 'gameDiv');

//list of enemies
var enemies = [];

var gameProperties = {
	gameWidth: 4000,
	gameHeight: 4000,
	game_elemnt: "gameDiv",
	in_game: false,
	speed: 50
};

var main = function (game) {
	//nothing goes here
};

function onSocketConnected(data) {
	console.log("connnected to server");
	gameProperties.in_game = true;
	var username = data.username;
	socket.emit('new_player', {
		username: data.username,
		x: 0,
		y: 0,
		direction_x: 0,
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

	removePlayer.player.destroy();
	enemies.splice(enemies.indexOf(removePlayer), 1);
}

function createPlayer(data) {
	player = game.add.graphics(0, 0);

	//a player have
	player.x = data.x; //x axis position of the player
	player.y = data.y; //y axis position of the player
	player.direction_x = data.start_direction_x; //direction of the player
	player.direction_y = data.start_direction_y;
	player.territory = data.start_territory; //area taken by the player * need to figure out the data structure
	//add code here to create player graphics and values
	game.physics.p2.enableBody(player, true);

	player.lineStyle(0);
	player.beginFill(0x2366, 0.5);
	player.drawRect(data.x, data.y, 50, 50);
	player.endFill();

	//enable collision and when it makes a contact with another body, call player_coll
	//player.body.onBeginContact.add(player_coll, this); 
	
	//camera follow
	game.camera.follow(player, Phaser.Camera.FOLLOW_LOCKON, 0.5, 0.5);
}

var enemy_player = function (id, startx, starty, start_direction_x, start_direction_y, start_territory) {
	//set initial values given by the server
	this.x = startx;
	this.y = starty;
	this.id = id;

	//get start directions
	this.direction_x = start_direction_x;
	this.direction_y = start_direction_y;

	this.territory = start_territory;

	//add code here to create enemy player graphics

	//don't forget to add body to physics, may need to make modifications
	game.physics.p2.enableBody(this.player, true);
	this.player.body.clearShapes();
	this.player.body.data.shapes[0].sensor = true;
}

//Server will tell us when a new enemy player connects to the server.
//We create a new enemy in our game.
function onNewEnemyPlayer(data) {
	//enemy object 
	console.log(data);
	var new_enemy = new enemy_player(data.id, data.x, data.y, data.direction_x, data.direction_y, data.territory);
	enemies.push(new_enemy);
}

//Server tells us there is a new enemy movement. We find the moved enemy
//and sync the enemy movement and territory with the server
function onEnemyMove(data) {
	var movePlayer = findplayerbyid(data.id);

	if (!movePlayer) {
		return;
	}

	var newPointer = {
		x: data.x,
		y: data.y
	}

	//check if the server enemy size is not equivalent to the client
	if (data.size != movePlayer.player.body_size) {
		//do something to correct this
	}

	//add code here to update enemy position and territory
}

//receiving the calculated position of this player from the server, make updates
function onInputReceived(data) {
	//we're forming a new pointer with the new position

	//add code here to update player position and territory
	player.body.velocity.x = data.velocity_x;
	player.body.velocity.y = data.velocity_y;
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
		game.scale.scaleMode = Phaser.ScaleManager.RESIZE;
		game.world.setBounds(0, 0, gameProperties.gameWidth, gameProperties.gameHeight, false, false, false, false);
		game.physics.startSystem(Phaser.Physics.P2JS);
		game.physics.p2.setBoundsToWorld(false, false, false, false, false);
		game.physics.p2.gravity.y = 0;
		game.physics.p2.applyGravity = false; 
		game.physics.p2.enableBody(game.physics.p2.walls, false);
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
		//move the player when the player is made 
		if (gameProperties.in_game) {
			//we're checking for arrow key and sending this input to 
			//the server.
			//socket.emit('input_fired', directionData);
			//if (cursors.left.isDown) {
			//	console.log('left');
			//} else if (cursors.right.isDown) {
			//	console.log('right');
			//} else if (cursors.down.isDown) {
			//	console.log('down');
			//} else if (cursors.up.isDown) {
			//	console.log('up');
			//}
		}
	}
};

function goLeft() {
	console.log('left');
	//Send up direction to the server 
	directionData = {
		direction_x: -1, direction_y: 0
	}
	socket.emit('input_fired', directionData);
}

function goRight() {
	console.log('right');
	//Send up direction to the server 
	directionData = {
		direction_x: 1, direction_y: 0
	}
	socket.emit('input_fired', directionData);
}

function goDown() {
	console.log('down');
	//Send up direction to the server 
	directionData = {
		direction_x: 0, direction_y: 1
	}
	socket.emit('input_fired', directionData);
}

function goUp() {
	console.log('up');
	//Send up direction to the server 
	directionData = {
		direction_x: 0, direction_y: -1
	}
	socket.emit('input_fired', directionData);
}

var gameBootstrapper = {
    init: function(gameContainerElementId){
		game.state.add('main', main);
		game.state.add('login', login);
		game.state.start('login'); 
    }
};

gameBootstrapper.init("gameDiv");