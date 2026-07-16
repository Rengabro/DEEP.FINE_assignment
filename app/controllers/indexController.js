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
        const result = await poiService.importExcel(req.file);
        res.json({
            message: `기존 ${result.previousCount}건을 삭제하고 ${result.importedCount}건의 POI를 저장했습니다.`,
            resultCnt: result.importedCount,
            resultData: result
        });
    } catch (error) {
        next(error);
    }
};

exports.previewPoisImport = async (req, res, next) => {
    try {
        res.json({ resultData: poiService.previewExcel(req.file) });
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
