var audioMidiJS = {
	audioCtx : new (window.AudioContext || window.webkitAudioContext)(),
	notes : ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'],
	init : function () {
		this.canvasCtx = document.querySelector('canvas').getContext("2d");

		this.analyser = this.audioCtx.createAnalyser();
		source = this.audioCtx.createMediaElementSource(document.querySelector('audio'));
		source.connect(this.analyser);
		this.analyser.connect(this.audioCtx.destination);
		this.analyser.fftSize = 2048;
		this.bufferLength = this.analyser.frequencyBinCount;

		this.dataArray = new Uint8Array(this.bufferLength);
		this.frequencies = new Float32Array(this.bufferLength);
		this.noteArray = this.buildNoteArray(5);
		this.run();

		return this;
	},
	//https://github.com/fritzvd/signaltohertz
	calculateHertz : function (frequencies, options) {
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
	},
	// http://www.phy.mtu.edu/~suits/NoteFreqCalcs.html
	getFrequencyByNote : function (note, octave) {
		// note is only naturals and sharps for now
		// Use A4 440hz as reference note
		// Figure out how many half steps away from A4 this note is

		var octaveDiff = octave - 4;
		var distance = this.notes.indexOf(note) - this.notes.indexOf('A') + octaveDiff * 12;
		var hertz = 440 * Math.pow(Math.pow(2, 1/12), distance);
		return hertz;
	},
	// Build object of notes and frequencies [{note: 'A', octave: 1, frequency : 440}]
	buildNoteArray : function (octaves) {
		var noteObject = [];

		for (var i = 1; i <= octaves; i++) {
			for (var j in this.notes) {
				noteObject.push({
									note: this.notes[j],
									octave: i,
									frequency: this.getFrequencyByNote(this.notes[j], i)
								});
			}
		}

		return noteObject;
	},
	// Match frequency to closest note
	matchNoteToFrequency : function (frequency) {
		var closestMatch = 0; // index of NoteArray

		for (var i in this.noteArray) {
			if (Math.abs(this.noteArray[i].frequency - frequency) < Math.abs(this.noteArray[closestMatch].frequency - frequency)) {
				closestMatch = i;
			}
		}

		return this.noteArray[closestMatch];
	},
	run : function () {
		drawVisual = requestAnimationFrame(this.run.bind(this));

		this.analyser.getFloatFrequencyData(this.frequencies);
		this.analyser.getByteTimeDomainData(this.dataArray);
		frequency = this.calculateHertz(this.frequencies);

		this.canvasCtx.fillStyle = 'rgb(0, 400, 0)';
		this.canvasCtx.fillRect(0, 0, 500, 500);

		var barWidth = (100 / this.bufferLength) * 2.5;
		var barHeight;
		var x = 0;

		for(var i = 0; i < this.bufferLength; i++) {
			barHeight = this.dataArray[i];

			this.canvasCtx.fillStyle = 'rgb(' + (barHeight+100) + ',60,60)';
			this.canvasCtx.fillRect(x,150-barHeight/2,barWidth,barHeight/2);

			x += barWidth + 1;
		}

		var note = this.matchNoteToFrequency(frequency);

		document.getElementById('frequency').innerHTML = JSON.stringify(this.matchNoteToFrequency(frequency)) + ' diff: ' + (note.frequency - frequency);	
	}

};

audioMidiJS.init();


