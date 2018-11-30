var express = require('express');
//require p2 physics library in the server.
var p2 = require('p2'); 
//get the node-uuid package for creating unique id
var unique = require('node-uuid')

var app = express();
var serv = require('http').Server(app);

app.get('/',function(req, res) {
	res.sendFile(__dirname + '/client/index.html');
});
app.use('/client',express.static(__dirname + '/client'));

serv.listen(process.env.PORT || 2000);
console.log("Server started.");

var player_list = [];

//needed for repeating updates 
var startTime = (new Date).getTime();
var lastTime;
var timeStep= 1/70; 

var world = new p2.World({
	gravity : [0,0]
});

//create a game class to store basic game data
var game_setup = function() {
	this.canvas_width = 4000;
	this.canvas_height = 4000;
}

//create a new game instance
var game_instace = new game_setup()

var Territory = function() {
	this.territory = [];
}

//a player class in the server
var Player = function (startX, startY, start_direction_x, start_direction_y) {
	this.id;
	this.x = startX;
	this.y = startY;
	this.direction_x = start_direction_x;
	this.direction_y = start_direction_y;
	this.territory = new Territory();
	this.speed = 1;
	//We need to intilaize with true.
	this.sendData = true;
	this.dead = false;
}

//call movement handler 60fps, calclulate 
setInterval(heartbeat, 1000/60);

function heartbeat() {
	movement_handler();
}

function movement_handler() {
	var currentTime = (new Date).getTime();
	tiemElapsed = currentTime - startTime;
	var dt = lastTime ? (tiemElapsed - lastTime) / 1000 : 0;
	dt = Math.min(1 / 10, dt);
	world.step(timeStep);
}

function onNewPlayer(data) {
	//what to do when have new player
	var new_player = new Player(data.x, data.y, data.direction_x, data.direction_y);
	new_player.id = this.id;
	new_player.username = data.username;
	
	this.emit('create_player', {
		id: new_player.id, x: new_player.x, y: new_player.y, 
		start_direction_x: this.direction_x, start_direction_y: this.direction_y, start_territory: new_player.territory,
		username: new_player.username
	});

	playerBody = new p2.Body ({
		mass: 0,
		position: [new_player.x,new_player.y],
		fixedRotation: true
	});

	//add player body
	new_player.playerBody = playerBody;
	world.addBody(new_player.playerBody);

	//tell this new player about existing players
	for (var i = 0; i < player_list.length; i++) {
		existing_player = player_list[i];
		player_info = {
			x: existing_player.x,
			y: existing_player.y,
			territory: existing_player.territory,
			id: existing_player.id,
			direction_x: existing_player.direction_x,
			direction_y: existing_player.direction_y,
			username: existing_player.username
		};
		this.emit('new_enemyPlayer', player_list);
	}

	//tell every body about this new player
	this.broadcast.emit('new_enemyPlayer', {
		id: new_player.id, x: new_player.x, y: new_player.y, 
		direction_x: new_player.direction_x, direction_y: new_player.direction_y, territory: new_player.territory,
		username: new_player.username
	});

	//add player to the list
	player_list.push(new_player);
}

function onInputFired(data) {
	//what to do when input received
	player_to_move = find_playerid(this.id);
	player_to_move.direction_x = data.direction_x;
	player_to_move.direction_y = data.direction_y;
	
}

function onCollision(data) {
	//decide who to kill
	playerKilled(player);
}

function sortPlayerListByScore() {
	//sort player according to their score
}

function playerKilled(player) {
	//find the player and remove it
	var removePlayer = find_playerid(player.id);

	if(removePlayer) {
		player_list.splice(player_list.indexOf(removePlayer), 1);
	}

	player.dead = true;
}

function getRndInteger(min, max) {
	return Math.floor(Math.random() * (max - min + 1) ) + min;
}

function onEntername(data) {
	this.emit('join_game', {username: data.username, id: this.id});
}

function onClientDisconnect() {
	//what to do when someone disconnect
	console.log('disconnect');
}

function find_playerid(id) {
	//find player according to id 
	for (var i = 0; i < player_list.length; i++) {
		if (player_list[i].id == id) {
			return player_list[i];
		}
	}
	return false
}

var io = require('socket.io')(serv, {});

io.sockets.on('connection', function(socket){
	console.log("socket connected");

	//when the player enters their name
	socket.on('enter_name', onEntername); 

	//when the player logs in
	socket.on('logged_in', function(data){
		this.emit('enter_game', {username: data.username});
	});

	//listen for disconnection
	socket.on('disconnect', onClientDisconnect);

	//listen for new player
	socket.on('new_player', onNewPlayer);

	//listen for new player inputs
	socket.on('input_fired', onInputFired);

	//listen for collision
	socket.on('player_collision', onCollision);
});