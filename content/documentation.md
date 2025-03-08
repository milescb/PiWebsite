## Overview

Below, I document the deployment of this webpage. The code that hosts this site is located [on github](https://github.com/milescb/PiWebsite) and the whole website is hosted on a Raspberry Pi Zero 2w running [nginx](https://nginx.org/en/). 

Hardware

- Raspberry Pi Zero 2w
- Sensor: DHT22 for temperature and humidity measurement

Software

- raspbian lite OS (64bit)
- nginx

## Setup pi

Here are a few commands I run to get all the software I need on raspbian. First, make sure everything is up to date:

```bash
sudo apt update
sudo apt upgrade
```

Then, make ssh keys and configure git to use them:

```bash
sudo apt install git-all
ssh-keygen -t ed25519 -C “youremail@domain.com”
```

I like to use vim when not using vscode. Raspbian comes with a minimal version of vim, so we install the whole thing as well as [vimplug](https://github.com/junegunn/vim-plug): 

```bash
sudo apt install vim
curl -fLo ~/.vim/autoload/plug.vim --create-dirs \
    https://raw.githubusercontent.com/junegunn/vim-plug/master/plug.vim
```

Finally, we install python dev tools, tmux, and tree:

```bash
sudo apt install python-dev-is-python3
sudo apt install tmux
sudo apt install tree
```

## Host Website

I use `nginx` to host the server. To use this, we first need to configure a few settings. 

### Configuring a Domain

I used [FreeDNS](https://freedns.afraid.org) to obtain a free domain name and subdomain for this website. To get this running, forward the http port (port 80), and the https port (port 443) on your home router. Then, obtain the IP address of your home router, and configure your selected subdomain with FreeDNS. You can then use this free url in the below configuration!

### Configuring ssl

Install `certbot` to deal with obtaining an ssl certificate

```bash
sudo apt update
sudo apt install certbot python3-certbot-nginx
```

Then, run `certbot`:

```bash
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

### Install Server

To install, first update the pi's software and remove apache2 (downloaded by default with raspbian)

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

Now you have a secure(ish) website! To propagate this with content, download the github repository linked above at `<WEBSITE_LOCAL_DIR_LOCATION>` and edit the enclosed `html`. 

## Interfacing with detectors

Once you have your dht22 sensor, connect it to the GPIO pins of the pi

- Connect the positive lead to pin 1 (3.3V power)
- Connect the negative lead to pin 5 (ground)
- Connect the remaining data lead to pin 7 (GPIO 4)

You can then interface with the detector using the `adafruit_dht` python library as follows:

```python
import adafruit_dht 
import board

DHT_DEVICE = adafruit_dht.DHT22(board.D4)

try:
    temperature = DHT_DEVICE.temperature
    humidity = DHT_DEVICE.humidity
    print(f"Temp: {temperature:.1f}°C  Humidity: {humidity:.1f}%")
except RuntimeError as e:
    print(f"Reading from DHT22 failed: {e}")
```

Now you can read off the local temperature and humidity!