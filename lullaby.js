const Sound = require('node-aplay');

let isPlaying = false;

function playLullaby(random = 0, number) {
    if (isPlaying) {
        console.log('Lullaby requested, but another lullaby is currently playing.');
        return;
    }

    let lullabyNumber;
    if (random) {
        lullabyNumber = Math.floor(Math.random() * 5) + 1;  // Fixed the range to 1 to 5 as you described earlier
    } else {
        lullabyNumber = number;
    }

    const lullabyPath = `lullabies/lullaby${lullabyNumber}.wav`;  // Ensure this path is correct and points to a .wav file
    console.log(`Playing Lullaby ${lullabyNumber}`);
    console.log(lullabyPath);

    isPlaying = true;

    let music = new Sound(lullabyPath);
    music.play();

    music.on('complete', function () {
        console.log(`Lullaby ${lullabyNumber} finished playing.`);
        isPlaying = false;
    });

    music.on('error', function (error) {
        console.error('Error playing the lullaby:', error);
        isPlaying = false;
    });
}

playLullaby(0, 1);  // Example usage
