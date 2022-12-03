if (process.env.NODE_ENV !== 'production') {
	require('dotenv').config();
}

const appID = process.env.APP_ID
const appCertificate = process.env.APP_CERTIFICATE

const express = require('express')
const app = express()
const server = require("http").Server(app);
const io = require("socket.io")(server);
const { RtcTokenBuilder, RtcRole } = require('agora-access-token');

app.set("view engine", "ejs");
app.use(express.static("public"));

app.get("/", (req, res) => {
	res.render("home", {});
});

app.get("/:room", (req, res) => {
	res.render("room", {
		roomId: req.params.room
	});
});

app.get("/getToken/:channel", (req, res) => {
	const channelName = req.params.channel;
	const uid = getRandInteger(1, 230);
	const role = RtcRole.PUBLISHER;
	const expirationTimeInSeconds = 3600 * 24;
	const currentTimestamp = Math.floor(Date.now() / 1000);
	const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

	const token = RtcTokenBuilder.buildTokenWithUid(appID, appCertificate, channelName, uid, role, privilegeExpiredTs);

	res.json({
		token: token,
		uid: uid
	});
})


io.on("connection", socket => {
	socket.on("join-room", (roomId, userId) => {
		socket.join(roomId);
		socket.broadcast.to(roomId).emit("user-connected", userId);

		socket.on("disconnect", () => {
			socket.broadcast.to(roomId).emit("user-disconnected", userId);
		})

		socket.on("code-change", (delta) => {
			socket.broadcast.to(roomId).emit("code-change", delta);
		})

		socket.on("code-output", (output) => {
			socket.broadcast.to(roomId).emit("code-output", output);
		})

		socket.on("language-change", (language) => {
			socket.broadcast.to(roomId).emit("language-change", language);
		})

		// live board related events
		let clientSet = io.sockets.adapter.rooms.get(roomId)
		let host
		if (clientSet)
			host = [...clientSet][0]

		socket.join(roomId)

		if (host)
			socket.to(host).emit('send-state', socket.id)

		socket.on("send-canvas-state", (user, data, undoStack, redoStack) => {
			socket.to(user).emit("get-canvas-state", data, undoStack, redoStack)
		})

		socket.on("trigger-clear-canvas", roomId => {
			socket.to(roomId).emit('clear-canvas')
		})

		socket.on("send-paint-path", paintObject => {
			socket.to(roomId).emit("paint", paintObject)
		})

		socket.on("undo-triggered", () => {
			socket.to(roomId).emit("undo")
		})

		socket.on("redo-triggered", () => {
			socket.to(roomId).emit("redo")
		})
	})
})

server.listen(3000);

function getRandInteger(min, max) {
	return Math.floor(Math.random() * (max - min)) + min;
}