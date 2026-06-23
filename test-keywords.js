const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'admin',
  database: 'app_mensagens_cash',
});

async function run() {
  await client.connect();
  console.log('Connected to PG');

  // Let's create a test user
  const userRes = await client.query(`
    INSERT INTO users (email, phone, nickname, name, person_type, cpf, cep, password_hash, is_active, is_searchable, plan)
    VALUES ('testkeyword@example.com', '12345678', 'testkw', 'Test Keyword User', 'PF', '12345678901', '01001000', 'hash', true, true, 'PRO')
    ON CONFLICT (email) DO UPDATE SET plan = 'PRO'
    RETURNING id;
  `);
  const userId = userRes.rows[0].id;
  console.log('User ID:', userId);

  // Let's buy a keyword
  await client.query(`
    INSERT INTO user_search_keywords (user_id, keyword, position, price_paid, expires_at, active)
    VALUES ($1, 'bolo', 1, 0, NOW() + INTERVAL '30 days', true)
    ON CONFLICT (user_id, position) DO UPDATE SET keyword = 'bolo', active = true;
  `, [userId]);
  console.log('Keyword inserted');

  // Let's execute the search query
  const sql = `
    SELECT
      u.id, u.email, u.phone, u.nickname, u.name, u.person_type, u.cep, u.address,
      u.city, u.state, u.profile_image, u.status, u.preferred_language, u.created_at,
      u.latitude, u.longitude, u.is_searchable,
      COALESCE(r.average_rating, 0) as average_rating,
      COALESCE(r.total_reviews, 0) as total_reviews,
      CASE
        WHEN COALESCE(r.average_rating, 0) >= 4.8 THEN 'LENDÁRIO'
        WHEN COALESCE(r.average_rating, 0) >= 4.5 THEN 'EXCELENTE'
        WHEN COALESCE(r.average_rating, 0) >= 4.0 THEN 'CONFIÁVEL'
        WHEN COALESCE(r.average_rating, 0) >= 3.5 THEN 'INICIANTE'
        ELSE 'NOVO'
      END as rating_level,
      MIN(CASE WHEN uk.active = true AND uk.expires_at > CURRENT_TIMESTAMP AND uk.keyword ILIKE $1 THEN uk.position ELSE 99 END) as keyword_rank
    FROM users u
    LEFT JOIN user_reputation r ON u.id = r.user_id
    LEFT JOIN user_search_keywords uk ON u.id = uk.user_id
    WHERE u.is_active = true AND u.is_searchable = true AND (
      u.nickname ILIKE $1 OR 
      u.name ILIKE $1 OR 
      u.email ILIKE $1 OR 
      u.phone ILIKE $1 OR 
      u.cep ILIKE $1 OR
      uk.keyword ILIKE $1
    )
    GROUP BY u.id, r.average_rating, r.total_reviews
    ORDER BY keyword_rank ASC, average_rating DESC, u.name ASC
    LIMIT 20 OFFSET 0
  `;

  try {
    const searchRes = await client.query(sql, ['%bolo%']);
    console.log('Search success, rows count:', searchRes.rows.length);
    console.log('Row sample:', searchRes.rows[0]);
  } catch (err) {
    console.error('Search query failed:', err);
  }

  await client.end();
}

run().catch(console.error);
