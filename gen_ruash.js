const fs = require('fs');
const path = require('path');

const sampleRate = 44100;
const duration = 1.5; // 1.5 segundos para dar a fluidez do sopro
const numSamples = Math.floor(sampleRate * duration);
const numChannels = 1;

const buffer = Buffer.alloc(44 + numSamples * 2);

buffer.write('RIFF', 0);
buffer.writeUInt32LE(36 + numSamples * 2, 4);
buffer.write('WAVE', 8);
buffer.write('fmt ', 12);
buffer.writeUInt32LE(16, 16);
buffer.writeUInt16LE(1, 20);
buffer.writeUInt16LE(numChannels, 22);
buffer.writeUInt32LE(sampleRate, 24);
buffer.writeUInt32LE(sampleRate * numChannels * 2, 28);
buffer.writeUInt16LE(numChannels * 2, 32);
buffer.writeUInt16LE(16, 34);
buffer.write('data', 36);
buffer.writeUInt32LE(numSamples * 2, 40);

let offset = 44;

// Variáveis para o filtro Paul Kellet (Pink Noise) - o som clássico do Vento contínuo e suave
let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

for (let i = 0; i < numSamples; i++) {
  const t = i / sampleRate;

  // Envelope super macio 'Sopro' (vento batendo suave e indo embora)
  // Sobe gradualmente até 0.5s e desce flutuando até 1.5s
  let envelope = 0;
  if (t < 0.5) {
    envelope = Math.pow(t / 0.5, 1.5); // Attack curvo suave
  } else {
    envelope = Math.pow(Math.max(0, 1 - ((t - 0.5) / 1.0)), 2); // Decay contínuo e orgânico
  }

  // Gerador purista de Pink Noise (Ruído Rosa) = som de brisa sedosa
  let white = (Math.random() * 2 - 1);
  b0 = 0.99886 * b0 + white * 0.0555179;
  b1 = 0.99332 * b1 + white * 0.0750759;
  b2 = 0.96900 * b2 + white * 0.1538520;
  b3 = 0.86650 * b3 + white * 0.3104856;
  b4 = 0.55000 * b4 + white * 0.5329522;
  b5 = -0.7616 * b5 - white * 0.0168980;
  let pink = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
  b6 = white * 0.115926;

  // LFO oscila suavemente (Hz = 1.0) para dar uma ondulada ("vuuuuush")
  let lfo = 1.0 + Math.sin(t * Math.PI * 2 * 1.0) * 0.4;

  // Mix: O volume geral em 0.15 pra não estourar caixas
  let sample = pink * envelope * lfo * 0.15; 
  
  let intSample = Math.max(-1, Math.min(1, sample)) * 32767;
  buffer.writeInt16LE(intSample, offset);
  offset += 2;
}

const dir = path.join(__dirname, 'atos2-antigravity', 'assets', 'sounds');
fs.mkdirSync(dir, { recursive: true });

const filePath = path.join(dir, 'ruash.wav');
fs.writeFileSync(filePath, buffer);
console.log('Ruash Vento Suave Criado: ', filePath);
