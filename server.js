const appID = "YOUR_AGORA_APP_ID";
const appCertificate = "YOUR_AGORA_APP_CERTIFICATE";

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
	})
})

server.listen(3000);

function getRandInteger(min, max) {
	return Math.floor(Math.random() * (max - min)) + min;
}