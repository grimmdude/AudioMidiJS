var AudioMidiJS = {
	audioCtx : new (window.AudioContext || window.webkitAudioContext)(),
	notes : ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'],
	bounceData : [],
	currentNote : null,
	timer : 0,
	audioPlaying : true,
	init : function () {
		var self = this;
		this.canvasCtx = document.querySelector('canvas').getContext("2d");

		this.analyser = this.audioCtx.createAnalyser();
		var audioElement = document.querySelector('audio');
		source = this.audioCtx.createMediaElementSource(audioElement);
		source.connect(this.analyser);
		audioElement.onended = function() {
			self.audioPlaying = false;

			// Write MIDI
			var noteEvents = [];
			self.bounceData.map(function (element) {
				return element.note + element.octave;
			}).forEach(function(note) {
			    Array.prototype.push.apply(noteEvents, MidiEvent.createNote(note));
			});

			// Create a track that contains the events to play the notes above
			var track = new MidiTrack({ events: noteEvents });

			// Creates an object that contains the final MIDI track in base64 and some
			// useful methods.
			var song  = MidiWriter({ tracks: [track] });

			// Alert the base64 representation of the MIDI file
			alert(song.b64);

			// Play the song
			song.play();

			// Play/save the song (depending of MIDI plugins in the browser). It opens
			// a new window and loads the generated MIDI file with the proper MIME type
			song.save();
		};

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
		// note is only naturals and flats for now
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

		// default this.currentNote
		this.currentNote = noteObject[0];
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
	isNewNote : function(note) {
		if (this.currentNote.note != note.note) {
			return true;
		}
		return false;
	},
	isRest : function(frequency) {

	},
	startTimer : function() {
		this.timer = new Date().getTime()
	},
	stopTimer : function() {
		return new Date().getTime() - this.timer;
	},
	run : function () {
		if (this.audioPlaying) {
			this.animationFrame = requestAnimationFrame(this.run.bind(this));

		} else {
			cancelAnimationFrame(this.animationFrame);
		}

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

		note = this.matchNoteToFrequency(frequency);

		if (this.isNewNote(note)) {
			this.bounceData.push(note);
		}

		if (this.dataArray[0] == 128) {
			// This is no audio.
			//console.log('rest');
		}
		
		this.currentNote = note;
		
		document.getElementById('frequency').innerHTML = JSON.stringify(this.currentNote) + ' diff: ' + (this.currentNote.frequency - frequency);	
	}

};

AudioMidiJS.init();
