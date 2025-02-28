<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { map } from '@windy/map';
    import SunCalc from 'suncalc';

    // Constants
    const OBSERVER_HEIGHT = 1.7; // Observer height in meters
    const LOW_CLOUDS_MIN = 400;  // Low clouds min height in meters
    const LOW_CLOUDS_MAX = 1200; // Low clouds max height in meters
    const MIDDLE_CLOUDS_MIN = 2000; // Middle clouds min height in meters
    const MIDDLE_CLOUDS_MAX = 4000; // Middle clouds max height in meters
    const HIGH_CLOUDS = 6000; // High clouds height in meters
    const EXTRA_DISTANCE = 10; // Extra distance for sun lines in kilometers

    // Variables to manage the information box
    let lat = 0;
    let lon = 0;
    let elevation = 0;
    let sunriseTime = '';  // Variable for sunrise time
    let sunsetTime = '';   // Variable for sunset time
    let distances = {
        lowCloudsMin: 0,
        lowCloudsMax: 0,
        middleCloudsMin: 0,
        middleCloudsMax: 0,
        highClouds: 0
    };

    let horizonCircles: L.Circle[] = [];
    let labels: L.Marker[] = [];
    let sunriseLine: L.Polyline | null = null;
    let sunsetLine: L.Polyline | null = null;

    // Fetch elevation using Open-Meteo API
    async function getElevation(lat: number, lon: number): Promise<number> {
    const url = `https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lon}`;
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        const data = await response.json();
        if (data.elevation !== undefined) {
            let elevationValue = data.elevation;

            // If elevation is an array, take the first element
            if (Array.isArray(elevationValue)) {
                elevationValue = elevationValue[0];
            }

            // If elevation is a string, convert it to a number
            if (typeof elevationValue === 'string') {
                elevationValue = elevationValue.replace(',', '.'); // Replace comma with dot
                elevationValue = parseFloat(elevationValue); // Convert to number
            }

            // If elevation is in feet, convert to meters (1 foot = 0.3048 meters)
            if (elevationValue > 10000) { // Assume elevation > 10000 is in feet
                elevationValue *= 0.3048;
            }

            console.log('Elevation value:', elevationValue, 'Type:', typeof elevationValue); // Log the value and type
            return elevationValue;
        }
        throw new Error('Elevation data not found');
    } catch (error) {
        console.error('Failed to fetch elevation:', error);
        throw error;
    }
}

    // Calculate horizon distance
    function calculateHorizonDistance(elevation: number, cloudHeight: number): number {
        const totalHeightMeters = elevation + OBSERVER_HEIGHT + cloudHeight; // All in meters
        const totalHeightKm = totalHeightMeters / 1000; // Convert meters to kilometers
        const earthRadiusKm = 6371; // Earth's radius in kilometers
        return Math.sqrt(2 * earthRadiusKm * totalHeightKm); // Distance in kilometers
    }

    // Draw horizon circles and labels
    function drawHorizonCircles(lat: number, lon: number, distances: number[], labelsText: string[]) {
    // Remove existing circles and labels
    horizonCircles.forEach(circle => map.removeLayer(circle));
    horizonCircles = [];
    labels.forEach(label => map.removeLayer(label));
    labels = [];

    const circleStyles = [
        { color: 'blue', dashArray: '5, 5', weight: 2 },
        { color: 'blue', dashArray: '5, 5', weight: 2 },
        { color: 'purple', dashArray: '5, 5', weight: 2 },
        { color: 'purple', dashArray: '5, 5', weight: 2 },
        { color: 'red', dashArray: '5, 5', weight: 2 },
    ];

    distances.forEach((distance, index) => {
        // Create the main circle
        const circle = L.circle([lat, lon], {
            color: circleStyles[index].color,
            dashArray: circleStyles[index].dashArray,
            weight: circleStyles[index].weight,
            fillOpacity: 0,
            radius: distance * 1000 // Convert kilometers to meters
        }).addTo(map);
        horizonCircles.push(circle);

        // Draw additional circles for ranges
        if (index === 0 || index === 2) { // Only for low and mid clouds
            const step = (index === 0) ? 200 : 400; // Step size for additional circles
            const start = (index === 0) ? LOW_CLOUDS_MIN : MIDDLE_CLOUDS_MIN;
            const end = (index === 0) ? LOW_CLOUDS_MAX : MIDDLE_CLOUDS_MAX;

            // Styles for additional circles
            const thinDashArray = '4, 6'; // More visible dash
            let thinWeight = 1.5; // Slightly increased weight
            let thinOpacity = 0.5; // Reduce opacity a bit for better visibility

            // Specific modifications for mid clouds (index === 2)
            if (index === 2) {
                thinWeight = 1.7; // Higher weight for mid clouds
                thinOpacity = 0.7; // Less transparency for mid clouds
            }

            for (let cloudHeight = start + step; cloudHeight < end; cloudHeight += step) {
                const extraDistance = calculateHorizonDistance(elevation, cloudHeight);
                const extraCircle = L.circle([lat, lon], {
                    color: circleStyles[index].color,
                    dashArray: thinDashArray,
                    weight: thinWeight,
                    fillOpacity: 0,
                    opacity: thinOpacity,
                    radius: extraDistance * 1000 // Convert kilometers to meters
                }).addTo(map);
                horizonCircles.push(extraCircle);

                // Add a label for each additional circle
                const extraLabel = L.marker([lat + (extraDistance / 111) + 0.02, lon], {
                    icon: L.divIcon({
                        className: 'label',
                        html: `<div style="color: ${circleStyles[index].color}; font-weight: bold;">${index === 0 ? "+200m" : "+400m"}</div>`,
                        iconSize: [100, 20]
                    })
                }).addTo(map);
                labels.push(extraLabel);
            }
        }

        // Add main labels
        const label = L.marker([lat + (distance / 111), lon], {
            icon: L.divIcon({
                className: 'label',
                html: `<div style="color: ${circleStyles[index].color}; font-weight: bold;">${labelsText[index]} (${Math.round(distance)}km)</div>`,
                iconSize: [200, 40]
            })
        }).addTo(map);
        labels.push(label);
    });
}

    // Draw sun lines
    function drawSunLines(lat: number, lon: number, sunTimes: { sunrise: Date, sunset: Date }, highCloudDistance: number) {
        const lineLength = highCloudDistance + EXTRA_DISTANCE;
        const sunriseAzimuth = calculateAzimuth(lat, lon, sunTimes.sunrise);
        const sunsetAzimuth = calculateAzimuth(lat, lon, sunTimes.sunset);

        const sunriseEndLatLon = computeEndPoint(lat, lon, sunriseAzimuth, lineLength);
        const sunsetEndLatLon = computeEndPoint(lat, lon, sunsetAzimuth, lineLength);

        if (sunriseLine) map.removeLayer(sunriseLine);
        if (sunsetLine) map.removeLayer(sunsetLine);

        sunriseLine = L.polyline([[lat, lon], sunriseEndLatLon], { color: 'yellow' }).addTo(map);
        sunsetLine = L.polyline([[lat, lon], sunsetEndLatLon], { color: 'orange' }).addTo(map);
    }

    // Calculate azimuth for sun position
    function calculateAzimuth(lat: number, lon: number, time: Date): number {
        const sunPos = SunCalc.getPosition(time, lat, lon);
        return sunPos.azimuth * 180 / Math.PI + 180;
    }

    // Compute endpoint for sun lines
    function computeEndPoint(lat: number, lon: number, azimuth: number, distanceKm: number): [number, number] {
        const radiusEarthKm = 6371;
        const bearing = azimuth * Math.PI / 180;
        const lat1 = lat * Math.PI / 180;
        const lon1 = lon * Math.PI / 180;
        const lat2 = Math.asin(Math.sin(lat1) * Math.cos(distanceKm / radiusEarthKm) +
                    Math.cos(lat1) * Math.sin(distanceKm / radiusEarthKm) * Math.cos(bearing));
        const lon2 = lon1 + Math.atan2(Math.sin(bearing) * Math.sin(distanceKm / radiusEarthKm) * Math.cos(lat1),
                    Math.cos(distanceKm / radiusEarthKm) - Math.sin(lat1) * Math.sin(lat2));
        return [lat2 * 180 / Math.PI, lon2 * 180 / Math.PI];
    }

    // Handle map click
    async function onMapClick(event: any) {
        const { lat: clickedLat, lng: clickedLon } = event.latlng;
        lat = parseFloat(clickedLat.toFixed(2));
        lon = parseFloat(clickedLon.toFixed(2));

        try {
            elevation = await getElevation(lat, lon);

            distances = {
                lowCloudsMin: calculateHorizonDistance(elevation, LOW_CLOUDS_MIN),
                lowCloudsMax: calculateHorizonDistance(elevation, LOW_CLOUDS_MAX),
                middleCloudsMin: calculateHorizonDistance(elevation, MIDDLE_CLOUDS_MIN),
                middleCloudsMax: calculateHorizonDistance(elevation, MIDDLE_CLOUDS_MAX),
                highClouds: calculateHorizonDistance(elevation, HIGH_CLOUDS)
            };

            // Calculate sunrise and sunset times
            const sunTimes = SunCalc.getTimes(new Date(), lat, lon);
            sunriseTime = sunTimes.sunrise.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            sunsetTime = sunTimes.sunset.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            // Draw the horizon circles and sun lines
            drawHorizonCircles(lat, lon, Object.values(distances), [
                "Low Clouds 400m", 
                "Low Clouds 1200m", 
                "Mid Clouds 2000m", 
                "Mid Clouds 4000m", 
                "High Clouds 6000m"
            ]);
            drawSunLines(lat, lon, sunTimes, distances.highClouds);

        } catch (error) {
            console.error(`Failed to process click: ${error.message}`);
        }
    }

    // Mount and destroy lifecycle hooks
    onMount(() => {
        if (map && map.on) {
            map.on('click', onMapClick);
        }
    });

    onDestroy(() => {
        if (map && map.off) {
            map.off('click', onMapClick);
        }
        horizonCircles.forEach(circle => map.removeLayer(circle));
        labels.forEach(label => map.removeLayer(label));
        if (sunriseLine) map.removeLayer(sunriseLine);
        if (sunsetLine) map.removeLayer(sunsetLine);
    });
</script>

<!-- HTML for the information box -->
<div class="info-box">
    <fieldset>
        <legend>Altitude</legend>
        <label>Your Elevation: {elevation} m</label>
    </fieldset>
    <fieldset>
        <legend>Horizon Distance (Clouds)</legend>
        <label><b>L</b> block range: between {distances.lowCloudsMin.toFixed(0)} and {distances.lowCloudsMax.toFixed(0)} km</label>
        <label><b>M</b> block range: between {distances.middleCloudsMin.toFixed(0)} and {distances.middleCloudsMax.toFixed(0)} km</label>
        <label><b>H</b> horizon from {distances.highClouds.toFixed(0)} km</label>
    </fieldset>
    <fieldset>
        <legend>Sunrise and Sunset</legend>
        <label><b>Sunrise</b>: {sunriseTime} | <b>Sunset</b>: {sunsetTime}</label>
    </fieldset>
</div>

<style>
    fieldset {
        border: none;
        margin-bottom: 10px;
    }

    legend {
        font-weight: bold;
        margin-bottom: 5px;
        color: white;
    }

    label {
        display: block;
        margin-bottom: 5px;
        color: white;
    }

    .label {
        font-size: 14px;
        font-weight: bold;
        background-color: rgba(255, 255, 255, 0.8);
        padding: 5px;
        border-radius: 5px;
    }
</style>