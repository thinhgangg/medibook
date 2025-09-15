document.addEventListener("DOMContentLoaded", () => {
    const ENDPOINTS = {
        send_otp: "/api/accounts/forgot_password/send_otp/",
        verify_otp: "/api/accounts/forgot_password/verify_otp/",
        set_password: "/api/accounts/forgot_password/set_password/",
        login: "/api/accounts/login/",
    };

    const REDIRECTS = {
        afterReset: "/accounts/login/?action=login",
    };

    // CSRF
    function getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return decodeURIComponent(parts.pop().split(";").shift());
    }
    const csrfToken = getCookie("csrftoken");

    // Helpers
    async function postJSON(url, payload) {
        const headers = {
            "Content-Type": "application/json",
            ...(csrfToken ? { "X-CSRFToken": csrfToken } : {}),
        };

        const res = await fetch(url, {
            method: "POST",
            headers,
            body: JSON.stringify(payload),
        });

        let data = null;
        try {
            data = await res.json();
        } catch (_e) {}
        return { ok: res.ok, status: res.status, data };
    }

    // Elements
    const emailInput = document.querySelector("#forgot-password-form input[name='email']");
    const sendOtpButton = document.getElementById("send-otp");
    const regEmailErrorSpan = document.getElementById("reg-email-error");

    const otpInput = document.querySelector("#otp-section input[name='otp']");
    const verifyOtpButton = document.getElementById("verify-otp");
    const resendOtpLink = document.getElementById("resend-otp");
    const countdownElement = document.getElementById("countdown");

    const setPasswordButton = document.getElementById("set-password");

    // Validate email
    function validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    function checkConditions() {
        const isValidEmail = validateEmail(emailInput.value);
        sendOtpButton.disabled = !isValidEmail;
    }

    emailInput.addEventListener("input", checkConditions);

    // Step navigation
    function goToStep(stepNumber) {
        document.querySelectorAll(".step-content").forEach((el) => el.classList.add("hidden"));
        document.querySelector(`.step-content[data-step="${stepNumber}"]`).classList.remove("hidden");

        document.querySelectorAll(".steps .step").forEach((el) => el.classList.remove("active"));
        document.querySelector(`.steps .step[data-step="${stepNumber}"]`).classList.add("active");
    }

    // Countdown
    function startCountdown(seconds) {
        let timeLeft = seconds;
        countdownElement.dataset.counting = "true";
        resendOtpLink.style.pointerEvents = "none";

        const timer = setInterval(() => {
            if (timeLeft <= 0) {
                clearInterval(timer);
                countdownElement.textContent = "";
                countdownElement.dataset.counting = "false";
                resendOtpLink.style.pointerEvents = "auto";
                return;
            }
            const minutes = Math.floor(timeLeft / 60);
            const secs = timeLeft % 60;
            countdownElement.textContent = `(${minutes}:${secs < 10 ? "0" : ""}${secs})`;
            timeLeft--;
        }, 1000);
    }

    // ===== SEND OTP =====
    sendOtpButton.addEventListener("click", async () => {
        const payload = { email: emailInput.value.trim() };
        regEmailErrorSpan.textContent = "";

        sendOtpButton.disabled = true;
        sendOtpButton.textContent = "Đang xử lý...";

        const { ok, data } = await postJSON(ENDPOINTS.send_otp, payload);

        sendOtpButton.disabled = false;
        sendOtpButton.textContent = "Gửi OTP";

        if (ok) {
            document.querySelector(".form-container").classList.add("hidden");
            document.querySelector(".forgot-password-flow").classList.remove("hidden");
            document.getElementById("user-email").textContent = emailInput.value.trim();
            goToStep(1);
            startCountdown(300);
        } else {
            if (data?.email && Array.isArray(data.email) && data.email.length > 0) {
                regEmailErrorSpan.textContent = data.email[0];
                regEmailErrorSpan.style.display = "block";
            } else if (data?.detail) {
                regEmailErrorSpan.textContent = data.detail;
                regEmailErrorSpan.style.display = "block";
            } else {
                regEmailErrorSpan.textContent = "Gửi OTP thất bại. Vui lòng thử lại.";
                regEmailErrorSpan.style.display = "block";
            }
        }
    });

    // ===== RESEND OTP =====
    resendOtpLink.addEventListener("click", async (e) => {
        e.preventDefault();
        if (countdownElement.dataset.counting === "true") return;
        const payload = { email: emailInput.value.trim() };
        const { ok } = await postJSON(ENDPOINTS.send_otp, payload);
        if (ok) {
            startCountdown(300);
        }
    });

    // ===== VERIFY OTP =====
    verifyOtpButton.addEventListener("click", async () => {
        const otp = otpInput.value.trim();
        if (!otp) {
            alert("Vui lòng nhập OTP.");
            return;
        }

        const payload = { email: emailInput.value.trim(), otp };
        const { ok, data } = await postJSON(ENDPOINTS.verify_otp, payload);

        if (ok) {
            if (data.temp_token) {
                localStorage.setItem("temp_token", data.temp_token);
            }
            goToStep(2);
        } else {
            alert("Xác thực OTP thất bại.");
        }
    });

    // ===== SET PASSWORD =====
    setPasswordButton.addEventListener("click", async () => {
        const passwordForm = document.getElementById("password-form");
        const password = passwordForm.querySelector("input[name='password']").value;
        const confirmPassword = passwordForm.querySelector("input[name='confirm_password']").value;

        if (password !== confirmPassword) {
            alert("Mật khẩu xác nhận không khớp!");
            return;
        }

        const payload = {
            email: emailInput.value.trim(),
            password1: password,
            password2: confirmPassword,
            temp_token: localStorage.getItem("temp_token"),
        };

        const { ok } = await postJSON(ENDPOINTS.set_password, payload);

        if (ok) {
            localStorage.removeItem("temp_token");
            window.location.href = REDIRECTS.afterReset;
        } else {
            alert("Đặt mật khẩu thất bại. Vui lòng thử lại.");
        }
    });
});
