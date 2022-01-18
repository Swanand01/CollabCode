const APP_ID = "8b8b3f7547914a1ca9f8b586adc338e3";
const CHANNEL = window.location.pathname.replace("/", "");

let TOKEN;
let UID;

async function fetchCred() {
	let response = await fetch(`/getToken/${CHANNEL}`);
	let data = await response.json();
	
	TOKEN = data.token;
	UID = Number(data.uid);
}


const socket = io("/");
const client = AgoraRTC.createClient({
	mode: "rtc",
	codec: "vp8"
});


let audioTrack;
let videoTrack;
let remoteUsers = {};

async function joinAndDisplayLocalStream() {
	client.on('user-published', handleUserJoined);
	client.on('user-left', handleUserLeft);

	await fetchCred();

	await client.join(APP_ID, CHANNEL, TOKEN, UID);

	audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
	videoTrack = await AgoraRTC.createCameraVideoTrack();

	let player = `<div  class="video-container" id="user-container-${UID}">
					<div class="video-player" id="user-${UID}">
				</div>`;

	// <div class="username-wrapper"><span class="user-name">My name</span></div>
	// </div>

	document.getElementById('video-grid').insertAdjacentHTML('beforeend', player);
	videoTrack.play(`user-${UID}`);


	console.log("Publishing stream...");
	await delay(1);
	await client.publish([audioTrack, videoTrack]);
}

async function handleUserJoined(user, mediaType) {
	console.log("RECEIVING USER STREAM...");
	remoteUsers[user.uid] = user;
	await client.subscribe(user, mediaType);

	if (mediaType === "video") {
		let player = document.getElementById(`user-container-${user.uid}`)
		if (player != null) {
			player.remove();
		}

		player = `<div class="video-container" id="user-container-${user.uid}">
						<div class="video-player" id="user-${user.uid}"></div>
				</div>`;

		document.getElementById('video-grid').insertAdjacentHTML('beforeend', player);
		user.videoTrack.play(`user-${user.uid}`);

	}
	if (mediaType === "audio") {
		user.audioTrack.play();
	}
}

async function handleUserLeft(user) {
	delete remoteUsers[user.uid];
	document.getElementById(`user-container-${user.uid}`).remove();
}

socket.on('connect', function () {
	socket.emit("join-room", ROOM_ID, socket.id);
	joinAndDisplayLocalStream();
});

socket.on("user-disconnected", userId => {
})

let applyingChanges;
socket.on("code-change", delta => {
	applyingChanges = true;
	editor.session.doc.applyDelta(delta);
	applyingChanges = false;
})

socket.on('user-connected', async userId => {
	console.log("New user connected: " + userId);
})

let editor = ace.edit("editor");
editor.setTheme("ace/theme/monokai");
editor.session.setMode("ace/mode/javascript");
editor.setFontSize(16)

editor.on('change', delta => {
	if (!applyingChanges) {
		socket.emit("code-change", delta);
	}
})

const muteAudioBtn = document.getElementById("mute_audio");
const muteVideoBtn = document.getElementById("mute_video");

muteAudioBtn.addEventListener("click", async () => {
	if (audioTrack.enabled) {
		await audioTrack.setEnabled(false);
		muteAudioBtn.innerHTML = "mic_off";
		// e.target.style.backgroundColor = '#fff'
	} else {
		await audioTrack.setEnabled(true);
		muteAudioBtn.innerHTML = "mic";
		// e.target.style.backgroundColor = 'rgb(255, 80, 80, 1)'
	}
})

muteVideoBtn.addEventListener("click", async () => {
	if (videoTrack.enabled) {
		await videoTrack.setEnabled(false);
		muteVideoBtn.innerHTML = "videocam_off";
		// e.target.style.backgroundColor = '#fff'
	} else {
		await videoTrack.setEnabled(true);
		muteVideoBtn.innerHTML = "videocam";
		// e.target.style.backgroundColor = 'rgb(255, 80, 80, 1)'
	}
})



function addVideoStream(video, stream) {
	video.srcObject = stream;
	video.addEventListener('loadedmetadata', () => {
		video.play();
	});
	videoGrid.append(video);
}


function delay(n) {
	return new Promise(function (resolve) {
		setTimeout(resolve, n * 1000);
	});
}
