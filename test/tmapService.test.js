const assert = require('node:assert/strict');
const test = require('node:test');
const tmapService = require('../app/services/tmapService');

test('returns 503 before calling TMAP when the server key is missing', async (t) => {
    const originalKey = process.env.TMAP_API_KEY;
    delete process.env.TMAP_API_KEY;
    t.after(() => { process.env.TMAP_API_KEY = originalKey; });

    await assert.rejects(
        () => tmapService.reverseGeocode({ latitude: 37.5295, longitude: 126.9655 }),
        (error) => error.status === 503
    );
});

test('sends the TMAP key only as a server-side request header', async (t) => {
    const originalKey = process.env.TMAP_API_KEY;
    const originalFetch = global.fetch;
    process.env.TMAP_API_KEY = 'test-server-key';
    global.fetch = async (url, options) => {
        assert.match(url, /reversegeocoding/);
        assert.equal(options.headers.appKey, 'test-server-key');
        return { ok: true, json: async () => ({ addressInfo: { fullAddress: '테스트 주소' } }) };
    };
    t.after(() => {
        process.env.TMAP_API_KEY = originalKey;
        global.fetch = originalFetch;
    });

    const result = await tmapService.reverseGeocode({ latitude: 37.5295, longitude: 126.9655 });
    assert.equal(result.addressInfo.fullAddress, '테스트 주소');
});
