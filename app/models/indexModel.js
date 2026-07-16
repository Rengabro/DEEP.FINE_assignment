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
        CONSTRAINT chk_tb_poi_latitude_range CHECK (latitude BETWEEN -90 AND 90),
        CONSTRAINT chk_tb_poi_longitude_range CHECK (longitude BETWEEN -180 AND 180),
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMPTZ NULL
    )
`;

const ADD_POI_CONSTRAINTS = `
    DO $$
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = 'chk_tb_poi_latitude_range'
              AND conrelid = 'tb_poi'::regclass
        ) THEN
            ALTER TABLE tb_poi
                ADD CONSTRAINT chk_tb_poi_latitude_range CHECK (latitude BETWEEN -90 AND 90);
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = 'chk_tb_poi_longitude_range'
              AND conrelid = 'tb_poi'::regclass
        ) THEN
            ALTER TABLE tb_poi
                ADD CONSTRAINT chk_tb_poi_longitude_range CHECK (longitude BETWEEN -180 AND 180);
        END IF;
    END $$;
`;

const CREATE_POI_TITLE_INDEX = `
    CREATE INDEX IF NOT EXISTS idx_tb_poi_title_id ON tb_poi (title, id)
`;

const ADD_POI_SOFT_DELETE_COLUMN = `
    ALTER TABLE tb_poi
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL
`;

const ensurePoiSchema = async (connection) => {
    await connection.query(CREATE_POI_TABLE);
    await connection.query(ADD_POI_CONSTRAINTS);
    await connection.query(ADD_POI_SOFT_DELETE_COLUMN);
    await connection.query(CREATE_POI_TITLE_INDEX);
};

exports.findPois = async (search = '') => {
    await ensurePoiSchema(psql);

    const hasSearch = Boolean(search);
    const result = await psql.query(
        `SELECT id, title, latitude, longitude
           FROM tb_poi
          WHERE deleted_at IS NULL
            ${hasSearch ? 'AND title ILIKE $1' : ''}
          ORDER BY title, id`,
        hasSearch ? [`%${search}%`] : []
    );
    return result.rows;
};

exports.createPoi = async ({ title, latitude, longitude }) => {
    await ensurePoiSchema(psql);
    const result = await psql.query(
        `INSERT INTO tb_poi (title, latitude, longitude)
         VALUES ($1, $2, $3)
         RETURNING id, title, latitude, longitude`,
        [title, latitude, longitude]
    );
    return result.rows[0];
};

exports.deletePoi = async (id) => {
    await ensurePoiSchema(psql);
    const result = await psql.query(
        `UPDATE tb_poi
            SET deleted_at = CURRENT_TIMESTAMP
          WHERE id = $1
            AND deleted_at IS NULL
         RETURNING id, title, deleted_at`,
        [id]
    );
    return result.rows[0] || null;
};

/** Replace all POIs atomically so the uploaded Excel file is the source of truth. */
exports.replacePois = async (pois) => {
    const connection = await psql.getConnection();
    try {
        await connection.query('BEGIN');
        await ensurePoiSchema(connection);
        const previousCountResult = await connection.query('SELECT COUNT(*)::int AS count FROM tb_poi');
        const previousCount = previousCountResult.rows[0].count;
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
        return { previousCount, importedCount: pois.length };
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
