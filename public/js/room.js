let editor = CodeMirror.fromTextArea(document.querySelector("#firepad"), {
	mode: "python",
	theme: "dracula",
	lineNumbers: true,
	extraKeys: {
		"Ctrl-Space": "autocomplete"
	},
})
editor.on("keyup", function (cm, event) {
	if (!cm.state.completionActive &&   /*Enables keyboard navigation in autocomplete list*/
		event.keyCode > 64 && event.keyCode < 91) {// only when a letter key is pressed
		CodeMirror.commands.autocomplete(cm, null, { completeSingle: false });
	}
});

function init() {
	// Initialize the Firebase SDK.
	firebase.initializeApp({
		apiKey: 'AIzaSyDD-SKMBbTcTtvQ1XyzWNKMPxpNrpATZMM',
		databaseURL: 'https://collabcode-21b1b-default-rtdb.firebaseio.com/'
	});

	// Get Firebase Database reference.
	let firepadRef = firebase.database().ref().child(ROOM_ID);

	// Create Firepad (with rich text toolbar and shortcuts enabled).
	let firepad = Firepad.fromCodeMirror(firepadRef, editor, {
		defaultText: ''
	});
}

init();

const socket = io("/");

const APP_ID = "8b8b3f7547914a1ca9f8b586adc338e3";
const CHANNEL = window.location.pathname.replace("/", "");

let TOKEN;
let UID;

const client = AgoraRTC.createClient({
	mode: "rtc",
	codec: "vp8"
});

AgoraRTC.setLogLevel(4)

let audioTrack;
let videoTrack;
let remoteUsers = {};

let runtimes = {};


async function fetchCred() {
	let response = await fetch(`/getToken/${CHANNEL}`);
	let data = await response.json();

	TOKEN = data.token;
	UID = Number(data.uid);
}

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

	document.getElementById('video-grid').insertAdjacentHTML('beforeend', player);
	videoTrack.play(`user-${UID}`);


	await delay(1);
	await client.publish([audioTrack, videoTrack]);
}

async function handleUserJoined(user, mediaType) {
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


socket.on('user-connected', async userId => {
	console.log("New user connected: " + userId);
})

const muteAudioBtn = document.getElementById("mute_audio");
const muteVideoBtn = document.getElementById("mute_video");

muteAudioBtn.addEventListener("click", async () => {
	if (muteAudioBtn.innerHTML === "mic_off") {
		muteAudioBtn.innerHTML = "mic";
		muteAudioBtn.style.backgroundColor = 'white';
		muteAudioBtn.style.color = 'black';
	}
	else {
		muteAudioBtn.innerHTML = "mic_off";
		muteAudioBtn.style.backgroundColor = 'red';
		muteAudioBtn.style.color = 'white';
	}

	// Check if audio track exists
	if (audioTrack.muted) {
		await audioTrack.setMuted(false);
	} else {
		await audioTrack.setMuted(true);
	}
})

muteVideoBtn.addEventListener("click", async () => {
	if (videoTrack.enabled) {
		muteVideoBtn.innerHTML = "videocam_off";
		muteVideoBtn.style.backgroundColor = 'red';
		muteVideoBtn.style.color = 'white';
		await videoTrack.setEnabled(false);
	} else {
		muteVideoBtn.innerHTML = "videocam";
		muteVideoBtn.style.backgroundColor = 'white';
		muteVideoBtn.style.color = 'black';
		await videoTrack.setEnabled(true);
	}
})


const outputDiv = document.getElementById("output");
const languageDropdown = document.getElementById("language-dropdown");
const inputDiv = document.getElementById("input");
const runCodeBtn = document.getElementById("run-code-btn");

socket.on("code-output", output => {
	outputDiv.innerHTML = output;
});

function runCode() {
	let code = editor.getValue();
	let language = languageDropdown.value;
	let input = inputDiv.value;

	if (code) {
		var myHeaders = new Headers();
		myHeaders.append("Content-Type", "application/json");

		var raw = JSON.stringify({
			"language": language,
			"version": runtimes[language],
			"files": [
				{
					"content": `${code}`
				}
			],
			"stdin": input,
			"compile_timeout": 10000,
			"run_timeout": 3000,
			"compile_memory_limit": -1,
			"run_memory_limit": -1
		});

		var requestOptions = {
			method: 'POST',
			headers: myHeaders,
			body: raw,
			redirect: 'follow'
		};

		fetch("https://emkc.org/api/v2/piston/execute", requestOptions)
			.then(response => response.text())
			.then(result => {
				let output = JSON.parse(result).run.output;
				outputDiv.innerHTML = output;
				socket.emit("code-output", output);
			})
			.catch(error => console.log('error', error));
	}
}
runCodeBtn.addEventListener("click", runCode);
languageDropdown.addEventListener("change", () => {
	socket.emit("language-change", languageDropdown.value);
	changeEditorMode(languageDropdown.value);
})
socket.on("language-change", language => {
	languageDropdown.value = language;
	changeEditorMode(language);
});

window.onload = async function () {
	let runtimeRes = await getRuntimes();
	runtimeRes.forEach(element => {
		runtimes[element.language] = element.version;
	});
};

async function getRuntimes() {
	var myHeaders = new Headers();

	var requestOptions = {
		method: 'GET',
		headers: myHeaders,
		redirect: 'follow'
	};

	let response = await fetch("https://emkc.org/api/v2/piston/runtimes", requestOptions);

	response = await response.text();
	return JSON.parse(response);
}

function changeEditorMode(language) {
	if (language === "python" || language === "javascript") {
		editor.setOption("mode", language);
	}
	else if (language === "java") {
		editor.setOption("mode", "text/x-java");
	}
	else if (language === "c") {
		editor.setOption("mode", "text/x-csrc");
	}
	else if (language === "c++") {
		editor.setOption("mode", "text/x-c++src");
	}
	else if (language === "csharp") {
		editor.setOption("mode", "text/x-csharp");
	}
	else if (language === "go") {
		editor.setOption("mode", "text/x-go");
	}
}

function delay(n) {
	return new Promise(function (resolve) {
		setTimeout(resolve, n * 1000);
	});
}