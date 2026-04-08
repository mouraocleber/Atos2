import axios from 'axios';

async function testApi() {
  try {
    // 1. Get token
    const loginResp = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'mourao.cleber@gmail.comm',
      password: 'mourao.cleber'
    });
    const token = loginResp.data.data.token;
    
    // 2. Mock create pix just like App
    const resp = await axios.post('http://localhost:3000/api/payments/deposit/pix', 
      { amount: 10 }, 
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log('SUCCESS:', resp.data.data.pix);
    process.exit(0);
  } catch (e: any) {
    console.error('FAILED:');
    if (e.response) {
      console.error(e.response.data);
    } else {
      console.error(e);
    }
    process.exit(1);
  }
}

testApi();
