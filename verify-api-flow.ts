import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api',
  timeout: 5000,
});

async function verifyFlow() {
    const testEmail = `test_${Date.now()}@atos2.com`;
    const testNickname = `test_${Date.now()}`;
    const testPhone = `119${Math.floor(10000000 + Math.random() * 90000000)}`;
    
    try {
      console.log('1. Health Check...');
      const health = await axios.get('http://localhost:3000/health');
      console.log('Health:', health.data.success ? 'OK' : 'FAIL');
  
      console.log('2. Registering User:', testEmail, 'Phone:', testPhone);
      const regRes = await api.post('/auth/register', {
        email: testEmail,
        phone: testPhone,
      nickname: testNickname,
      name: 'Test Agent',
      personType: 'PF',
      cpf: '12345678901',
      cep: '01001000',
      password: 'Password123!',
      passwordConfirm: 'Password123!',
      preferredLanguage: 'pt-BR'
    });
    console.log('Register Success:', regRes.data.success);

    console.log('3. Logging in...');
    const loginRes = await api.post('/auth/login', {
      email: testEmail,
      password: 'Password123!'
    });
    console.log('Login Success:', loginRes.data.success);
    const token = loginRes.data.data.token;
    console.log('Token received:', token ? 'YES' : 'NO');

    console.log('4. Testing Protected Route (Profile)...');
    const profileRes = await api.get('/auth/me', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Profile Success:', profileRes.data.success);
    console.log('Authenticated User:', profileRes.data.data.nickname);

    console.log('✅ ALL TESTS PASSED');
  } catch (e: any) {
    console.error('❌ TEST FAILED');
    if (e.response) {
      console.error('Status:', e.response.status);
      console.error('Data:', JSON.stringify(e.response.data));
    } else {
      console.error('Error:', e.message);
    }
  } finally {
    process.exit();
  }
}

verifyFlow();
