const colorsMap = {
    color1: "#e63946",
    color2: "#83c5be",
    color3: "#ffc300"
}

document.addEventListener("DOMContentLoaded", () => {
    const cardContainer = document.getElementById("card-container");
    const cards = cardContainer.getElementsByClassName("card-body");

    Array.from(cards).forEach((card, index) => {
        // color initialization
        const colorKey = `color${(index % 3) + 1}`;
        document.getElementById('close-icon-' + ((index % 3) + 1)).style.color = colorsMap[colorKey];
        card.style.borderColor = colorsMap[colorKey];
        const icon = card.getElementsByClassName("card-icon")[0];
        if (icon) icon.style.color = colorsMap[colorKey];

        const textElement = card.getElementsByClassName("card-title")[0];
        
        // store original text to restore it later
        card.dataset.originalText = textElement.innerText;

        // Trova tutti gli elementi della card che aprono/chiudono (header e icona di chiusura)
        const toggleElements = card.querySelectorAll('[data-bs-toggle="collapse"]');
        
        toggleElements.forEach(toggleElement => {
            toggleElement.addEventListener("click", () => {
                setTimeout(() => {
                    const toggleHeader = card.querySelector('.row[data-bs-toggle="collapse"]');
                    const isExpanded = toggleHeader.getAttribute("aria-expanded") === "true";

                    if (isExpanded) {
                        textElement.style.color = colorsMap[colorKey];

                        const originalText = card.dataset.originalText;
                        let position = 0;
                        let direction = 1;

                        const runAnimation = () => {
                            const letters = originalText.split("");
                            letters[position] = "_";
                            textElement.innerText = letters.join("");

                            position += direction;

                            if (position >= originalText.length - 1 || position <= 0) {
                                direction *= -1;
                            }
                        };

                        // prevent multiple intervals
                        if (card.dataset.intervalId) clearInterval(card.dataset.intervalId);
                        card.dataset.intervalId = setInterval(runAnimation, 70);

                    } else {
                        if (card.dataset.intervalId) {
                            clearInterval(card.dataset.intervalId);
                            card.dataset.intervalId = null;
                        }
                        
                        // restore original text and color
                        textElement.style.color = "#ffffff";
                        textElement.innerText = card.dataset.originalText;
                    }
                }, 10);
            });
        });
    });
});