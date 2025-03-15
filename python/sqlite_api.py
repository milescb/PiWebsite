from flask import Flask, jsonify, request
import sqlite3
import datetime

app = Flask(__name__)

# Database configuration
DB_FILE = 'data/sensor_data.db'

def dict_factory(cursor, row):
    """Convert database row objects to a dictionary"""
    d = {}
    for idx, col in enumerate(cursor.description):
        d[col[0]] = row[idx]
    return d

@app.route('/sensor_data/history', methods=['GET'])
def get_historical_sensor_data():
    """Get historical sensor data for a specified time range"""
    try:
        time_range = request.args.get('range', '24h')
        
        # Calculate time cutoff based on range parameter
        now = datetime.datetime.now()
        
        if time_range == '1h':
            cutoff_time = now - datetime.timedelta(hours=1)
        elif time_range == '6h':
            cutoff_time = now - datetime.timedelta(hours=6)
        elif time_range == '24h':
            cutoff_time = now - datetime.timedelta(hours=24)
        elif time_range == '7d':
            cutoff_time = now - datetime.timedelta(days=7)
        elif time_range == '30d':
            cutoff_time = now - datetime.timedelta(days=30)
        else:
            # Default to 24 hours
            cutoff_time = now - datetime.timedelta(hours=24)
        
        # Format timestamp for SQLite comparison
        cutoff_timestamp = cutoff_time.isoformat()
        
        # Connect to database and get data
        conn = sqlite3.connect(DB_FILE)
        conn.row_factory = dict_factory
        cursor = conn.cursor()
        
        # For longer time periods, we might want to downsample the data to avoid overwhelming the chart
        if time_range in ['7d', '30d']:
            # For longer periods, group by hour
            cursor.execute('''
                SELECT 
                    sensor_type,
                    location,
                    strftime('%Y-%m-%dT%H:00:00', timestamp) as timestamp,
                    AVG(value) as value
                FROM sensor_data
                WHERE timestamp >= ?
                GROUP BY sensor_type, location, strftime('%Y-%m-%dT%H:00:00', timestamp)
                ORDER BY timestamp
            ''', (cutoff_timestamp,))
        else:
            # For shorter periods, get all data points
            cursor.execute('''
                SELECT sensor_type, location, timestamp, value
                FROM sensor_data
                WHERE timestamp >= ?
                ORDER BY timestamp
            ''', (cutoff_timestamp,))
        
        data = cursor.fetchall()
        conn.close()
        
        return jsonify(data)
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':    
    app.run(debug=False, host="0.0.0.0", port=5000)
