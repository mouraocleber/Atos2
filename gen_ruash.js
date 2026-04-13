const fs = require('fs');
const path = require('path');

const sampleRate = 44100;
const duration = 1.5; // Retornando aos 1.5 segundos
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

// Modificador de ruído para som GRAVE (Brown Noise) - Vento pesado e denso
let lastBrown = 0;

for (let i = 0; i < numSamples; i++) {
  const t = i / sampleRate;

  // Formato "Sopro" - O ar sai rápido dos pulmões (0.2s) e vai se esgotando suavemente até 1.5s
  let envelope = 0.0;
  if (t < 0.2) {
    envelope = t / 0.2; // Entrada rápida e intensa (impulso de sopro)
  } else {
    envelope = Math.max(0, 1.0 - ((t - 0.2) / 1.3)); // Vai morrendo até o fim
  }
  
  // Curva exponencial para queda mais dramática e natural
  envelope = Math.pow(envelope, 1.5);

  // Brown noise reforçado (vento super grave)
  let white = (Math.random() * 2 - 1);
  let brown = (lastBrown + (0.015 * white)) / 1.015;
  lastBrown = brown;
  let noise = brown * 5.0; 

  // LFO MAIS LENTO para dar onda de brisa
  let lfo = 2.0 + Math.sin(t * Math.PI * 2 * 0.5) * 0.4;

  // CAMADA "VIRAL" - Acorde de Sinos/Vogal Celestial
  // Criar um envelope separado para a harmonia (Bell)
  let bellEnv = Math.max(0, 1.0 - (t / 0.8)); // O "Sino" some rápido (0.8s)
  bellEnv = Math.pow(bellEnv, 2.5); // Corte percussivo suave (tipo vibração do vidro)

  // Frequências Místicas/Gospel: Dó Maior com 7M ou 9a (C, E, G, B) em 432Hz vibe
  // Fundamental 528 Hz (conhecida como 'Frequência do Milagre' na musicoterapia)
  let osc1 = Math.sin(t * Math.PI * 2 * 528.00); 
  let osc2 = Math.sin(t * Math.PI * 2 * 659.25); // Mi
  let osc3 = Math.sin(t * Math.PI * 2 * 792.00); // Sol

  // Harmônicos cristalinos agudos (tilt)
  let sparkle = (Math.sin(t * Math.PI * 2 * 1056.00) * 0.5) + (Math.sin(t * Math.PI * 2 * 1318.5) * 0.25);
  
  // Mistura as notas
  let harmonicLayer = ((osc1 + osc2 + osc3) / 3.0) + (sparkle * 0.3);

  // Mix Final: Sopra o grave com força + Toque do Acorde de Vidro mágico no meio do vento!
  let sampleWind = noise * envelope * lfo * 0.85;
  let sampleHarmonic = harmonicLayer * bellEnv * 0.25; // 25% de melodia no fundo

  let sample = sampleWind + sampleHarmonic; 
  
  let intSample = Math.max(-1, Math.min(1, sample)) * 32767;
  buffer.writeInt16LE(intSample, offset);
  offset += 2;
}

const dir = path.join(__dirname, 'atos2-antigravity', 'assets', 'sounds');
fs.mkdirSync(dir, { recursive: true });

const filePath = path.join(dir, 'ruash.wav');
fs.writeFileSync(filePath, buffer);
console.log('Ruash Vento Suave Criado: ', filePath);
