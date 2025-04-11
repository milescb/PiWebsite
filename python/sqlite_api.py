from flask import Flask, jsonify, request
import sqlite3
import datetime
import os

app = Flask(__name__)

# Database configuration
DB_FILE = '../data/sensor_data.db'

def dict_factory(cursor, row):
    """Convert database row objects to a dictionary"""
    d = {}
    for idx, col in enumerate(cursor.description):
        d[col[0]] = row[idx]
    return d

@app.route('/sensor_data/history', methods=['GET'])
def get_historical_sensor_data():
    """Get historical sensor data for a specified time range with filtering options"""
    try:
        # Get all query parameters
        time_range = request.args.get('range', '24h')
        sensor_type = request.args.get('sensor_type', 'default')
        location = request.args.get('location', None)

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
        elif time_range == '14d':
            cutoff_time = now - datetime.timedelta(days=14)
        elif time_range == '30d':
            cutoff_time = now - datetime.timedelta(days=30)
        else:
            # Default to 24 hours
            cutoff_time = now - datetime.timedelta(hours=24)

        # Format timestamp for SQLite comparison
        cutoff_timestamp = cutoff_time.strftime('%Y-%m-%d %H:%M:%S')

        # Connect to database and get data
        conn = sqlite3.connect(DB_FILE)
        conn.row_factory = dict_factory
        cursor = conn.cursor()

        # Build the query with parameters
        query_params = [cutoff_timestamp]
        filter_clause = "WHERE timestamp >= ?"

        # Add sensor type filtering
        if sensor_type == 'moisture':
            filter_clause += " AND sensor_type = 'moisture'"
            # If location is specified, add location filter for moisture sensors
            if location:
                filter_clause += " AND location = ?"
                query_params.append(location)
        elif sensor_type != 'all':
            # Default behavior: return only temperature and humidity
            filter_clause += " AND sensor_type IN ('temperature', 'humidity')"

        # downsample the data to avoid overwhelming the chart
        if time_range in ['7d', '30d'] and sensor_type != 'moisture':
            # For longer periods, group by hour
            query = f'''
                SELECT
                    sensor_type,
                    location,
                    strftime('%Y-%m-%d %H:%M:%S', timestamp) as timestamp,
                    AVG(value) as value
                FROM sensor_data
                {filter_clause}
                GROUP BY sensor_type, location, strftime('%Y-%m-%d %H', timestamp)
                ORDER BY timestamp
            '''
        else:
            # For shorter periods, get all data points
            query = f'''
                SELECT sensor_type, location, timestamp, value
                FROM sensor_data
                {filter_clause}
                ORDER BY timestamp
            '''

        cursor.execute(query, query_params)
        data = cursor.fetchall()
        conn.close()

        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=False, host="0.0.0.0", port=5000)
