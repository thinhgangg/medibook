document.addEventListener("DOMContentLoaded", () => {
    const emailInput = document.querySelector("#forgot-password-form input[name='email']");
    const sendOtpButton = document.getElementById("send-otp");

    function validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    function checkConditions() {
        const isValidEmail = validateEmail(emailInput.value);
        sendOtpButton.disabled = !isValidEmail;
    }

    emailInput.addEventListener("input", checkConditions);

    sendOtpButton.addEventListener("click", () => {
        const otpSection = document.getElementById("otp-section");
        const registerForm = document.getElementById("register-form");
        otpSection.classList.remove("hidden");
        registerForm.classList.add("hidden");
    });
});
