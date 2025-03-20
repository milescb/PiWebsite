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

```
cd python
# subscribe to MQTT messages
python subscribe.py
```
and run the API in the background
```
gunicorn --bind 0.0.0.0:5000 --worker-class gevent sqlite_api:app
```
