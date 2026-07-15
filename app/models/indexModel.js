let baseModel = require('./baseModel');

const INDEX = {
    id: null
    , name: null
};

const CREATE_POI_TABLE = `
    CREATE TABLE IF NOT EXISTS tb_poi (
        id BIGSERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        latitude DOUBLE PRECISION NOT NULL,
        longitude DOUBLE PRECISION NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
`;

exports.findPois = async (search = '') => {
    await psql.query(CREATE_POI_TABLE);

    const hasSearch = Boolean(search);
    const result = await psql.query(
        `SELECT id, title, latitude, longitude
           FROM tb_poi
          ${hasSearch ? 'WHERE title ILIKE $1' : ''}
          ORDER BY title, id`,
        hasSearch ? [`%${search}%`] : []
    );
    return result.rows;
};

/** Replace all POIs atomically so the uploaded Excel file is the source of truth. */
exports.replacePois = async (pois) => {
    const connection = await psql.getConnection();
    try {
        await connection.query('BEGIN');
        await connection.query(CREATE_POI_TABLE);
        await connection.query('TRUNCATE TABLE tb_poi RESTART IDENTITY');

        for (let offset = 0; offset < pois.length; offset += 500) {
            const chunk = pois.slice(offset, offset + 500);
            const values = [];
            const placeholders = chunk.map((poi, index) => {
                const position = index * 3;
                values.push(poi.title, poi.latitude, poi.longitude);
                return `($${position + 1}, $${position + 2}, $${position + 3})`;
            });
            await connection.query(
                `INSERT INTO tb_poi (title, latitude, longitude) VALUES ${placeholders.join(', ')}`,
                values
            );
        }

        await connection.query('COMMIT');
        return pois.length;
    } catch (error) {
        await connection.query('ROLLBACK');
        throw error;
    } finally {
        connection.release();
    }
};

exports.newModel = (opt) => {
    return baseModel.extend(INDEX, opt);
};
