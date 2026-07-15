const defaultMapper = 'index';
const indexModel = require('../models/indexModel');
const XLSX = require('xlsx');

const TMAP_BASE_URL = 'https://apis.openapi.sk.com/tmap';

const toCoordinate = (value) => {
    const coordinate = Number(value);
    return Number.isFinite(coordinate) ? coordinate : null;
};

const isValidCoordinate = (latitude, longitude) =>
    latitude !== null && longitude !== null &&
    latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;

const tmapRequest = async (path, options = {}) => {
    if (!process.env.TMAP_API_KEY) {
        const error = new Error('서버의 TMAP_API_KEY 환경변수가 설정되지 않았습니다.');
        error.status = 503;
        throw error;
    }

    const response = await fetch(`${TMAP_BASE_URL}${path}`, {
        ...options,
        headers: { appKey: process.env.TMAP_API_KEY, ...(options.headers || {}) }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        const error = new Error(data.error?.message || 'TMAP API 요청에 실패했습니다.');
        error.status = response.status;
        throw error;
    }
    return data;
};

exports.getPois = async (req, res, next) => {
    try {
        const pois = await indexModel.findPois(String(req.query.search || '').trim());
        res.json({ resultData: pois, resultCnt: pois.length });
    } catch (error) {
        next(error);
    }
};

exports.importPois = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: '업로드할 .xlsx 파일을 선택해 주세요.' });
        }

        const workbook = XLSX.read(req.file.buffer, { type: 'buffer', raw: true });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = sheet ? XLSX.utils.sheet_to_json(sheet, { defval: null }) : [];
        const invalidRows = [];
        const pois = rows.map((row, index) => {
            const title = String(row.title ?? row.TITLE ?? '').trim();
            const latitude = toCoordinate(row.latitude ?? row.LATITUDE);
            const longitude = toCoordinate(row.longitude ?? row.LONGITUDE);

            if (!title || !isValidCoordinate(latitude, longitude)) {
                invalidRows.push(index + 2);
                return null;
            }
            return { title, latitude, longitude };
        }).filter(Boolean);

        if (!rows.length || invalidRows.length) {
            return res.status(400).json({
                message: '엑셀의 title, latitude, longitude 컬럼을 확인해 주세요.',
                invalidRows
            });
        }

        const count = await indexModel.replacePois(pois);
        res.json({ message: `${count}건의 POI를 저장했습니다.`, resultCnt: count });
    } catch (error) {
        next(error);
    }
};

exports.reverseGeocode = async (req, res, next) => {
    try {
        const latitude = toCoordinate(req.query.latitude);
        const longitude = toCoordinate(req.query.longitude);
        if (!isValidCoordinate(latitude, longitude)) {
            return res.status(400).json({ message: '올바른 위도와 경도를 입력해 주세요.' });
        }

        const query = new URLSearchParams({
            version: '1', lat: String(latitude), lon: String(longitude),
            coordType: 'WGS84GEO', addressType: 'A10'
        });
        res.json(await tmapRequest(`/geo/reversegeocoding?${query}`));
    } catch (error) {
        next(error);
    }
};

exports.getPedestrianRoute = async (req, res, next) => {
    try {
        const startLat = toCoordinate(req.body.startLat);
        const startLng = toCoordinate(req.body.startLng);
        const endLat = toCoordinate(req.body.endLat);
        const endLng = toCoordinate(req.body.endLng);
        if (!isValidCoordinate(startLat, startLng) || !isValidCoordinate(endLat, endLng)) {
            return res.status(400).json({ message: '경로 좌표가 올바르지 않습니다.' });
        }

        const route = await tmapRequest('/routes/pedestrian?version=1', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                version: '1', startX: String(startLng), startY: String(startLat),
                endX: String(endLng), endY: String(endLat),
                startName: '현재 위치', endName: String(req.body.endName || '목적지')
            })
        });
        res.json(route);
    } catch (error) {
        next(error);
    }
};
