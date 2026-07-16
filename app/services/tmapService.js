const TMAP_BASE_URL = 'https://apis.openapi.sk.com/tmap';

const createHttpError = (status, message) => Object.assign(new Error(message), { status });

const toCoordinate = (value) => {
    const coordinate = Number(value);
    return Number.isFinite(coordinate) ? coordinate : null;
};

const isValidCoordinate = (latitude, longitude) =>
    latitude !== null && longitude !== null &&
    latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;

const assertCoordinate = (latitude, longitude, message) => {
    if (!isValidCoordinate(latitude, longitude)) {
        throw createHttpError(400, message);
    }
};

const requestTmap = async (path, options = {}) => {
    if (!process.env.TMAP_API_KEY) {
        throw createHttpError(503, '서버의 TMAP_API_KEY 환경변수가 설정되지 않았습니다.');
    }

    const response = await fetch(`${TMAP_BASE_URL}${path}`, {
        ...options,
        headers: { appKey: process.env.TMAP_API_KEY, ...(options.headers || {}) }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw createHttpError(response.status, data.error?.message || 'TMAP API 요청에 실패했습니다.');
    }
    return data;
};

exports.reverseGeocode = ({ latitude, longitude }) => {
    const lat = toCoordinate(latitude);
    const lng = toCoordinate(longitude);
    assertCoordinate(lat, lng, '올바른 위도와 경도를 입력해 주세요.');

    const query = new URLSearchParams({
        version: '1', lat: String(lat), lon: String(lng),
        coordType: 'WGS84GEO', addressType: 'A10'
    });
    return requestTmap(`/geo/reversegeocoding?${query}`);
};

exports.getPedestrianRoute = ({ startLat, startLng, endLat, endLng, endName }) => {
    const startLatitude = toCoordinate(startLat);
    const startLongitude = toCoordinate(startLng);
    const endLatitude = toCoordinate(endLat);
    const endLongitude = toCoordinate(endLng);
    assertCoordinate(startLatitude, startLongitude, '출발 좌표가 올바르지 않습니다.');
    assertCoordinate(endLatitude, endLongitude, '도착 좌표가 올바르지 않습니다.');

    return requestTmap('/routes/pedestrian?version=1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            version: '1', startX: String(startLongitude), startY: String(startLatitude),
            endX: String(endLongitude), endY: String(endLatitude),
            startName: '현재 위치', endName: String(endName || '목적지')
        })
    });
};
