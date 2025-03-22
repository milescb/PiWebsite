const SENSOR_HISTORY_API_URL = '../api/sensor_data/history';
const UPDATE_INTERVAL = 60000;
const PLANTS = [
    {
        id: 'spotted_begonia',
        name: 'Spotted Begonia',
        dataUrl: '../data/json_data/moisture_spotted_begonia.json',
        storageKey: 'lastWatered_begonia'
    },
    {
        id: 'snake_plant',
        name: 'Snake Plant',
        dataUrl: '../data/json_data/moisture_snake_plant.json',
        storageKey: 'lastWatered_snake_plant'
    }
];

// formate date as YYYY-MM-DD HH:MM:SS
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

// format date as MM/DD, HH:MM
function formatShortDateTime(date) {
    return date.toLocaleString(undefined, {
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
}

async function fetchSensorData(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Error fetching data from ${url}:`, error);
        return null;
    }
}

async function fetchPlantData(plant) {
    try {
        const data = await fetchSensorData(plant.dataUrl);
        if (data && data.moisture !== undefined) {
            document.getElementById(plant.id).textContent = data.moisture.toFixed(1);
            document.getElementById(`last-updated-${plant.id}`).textContent = 
                `Last updated: ${formatShortDateTime(new Date(data.timestamp))}`;
        } else {
            document.getElementById(plant.id).textContent = 'Err';
        }
    } catch (error) {
        console.error(`Error fetching data for ${plant.name}:`, error);
        document.getElementById(plant.id).textContent = 'Err';
    }
}

function handleWatering(plant) {
    const now = new Date();
    localStorage.setItem(plant.storageKey, now.toISOString());
    displayLastWatered(plant);
    
    // Refresh the chart to show the new watering marker
    const plotContainer = document.getElementById(`plot-${plant.id}`);
    if (plotContainer) {
        fetchMoistureHistory(plant.id).then(data => {
            if (data) {
                data.plantId = plant.id;
                drawMoistureChart(plotContainer, data, plant.name);
            }
        });
    }
}

function displayLastWatered(plant) {
    const lastWateredElement = document.getElementById(`last-watered-${plant.id}`);
    const lastWateredTime = localStorage.getItem(plant.storageKey);

    const date = new Date(lastWateredTime);
    // Create a wrapper div to hold the two lines
    lastWateredElement.innerHTML = '';
    
    // Create label line
    const labelElement = document.createElement('div');
    labelElement.textContent = 'Last Watered:';
    
    // Create date line
    const dateElement = document.createElement('div');
    
    if (lastWateredTime) {
        dateElement.textContent = formatShortDateTime(date);
    } else {
        dateElement.textContent = 'Never';
    }
    // Append both to the container
    lastWateredElement.appendChild(labelElement);
    lastWateredElement.appendChild(dateElement);
}

async function fetchMoistureHistory(plantId) {
    try {
        // Always request 7-day data
        const response = await fetch(`${SENSOR_HISTORY_API_URL}?sensor_type=moisture&location=${plantId}&range=7d`);
        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.status}`);
        }
        const data = await response.json();
        return processHistoricalData(data, plantId);
    } catch (error) {
        console.error(`Error fetching historical data for ${plantId}:`, error);
        return null;
    }
}

function processHistoricalData(data, plantId) {
    const dataByTimestamp = new Map();

    data.forEach(record => {
        const timestamp = record.timestamp;
        if (!dataByTimestamp.has(timestamp)) {
            dataByTimestamp.set(timestamp, {
                moisturePlant: null
            });
        }

        const entry = dataByTimestamp.get(timestamp);
        entry.moisturePlant = record.value;
    });

    const sortedTimestamps = Array.from(dataByTimestamp.keys()).sort();

    const processedData = {
        timestamps: sortedTimestamps,
        moisture: [],
        plantId: plantId
    };

    sortedTimestamps.forEach(timestamp => {
        const entry = dataByTimestamp.get(timestamp);
        processedData.moisture.push(entry.moisturePlant);
    });

    return processedData;
}

function drawMoistureChart(container, data, plantName) {
    // Clear any existing content
    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }
    
    if (!data || !data.timestamps || data.timestamps.length === 0) {
        // Show no data message
        const noDataDiv = document.createElement('div');
        noDataDiv.style.display = 'flex';
        noDataDiv.style.justifyContent = 'center';
        noDataDiv.style.alignItems = 'center';
        noDataDiv.style.height = '100%';
        noDataDiv.style.color = '#666';
        noDataDiv.textContent = 'No moisture data available';
        container.appendChild(noDataDiv);
        return;
    }
    
    // Process data for chart
    const timestamps = data.timestamps.map(ts => new Date(ts));
    const moisture = data.moisture;
    
    // Filter out null values for min/max calculation
    const validMoisture = moisture.filter(v => v !== null);
    if (validMoisture.length === 0) {
        const noDataDiv = document.createElement('div');
        noDataDiv.style.display = 'flex';
        noDataDiv.style.justifyContent = 'center';
        noDataDiv.style.alignItems = 'center';
        noDataDiv.style.height = '100%';
        noDataDiv.style.color = '#666';
        noDataDiv.textContent = 'No valid moisture data';
        container.appendChild(noDataDiv);
        return;
    }
    
    // Find min and max values for scaling
    let minMoisture = Math.min(...validMoisture);
    let maxMoisture = Math.max(...validMoisture);
    
    // Add padding to values
    const moisturePadding = Math.max(5, (maxMoisture - minMoisture) * 0.1);
    minMoisture = Math.max(0, minMoisture - moisturePadding);
    maxMoisture = Math.min(100, maxMoisture + moisturePadding);
    
    // Create main moisture trace
    const moistureTrace = {
        x: timestamps,
        y: moisture,
        type: 'scatter',
        mode: 'lines',
        name: 'Moisture',
        line: {
            color: '#72a178',
            width: 2
        },
        connectgaps: true
    };
    
    // Create layout
    const layout = {
        xaxis: {
            tickformat: '%m/%d',
            hoverformat: '%b %d, %Y %H:%M'
        },
        yaxis: {
            title: 'Moisture (%)',
            range: [minMoisture, maxMoisture]
        },
        margin: {
            l: 60,
            r: 30,
            t: 50,
            b: 50
        },
        shapes: [],
        annotations: []
    };
    
    // Add watering marker if available
    const lastWateredTime = localStorage.getItem(`lastWatered_${data.plantId}`);
    if (lastWateredTime) {
        const waterDate = new Date(lastWateredTime);
        const startDate = timestamps[0];
        const endDate = timestamps[timestamps.length - 1];
        
        // Check if water date is within the chart time range
        if (waterDate >= startDate && waterDate <= endDate) {
            // Add vertical line for watering
            layout.shapes.push({
                type: 'line',
                x0: waterDate,
                y0: 0,
                x1: waterDate,
                y1: 1,
                yref: 'paper',
                line: {
                    color: '#d56097',
                    width: 2,
                    dash: 'dash'
                }
            });
            
            // Add watering annotation
            layout.annotations.push({
                x: waterDate,
                y: 1,
                yref: 'paper',
                text: 'Watered',
                showarrow: false,
                font: {
                    color: '#d56097',
                    size: 12
                },
                yshift: 15
            });
        }
    }
    
    // Define configuration with responsive behavior
    const config = {
        responsive: true,
        displayModeBar: false // Hide the modebar for cleaner look
    };
    
    // Create the plot
    Plotly.newPlot(container, [moistureTrace], layout, config);
}

function initializePlantsData() {
    PLANTS.forEach(plant => {
        // Fetch initial current data
        fetchPlantData(plant);
        
        // Display last watered time from localStorage
        displayLastWatered(plant);
        
        // Add event listener for the Watered! button
        const waterButton = document.querySelector(`#water-btn-${plant.id}`);
        if (waterButton) {
            waterButton.addEventListener('click', () => handleWatering(plant));
        }
        
        // Update canvas elements to divs for Plotly
        const plotCanvas = document.getElementById(`plot-${plant.id}`);
        if (plotCanvas) {
            // If it's still a canvas, replace it with a div
            if (plotCanvas.tagName === 'CANVAS') {
                const parentElement = plotCanvas.parentElement;
                const plotDiv = document.createElement('div');
                plotDiv.id = `plot-${plant.id}`;
                plotDiv.style.width = '100%';
                plotDiv.style.height = '300px'; // Set appropriate height
                parentElement.replaceChild(plotDiv, plotCanvas);
                
                // Fetch and draw historical data on the new div
                fetchMoistureHistory(plant.id).then(data => {
                    if (data) {
                        data.plantId = plant.id;
                        drawMoistureChart(plotDiv, data, plant.name);
                    }
                });
            } else {
                // It's already a div, just use it
                fetchMoistureHistory(plant.id).then(data => {
                    if (data) {
                        data.plantId = plant.id;
                        drawMoistureChart(plotCanvas, data, plant.name);
                    }
                });
            }
        }
    });
    
    // Set up periodic refresh for all plants
    setInterval(() => {
        PLANTS.forEach(plant => {
            // Update current data
            fetchPlantData(plant);
            
            // Update historical chart
            const plotElement = document.getElementById(`plot-${plant.id}`);
            if (plotElement) {
                fetchMoistureHistory(plant.id).then(data => {
                    if (data) {
                        data.plantId = plant.id;
                        drawMoistureChart(plotElement, data, plant.name);
                    }
                });
            }
        });
    }, UPDATE_INTERVAL);
}

document.addEventListener('DOMContentLoaded', initializePlantsData);