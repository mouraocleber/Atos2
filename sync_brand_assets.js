const { Client } = require('ssh2');

const config = {
  host: '142.93.59.54',
  port: 22,
  username: 'root',
  password: 'fElicid@de137L',
  readyTimeout: 15000,
};

const conn = new Client();

function uploadFile(sftp, local, remote) {
  return new Promise((resolve, reject) => {
    sftp.fastPut(local, remote, (err) => {
      if (err) return reject(err);
      console.log('Upload concluido: ' + remote);
      resolve();
    });
  });
}

function runExec(cmd) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let out = '';
      stream.on('data', d => { out += d; process.stdout.write(d); });
      stream.stderr.on('data', d => { out += d; process.stderr.write(d); });
      stream.on('close', code => {
        if (code !== 0) return reject(new Error('Command failed: ' + cmd + ' with code ' + code));
        resolve(out);
      });
    });
  });
}

conn.on('ready', async () => {
  try {
    console.log('SSH conectado. Sincronizando novo design, logo e marca AtoS2...');
    await runExec('mkdir -p /var/www/atos2-web/assets');

    const sftp = await new Promise((res, rej) => conn.sftp((e, s) => e ? rej(e) : res(s)));

    await uploadFile(sftp, 'c:/Users/Usuario/projetos/Atos2/landing-page/assets/logo_atos2.png', '/var/www/atos2-web/assets/logo_atos2.png');
    await uploadFile(sftp, 'c:/Users/Usuario/projetos/Atos2/landing-page/index.html', '/var/www/atos2-web/index.html');
    await uploadFile(sftp, 'c:/Users/Usuario/projetos/Atos2/landing-page/styles.css', '/var/www/atos2-web/styles.css');
    await uploadFile(sftp, 'c:/Users/Usuario/projetos/Atos2/landing-page/script.js', '/var/www/atos2-web/script.js');
    await uploadFile(sftp, 'c:/Users/Usuario/projetos/Atos2/pitch_deck_bilingual.html', '/var/www/atos2-web/pitch.html');
    await uploadFile(sftp, 'c:/Users/Usuario/projetos/Atos2/pitch_deck_en.html', '/var/www/atos2-web/pitch_en.html');
    await uploadFile(sftp, 'c:/Users/Usuario/projetos/Atos2/PITCH_DECK_ATOS2.md', '/var/www/atos2-web/pitch.md');
    await uploadFile(sftp, 'c:/Users/Usuario/projetos/Atos2/PITCH_DECK_ATOS2_EN.md', '/var/www/atos2-web/pitch_en.md');

    console.log('Recarregando Nginx...');
    await runExec('systemctl reload nginx');

    console.log('DEPLOY COMPLETO! Cores, logo oficial e nome AtoS2 sincronizados no servidor!');
  } catch (err) {
    console.error('Erro no deploy:', err);
  } finally {
    conn.end();
  }
}).connect(config);
