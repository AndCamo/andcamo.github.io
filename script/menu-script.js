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
        card.style.borderColor = colorsMap[colorKey];
        const icon = card.getElementsByClassName("card-icon")[0];
        if (icon) icon.style.color = colorsMap[colorKey];

        const textElement = card.getElementsByClassName("card-title")[0];
        
        // store original text to restore it later
        card.dataset.originalText = textElement.innerText;

        // Trova l'elemento con data-bs-toggle invece della card intera
        const toggleElement = card.querySelector('[data-bs-toggle="collapse"]');
        
        if (toggleElement) {
            toggleElement.addEventListener("click", () => {
                const isExpanded = toggleElement.getAttribute("aria-expanded") === "true";

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
            });
        }
    });
});