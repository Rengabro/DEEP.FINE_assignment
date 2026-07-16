const assert = require('node:assert/strict');
const test = require('node:test');

const createConnection = () => {
    const queries = [];
    let released = false;
    return {
        queries,
        get released() { return released; },
        query: async (text, values = []) => {
            queries.push({ text, values });
            return text.includes('SELECT COUNT(*)') ? { rows: [{ count: 3 }] } : { rows: [] };
        },
        release: () => { released = true; }
    };
};

test('replaces POIs in one transaction after truncating existing rows', async () => {
    const connection = createConnection();
    global.psql = { getConnection: async () => connection };
    const indexModel = require('../app/models/indexModel');

    const count = await indexModel.replacePois([
        { title: 'A', latitude: 37.5, longitude: 126.9 },
        { title: 'B', latitude: 37.6, longitude: 127.0 }
    ]);

    assert.deepEqual(count, { previousCount: 3, importedCount: 2 });
    assert.match(connection.queries[0].text, /BEGIN/);
    assert.ok(connection.queries.some(({ text }) => text.includes('chk_tb_poi_latitude_range')));
    assert.ok(connection.queries.some(({ text }) => text.includes('idx_tb_poi_title_id')));
    assert.ok(connection.queries.some(({ text }) => text.includes('TRUNCATE TABLE tb_poi RESTART IDENTITY')));
    assert.ok(connection.queries.some(({ text, values }) => text.includes('INSERT INTO tb_poi') && values.length === 6));
    assert.match(connection.queries.at(-1).text, /COMMIT/);
    assert.equal(connection.released, true);
});

test('inserts a manually created POI with parameter binding', async () => {
    const queries = [];
    global.psql = {
        query: async (text, values = []) => {
            queries.push({ text, values });
            if (text.includes('RETURNING id')) {
                return { rows: [{ id: 9, title: '지도 클릭 POI', latitude: 37.5295, longitude: 126.9655 }] };
            }
            return { rows: [] };
        }
    };
    const indexModel = require('../app/models/indexModel');

    const poi = await indexModel.createPoi({
        title: '지도 클릭 POI',
        latitude: 37.5295,
        longitude: 126.9655
    });

    assert.equal(poi.id, 9);
    assert.ok(queries.some(({ text, values }) =>
        text.includes('INSERT INTO tb_poi') && values.join('|') === '지도 클릭 POI|37.5295|126.9655'
    ));
});

test('deletes a POI with parameter binding', async () => {
    const queries = [];
    global.psql = {
        query: async (text, values = []) => {
            queries.push({ text, values });
            if (text.includes('DELETE FROM tb_poi')) {
                return { rows: [{ id: 12, title: '삭제할 POI' }] };
            }
            return { rows: [] };
        }
    };
    const indexModel = require('../app/models/indexModel');

    const poi = await indexModel.deletePoi(12);

    assert.deepEqual(poi, { id: 12, title: '삭제할 POI' });
    assert.ok(queries.some(({ text, values }) =>
        text.includes('DELETE FROM tb_poi') && values[0] === 12
    ));
});
