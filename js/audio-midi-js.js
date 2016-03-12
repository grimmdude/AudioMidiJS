if (typeof AudioMidiJS === 'undefined') {
    // the variable is defined
	var AudioMidiJS = {
		audioCtx : new (window.AudioContext || window.webkitAudioContext)(),
		analyser : null,
		notes : ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'],
		notesData : [],
		noteOn : false,
		currentNote : null,
		timers : [],
		sourceElement : null,
		audioPlaying : false,
		minimumDuration : 300,
		midiEvents : [],
		init : function () {
			var self = this;
			//this.canvasCtx = document.querySelector('canvas').getContext("2d");

			this.analyser = this.audioCtx.createAnalyser();
			var audioElement = document.querySelector('audio');
			var source = this.audioCtx.createMediaElementSource(audioElement);
			source.connect(this.analyser);

			this.analyser.connect(this.audioCtx.destination);
			this.analyser.fftSize = 2048;
			this.bufferLength = this.analyser.frequencyBinCount;

			this.dataArray = new Uint8Array(this.bufferLength);
			this.frequencies = new Float32Array(this.bufferLength);
			this.buildNotesData(5);

			audioElement.addEventListener('ended', function() {
				self.audioPlaying = false;

				//** JSMIDI **//
				// Write MIDI
				var noteEvents = [];
				self.midiEvents.map(function (element) {
					//console.log({pitch: element.note + element.octave, duration: element.duration});
					//return element.note + element.octave;
					return {pitch: element.note + element.octave, duration: element.duration/5};
				}).forEach(function(note) {
					//console.log(note);
				    Array.prototype.push.apply(noteEvents, MidiEvent.createNote(note));
				});
				//console.log(noteEvents);

				// Create a track that contains the events to play the notes above
				var track = new MidiTrack({ events: noteEvents });
				track.setTempo(10);

				// Creates an object that contains the final MIDI track in base64 and some
				// useful methods.
				var song  = MidiWriter({ tracks: [track] });

				// Alert the base64 representation of the MIDI file
				//console.log(song.b64);

				document.getElementById('midi-play').href = "javascript:void(play('data:audio/midi;base64," + song.b64 + "'));";
				// Play the song
				//song.play();

				// Play/save the song (depending of MIDI plugins in the browser). It opens
				// a new window and loads the generated MIDI file with the proper MIME type
				//song.save();
			}, true);

			audioElement.addEventListener('play', function() {
				self.startTimer(1);
				this.midiEvents = [];
				self.currentNote = null;
				self.audioPlaying = true;
				self.capture();
			}, true);

			return this;
		},
		setSource : function (sourceElement) {
			this.sourceElement = sourceElement;
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
		buildNotesData : function (octaves) {
			for (var i = 1; i <= octaves; i++) {
				for (var j in this.notes) {
					this.notesData.push(new this.note({
										note: this.notes[j],
										octave: i,
										frequency: this.getFrequencyByNote(this.notes[j], i)
									}));
				}
			}

			// default this.currentNote
			this.currentNote = this.notesData[0];
			return this;
		},
		// Match frequency to closest note
		matchNoteToFrequency : function (frequency) {
			var closestMatch = 0; // index of NoteArray
			var diff = 0;
			var lastDiff = 0; // Keep track of diff so if it's getting bigger we can break the loop.

			for (var i in this.notesData) {
				if (Math.abs(this.notesData[i].frequency - frequency) < Math.abs(this.notesData[closestMatch].frequency - frequency)) {
					closestMatch = i;
				}
			}

			return this.notesData[closestMatch];
		},
		isNewNote : function(note) {
			if (this.currentNote && note && this.currentNote.note != note.note) {
				return true;
			}
			return false;
		},
		startTimer : function(timerNumber) {
			this.timers[timerNumber] = new Date().getTime()
		},
		getCurrentDuration : function(timerNumber) {
			return new Date().getTime() - this.timers[timerNumber];
		},
		note : function(params) {
			this.note = params.note;
			this.octave = params.octave;
			this.frequency = params.frequency;
		},
		midiEvent : function(params) {
			this.note = params.note;
			this.octave = params.octave;
			this.duration = params.duration;
		},
		capture : function () {
			if (true || this.audioPlaying) {
				this.animationFrame = requestAnimationFrame(this.capture.bind(this));

			} else {
				cancelAnimationFrame(this.animationFrame);
			}

			this.analyser.getFloatFrequencyData(this.frequencies);
			this.analyser.getByteTimeDomainData(this.dataArray);
			frequency = this.calculateHertz(this.frequencies);

			/*
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
			*/

			// Need to wait for minimum note duration
			if (this.dataArray[0] == 128) {
				this.noteOn = false;

			} else {
				this.noteOn = true;
				
				if (this.getCurrentDuration(1) > this.minimumDuration) {
					this.startTimer(1);
				}		
			}

			if (this.noteOn || this.getCurrentDuration(1) < this.minimumDuration) {
				//console.log(this.getCurrentDuration(1));
				note = this.matchNoteToFrequency(frequency);

				if (this.isNewNote(note)) {
					var duration = this.getCurrentDuration(2);
					this.startTimer(2);
				
					this.onMidiEvent();
					this.midiEvents.push(new this.midiEvent({note:note.note, octave:note.octave, duration:duration}));				
				}
				
				this.currentNote = note;
				this.whileNoteOn(this);
			} else {
				this.currentNote = null;
				this.whileNoteOff(this);
			}

			this.whileCapture(this);
		},
		// Events
		whileCapture : function(ref) {
			//console.log(ref.dataArray[0]);
		},
		whileNoteOn : function(ref) {
			document.getElementById('frequency').innerHTML = ref.currentNote.note;
		},
		whileNoteOff : function() {
			document.getElementById('frequency').innerHTML = '-';
		},
		onMidiEvent : function() {

		}

	};

	AudioMidiJS.init();

} else {
	console.warn('AudioMidiJS already defined');
}