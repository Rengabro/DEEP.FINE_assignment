const { createHttpError } = require('./httpError');

exports.toCoordinate = (value) => {
    const coordinate = Number(value);
    return Number.isFinite(coordinate) ? coordinate : null;
};

exports.isValidCoordinate = (latitude, longitude) =>
    latitude !== null && longitude !== null &&
    latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;

exports.assertCoordinate = (latitude, longitude, message) => {
    if (!exports.isValidCoordinate(latitude, longitude)) {
        throw createHttpError(400, message);
    }
};
