# CollabCode

A collaborative, real-time, online coding environment for developers.



## Features

- Feature rich code editor
  - The CollabCode code editor supports 7+ different languages, and comes with syntax highlighting and auto-complete.
- In browser compiler
  - Compile or run your code in the browser using the high performance CollabCode compiler.
- Video and audio chat
  - Chat with your fellow collaborators using the inbuilt video and audio chat.



## Try it!

Try out CollabCode [here](https://collab-code-app.herokuapp.com/).



## Glimpse

![](https://raw.githubusercontent.com/Swanand01/CollabCode/master/public/glimpse.png)



## Tech

**Server:** NodeJS, ExpressJS, SocketIO.

**Client:** HTML, CSS, JS, ejs.

**CollabCode Editor**: [Codemirror](https://codemirror.net/) and [Firepad](https://firepad.io/).

**CollabCode Compiler**: [Piston](https://github.com/engineer-man/piston) API.

**Video and audio chat**: [Agora](https://www.agora.io/en/).



## Run locally

1. Clone the repository

   `https://github.com/Swanand01/CollabCode.git`

2. Install dependencies

   `npm install`

3. Create a Agora project. [Agora Docs](https://docs.agora.io/en/Agora%20Platform/get_appid_token?platform=Web).

4. In `server.js` , set the following constants:

    `const appID = "YOUR_AGORA_APP_ID";`

    `const appCertificate = "YOUR_AGORA_APP_CERTIFICATE";`

5. Create a [Firebase](https://console.firebase.google.com/) project.

6. Create a Realtime database. Please make sure to select the location as US-Central.

7. In `room.js` , set the following constants:

   `const FIREBASE_KEY = 'YOUR_FIREBASE_KEY';`

   `const DB_URL = 'YOUR_FIREBASE_DB_URL';`

   `const AGORA_APP_ID = "YOUR_AGORA_APP_ID";`

8. Run `npm run devStart` .

