document.addEventListener('DOMContentLoaded', () => {
    const buttons = document.querySelectorAll('.feature-button');
    buttons.forEach(button => {
        button.addEventListener('click', () => {
            alert(`Bạn đã chọn: ${button.textContent}`);
        });
    });
});