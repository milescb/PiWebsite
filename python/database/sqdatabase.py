import sqlite3

def setup_database(db_file):
    """Initialize the SQLite database with the required table."""
    try:
        conn = sqlite3.connect(db_file)
        cursor = conn.cursor()
        
        # Create table for sensor readings
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS sensor_readings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            temperature REAL NOT NULL,
            humidity REAL NOT NULL
        )
        ''')
        
        # Create index on timestamp for faster queries
        cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_timestamp ON sensor_readings(timestamp)
        ''')
        
        conn.commit()
        conn.close()
        print(f"Database initialized at {db_file}")
        return True
    except Exception as e:
        print(f"Database initialization error: {e}")
        return False
    
def save_to_sqlite(reading, db_file):
    """Save reading to SQLite database."""
    try:
        conn = sqlite3.connect(db_file)
        cursor = conn.cursor()
        
        # Insert new reading
        cursor.execute(
            "INSERT INTO sensor_readings (timestamp, temperature, humidity) VALUES (?, ?, ?)",
            (reading["timestamp"], reading["temperature"], reading["humidity"])
        )
        
        # Commit the transaction
        conn.commit()
        
        # Clean up old readings - keep only the most recent ~300 (about a day of data)
        cursor.execute("DELETE FROM sensor_readings WHERE id NOT IN (SELECT id FROM sensor_readings ORDER BY timestamp DESC LIMIT 300)")
        conn.commit()
        conn.close()
        
        return True
    except Exception as e:
        print(f"Error saving data to SQLite: {e}")
        return False