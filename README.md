# Website for Pi Zero 2w

Visit the website created by this repository for instructions on hosting at [rain.crabdance.com](https://rain.crabdance.com/pages/info.html)

## Environment setup for python

```
python -m venv .venv
source .venv/bin/activate
```

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
