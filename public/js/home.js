let startBtn = document.getElementById("start-btn");

startBtn.addEventListener("click", async () => {
	let room = uuidv4();
	let response = await fetch(`/getToken/${room}`);
	let data = await response.json();

	let UID = data.uid;
	let token = data.token;

	sessionStorage.setItem("UID", UID);
	sessionStorage.setItem("token", token);

	window.open(`/${room}`, "_self");
})
