
// ASCII DATA
const asciiSets = [
  [
    "         ______________  ",
    "        /             /| ",
    "       /             / | ",
    "      /____________ /  | ",
    "     | ___________ |   | ",
    "     ||           ||   | ",
    "     ||           ||   | ",
    "     ||           ||   | ",
    "     ||___________||   | ",
    "     |   _______   |  /  ",
    "    /|  (_______)  | /   ",
    "   ( |_____________|/    ",
    "    \\                   ",
    ".=======================.",
    "| ::::::::::::::::  ::: |",
    "| ::::::::::::::[]  ::: |",
    "|   -----------     ::: |",
    "`-----------------------'"
  ],
    [
    "                         ",
    "                         ",
    "                         ",
    "                         ",
    "     _________________   ",
    "    | | ___________ | |  ",
    "    | | ___________ | |  ",
    "    | | ___________ | |  ",
    "    | | ___________ | |  ",
    "    | |_____________| |  ",
    "    |     _______     |  ",
    "    |    |       |   ||  ",
    "    |    |       |   V|  ",
    "    |____|_______|____|  ",
    "                         ",
    "                         ",
    "                         ",
    "                         "
    ],
    [
    "   .___________________. ",
    "   |  ,-------------.  | ",
    "   | |  .---------.  | | ",
    "   | |  |         |  | | ",
    "   | |  |         |  | | ",
    "   | |  |         |  | | ",
    "   | |  |         |  | | ",
    "   | |  `---------'  | | ",
    "   | `---------------' | ",
    "   |   _ GAME BOY      | ",
    "   | _| |_         ,-. | ",
    "   ||_ O _|   ,-. '._,'| ",
    "   |  |_|    '._,'   A | ", 
    "   |    _  _    B      | ", 
    "   |   // //           | ",
    "   |  // //    ######  | ",
    "   |  `  `      ###### , ",
    "   |________...______,'  "
    ]
  ]

const CONFIG = {
    chars: "░▒▓█<>/\\|?*!@#$%^&()_+-=[]{}", // Characters used for the 'glitch' effect
    transitionSpeed: 15, // Milliseconds per frame 
    holdTime: 2000,      // How long to wait before next image (ms)
};

class AsciiMorph {
    constructor(element, data) {
        this.element = element;
        this.data = data;
        this.currentIndex = 0;
        this.frameId = null;
    }

    start() {
        this.morph(0);
    }

    morph(nextIndex) {
        const currentArt = this.data[this.currentIndex];
        const nextArt = this.data[nextIndex];
        
        // Get dimensions from the current art directly
        // (Assumes all arrays are equal rectangles)
        const maxHeight = currentArt.length;
        const maxWidth = currentArt[0].length;

        // Convert to grids
        let currentGrid = currentArt.map(line => line.split(''));
        const nextGrid = nextArt.map(line => line.split(''));
        
        let coords = [];
        for (let y = 0; y < maxHeight; y++) {
            for (let x = 0; x < maxWidth; x++) {
                coords.push({x, y});
            }
        }
        
        coords.sort(() => Math.random() - 0.5);

        let i = 0;
        const totalSteps = coords.length; // Total number of character to change
        const stepsPerFrame = Math.ceil(totalSteps / 40); 

        const animate = () => {
            let chunk = 0;
            
            // Update a chunk of characters to their final (correct) state
            while (chunk < stepsPerFrame && i < totalSteps) {
                const {x, y} = coords[i];
                currentGrid[y][x] = nextGrid[y][x];
                i++;
                chunk++;
            }

            if (i < totalSteps) {
                for (let n = 0; n < 10; n++) {
                    const randomCoord = coords[Math.floor(Math.random() * (totalSteps - i)) + i];
                    if (randomCoord) {
                        const {x, y} = randomCoord;
                        // Only glitch if one of the layers actually has content
                        if (nextGrid[y][x] !== ' ' || currentGrid[y][x] !== ' ') {
                            const randomChar = CONFIG.chars[Math.floor(Math.random() * CONFIG.chars.length)];
                            currentGrid[y][x] = randomChar;
                        }
                    }
                }
            }
            
            let newContent = currentGrid.map(line => line.join('')).join('\n');
            this.element.textContent = newContent

            if (i < totalSteps) {
                this.frameId = setTimeout(animate, CONFIG.transitionSpeed);
            } else {
                this.currentIndex = nextIndex;
                const nextNextIndex = (this.currentIndex + 1) % this.data.length;
                setTimeout(() => this.morph(nextNextIndex), CONFIG.holdTime);
            }
        };

        animate();
    }
}

// 3. INITIALIZATION
document.addEventListener("DOMContentLoaded", () => {
    const container = document.getElementById('ascii-container');
    const player = new AsciiMorph(container, asciiSets);
    player.start();
});
