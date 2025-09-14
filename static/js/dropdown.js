document.addEventListener("DOMContentLoaded", () => {
    const avatarContainer = document.querySelector(".avatar-container");
    const dropdown = document.querySelector(".dropdown-content");

    if (avatarContainer && dropdown) {
        avatarContainer.addEventListener("click", (e) => {
            e.stopPropagation();
            dropdown.style.display =
                dropdown.style.display === "block" ? "none" : "block";
        });

        document.addEventListener("click", () => {
            dropdown.style.display = "none";
        });
    }
});