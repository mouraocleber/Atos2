import QRCode from 'qrcode';

const ips = ['10.213.69.86', '172.20.10.8', '26.52.34.169'];

async function generate() {
  console.log('\nGerando QR Codes...\n');
  for (const ip of ips) {
    const url = `exp://${ip}:8081`;
    console.log(`===========================================`);
    if (ip.startsWith('192')) {
      console.log(`📡 REDE LOCAL (Wi-Fi/Cabo): ${ip}`);
    } else {
      console.log(`🌐 REDE VPN (Radmin/Hamachi): ${ip}`);
    }
    console.log(`===========================================`);
    try {
      const string = await QRCode.toString(url, { type: 'terminal', small: true });
      console.log(string);
    } catch (e) {
      console.error(e);
    }
  }
  console.log('Finalizado.');
}

generate();
