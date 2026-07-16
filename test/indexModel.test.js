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
    assert.ok(connection.queries.some(({ text }) => text.includes('TRUNCATE TABLE tb_poi RESTART IDENTITY')));
    assert.ok(connection.queries.some(({ text, values }) => text.includes('INSERT INTO tb_poi') && values.length === 6));
    assert.match(connection.queries.at(-1).text, /COMMIT/);
    assert.equal(connection.released, true);
});
