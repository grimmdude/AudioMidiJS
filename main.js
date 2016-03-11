//https://github.com/fritzvd/signaltohertz
function calculateHertz (frequencies, options) {
  var rate = 22050 / 1024; // defaults in audioContext.

	if (options) {
		if (options.rate) {
			rate = options.rate;
		}
	}

	var maxI, max = frequencies[0];
  
	for (var i=0; frequencies.length > i; i++) {
		var oldmax = parseFloat(max);
		var newmax = Math.max(max, frequencies[i]);
		if (oldmax != newmax) {
			max = newmax;
			maxI = i;
		} 
	}
	return maxI * rate;
}

var notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// http://www.phy.mtu.edu/~suits/NoteFreqCalcs.html
// note is only naturals and sharps for now
function getFrequencyByNote(note, octave) {
	// Use A4 440hz as reference note
	// Figure out how many half steps away from A4 this note is

	var octaveDiff = octave - 4;
	var distance = notes.indexOf(note) - notes.indexOf('A') + octaveDiff * 12;
	var hertz = 440 * Math.pow(Math.pow(2, 1/12), distance);
	return hertz;
}

var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
var canvasCtx = document.querySelector('canvas').getContext("2d");;
var analyser = audioCtx.createAnalyser();

var myAudio = document.querySelector('audio');
var source = audioCtx.createMediaElementSource(myAudio);

source.connect(analyser);
analyser.connect(audioCtx.destination)

analyser.fftSize = 2048;
var bufferLength = analyser.frequencyBinCount;
var dataArray = new Uint8Array(bufferLength);
var frequencies = new Float32Array(bufferLength);

analyser.getByteTimeDomainData(dataArray);

var highest = 0;
//console.log(dataArray);
function run() {
  drawVisual = requestAnimationFrame(run);

  analyser.getFloatFrequencyData(frequencies);
  analyser.getByteTimeDomainData(dataArray);
  frequency = calculateHertz(frequencies);

  canvasCtx.fillStyle = 'rgb(0, 400, 0)';
  canvasCtx.fillRect(0, 0, 500, 500);

  var barWidth = (100 / bufferLength) * 2.5;
  var barHeight;
  var x = 0;

  for(var i = 0; i < bufferLength; i++) {
    barHeight = dataArray[i];

    canvasCtx.fillStyle = 'rgb(' + (barHeight+100) + ',60,60)';
    canvasCtx.fillRect(x,150-barHeight/2,barWidth,barHeight/2);

    x += barWidth + 1;
  }

  if (dataArray[0] > highest) {
  	highest = dataArray[0];
  }

  document.getElementById('frequency').innerHTML = frequency;
  //console.log(frequency);
	
}

run();