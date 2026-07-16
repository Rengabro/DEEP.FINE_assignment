const XLSX = require('xlsx');
const indexModel = require('../models/indexModel');

const createHttpError = (status, message, extra = {}) =>
    Object.assign(new Error(message), { status, ...extra });

const toCoordinate = (value) => {
    const coordinate = Number(value);
    return Number.isFinite(coordinate) ? coordinate : null;
};

const isValidCoordinate = (latitude, longitude) =>
    latitude !== null && longitude !== null &&
    latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;

const readPoisFromExcel = (file) => {
    if (!file) {
        throw createHttpError(400, '업로드할 .xlsx 파일을 선택해 주세요.');
    }

    const workbook = XLSX.read(file.buffer, { type: 'buffer', raw: true });
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
        throw createHttpError(
            400,
            '엑셀의 title, latitude, longitude 컬럼을 확인해 주세요.',
            { invalidRows }
        );
    }

    return pois;
};

exports.getPois = (search) => indexModel.findPois(search);

exports.importExcel = async (file) => {
    const pois = readPoisFromExcel(file);
    return indexModel.replacePois(pois);
};
