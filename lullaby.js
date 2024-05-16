let isPlaying;

const player = require("play-sound")();

function playLullaby(random = 0, number) {
    // Generate a random lullaby number between 1 and 5
    if (isPlaying) {
        console.log(
            `Lullaby requested, but another lullaby is currently playing.`
        );
        return; // Skip playing a new lullaby if one is already playing
    }
    let lullabyNumber;
    if (random) {
        lullabyNumber = Math.floor(Math.random() * 2) + 1;
    } else {
        lullabyNumber = number;
    }
    console.log(`Playing Lullaby ${lullabyNumber}`);
    // Add logic to play the lullaby here
    // For example, you can use a library like 'play-sound' to play an audio file
    // Install play-sound using npm: npm install play-sound
    // Then use it to play the lullaby file based on the lullabyNumber
    const lullabyPath = `lullabies/lullaby${lullabyNumber}.wav`;
    isPlaying = true; // Set the isPlaying flag to true

    player.play(lullabyPath, function (err) {
        if (err) {
            console.error("Error playing the lullaby:", err);
            isPlaying = false; // Reset the flag if there's an error
            return;
        }
        console.log(`Lullaby ${lullabyNumber} finished playing.`);
        isPlaying = false; // Reset the flag when the lullaby finishes playing
        // Lullaby finished playing
    });
}

playLullaby(0,1);