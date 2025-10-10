export class Sound {
    constructor(){
        this.CAPTURESOUND = document.getElementById('capture'),
        this.MOVESELFSOUND = document.getElementById('move-self'),
        this.MOVECHECKSOUND = document.getElementById('move-check'),
        this.CASTLESOUND = document.getElementById('castle'),
        this.PROMOTESOUND = document.getElementById('promote'),
        this.GAMEENDSOUND = document.getElementById('game-end')
    }
    primeAudio() {
        const sounds = [
            this.CAPTURESOUND,
            this.MOVESELFSOUND,
            this.MOVECHECKSOUND,
            this.CASTLESOUND,
            this.PROMOTESOUND,
            this.GAMEENDSOUND
        ];
        // Play each sound to ensure it is working before piece move
        sounds.forEach(sound => {
            sound.volume = 0;
            sound.play().catch(() => {});
            setTimeout(() => { sound.pause(); sound.currentTime = 0; sound.volume = 1; }, 50);
        });
    }
    playMoveSounds(move) { // Handles various sounds played by different kinds of moves
        const moveFlags = move.flags
        if (moveFlags === 'p') {
            this.PROMOTESOUND.play();
        } else if (moveFlags === 'c' || moveFlags === 'e'){
            this.CAPTURESOUND.play();
        } else if (moveFlags === 'k' || moveFlags === 'q') {
            this.CASTLESOUND.play();
        } else {
            this.MOVESELFSOUND.play();
        };
    }

}