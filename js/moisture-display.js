// path to files and constants
const UPDATE_INTERVAL = 60000;
const PLANTS = [
    {
        id: 'begonia',
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

// Function for shorter date/time format
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

// Fetch data for a specific plant
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

// Function to handle watering button click for a specific plant
function handleWatering(plant) {
    const now = new Date();
    // Store in localStorage
    localStorage.setItem(plant.storageKey, now.toISOString());
    // Update the display
    displayLastWatered(plant);
}

// Function to display the last watered time for a specific plant
function displayLastWatered(plant) {
    const lastWateredElement = document.getElementById(`last-watered-${plant.id}`);
    const lastWateredTime = localStorage.getItem(plant.storageKey);
    
    if (lastWateredTime) {
        const date = new Date(lastWateredTime);
        // Create a wrapper div to hold the two lines
        lastWateredElement.innerHTML = '';
        
        // Create label line
        const labelElement = document.createElement('div');
        labelElement.textContent = 'Last Watered:';
        
        // Create date line
        const dateElement = document.createElement('div');
        dateElement.textContent = formatShortDateTime(date);
        
        // Append both to the container
        lastWateredElement.appendChild(labelElement);
        lastWateredElement.appendChild(dateElement);
    } else {
        // Same approach for "Never" case
        lastWateredElement.innerHTML = '';
        
        const labelElement = document.createElement('div');
        labelElement.textContent = 'Last Watered:';
        
        const dateElement = document.createElement('div');
        dateElement.textContent = 'Never';
        
        lastWateredElement.appendChild(labelElement);
        lastWateredElement.appendChild(dateElement);
    }
  }

// Initialize the UI for all plants
function initializePlants() {
    PLANTS.forEach(plant => {
        // Fetch initial data
        fetchPlantData(plant);
        
        // Display last watered time from localStorage
        displayLastWatered(plant);
        
        // Add event listener for the Watered! button
        const waterButton = document.querySelector(`#water-btn-${plant.id}`);
        if (waterButton) {
            waterButton.addEventListener('click', () => handleWatering(plant));
        }
    });
    
    // Set up periodic refresh for all plants
    setInterval(() => {
        PLANTS.forEach(plant => fetchPlantData(plant));
    }, UPDATE_INTERVAL);
}

document.addEventListener('DOMContentLoaded', initializePlants);