# Plant Configuration System

## API Configuration
- `sensorHistoryUrl`: URL for fetching sensor history data
- `updateInterval`: How often to refresh data (in milliseconds)

## Plant Configuration
Each plant entry includes:
- `id`: Unique identifier used in HTML elements and API calls
- `name`: Display name for the plant
- `commonName`: Common name displayed on the card
- `scientificName`: Scientific name displayed on the card
- `location`: Room/area where the plant is located (used for grouping)
- `waterThreshold`: Moisture percentage below which the plant needs water
- `image`: Path to the plant's image
- `dataUrl`: URL to fetch current moisture data
- `storageKey`: Local storage key for tracking watering

## Adding a New Plant

To add a new plant, simply edit `/website/config/plants-config.json` and add a new entry to the `plants` array:

```json
{
  "id": "new_plant_id",
  "name": "New Plant Name",
  "commonName": "New Plant",
  "scientificName": "Plantus newicus",
  "location": "Living Room",
  "waterThreshold": 35,
  "image": "../images/new_plant.jpg",
  "dataUrl": "../json/moisture_new_plant.json",
  "storageKey": "lastWatered_new_plant"
}
```
