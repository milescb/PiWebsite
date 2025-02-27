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
    return date.toLocaleString();
}

// Initialize data refresh
function initDataRefresh() {
    // Fetch data immediately on page load
    fetchCurrentData();
    
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
        minute: '2-digit'
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
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Get the last N readings
    const CHART_POINTS = Math.min(readings.length, 50);
    const displayReadings = readings.slice(-CHART_POINTS);
    const pointCount = displayReadings.length;
    
    if (pointCount === 0) return;
    
    // Find min/max values for scaling
    let minTemp = Number.MAX_VALUE;
    let maxTemp = Number.MIN_VALUE;
    let minHumidity = Number.MAX_VALUE;
    let maxHumidity = Number.MIN_VALUE;
    
    displayReadings.forEach(reading => {
        minTemp = Math.min(minTemp, reading.temperature);
        maxTemp = Math.max(maxTemp, reading.temperature);
        minHumidity = Math.min(minHumidity, reading.humidity);
        maxHumidity = Math.max(maxHumidity, reading.humidity);
    });
    
    // Add padding to min/max
    const tempPadding = Math.max(2, (maxTemp - minTemp) * 0.1);
    const humidityPadding = Math.max(5, (maxHumidity - minHumidity) * 0.1);
    
    minTemp -= tempPadding;
    maxTemp += tempPadding;
    minHumidity -= humidityPadding;
    maxHumidity += humidityPadding;
    
    // Draw grid and axes
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 1;
    
    // Draw horizontal grid lines
    for (let i = 0; i <= 4; i++) {
        const y = height - (height * (i / 4));
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
    }
    
    // Draw vertical grid lines
    for (let i = 0; i <= pointCount; i++) {
        const x = (width / pointCount) * i;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
    }
    
    // Draw temperature line
    ctx.strokeStyle = '#FF6B6B';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    displayReadings.forEach((reading, index) => {
        const x = (width / (pointCount - 1)) * index;
        const y = height - ((reading.temperature - minTemp) / (maxTemp - minTemp) * height);
        
        if (index === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });
    
    ctx.stroke();
    
    // Draw humidity line
    ctx.strokeStyle = '#4ECDC4';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    displayReadings.forEach((reading, index) => {
        const x = (width / (pointCount - 1)) * index;
        const y = height - ((reading.humidity - minHumidity) / (maxHumidity - minHumidity) * height);
        
        if (index === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });
    
    ctx.stroke();
    
    // Draw legend
    ctx.font = '12px Arial';
    
    // Temperature legend
    ctx.fillStyle = '#FF6B6B';
    ctx.fillRect(10, 10, 20, 10);
    ctx.fillText('Temperature', 35, 18);
    ctx.fillText(`${minTemp.toFixed(1)}°C - ${maxTemp.toFixed(1)}°C`, 130, 18);
    
    // Humidity legend
    ctx.fillStyle = '#4ECDC4';
    ctx.fillRect(10, 30, 20, 10);
    ctx.fillText('Humidity', 35, 38);
    ctx.fillText(`${minHumidity.toFixed(0)}% - ${maxHumidity.toFixed(0)}%`, 130, 38);
    
    // Time range
    if (pointCount > 1) {
        const firstTime = new Date(displayReadings[0].timestamp);
        const lastTime = new Date(displayReadings[pointCount - 1].timestamp);
        
        ctx.fillStyle = '#666';
        ctx.fillText(formatShortDateTime(firstTime), 10, height - 10);
        ctx.fillText(formatShortDateTime(lastTime), width - 80, height - 10);
    }
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
    fetchHistoricalData();
});