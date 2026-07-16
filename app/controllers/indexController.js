const poiService = require('../services/poiService');
const tmapService = require('../services/tmapService');

exports.getPois = async (req, res, next) => {
    try {
        const pois = await poiService.getPois(String(req.query.search || '').trim());
        res.json({ resultData: pois, resultCnt: pois.length });
    } catch (error) {
        next(error);
    }
};

exports.importPois = async (req, res, next) => {
    try {
        const count = await poiService.importExcel(req.file);
        res.json({ message: `${count}건의 POI를 저장했습니다.`, resultCnt: count });
    } catch (error) {
        next(error);
    }
};

exports.reverseGeocode = async (req, res, next) => {
    try {
        const result = await tmapService.reverseGeocode(req.query);
        res.json(result);
    } catch (error) {
        next(error);
    }
};

exports.getPedestrianRoute = async (req, res, next) => {
    try {
        const route = await tmapService.getPedestrianRoute(req.body);
        res.json(route);
    } catch (error) {
        next(error);
    }
};
