import { MercadoPagoConfig, Payment } from 'mercadopago';
import dotenv from 'dotenv';
dotenv.config();

const client = new MercadoPagoConfig({
    accessToken: process.env.MP_ACCESS_TOKEN || '',
    options: { timeout: 15000 }
});

const payment = new Payment(client);

async function checkSdk() {
    console.log('Payment.create parameters:', payment.create.toString());
}

checkSdk();
