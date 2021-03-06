var WIDTH = 1000;
var HEIGHT = 740;

var BOUND_WIDTH = 1000000;
var BOUND_HEIGHT = 740;

var LOOP_INTERVAL = 5;
var INVERT_JUMP_THRESHOLD = 100.0;

// Default custom synth program
DEFAULT_PROGRAM = CustomProgram = {
  'attackAmplitude': 0.18,
  'sustainAmplitude': 0.08,
  'attackTime': 0.01,
  'decayTime': 0.3,
  'releaseTime': 0.04,
  'phase': 0.75,
  'createNote': function(note, velocity) {
    var frequency = midiToFrequency(note);
    return ADSRGenerator(
      SquareGenerator(frequency, this.phase),
      this.attackAmplitude * (velocity / 128), this.sustainAmplitude * (velocity / 128),
      this.attackTime, this.decayTime, this.releaseTime
    );
  }
};

// NOTE: REMOVE THIS LINE TO USE CUSTOM SYNTH PROGRAM
DEFAULT_PROGRAM = PianoProgram;

/* END SETTINGS */
var timer;
var circle;

var emitter;
var moveSpeed = 0;
var fadeSpeed = 500;

var synth, replayer, audio;

var midi, midiFile, sequence, lastEvent;
var counter = 0;
var ready = false;
var started = false;
var finished = false;

function preload() {

  counter = 0;
  ready = false;
  started = false;
  finished = false;
  moveSpeed = 0;
  fadeSpeed = 500;

  fetchMidi(file, function(data) {
    // load and initialize midi file
    original = MidiFile(data);
    midi = initMidiFile(original, bpm);

    // parse midi events
    parsed = parseEvents(midi, trackNo);

    // generate sequence
    seq = generateSequence(parsed, bpm);
    console.log(seq);

    // play the midi
    synth = Synth(44100);
    replayer = Replayer(midi, synth);
    audio = AudioPlayer(replayer);
    //audio = AudioPlayer(replayer, {'latency': 0.5});

    // assign value to gloval
    sequence = seq;
    midiFile = midi;

    setTimeout(function() { ready = true; }, 500);
  });


  this.game.stage.backgroundColor = '#000000';
  game.load.image('circle', 'img/circle.png');
  game.load.image('particle', 'img/blue.png');
  game.load.image("grid", "img/grid.bmp");
}

function create() {
  game.physics.startSystem(Phaser.Physics.P2JS);
  game.world.setBounds(0, 0, BOUND_WIDTH, BOUND_HEIGHT);

  var background = game.add.tileSprite(0, 0, BOUND_WIDTH, BOUND_HEIGHT, 'grid');

  emitter = game.add.emitter(0, 0, 200);
  emitter.makeParticles('particle')
  emitter.setAlpha(0.3, 0.8);
  emitter.setScale(0.1, 0.1);
  emitter.gravity = 0;
  //emitter.start(false, 500, 50);

  circle = game.add.sprite(0, HEIGHT - 50, 'circle');

  game.physics.p2.gravity.y = 500;
  game.physics.p2.enable(circle);

  circle.anchor.set(0.5);
  circle.body.setCircle(15);
  circle.body.collideWorldBounds = true;

  //game.time.events.loop(LOOP_INTERVAL, updateCounter, this);
  game.camera.follow(circle);

  // create timer
  timer = new Tock({
    interval: LOOP_INTERVAL,
    callback: fixedUpdate,
    //complete: someCompleteFunction
  });

  // start timer
  timer.start();
}

function update() {
  emitter.x = circle.x
  emitter.y = circle.y

  if (!finished) {
    circle.body.moveRight(moveSpeed);
  }
}

function fixedUpdate() {
  // Ignore if not ready or finished
  if (!ready || finished) {
    return;
  }

  // Initialize first update
  if (!started) {
    // var synth = Synth(44100);
    // var replayer = Replayer(midiFile, synth);
    // var audio = AudioPlayer(replayer);

    started = true;
  }

  // When song ends
  if (replayer.finished) {
    setTimeout(function() {
      finished = true;

      game.physics.p2.gravity.y = 10000;
      game.add.tween(circle).to( { alpha: 0 }, 250, Phaser.Easing.Linear.None, true, 0, 0, false);
      //circle.body.static = true;
    }, 1000);
  }

  // Fetch current event from sequence
  var currentEvent = sequence[counter];

  //console.log(timer.lap())

  if(currentEvent){
    console.log(currentEvent)

    if(currentEvent.fadespeed){
      fadeSpeed = currentEvent.fadespeed
    }

    if(currentEvent.gravity){
      game.physics.p2.gravity.y = currentEvent.gravity;
    }

    if(currentEvent.speed){
      moveSpeed = currentEvent.speed;
    }

    if(currentEvent.hide == 1){
      game.add.tween(circle).to( { alpha: 0 }, fadeSpeed, Phaser.Easing.Linear.None, true, 0, 0, false);
    }
    else if(currentEvent.jump) {
      var jumpVal = currentEvent.jump;
      if (circle.y <= INVERT_JUMP_THRESHOLD) {
        jumpVal *= -1;
      }

      if(currentEvent.immediate == 1){
        circle.alpha = 1;
        circle.body.y = circle.y - jumpVal;
      }
      else {
        game.add.tween(circle).to( { alpha: 1 }, fadeSpeed, Phaser.Easing.Linear.None, true, 0, 0, false);
        circle.body.moveUp(jumpVal);
      }
    }

    // cache the event
    lastEvent = currentEvent;
  }

  counter += LOOP_INTERVAL;
}

function render() {
  game.debug.cameraInfo(game.camera, 32, 64);
  game.debug.spriteCoords(circle, 32, 150);

  if (lastEvent) {
    game.debug.text(JSON.stringify(lastEvent), 32, 210, "rgba(0,255,0,0.5)", "13pt");
  }
}
