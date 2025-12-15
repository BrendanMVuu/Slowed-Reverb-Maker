let audioCtx, source, buffer, reverbNode, dryGain, wetGain, analyser;
let isPlaying = false;

const fileInput = document.getElementById('audioInput');
const playBtn = document.getElementById('playBtn');
const speedControl = document.getElementById('speed');
const reverbControl = document.getElementById('reverb');
const statusText = document.getElementById('status');
const speedVal = document.getElementById('speedVal');
const reverbVal = document.getElementById('reverbVal');
const visualizer = document.getElementById('visualizer');

// Visualizer bars
const barCount = 30;
const bars = Array.from({ length: barCount }, () => {
  const bar = document.createElement('div');
  bar.className = 'bar';
  bar.style.height = '2px';
  visualizer.appendChild(bar);
  return bar;
});

function buildImpulse(ctx) {
  const rate = ctx.sampleRate;
  const length = rate * 3.0;
  const decay = 2.0;
  const impulse = ctx.createBuffer(2, length, rate);
  const left = impulse.getChannelData(0);
  const right = impulse.getChannelData(1);

  for (let i = 0; i < length; i++) {
    const val = Math.pow(1 - i / length, decay);
    left[i] = (Math.random() * 2 - 1) * val;
    right[i] = (Math.random() * 2 - 1) * val;
  }
  return impulse;
}

async function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    dryGain = audioCtx.createGain();
    wetGain = audioCtx.createGain();
    reverbNode = audioCtx.createConvolver();
    analyser = audioCtx.createAnalyser();

    reverbNode.buffer = buildImpulse(audioCtx);

    dryGain.connect(analyser);
    wetGain.connect(analyser);
    analyser.connect(audioCtx.destination);
    analyser.fftSize = 64;

    updateMix();
  }
  if (audioCtx.state === 'suspended') await audioCtx.resume();
}

fileInput.addEventListener('change', async e => {
  const file = e.target.files[0];
  if (!file) return;
  statusText.textContent = "Loading & Decoding...";
  playBtn.classList.remove('active');
  await initAudio();

  const reader = new FileReader();
  reader.onload = ev => {
    audioCtx.decodeAudioData(ev.target.result, decodedBuffer => {
      buffer = decodedBuffer;
      statusText.textContent = "Ready to play!";
      playBtn.classList.add('active');
      playAudio();
    }, err => {
      statusText.textContent = "Error decoding file.";
      console.error(err);
    });
  };
  reader.readAsArrayBuffer(file);
});

function playAudio() {
  if (source) source.stop();
  source = audioCtx.createBufferSource();
  source.buffer = buffer;
  source.connect(dryGain);
  source.connect(reverbNode);
  reverbNode.connect(wetGain);

  source.playbackRate.value = speedControl.value;
  source.loop = true;
  source.start(0);

  isPlaying = true;
  playBtn.innerText = "Pause";
  animate();
}

function togglePlay() {
  if (!buffer) return;
  if (isPlaying) {
    audioCtx.suspend();
    isPlaying = false;
    playBtn.innerText = "Play";
  } else {
    audioCtx.resume();
    isPlaying = true;
    playBtn.innerText = "Pause";
    animate();
  }
}

playBtn.addEventListener('click', togglePlay);

speedControl.addEventListener('input', e => {
  const val = e.target.value;
  speedVal.textContent = val + 'x';
  if (source) source.playbackRate.value = val;
});

reverbControl.addEventListener('input', e => {
  const val = e.target.value;
  reverbVal.textContent = Math.round(val * 100) + '%';
  updateMix();
});

function updateMix() {
  dryGain.gain.value = 1 - reverbControl.value;
  wetGain.gain.value = reverbControl.value;
}

function animate() {
  if (!isPlaying) return;
  const dataArray = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(dataArray);
  
  bars.forEach((bar, i) => {
    bar.style.height = (dataArray[i] / 255 * 100) + '%';
  });
  
  requestAnimationFrame(animate);
}
