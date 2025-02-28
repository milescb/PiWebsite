// Configuration
const CURRENT_DATA_URL = 'data/current_reading.json';
const HISTORY_DATA_URL = 'data/sensor_data.json';
const UPDATE_INTERVAL = 60000; // Update every 60 seconds

// DOM elements
const temperatureElement = document.getElementById('temperature-value');
const humidityElement = document.getElementById('humidity-value');
const lastUpdatedElement = document.getElementById('last-updated');

// Function to fetch current sensor data
async function fetchCurrentData() {
    try {
        const response = await fetch(CURRENT_DATA_URL);
        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.status}`);
        }
        
        const data = await response.json();
        displayCurrentData(data);
    } catch (error) {
        console.error('Error fetching current data:', error);
        displayError();
    }
}

// Function to display current data
function displayCurrentData(data) {
    if (data) {
        temperatureElement.textContent = data.temperature;
        humidityElement.textContent = data.humidity;
        
        // Format and display timestamp
        const timestamp = new Date(data.timestamp);
        lastUpdatedElement.textContent = `Last updated: ${formatDateTime(timestamp)}`;
    }
}

// Function to display error state
function displayError() {
    temperatureElement.textContent = 'Err';
    humidityElement.textContent = 'Err';
    lastUpdatedElement.textContent = 'Unable to fetch sensor data';
}

// Function to format date and time
function formatDateTime(date) {
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  }

// Initialize data refresh
function initDataRefresh() {
    // Fetch data immediately on page load
    fetchCurrentData();
    fetchHistoricalData();
    
    // Set up periodic refresh
    setInterval(fetchCurrentData, UPDATE_INTERVAL);
}

// For plotting historical data:

// Function for shorter date/time format for chart
function formatShortDateTime(date) {
    return date.toLocaleString(undefined, {
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
}

// Function to ensure the canvas is properly sized for high-DPI displays
function setupCanvas() {
    const canvas = document.getElementById('history-chart');
    if (!canvas) return;
    
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
}

// Function to draw history chart
function drawHistoryChart(canvas, readings) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const padding = 50; // Increased space for labels
    
    ctx.clearRect(0, 0, width, height);
    
    const CHART_POINTS = Math.min(readings.length, 288);
    const displayReadings = readings.slice(-CHART_POINTS);
    const pointCount = displayReadings.length;
    
    if (pointCount === 0) return;
    
    let minTemp = 50, maxTemp = 95, minHumidity = 20, maxHumidity = 100;
    
    // Draw grid lines and labels
    ctx.strokeStyle = '#DDD';
    ctx.lineWidth = 1;
    ctx.font = '12px Arial';
    ctx.fillStyle = '#666';
    
    // Y-axis temperature (left)
    ctx.save();
    ctx.translate(20, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Temperature (°F)', 0, 0);
    ctx.restore();
    
    for (let i = 0; i <= 5; i++) {
        const y = height - padding - (i / 5) * (height - 2 * padding);
        const tempValue = minTemp + (i / 5) * (maxTemp - minTemp);
        ctx.fillText(`${tempValue.toFixed(0)}°F`, 30, y + 4);
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(width - padding, y);
        ctx.stroke();
    }
    
    // Y-axis humidity (right)
    ctx.save();
    ctx.translate(width - 10, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Humidity (%)', 0, 0);
    ctx.restore();
    
    for (let i = 0; i <= 5; i++) {
        const y = height - padding - (i / 5) * (height - 2 * padding);
        const humidityValue = minHumidity + (i / 5) * (maxHumidity - minHumidity);
        ctx.fillText(`${humidityValue.toFixed(0)}%`, width - 45, y + 4);
    }
    
    // X-axis time
    ctx.textAlign = 'center';
    for (let i = 0; i <= 5; i++) {
        const index = Math.floor((i / 5) * (pointCount - 1));
        const x = padding + (i / 5) * (width - 2 * padding);
        ctx.fillText(formatShortDateTime(new Date(displayReadings[index].timestamp)), x, height - 5);
    }
    
    // Draw temperature line
    ctx.strokeStyle = '#FF6B6B';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    displayReadings.forEach((reading, index) => {
        const x = padding + (index / (pointCount - 1)) * (width - 2 * padding);
        const y = height - padding - ((reading.temperature - minTemp) / (maxTemp - minTemp) * (height - 2 * padding));
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });
    ctx.stroke();
    
    // Draw humidity line
    ctx.strokeStyle = '#4ECDC4';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    displayReadings.forEach((reading, index) => {
        const x = padding + (index / (pointCount - 1)) * (width - 2 * padding);
        const y = height - padding - ((reading.humidity - minHumidity) / (maxHumidity - minHumidity) * (height - 2 * padding));
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });
    ctx.stroke();
}




// Function to fetch historical sensor data
async function fetchHistoricalData() {
    try {
        const canvas = document.getElementById('history-chart');
        if (!canvas) {
            console.error('History chart element not found in DOM');
            return;
        }
        
        const response = await fetch(HISTORY_DATA_URL);
        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.status}`);
        }
        
        const data = await response.json();
        if (data && data.readings && data.readings.length > 0) {
            drawHistoryChart(canvas, data.readings);
        } else {
            console.warn('No historical data available');
        }
    } catch (error) {
        console.error('Error fetching historical data:', error);
    }
}

// Start the application when DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    initDataRefresh();
});