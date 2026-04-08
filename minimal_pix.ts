import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

async function minimalPix() {
    const token = process.env.MP_ACCESS_TOKEN;
    const body = {
        transaction_amount: 15.00,
        payment_method_id: 'pix',
        payer: {
          email: "test_user_64689405@testuser.com"
        }
    };

    console.log('Using Token:', token?.substring(0, 15));

    try {
        const response = await axios.post('https://api.mercadopago.com/v1/payments', body, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        console.log('Success!', response.data.id);
    } catch (e: any) {
        console.error('Status:', e.response?.status);
        console.error('Data:', JSON.stringify(e.response?.data, null, 2));
    }
}

minimalPix();
