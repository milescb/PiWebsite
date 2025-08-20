# Home Environement and Plant Monitor

This repository contains the code used to host [rain.crabdance.com](https://rain.crabdance.com/), a home environment and plant moisture monitoring system. The following contains instructions on how to get your own website running!

## Website configuration

## Running python services for website support

To create the `python` environment, run

```
python -m venv .venv
source .venv/bin/activate
```
and
```
pip install -r requirements.txt
```

Then, open a `tmux` session and run the python scripts, one in each tmux window:

To subscribe to MQTT messages 
```
cd python
python subscribe.py
```
and run the API to query the database in the background
```
gunicorn --bind 0.0.0.0:5000 --worker-class gevent --max-requests 1000 --timeout 30 sqlite_api:app
```

### Running Processes with `systemd`

For a more permanent solution, run the two python services in the background. To do this, setup two configuration scripts:

```
# /etc/systemd/system/piwebsite-api.service
[Unit]
Description=Gunicorn server for sqlite_api Flask app
After=network.target

[Service]
User=milescb
WorkingDirectory=/home/milescb/PiWebsite/python
ExecStart=/home/milescb/PiWebsite/.venv/bin/gunicorn --bind 0.0.0.0:5000 --worker-class gevent --max-requests 1000 --timeout 30 sqlite_api:app
Restart=always
Environment="PATH=/home/milescb/PiWebsite/.venv/bin"

[Install]
WantedBy=multi-user.target
```

and

```
# /etc/systemd/system/mqtt-subscriber.service
[Unit]
Description=MQTT Subscriber for sensor data
After=network.target

[Service]
User=milescb
WorkingDirectory=/home/milescb/PiWebsite
ExecStart=/home/milescb/PiWebsite/.venv/bin/python python/subscribe.py
Restart=always
Environment="PATH=/home/milescb/PiWebsite/.venv/bin"

[Install]
WantedBy=multi-user.target
```

Then, enable and start the processes:

```bash
sudo systemctl daemon-reexec
sudo systemctl daemon-reload
sudo systemctl enable piwebsite-api.service
sudo systemctl enable mqtt-subscriber.service

# start the processes
sudo systemctl start piwebsite-api
sudo systemctl start mqtt-subscriber
```

You can check everything is running with

```
journalctl -u piwebsite-api -f
journalctl -u mqtt-subscriber -f
```

## Setting up sensors







