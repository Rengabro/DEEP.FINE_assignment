const assert = require('node:assert/strict');
const test = require('node:test');
const XLSX = require('xlsx');

const indexModel = require('../app/models/indexModel');
const poiService = require('../app/services/poiService');

const createExcelFile = (rows) => {
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, sheet, 'POI');
    return { buffer: XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) };
};

test('imports valid Excel rows and replaces the POI dataset', async (t) => {
    const originalReplacePois = indexModel.replacePois;
    let savedPois;
    indexModel.replacePois = async (pois) => {
        savedPois = pois;
        return { previousCount: 3, importedCount: pois.length };
    };
    t.after(() => { indexModel.replacePois = originalReplacePois; });

    const count = await poiService.importExcel(createExcelFile([
        { title: '테스트 POI', latitude: 37.5295, longitude: 126.9655 }
    ]));

    assert.deepEqual(count, { previousCount: 3, importedCount: 1 });
    assert.deepEqual(savedPois, [
        { title: '테스트 POI', latitude: 37.5295, longitude: 126.9655 }
    ]);
});

test('returns the valid row count before importing an Excel file', () => {
    const preview = poiService.previewExcel(createExcelFile([
        { title: '첫 번째 POI', latitude: 37.5295, longitude: 126.9655 },
        { title: '두 번째 POI', latitude: 37.5311, longitude: 126.9647 }
    ]));

    assert.deepEqual(preview, { validCount: 2 });
});

test('creates a POI with validated map coordinates', async (t) => {
    const originalCreatePoi = indexModel.createPoi;
    indexModel.createPoi = async (poi) => ({ id: 10, ...poi });
    t.after(() => { indexModel.createPoi = originalCreatePoi; });

    const poi = await poiService.createPoi({
        title: '지도 클릭 POI',
        latitude: '37.5295',
        longitude: '126.9655'
    });

    assert.deepEqual(poi, {
        id: 10,
        title: '지도 클릭 POI',
        latitude: 37.5295,
        longitude: 126.9655
    });
});

test('deletes a POI by its valid identifier', async (t) => {
    const originalDeletePoi = indexModel.deletePoi;
    indexModel.deletePoi = async (id) => ({ id, title: '삭제할 POI' });
    t.after(() => { indexModel.deletePoi = originalDeletePoi; });

    const poi = await poiService.deletePoi('11');
    assert.deepEqual(poi, { id: 11, title: '삭제할 POI' });
});

test('rejects an Excel file with invalid coordinates', async () => {
    const file = createExcelFile([
        { title: '잘못된 POI', latitude: 100, longitude: 126.9655 }
    ]);

    await assert.rejects(
        () => poiService.importExcel(file),
        (error) => error.status === 400 && error.invalidRows.includes(2)
    );
});
