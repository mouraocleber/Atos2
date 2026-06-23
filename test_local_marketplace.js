const axios = require('axios');
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'xyY2PgRtJTsDuZQRt4NpeusZMrpvtUU9gyXTk3Lfnn3MSm3u';
const token = jwt.sign({ userId: 'fea565be-2db0-4842-aca3-2f400b6717bf', email: 'vitrineuser@example.com' }, JWT_SECRET, { expiresIn: '1h' });

async function run() {
  try {
    const res = await axios.get('http://localhost:3001/api/products/marketplace', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Marketplace products count:', res.data.data.products.length);
    console.log('Marketplace products:', res.data.data.products);
  } catch (error) {
    console.error(error.message);
  }
}

run();
