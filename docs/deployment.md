# Deployment Guide

Stack: React (Nginx) + Express + Hocuspocus + Piston, all on a single Ubuntu VPS via Docker Compose.

## Prerequisites

- A VPS running Ubuntu (tested on Ubuntu 22.04+)
- A domain name with an A record pointing to your VPS IP
- Agora credentials (for video) — optional, video is disabled without them
- A tldraw license key — optional, removes the tldraw watermark

## 1. DNS

Add an A record on your domain registrar:

- **Host**: `@` (or your domain)
- **Value**: your VPS IP address

Wait for DNS to propagate before proceeding to the SSL step (usually a few minutes).

## 2. Server setup

SSH into your VPS and install dependencies:

```bash
sudo apt update && sudo apt install -y docker.io docker-compose-v2 certbot git
sudo systemctl enable --now docker
sudo usermod -aG docker $USER
```

## 3. Clone the repo

```bash
sudo git clone https://github.com/Swanand01/CollabCode /opt/collabcode
cd /opt/collabcode
```

## 4. Get SSL certificate

```bash
sudo certbot certonly --standalone -d your-domain.com
```

Certs are saved to `/etc/letsencrypt/live/your-domain.com/`.

## 5. Update nginx config

Edit `apps/client/nginx.conf` and replace `collabcode.app` with your domain:

```bash
sudo nano apps/client/nginx.conf
```

Change:
```nginx
server_name collabcode.app;
ssl_certificate /etc/letsencrypt/live/collabcode.app/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/collabcode.app/privkey.pem;
```

To:
```nginx
server_name your-domain.com;
ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
```

## 6. Configure environment

Create the root `.env` file:

```bash
sudo nano /opt/collabcode/.env
```

Add your credentials:

```env
AGORA_APP_ID=your_agora_app_id
AGORA_APP_CERTIFICATE=your_agora_app_certificate
VITE_TLDRAW_LICENSE_KEY=your_tldraw_license_key
```

All three are optional — omit any you don't have. Video requires Agora; the tldraw watermark is removed with a license key.

## 7. Start everything

```bash
sudo docker compose up -d --build
```

## 8. Install Piston language runtimes

Run once after containers are up:

```bash
sudo docker exec collabcode_piston node -e "
const http = require('http');
const packages = [
  {language:'javascript',version:'18.15.0'},
  {language:'typescript',version:'5.0.3'},
  {language:'python',version:'3.10.0'},
  {language:'go',version:'1.16.2'}
];
packages.forEach(pkg => {
  const data = JSON.stringify(pkg);
  const req = http.request({host:'localhost',port:2000,path:'/api/v2/packages',method:'POST',headers:{'Content-Type':'application/json','Content-Length':data.length}}, res => {
    let body=''; res.on('data',d=>body+=d); res.on('end',()=>console.log(body));
  });
  req.write(data); req.end();
});
"
```

To check available versions if a package fails:

```bash
sudo docker exec collabcode_piston node -e "
const http = require('http');
http.get('http://localhost:2000/api/v2/packages', res => {
  let body=''; res.on('data',d=>body+=d); res.on('end',()=>console.log(body));
});
"
```

## 9. Verify

- `https://your-domain.com` loads the app
- Create a room and open in two tabs — editor sync works
- Draw on the whiteboard in both tabs — board sync works
- Run code — output appears

## Updating

After pushing new code, pull and rebuild on the VPS:

```bash
cd /opt/collabcode
sudo git pull
sudo docker compose up -d --build
```

## SSL renewal

Certbot installs a systemd timer that auto-renews certs. Since renewal uses port 80, Nginx needs to be stopped briefly. Configure this with:

```bash
sudo systemctl edit certbot.service
```

Add:

```ini
[Service]
ExecStartPre=docker compose -f /opt/collabcode/docker-compose.yml stop nginx
ExecStartPost=docker compose -f /opt/collabcode/docker-compose.yml start nginx
```

## Useful commands

```bash
# View logs
sudo docker compose logs -f

# View logs for a specific service
sudo docker compose logs -f server

# Restart a single service
sudo docker compose restart server

# Check running containers
sudo docker compose ps

# Check installed Piston runtimes
sudo docker exec collabcode_piston node -e "
const http = require('http');
http.get('http://localhost:2000/api/v2/runtimes', res => {
  let body=''; res.on('data',d=>body+=d); res.on('end',()=>console.log(body));
});
"
```
