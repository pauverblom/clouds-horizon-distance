<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { map } from '@windy/map';
    import store from '@windy/store';
    import SunCalc from 'suncalc';

    import { isMobileOrTablet } from '@windy/rootScope';


    const OBSERVER_HEIGHT_METERS = 1.7;

    const LOW_CLOUDS_MIN_METERS = 400;
    const LOW_CLOUDS_MAX_METERS = 1200;

    const MID_CLOUDS_MIN_METERS = 2000;
    const MID_CLOUDS_MAX_METERS = 4000;

    const HIGH_CLOUDS_MIN_METERS = 6000;
    const HIGH_CLOUDS_MAX_METERS = 12000;

    const EXTRA_DISTANCE_KM = 10;

    // Hide circles when map zoom exceeds this level to prevent SVG lag
    const MAX_CIRCLE_ZOOM = 19;

    const CIRCLE_STYLES = [
        { color: 'blue',   dashArray: '5, 5', weight: 2 },
        { color: 'blue',   dashArray: '5, 5', weight: 2 },
        { color: 'purple', dashArray: '5, 5', weight: 2 },
        { color: 'purple', dashArray: '5, 5', weight: 2 },
        { color: 'red',    dashArray: '5, 5', weight: 2 },
        { color: 'red',    dashArray: '5, 5', weight: 2 },
    ];

    const CLOUD_LABEL_TEXTS = [
        'Low Clouds 400m', 'Low Clouds 1200m',
        'Mid Clouds 2000m', 'Mid Clouds 4000m',
        'High clouds 6000m', 'High clouds 12000m',
    ];

    const LABEL_AZIMUTH_DEG = 0;
    const LABEL_OFFSET_KM   = 2;

    const CURRENT_SUN_LINE_WEIGHT = 2;
    const CURRENT_SUN_COLOR_SUNRISE = '#ffff00';
    const CURRENT_SUN_COLOR_SUNSET = '#ffa500';
    const CURRENT_SUN_COLOR_GAMMA = 1.35;

    const SUN_UPDATE_INTERVAL_MS = 100;

    const INITIAL_TS_RETRY_INTERVAL_MS = 50;
    const INITIAL_TS_RETRY_MAX_ATTEMPTS = 12;

    const EARTH_RADIUS_KM = 6371;
    let elevationMeters = 0;
    let elevationError = false;
    let sunriseTime = '';
    let sunsetTime = '';

    let sunriseLine: any = null;
    let sunsetLine: any = null;

    let distancesKm = {
        lowMin: 0,
        lowMax: 0,
        midMin: 0,
        midMax: 0,
        high: 0,
        highMax: 0,
    };

    // Live Sun values for the info box
    let liveSunAltitudeDeg = 0;

    let currentTimestampMs: number = Date.now();

    function formatTimeHHMM(ts: number): string {
        if (!ts || isNaN(ts)) return '--:--';
        const d = new Date(ts);
        const hours = d.getHours().toString().padStart(2, '0');
        const minutes = d.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    }

    $: formattedTime = formatTimeHHMM(currentTimestampMs);

    function shiftTime(deltaMinutes: number) {
        const newTs = currentTimestampMs + deltaMinutes * 60 * 1000;
        currentTimestampMs = newTs;

        if (store && (store as any).set) {
            try {
                (store as any).set('timestamp', newTs);
            } catch (e) {
                console.warn('Could not update Windy store timestamp', e);
            }
        }

        scheduleSunUpdate(newTs);
    }

    let horizonCircles: any[] = [];
    let labels: any[] = [];
    let currentSunLine: any = null;
    let circlesHiddenByZoom = false;

    let lastClickedLat: number | null = null;
    let lastClickedLon: number | null = null;
    let lastDistanceRefKm = 0;

    let pendingSunUpdateTimer: number | null = null;
    let latestPendingTsMs: number | null = null;
    let isTickScheduled = false;
    let lastDrawnTsMs: number | null = null;

    let initialTsRetryTimer: number | null = null;

    const elevationCache = new Map<string, number>();

    let initTimer: number | null = null;
    let initTries = 0;

    let extWrap: HTMLDivElement | null = null;

    const Leaf = (globalThis as any).L;

    const makeCircle = (center: any, options: any) => {
        if (Leaf?.Circle) return new Leaf.Circle(center, options);
        return Leaf.circle(center, options);
    };

    const makePolyline = (latlngs: any, options: any) => {
        if (Leaf?.Polyline) return new Leaf.Polyline(latlngs, options);
        return Leaf.polyline(latlngs, options);
    };

    const makeDivIcon = (options: any) => {
        if (Leaf?.DivIcon) return new Leaf.DivIcon(options);
        return Leaf.divIcon(options);
    };

    const makeMarker = (pos: any, options: any) => {
        if (Leaf?.Marker) return new Leaf.Marker(pos, options);
        return Leaf.marker(pos, options);
    };

    function toKey(lat: number, lon: number): string {
        return `${lat.toFixed(4)},${lon.toFixed(4)}`;
    }

    async function getElevationMeters(lat: number, lon: number): Promise<number> {
        const key = toKey(lat, lon);
        const cached = elevationCache.get(key);
        if (cached !== undefined) return cached;

        const url = `https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lon}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Elevation http status ${response.status}`);

        const data = await response.json();
        if (data.elevation === undefined) throw new Error('Elevation missing');

        let value: any = data.elevation;
        if (Array.isArray(value)) value = value[0];
        if (typeof value === 'string') value = parseFloat(value.replace(',', '.'));

        if (typeof value !== 'number' || Number.isNaN(value)) throw new Error('Elevation invalid');

        elevationCache.set(key, value);
        return value;
    }

    function calculateHorizonDistanceKm(elevMeters: number, cloudMetersAGL: number): number {
        const hObsKm = (elevMeters + OBSERVER_HEIGHT_METERS) / 1000;
        const hCloudKm = (elevMeters + cloudMetersAGL) / 1000;
        return Math.sqrt(2 * EARTH_RADIUS_KM * hObsKm + hObsKm * hObsKm) +
               Math.sqrt(2 * EARTH_RADIUS_KM * hCloudKm + hCloudKm * hCloudKm);
    }

    // Exact 3D spherical trigonometry for sun ray intersection with cloud sphere
    function calculateSunRayIntersectionKm(elevMeters: number, cloudMetersAGL: number, sunAltitudeRad: number): number {
        const dGeom = calculateHorizonDistanceKm(elevMeters, cloudMetersAGL);
        if (!(sunAltitudeRad > 0)) return dGeom;

        const hObsKm = (elevMeters + OBSERVER_HEIGHT_METERS) / 1000;
        const hCloudKm = (elevMeters + cloudMetersAGL) / 1000;

        const rObs = EARTH_RADIUS_KM + hObsKm;
        const rCloud = EARTH_RADIUS_KM + hCloudKm;

        if (!(rCloud > rObs)) return dGeom;

        const sinAlt = Math.sin(sunAltitudeRad);
        const b = 2 * rObs * sinAlt;
        const c = rObs * rObs - rCloud * rCloud;
        const disc = b * b - 4 * c;

        if (!(disc >= 0)) return dGeom;

        const t = (-b + Math.sqrt(disc)) / 2;
        if (!(t > 0)) return dGeom;

        const z1 = rObs + t * sinAlt;
        const cosAng = Math.max(-1, Math.min(1, z1 / rCloud));
        const ang = Math.acos(cosAng);
        const dKm = ang * EARTH_RADIUS_KM;

        if (!Number.isFinite(dKm) || dKm <= 0) return dGeom;
        return Math.min(dKm, dGeom);
    }

    function formatKmVal(val: number): string {
        if (!val || val <= 0) return '0';
        if (val < 10) return val.toFixed(1);
        return Math.round(val).toString();
    }

    function calculateAzimuthDegrees(lat: number, lon: number, time: Date): number {
        const sunPos = SunCalc.getPosition(time, lat, lon);
        return sunPos.azimuth * 180 / Math.PI + 180;
    }

    function computeEndPoint(lat: number, lon: number, azimuthDeg: number, distanceKm: number): [number, number] {
        const bearing = azimuthDeg * Math.PI / 180;
        const lat1 = lat * Math.PI / 180;
        const lon1 = lon * Math.PI / 180;

        const angDist = distanceKm / EARTH_RADIUS_KM;

        const lat2 = Math.asin(
            Math.sin(lat1) * Math.cos(angDist) +
                Math.cos(lat1) * Math.sin(angDist) * Math.cos(bearing)
        );

        const lon2 =
            lon1 +
            Math.atan2(
                Math.sin(bearing) * Math.sin(angDist) * Math.cos(lat1),
                Math.cos(angDist) - Math.sin(lat1) * Math.sin(lat2)
            );

        return [lat2 * 180 / Math.PI, lon2 * 180 / Math.PI];
    }

    function clamp01(v: number) {
        return Math.max(0, Math.min(1, v));
    }

    function lerp(a: number, b: number, t: number) {
        return a + (b - a) * t;
    }

    function hexToRgb(hex: string) {
        const h = hex.replace('#', '').trim();
        const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
        const n = parseInt(full, 16);
        return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    }

    function rgbToHex(r: number, g: number, b: number) {
        const toHex = (x: number) => x.toString(16).padStart(2, '0');
        return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    }

    function lerpHexColor(aHex: string, bHex: string, t: number) {
        const a = hexToRgb(aHex);
        const b = hexToRgb(bHex);
        const tt = clamp01(t);

        const r = Math.round(lerp(a.r, b.r, tt));
        const g = Math.round(lerp(a.g, b.g, tt));
        const bb = Math.round(lerp(a.b, b.b, tt));

        return rgbToHex(r, g, bb);
    }

    function normalizeTimestampMs(ts: any): number | null {
        if (typeof ts !== 'number' || !Number.isFinite(ts)) return null;
        if (ts > 0 && ts < 1e12) return ts * 1000;
        return ts;
    }

    function clearCurrentSunLine() {
        if (currentSunLine) {
            map.removeLayer(currentSunLine);
            currentSunLine = null;
        }
    }

    function clearCirclesAndLabels() {
        horizonCircles.forEach(layer => map.removeLayer(layer));
        labels.forEach(layer => map.removeLayer(layer));
        horizonCircles = [];
        labels = [];
        circlesHiddenByZoom = false;
    }

    function clearMapOverlays() {
        clearCirclesAndLabels();
        clearCurrentSunLine();
        if (sunriseLine) map.removeLayer(sunriseLine);
        if (sunsetLine) map.removeLayer(sunsetLine);
        sunriseLine = null;
        sunsetLine = null;
    }

    function drawHorizonCircles(
        lat: number,
        lon: number,
        elevMeters: number,
        sunAltitudeRad: number = 0
    ) {
        clearCirclesAndLabels();

        const currentZoom = (map as any).getZoom ? (map as any).getZoom() : 0;
        circlesHiddenByZoom = currentZoom >= MAX_CIRCLE_ZOOM;

        const indicesToDraw = pickCircleIndicesForOverlay(activeOverlayKey);

        const cloudHeights = [
            LOW_CLOUDS_MIN_METERS,
            LOW_CLOUDS_MAX_METERS,
            MID_CLOUDS_MIN_METERS,
            MID_CLOUDS_MAX_METERS,
            HIGH_CLOUDS_MIN_METERS,
            HIGH_CLOUDS_MAX_METERS,
        ];

        const calculatedDistancesKm = cloudHeights.map(h =>
            calculateSunRayIntersectionKm(elevMeters, h, sunAltitudeRad)
        );

        distancesKm = {
            lowMin:  calculatedDistancesKm[0],
            lowMax:  calculatedDistancesKm[1],
            midMin:  calculatedDistancesKm[2],
            midMax:  calculatedDistancesKm[3],
            high:    calculatedDistancesKm[4],
            highMax: calculatedDistancesKm[5],
        };

        const addCircle = (distanceKm: number, styleIndex: number, opacity: number, weight: number, dash: string): any => {
            const circle = makeCircle([lat, lon], {
                color: CIRCLE_STYLES[styleIndex].color,
                dashArray: dash,
                weight,
                fillOpacity: 0,
                opacity,
                radius: distanceKm * 1000,
                interactive: false
            });
            if (!circlesHiddenByZoom) circle.addTo(map);
            horizonCircles.push(circle);
            return circle;
        };

        const addLabel = (distanceKm: number, text: string, styleIndex: number) => {
            const labelDistanceKm = distanceKm + LABEL_OFFSET_KM;
            const labelPos = computeEndPoint(lat, lon, LABEL_AZIMUTH_DEG, labelDistanceKm);

            const anchorMarker = makeMarker(labelPos, {
                interactive: false,
                icon: makeDivIcon({
                    className: 'chdLabelAnchor',
                    html: '',
                    iconSize: [0, 0]
                })
            });

            const displayDistStr = formatKmVal(distanceKm);

            anchorMarker.bindTooltip(
                `<span style="color:${CIRCLE_STYLES[styleIndex].color}; font-weight:700;">${text} (${displayDistStr}km)</span>`,
                {
                    permanent: true,
                    direction: 'top',
                    offset: [0, 0],
                    opacity: 1,
                    className: 'chdLabelTooltip'
                }
            );

            if (!circlesHiddenByZoom) {
                anchorMarker.addTo(map);
                anchorMarker.openTooltip();
            }

            labels.push(anchorMarker);
        };

        indicesToDraw.forEach((index) => {
            const distanceKm = calculatedDistancesKm[index];

            addCircle(distanceKm, index, 1, CIRCLE_STYLES[index].weight, CIRCLE_STYLES[index].dashArray);

            // Draw thin range circles for low, mid, and high cloud bands
            const isLow  = index === 0;
            const isMid  = index === 2;
            const isHigh = index === 4;
            const drawRange = isLow || isMid || isHigh;

            if (drawRange) {
                const start = isLow ? LOW_CLOUDS_MIN_METERS  : isMid ? MID_CLOUDS_MIN_METERS  : HIGH_CLOUDS_MIN_METERS;
                const end   = isLow ? LOW_CLOUDS_MAX_METERS  : isMid ? MID_CLOUDS_MAX_METERS  : HIGH_CLOUDS_MAX_METERS;
                const step  = isLow ? 200 : isMid ? 400 : 2000;

                const thinDash    = '4, 6';
                const thinWeight  = isLow ? 1.4 : 1.6;
                const thinOpacity = isLow ? 0.5 : isMid ? 0.7 : 0.6;

                for (let cloudMeters = start + step; cloudMeters < end; cloudMeters += step) {
                    const extraDistanceKm = calculateSunRayIntersectionKm(elevMeters, cloudMeters, sunAltitudeRad);
                    addCircle(extraDistanceKm, index, thinOpacity, thinWeight, thinDash);
                }
            }

            addLabel(distanceKm, CLOUD_LABEL_TEXTS[index], index);
        });
    }

    function drawSunriseSunsetLines(
        lat: number,
        lon: number,
        sunTimes: { sunrise: Date; sunset: Date },
        distanceRefKm: number
    ) {
        const lineLengthKm = distanceRefKm + EXTRA_DISTANCE_KM;

        const sunriseAz = calculateAzimuthDegrees(lat, lon, sunTimes.sunrise);
        const sunsetAz = calculateAzimuthDegrees(lat, lon, sunTimes.sunset);

        const sunriseEnd = computeEndPoint(lat, lon, sunriseAz, lineLengthKm);
        const sunsetEnd = computeEndPoint(lat, lon, sunsetAz, lineLengthKm);

        if (sunriseLine) map.removeLayer(sunriseLine);
        if (sunsetLine) map.removeLayer(sunsetLine);

        sunriseLine = makePolyline([[lat, lon], sunriseEnd], { color: 'yellow', interactive: false }).addTo(map);
        sunsetLine = makePolyline([[lat, lon], sunsetEnd], { color: 'orange', interactive: false }).addTo(map);
    }

    function dynamicCurrentSunColor(lat: number, lon: number, timestampMs: number): string {
        const time = new Date(timestampMs);
        const times = SunCalc.getTimes(time, lat, lon);

        const sunriseMs = times.sunrise.getTime();
        const sunsetMs = times.sunset.getTime();
        const denom = sunsetMs - sunriseMs;

        if (!(denom > 0)) return lerpHexColor(CURRENT_SUN_COLOR_SUNRISE, CURRENT_SUN_COLOR_SUNSET, 0.5);

        let t = (timestampMs - sunriseMs) / denom;
        t = clamp01(t);
        t = Math.pow(t, CURRENT_SUN_COLOR_GAMMA);

        return lerpHexColor(CURRENT_SUN_COLOR_SUNRISE, CURRENT_SUN_COLOR_SUNSET, t);
    }

    function drawOrUpdateCurrentSunLine(lat: number, lon: number, timestampMs: number, distanceRefKm: number) {
        const time = new Date(timestampMs);
        const pos = SunCalc.getPosition(time, lat, lon);

        // Save Sun altitude for UI
        liveSunAltitudeDeg = +(pos.altitude * 180 / Math.PI).toFixed(1);

        drawHorizonCircles(lat, lon, elevationMeters, pos.altitude);

        if (pos.altitude <= 0) {
            clearCurrentSunLine();
            lastDrawnTsMs = timestampMs;
            return;
        }

        const azimuthDeg = pos.azimuth * 180 / Math.PI + 180;
        const lineLengthKm = distancesKm.highMax;

        const end = computeEndPoint(lat, lon, azimuthDeg, lineLengthKm);
        const color = dynamicCurrentSunColor(lat, lon, timestampMs);

        if (!currentSunLine) {
            currentSunLine = makePolyline([[lat, lon], end], {
                color,
                weight: CURRENT_SUN_LINE_WEIGHT,
                interactive: false
            }).addTo(map);
        } else {
            currentSunLine.setLatLngs([[lat, lon], end]);
            currentSunLine.setStyle({ color });
        }

        lastDrawnTsMs = timestampMs;
    }



    function scheduleSunUpdate(rawTs: any) {
        if (lastClickedLat === null || lastClickedLon === null) return;

        const tsMs = normalizeTimestampMs(rawTs);
        if (tsMs === null) return;

        latestPendingTsMs = tsMs;

        if (isTickScheduled) return;
        isTickScheduled = true;

        pendingSunUpdateTimer = window.setTimeout(() => {
            isTickScheduled = false;
            pendingSunUpdateTimer = null;

            if (latestPendingTsMs === null) return;

            drawOrUpdateCurrentSunLine(
                lastClickedLat as number,
                lastClickedLon as number,
                latestPendingTsMs,
                lastDistanceRefKm
            );

            if (latestPendingTsMs !== null && lastDrawnTsMs !== null && latestPendingTsMs !== lastDrawnTsMs) {
                scheduleSunUpdate(latestPendingTsMs);
            }
        }, SUN_UPDATE_INTERVAL_MS);
    }


 function resetSunScheduler() {
    if (pendingSunUpdateTimer !== null) {
        window.clearTimeout(pendingSunUpdateTimer);
        pendingSunUpdateTimer = null;
    }
    isTickScheduled = false;
    latestPendingTsMs = null;
    lastDrawnTsMs = null;
}

    /**
     * Show/hide horizon circles based on zoom level to prevent SVG lag
     * when the map is zoomed in past MAX_CIRCLE_ZOOM.
     */
    function onZoomEnd() {
        if (lastClickedLat === null) return;
        const zoom = (map as any).getZoom ? (map as any).getZoom() : 0;
        const shouldHide = zoom >= MAX_CIRCLE_ZOOM;
        if (shouldHide === circlesHiddenByZoom) return;
        circlesHiddenByZoom = shouldHide;

        if (shouldHide) {
            horizonCircles.forEach(l => { try { map.removeLayer(l); } catch (e) {} });
            labels.forEach(l => { try { map.removeLayer(l); } catch (e) {} });
        } else {
            horizonCircles.forEach(l => { try { l.addTo(map); } catch (e) {} });
            labels.forEach(l => {
                try { l.addTo(map); l.openTooltip(); } catch (e) {}
            });
        }
    }



    async function onMapClick(event: any) {
    const latRaw = event.latlng.lat as number;
    const lonRaw = event.latlng.lng as number;

    try {
        elevationError = false;
        elevationMeters = await getElevationMeters(latRaw, lonRaw);

        distancesKm = {
            lowMin:  calculateHorizonDistanceKm(elevationMeters, LOW_CLOUDS_MIN_METERS),
            lowMax:  calculateHorizonDistanceKm(elevationMeters, LOW_CLOUDS_MAX_METERS),
            midMin:  calculateHorizonDistanceKm(elevationMeters, MID_CLOUDS_MIN_METERS),
            midMax:  calculateHorizonDistanceKm(elevationMeters, MID_CLOUDS_MAX_METERS),
            high:    calculateHorizonDistanceKm(elevationMeters, HIGH_CLOUDS_MIN_METERS),
            highMax: calculateHorizonDistanceKm(elevationMeters, HIGH_CLOUDS_MAX_METERS),
        };

        const now = new Date();
        const sunTimes = SunCalc.getTimes(now, latRaw, lonRaw);

        sunriseTime = sunTimes.sunrise.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        sunsetTime = sunTimes.sunset.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        lastClickedLat = latRaw;
        lastClickedLon = lonRaw;
        lastDistanceRefKm = distancesKm.highMax;

        drawHorizonCircles(latRaw, lonRaw, elevationMeters, 0);

        drawSunriseSunsetLines(latRaw, lonRaw, sunTimes as any, distancesKm.highMax);

        // Always start tracking
        const ts = store && (store as any).get ? (store as any).get('timestamp') : Date.now();
        scheduleSunUpdate(ts);

    } catch (err: any) {
        console.error('Click processing failed', err);
        elevationError = true;
    }
}

function redrawBaseAtLastClick() {
    if (lastClickedLat === null || lastClickedLon === null) return;

    const lat = lastClickedLat;
    const lon = lastClickedLon;

    const now = new Date();
    const sunTimes = SunCalc.getTimes(now, lat, lon);

    sunriseTime = sunTimes.sunrise.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    sunsetTime = sunTimes.sunset.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    drawHorizonCircles(
        lat,
        lon,
        elevationMeters,
        [distancesKm.lowMin, distancesKm.lowMax, distancesKm.midMin, distancesKm.midMax, distancesKm.high, distancesKm.highMax],
        CLOUD_LABEL_TEXTS
    );

    drawSunriseSunsetLines(lat, lon, sunTimes as any, distancesKm.highMax);
}

// Windy overlay currently selected (clouds, lclouds, mclouds, hclouds, etc)
let activeOverlayKey: string = 'clouds';

// Reactive flags for mobile card 2 visibility
$: showLow = activeOverlayKey === 'clouds' || activeOverlayKey === 'lclouds';
$: showMid = activeOverlayKey === 'clouds' || activeOverlayKey === 'mclouds';
$: showHigh = activeOverlayKey === 'clouds' || activeOverlayKey === 'hclouds';

function pickCircleIndicesForOverlay(overlayKey: string): number[] {
    // Index mapping:
    // 0 lowMin, 1 lowMax, 2 midMin, 3 midMax, 4 highMin, 5 highMax
    if (overlayKey === 'lclouds') return [0, 1];
    if (overlayKey === 'mclouds') return [2, 3];
    if (overlayKey === 'hclouds') return [4, 5];
    return [0, 1, 2, 3, 4, 5];
}

function onOverlayChange(next: any) {
    activeOverlayKey = typeof next === 'string' ? next : 'clouds';

    if (lastClickedLat === null || lastClickedLon === null) return;

    clearMapOverlays();
    clearCurrentSunLine();

    redrawBaseAtLastClick();
    const ts = store && (store as any).get ? (store as any).get('timestamp') : Date.now();
    scheduleSunUpdate(ts);
}

    function onTimestampChange(ts: any) {
        if (typeof ts === 'number' && !isNaN(ts)) {
            currentTimestampMs = ts;
        } else if (ts) {
            const parsed = new Date(ts).getTime();
            if (!isNaN(parsed)) currentTimestampMs = parsed;
        }
        scheduleSunUpdate(currentTimestampMs);
    }

    function initWhenReady() {
    const hasMap = !!(map && (map as any).on);
    const hasLeaflet = typeof (window as any).L !== 'undefined';
    const hasStore = !!(store && (store as any).on);

    if (hasMap && hasLeaflet) {

        try {
            (map as any).on('click', onMapClick);
            (map as any).on('zoomend', onZoomEnd);
        } catch (e) {
        }

        if (hasStore) {
            try {
                (store as any).on('timestamp', onTimestampChange);
                (store as any).on('overlay', onOverlayChange);

                const currentOverlay = (store as any).get ? (store as any).get('overlay') : null;
                if (typeof currentOverlay === 'string' && currentOverlay) {
                    activeOverlayKey = currentOverlay;
                }

                const initialTs = (store as any).get ? (store as any).get('timestamp') : null;
                if (typeof initialTs === 'number' && !isNaN(initialTs)) {
                    currentTimestampMs = initialTs;
                }
            } catch (e) {
            }
        }

        return;
    }

    initTries += 1;
    if (initTries > 40) return;

    initTimer = window.setTimeout(initWhenReady, 50);
}


    onMount(() => {
        initWhenReady();
    });

    onDestroy(() => {
        if (initTimer !== null) {
            window.clearTimeout(initTimer);
            initTimer = null;
        }

        if (map && (map as any).off) {
            try {
                (map as any).off('click', onMapClick);
                (map as any).off('zoomend', onZoomEnd);
            } catch (e) {
            }
        }

        if (store && (store as any).off) {
            try {
                (store as any).off('timestamp', onTimestampChange);
                (store as any).off('overlay', onOverlayChange);
            } catch (e) {
            }
        }

        if (pendingSunUpdateTimer !== null) {
            window.clearTimeout(pendingSunUpdateTimer);
            pendingSunUpdateTimer = null;
        }

        if (initialTsRetryTimer !== null) {
            window.clearTimeout(initialTsRetryTimer);
            initialTsRetryTimer = null;
        }

        isTickScheduled = false;
        latestPendingTsMs = null;
        lastDrawnTsMs = null;
        clearMapOverlays();
    });
</script>

{#if isMobileOrTablet}

    <div id="chdInfoBox" class="plugin__content">
        <!-- MOBILE UI -->
        <div class="mobileWrap">

            <!-- Card 1: Altitudine & Base -->
            <section class="mobileCard mobileCardNarrow">
                <div class="mobileLine">
                    <span class="k">Your elevation</span>
                    <span class="v">
                        {#if elevationError}
                            <span class="elev-error">Unavailable</span>
                        {:else}
                            {lastClickedLat === null ? 'Tap map' : `${Math.round(elevationMeters)}m`}
                        {/if}
                    </span>
                </div>
                <div class="mobileLine">
                    <span class="k">Sun altitude</span>
                    <span class="v">
                        {lastClickedLat === null ? 'Tap map' : `${liveSunAltitudeDeg.toFixed(1)}°`}
                    </span>
                </div>
            </section>

            <!-- Card 2: Distanze nubi -->
            <section class="mobileCard mobileCardWide">
                <div class="mobileCardTitle">Clouds Horizon Distance</div>
        
                {#if showLow || showMid}
                    <div class="mobileLineTwoCols">

                        {#if showLow}
                            <div class="pairOneLine">
                                <span class="kBadge">L</span>
                                <span class="vOneLine">
                                    {distancesKm.lowMin
                                        ? `${distancesKm.lowMin.toFixed(0)} to ${distancesKm.lowMax.toFixed(0)} km`
                                        : 'Tap map'}
                                </span>
                            </div>
                        {/if}

                        {#if showMid}
                            <div class="pairOneLine">
                                <span class="kBadge">M</span>
                                <span class="vOneLine">
                                    {distancesKm.midMin
                                        ? `${distancesKm.midMin.toFixed(0)} to ${distancesKm.midMax.toFixed(0)} km`
                                        : 'Tap map'}
                                </span>
                            </div>
                        {/if}

                    </div>
                {/if}

                {#if showHigh}
                    <div class="mobileLineOneCol">
                        <span class="kBadge">H</span>
                        <span class="vOneLine">
                            {distancesKm.high
                                ? `${distancesKm.high.toFixed(0)} to ${distancesKm.highMax.toFixed(0)} km`
                                : 'Tap map'}
                        </span>
                    </div>
                {/if}

                {#if !showLow && !showMid && !showHigh}
                    <div class="mobileLineOneCol">
                        <span class="kBadge">C</span>
                        <span class="vOneLine">Tap map</span>
                    </div>
                {/if}
            </section>

            <!-- Card 3: Alba / Tramonto -->
            <section class="mobileCard mobileCardNarrow">
                <div class="mobileLine">
                    <span class="k">Sunrise</span>
                    <span class="v">{sunriseTime || 'n/a'}</span>
                </div>
                <div class="mobileLine">
                    <span class="k">Sunset</span>
                    <span class="v">{sunsetTime || 'n/a'}</span>
                </div>
            </section>


        </div>

        <!-- Time Control Bar (Mobile) -->
        <div class="chd-time-bar">
            <button type="button" class="chd-time-btn" on:click={() => shiftTime(-1)} title="Decrease 1 minute" aria-label="Decrease 1 minute">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="15 18 9 12 15 6"></polyline>
                </svg>
            </button>
            <span class="chd-time-text">{formattedTime}</span>
            <button type="button" class="chd-time-btn" on:click={() => shiftTime(1)} title="Increase 1 minute" aria-label="Increase 1 minute">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
            </button>
        </div>
    </div>

{:else}


    <!-- DESKTOP: box originale -->
    <section class="plugin__content" id="chdInfoBox">
        <fieldset>
            <legend>Altitude</legend>
            {#if elevationError}
                <label>Your Elevation: <span class="elev-error">Unavailable</span></label>
            {:else}
                <label>Your Elevation: {lastClickedLat === null ? 'Click on the map' : `${Math.round(elevationMeters)} m`}</label>
            {/if}
            <label>Sun altitude: {lastClickedLat === null ? 'Click on the map' : `${liveSunAltitudeDeg.toFixed(1)}°`}</label>
        </fieldset>

        <fieldset>
            <legend>Clouds Horizon Distance</legend>
            <label><b>L</b> block range: {lastClickedLat === null ? '-' : `between ${formatKmVal(distancesKm.lowMin)} and ${formatKmVal(distancesKm.lowMax)} km`}</label>
            <label><b>M</b> block range: {lastClickedLat === null ? '-' : `between ${formatKmVal(distancesKm.midMin)} and ${formatKmVal(distancesKm.midMax)} km`}</label>
            <label><b>H</b> block range: {lastClickedLat === null ? '-' : `between ${formatKmVal(distancesKm.high)} and ${formatKmVal(distancesKm.highMax)} km`}</label>
        </fieldset>

        <fieldset>
            <legend>Sunrise and Sunset</legend>
            <label><b>Sunrise</b>: {sunriseTime || '-'} | <b>Sunset</b>: {sunsetTime || '-'}</label>
        </fieldset>

        <!-- Time Control Bar (Desktop) -->
        <div class="chd-time-bar">
            <button type="button" class="chd-time-btn" on:click={() => shiftTime(-1)} title="Decrease 1 minute" aria-label="Decrease 1 minute">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="15 18 9 12 15 6"></polyline>
                </svg>
            </button>
            <span class="chd-time-text">{formattedTime}</span>
            <button type="button" class="chd-time-btn" on:click={() => shiftTime(1)} title="Increase 1 minute" aria-label="Increase 1 minute">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
            </button>
        </div>
    </section>

{/if}

<style>
    :global(#plugin-windy-plugin-horizon-distance) {
        height: auto !important;
        min-height: min-content !important;
        max-height: none !important;
        overflow: visible !important;
        position: relative !important;
        z-index: 9999 !important;
        margin-bottom: 15px !important;
    }

    .plugin__content {
        height: auto !important;
        min-height: min-content !important;
        max-height: none !important;
        overflow: visible !important;
        padding: 10px 12px !important;
        box-sizing: border-box !important;
        display: block !important;
        position: relative !important;
        background-color: transparent !important;
        font-size: 13px !important;
        line-height: 1.35 !important;
    }

    fieldset {
        border: none !important;
        margin-bottom: 6px !important;
        padding: 0 !important;
    }

    legend {
        font-weight: bold;
        font-size: 11px !important;
        margin-bottom: 3px !important;
        color: #ffd700 !important;
        text-transform: uppercase;
        letter-spacing: 0.3px;
    }

    label {
        display: block;
        margin-bottom: 3px !important;
        font-size: 11px !important;
        color: white;
    }

    label b {
        color: #64b5f6;
    }

.chdLabelAnchor {
    background: transparent;
    border: 0;
}

:global(.leaflet-tooltip.chdLabelTooltip),
:global(.chdLabelTooltip) {
    background: transparent !important;
    background-color: transparent !important;
    border: none !important;
    box-shadow: none !important;
    padding: 0 !important;
    z-index: 200 !important;
    pointer-events: none !important;
}

:global(.leaflet-tooltip.chdLabelTooltip::before),
:global(.leaflet-tooltip.chdLabelTooltip::after),
:global(.chdLabelTooltip::before),
:global(.chdLabelTooltip::after) {
    display: none !important;
}

:global(.chdLabelTooltip .leaflet-tooltip-content) {
    margin: 0 !important;
    padding: 0 !important;
    background: transparent !important;
    background-color: transparent !important;
    white-space: nowrap !important;
    font-size: 16px !important;
    font-weight: 700 !important;
    line-height: 1.2 !important;
    text-shadow: 0 0 3px rgba(0, 0, 0, 0.35) !important;
}

:global(.leaflet-pane.leaflet-tooltip-pane) {
    z-index: 200 !important;
}

/* Mobile cards UI */
.mobileBox {
    padding: 8px 10px;
}

.mobileScroll {
    display: flex;
    flex-direction: row;
    gap: 10px;
    overflow-x: auto;
    overflow-y: hidden;
    -webkit-overflow-scrolling: touch;
    scroll-snap-type: x mandatory;
}

.mobileCard {
    flex: 0 0 auto;
    min-width: 240px;
    max-width: 290px;
    padding: 8px 10px;
    border-radius: 12px;
    background: rgba(0, 0, 0, 0.22);
    border: 1px solid rgba(255, 255, 255, 0.18);
    scroll-snap-align: start;
}

.mobileCardNarrow {
    min-width: 170px;
    max-width: 240px;
}

.mobileCardWide {
    min-width: 285px;
    max-width: 340px;
}

.mobileTitle {
    color: white;
    font-weight: 800;
    font-size: 13px;
    opacity: 0.95;
    margin-bottom: 8px;
    letter-spacing: 0.2px;
}

.mobileLine {
    display: flex;
    gap: 8px;
    align-items: baseline;
    margin-bottom: 6px;
    color: white;
}

.mobileLine .k {
    opacity: 0.75;
    font-weight: 800;
    font-size: 12px;
    white-space: nowrap;
}

.mobileLine .v {
    font-weight: 800;
    font-size: 13px;
    white-space: nowrap;
}

.elev-error {
    color: #ff6b6b;
    font-weight: 800;
    font-size: 13px;
}

.placeholder-text {
    opacity: 0.5;
    font-style: italic;
}

/* Card 2 compact layout */
.mobileLineTwoCols {
    display: flex;
    gap: 10px;
    margin-bottom: 6px;
}

.pairOneLine {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: baseline;
    gap: 6px;
}

.mobileLineOneCol {
    display: flex;
    align-items: baseline;
    gap: 6px;
    margin-bottom: 6px;
    min-width: 0;
}

.kBadge {
    flex: 0 0 auto;
    width: 18px;
    height: 18px;
    border-radius: 6px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-weight: 900;
    font-size: 12px;
    color: white;
    background: rgba(255, 255, 255, 0.18);
    border: 1px solid rgba(255, 255, 255, 0.22);
    line-height: 1;
}

.vOneLine {
    flex: 1 1 auto;
    min-width: 0;
    font-weight: 800;
    font-size: 13px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: white;
}

/* Card 4 buttons */
.mobileButtonsStack {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.mobileButtonsStack button {
    width: 100%;
    padding: 8px 10px;
    min-height: 28px;
    border-radius: 10px;
    border: 1px solid rgba(255, 255, 255, 0.22);
    background: rgba(0, 0, 0, 0.22);
    color: white;
    font-weight: 700;
    font-size: 13px;
    line-height: 1.1;
}

.mobileButtonsStack button.activeBtn {
    background: rgba(255, 165, 0, 0.55);
    border-color: rgba(255, 255, 255, 0.35);
}

/* Time Navigation Bar */
.chd-time-bar {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    margin-top: 8px;
    padding: 6px 12px;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 10px;
    box-sizing: border-box;
}

.chd-time-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    padding: 0;
    border-radius: 6px;
    border: 1px solid rgba(255, 255, 255, 0.25);
    background: rgba(255, 255, 255, 0.12);
    color: #ffffff;
    cursor: pointer;
    transition: background 0.15s ease, border-color 0.15s ease, transform 0.1s ease;
}

.chd-time-btn:hover {
    background: rgba(255, 255, 255, 0.25);
    border-color: rgba(255, 255, 255, 0.4);
}

.chd-time-btn:active {
    transform: scale(0.92);
    background: rgba(255, 165, 0, 0.5);
}

.chd-time-text {
    font-weight: 700;
    font-size: 14px;
    letter-spacing: 0.6px;
    color: #ffd700;
    min-width: 48px;
    text-align: center;
    font-variant-numeric: tabular-nums;
    font-family: inherit;
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
}
</style>