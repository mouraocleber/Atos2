import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

async function verifyRawPix() {
    const token = process.env.MP_ACCESS_TOKEN;
    const body = {
        transaction_amount: 10,
        description: 'Recarga de Saldo Atos2 Wallet',
        payment_method_id: 'pix',
        payer: {
          email: "mourao.cleber@gmail.com",
          first_name: "Cleber",
          last_name: "Mourao",
          phone: {
            area_code: "11",
            number: "999999999"
          },
          identification: {
            type: "CPF",
            number: "85805254620"
          }
        },
        external_reference: "raw_test_" + Date.now(),
    };

    console.log('Using Token:', token?.substring(0, 10));

    try {
        const response = await axios.post('https://api.mercadopago.com/v1/payments', body, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'X-Idempotency-Key': "raw_test_" + Date.now()
            }
        });
        console.log('Success!', response.data);
    } catch (e: any) {
        console.error('Raw Error Status:', e.response?.status);
        console.error('Raw Error Data:', JSON.stringify(e.response?.data, null, 2));
    }
}

verifyRawPix();
