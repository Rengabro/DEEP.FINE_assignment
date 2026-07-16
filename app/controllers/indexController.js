const poiService = require('../services/poiService');
const tmapService = require('../services/tmapService');
const { createSuccessResponse } = require('../utils/apiResponse');

exports.getPois = async (req, res, next) => {
    try {
        const pois = await poiService.getPois(String(req.query.search || '').trim());
        res.json(createSuccessResponse({ resultData: pois, resultCnt: pois.length }));
    } catch (error) {
        next(error);
    }
};

exports.createPoi = async (req, res, next) => {
    try {
        const poi = await poiService.createPoi(req.body);
        res.status(201).json(createSuccessResponse({
            message: 'POI를 추가했습니다.',
            resultData: poi,
            resultCnt: 1
        }));
    } catch (error) {
        next(error);
    }
};

exports.importPois = async (req, res, next) => {
    try {
        const result = await poiService.importExcel(req.file);
        res.json(createSuccessResponse({
            message: `기존 ${result.previousCount}건을 삭제하고 ${result.importedCount}건의 POI를 저장했습니다.`,
            resultCnt: result.importedCount,
            resultData: result
        }));
    } catch (error) {
        next(error);
    }
};

exports.previewPoisImport = async (req, res, next) => {
    try {
        res.json(createSuccessResponse({ resultData: poiService.previewExcel(req.file) }));
    } catch (error) {
        next(error);
    }
};

exports.reverseGeocode = async (req, res, next) => {
    try {
        const result = await tmapService.reverseGeocode(req.query);
        res.json(createSuccessResponse({ resultData: result, resultCnt: 1 }));
    } catch (error) {
        next(error);
    }
};

exports.getPedestrianRoute = async (req, res, next) => {
    try {
        const route = await tmapService.getPedestrianRoute(req.body);
        res.json(createSuccessResponse({ resultData: route, resultCnt: 1 }));
    } catch (error) {
        next(error);
    }
};
