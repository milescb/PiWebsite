## Overview

Below, I document the deployment of this webpage. The code that hosts this site is located [on github](https://github.com/milescb/PiWebsite) and the whole website is hosted on a Raspberry Pi Zero 2w running [nginx](https://nginx.org/en/). 

Hardware

- Raspberry Pi Zero 2w
- Sensors TBD

Software

- raspbian lite OS (64bit)
- nginx

## Installing the server

I use `nginx` to host the server. To install, first update the pi's software and remove apache2 (downloaded by default with raspbian)

```bash
sudo apt update
sudo apt upgrade
sudo apt remove apache2
```

Then, download `nginx`, start it, and enable so it's always started when booting up the pi

```bash
sudo apt install nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### Obtaining an address and exposing this to the internet

I used [FreeDNS](https://freedns.afraid.org) to obtain a free domain name and subdomain for this website. To get this running, forward the http port (port 80), and the https port (port 443) on your home router. Then, obtain the IP address of your home router, and configure your selected subdomain with FreeDNS. You can then use this free url in the below configuration!

### Configuring ssl

Install `certbot` to deal with obtaining an ssl certificate

```
sudo apt update
sudo apt install certbot python3-certbot-nginx
```

Then, run `certbot`:

```
sudo certbot certonly --standalone -d <YOUR_URL>
```

To configure you website, open the file `/etc/nginx/sites-available/default` and replace the current content with the below code, changing `<YOUR_URL>` to the one selected above and `<WEBSITE_LOCAL_DIR_LOCATION>` to the local location you plan on hosting your site from. 

```
server {
    listen 80;
    listen [::]:80;

    server_name <YOUR_URL>;

    # Redirect HTTP to HTTPS
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;

    server_name <YOUR_URL>;

    ssl_certificate /etc/letsencrypt/live/<YOUR_URL>/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/<YOUR_URL>/privkey.pem;

    root <WEBSITE_LOCAL_DIR_LOCATION>;
    index index.html index.htm;

    location / {
        try_files $uri $uri/ =404;
    }
}
```

Now you have a secure(ish) website! To propagate this with content, download the github repository linked above at `<WEBSITE_LOCAL_DIR_LOCATION>` and edit the enclosed `html`. 

## Interfacing with detectors