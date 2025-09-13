document.addEventListener("DOMContentLoaded", () => {
    // API ENDPOINTS
    const ENDPOINTS = {
        login: "/api/accounts/login/",
        logout: "/api/accounts/logout/",
        me: "/api/accounts/me/",
        send_otp: "/api/accounts/send_otp/",
        verify_otp: "/api/accounts/verify_otp/",
        set_password: "/api/accounts/set_password/",
        patient_profile: "/api/accounts/patient/profile/",
    };
    const REDIRECTS = {
        afterLogin: "/",
        afterRegister: "/accounts/login/",
        afterLogout: "/",
        dashboard: "/dashboard/",
    };

    // CSRF Token
    function getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return decodeURIComponent(parts.pop().split(";").shift());
    }
    const csrfToken = getCookie("csrftoken");

    // Check if user is logged in
    function checkAuthStatus() {
        const accessToken = localStorage.getItem("access");
        if (accessToken) {
            fetch(ENDPOINTS.me, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                },
            })
                .then((res) => res.json())
                .then((data) => {
                    if (data.id) {
                        document.getElementById("guest-buttons").style.display = "none";
                        const avatarContainer = document.getElementById("user-avatar");
                        avatarContainer.style.display = "block";
                        const avatarImg = avatarContainer.querySelector(".user-avatar");
                        avatarImg.src = data.profile_picture_thumbs?.small || "/static/img/default-avatar.jpg";
                    }
                })
                .catch(() => {
                    localStorage.removeItem("access");
                    localStorage.removeItem("refresh");
                    document.getElementById("guest-buttons").style.display = "block";
                    document.getElementById("user-avatar").style.display = "none";
                });
        }
    }

    checkAuthStatus();

    // Toggle password eye
    document.querySelectorAll(".toggle-eye").forEach((btn) => {
        const input = document.querySelector(btn.getAttribute("data-target"));
        if (!input) return;
        btn.addEventListener("click", () => {
            input.type = input.type === "password" ? "text" : "password";
        });
    });

    // ====== POST JSON ======
    async function postJSON(url, payload, includeAuth = false) {
        const headers = {
            "Content-Type": "application/json",
            ...(csrfToken ? { "X-CSRFToken": csrfToken } : {}),
        };
        if (includeAuth) {
            const accessToken = localStorage.getItem("access");
            if (accessToken) {
                headers["Authorization"] = `Bearer ${accessToken}`;
            } else {
                console.error("No access token found in localStorage");
            }
        }
        console.log("Request Headers:", headers);
        console.log("Request Payload:", payload);
        const res = await fetch(url, {
            method: "POST",
            headers: headers,
            body: JSON.stringify(payload),
        });
        let data = null;
        try {
            data = await res.json();
            console.log("API Response:", data);
        } catch (_e) {}
        return { ok: res.ok, status: res.status, data };
    }

    // ====== PATCH JSON ======
    async function patchJSON(url, payload, includeAuth = false) {
        const headers = {
            "Content-Type": "application/json",
            ...(csrfToken ? { "X-CSRFToken": csrfToken } : {}),
        };
        if (includeAuth) {
            const accessToken = localStorage.getItem("access");
            if (accessToken) {
                headers["Authorization"] = `Bearer ${accessToken}`;
            } else {
                console.error("No access token found in localStorage");
            }
        }
        console.log("PATCH Headers:", headers);
        console.log("PATCH Payload:", payload);

        const res = await fetch(url, {
            method: "PATCH",
            headers,
            body: JSON.stringify(payload),
        });

        let data = null;
        try {
            data = await res.json();
            console.log("API Response:", data);
        } catch (_e) {}
        return { ok: res.ok, status: res.status, data };
    }

    // ====== Validation Functions ======
    const validateField = (input) => {
        const value = input.value.trim();
        const type = input.getAttribute("data-validate");
        const errorElement = document.getElementById(`${input.id || input.name}-error`) || input.parentElement.querySelector(".error");
        let isValid = true;

        if (value.length === 0) {
            errorElement.style.display = "none";
            return true;
        }

        switch (type) {
            case "email":
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                isValid = emailRegex.test(value);
                errorElement.textContent = isValid ? "" : "Vui lòng nhập đúng định dạng email.";
                break;
            case "password":
                const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
                isValid = passwordRegex.test(value);
                errorElement.textContent = isValid ? "" : "Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ và số.";
                break;
            case "confirm-password":
                const passwordInput = document.querySelector('[name="password"]');
                isValid = value === passwordInput.value && value.length > 0;
                errorElement.textContent = isValid ? "" : "Mật khẩu xác nhận không khớp.";
                break;
            case "phone":
                const phoneRegex = /^[0-9]{10}$/;
                isValid = phoneRegex.test(value);
                errorElement.textContent = isValid ? "" : "Số điện thoại phải có 10 số.";
                break;
            case "otp":
                isValid = value.length === 6 && !isNaN(value);
                errorElement.textContent = isValid ? "" : "Mã OTP phải là 6 số.";
                break;
            case "date":
                const today = new Date();
                const inputDate = new Date(value);
                isValid = inputDate <= today && !isNaN(inputDate);
                errorElement.textContent = isValid ? "" : "Ngày sinh không hợp lệ.";
                break;
            case "id":
                const idRegex = /^[0-9]{9,12}$/;
                isValid = idRegex.test(value);
                errorElement.textContent = isValid ? "" : "Số CMND/CCCD phải là 9-12 số.";
                break;
            case "select":
                isValid = value !== "";
                errorElement.textContent = isValid ? "" : "Vui lòng chọn một tùy chọn.";
                break;
            default:
                isValid = value.length > 0;
                errorElement.textContent = isValid ? "" : "Trường này không được để trống.";
        }

        errorElement.style.display = isValid ? "none" : "block";
        return isValid;
    };

    const validateForm = (formId) => {
        const form = document.getElementById(formId);
        if (!form) return true;

        let isValid = true;
        const inputs = form.querySelectorAll("[data-validate]");
        inputs.forEach((input) => {
            if (!validateField(input)) isValid = false;
        });

        return isValid;
    };

    // Function to update button state based on form validation
    const updateButtonState = (button, formId) => {
        button.disabled = !validateForm(formId);
    };

    // ====== Login ======
    const loginForm = document.querySelector("#login-form");
    if (loginForm) {
        const loginBtn = loginForm.querySelector("button[type=submit]");
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            loginBtn.disabled = true;

            if (!validateForm("login-form")) {
                loginBtn.disabled = false;
                return;
            }

            const payload = {
                email: loginForm.email.value.trim(),
                password: loginForm.password.value,
            };
            const { ok, data } = await postJSON(ENDPOINTS.login, payload);

            loginBtn.disabled = false;
            loginBtn.textContent = "Đăng nhập";

            if (ok) {
                const { access, refresh, user } = data;

                localStorage.setItem("access", access);
                localStorage.setItem("refresh", refresh);

                window.location.href = "/";
            } else {
                showAlert("error", data?.detail || "Email hoặc mật khẩu không đúng.");
            }
        });
        // Realtime validation for login button
        loginForm.querySelectorAll("[data-validate]").forEach((input) => {
            input.addEventListener("input", () => updateButtonState(loginBtn, "login-form"));
        });
    }

    // ====== Register ======
    const regForm = document.querySelector("#patient-register-form");
    if (regForm) {
        const regBtn = regForm.querySelector("button[type=submit]");
        regForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            regBtn.disabled = true;
            regBtn.textContent = "Đang xử lý...";

            if (!validateForm("patient-register-form")) {
                regBtn.disabled = false;
                regBtn.textContent = "Đăng ký";
                return;
            }

            const genderVal = regForm.querySelector("input[name='gender']:checked")?.value || "";
            const payload = {
                username: regForm.username.value.trim(),
                email: regForm.email.value.trim(),
                password: regForm.password.value,
                full_name: regForm.full_name.value.trim(),
                dob: regForm.dob.value,
                phone_number: regForm.phone_number.value.trim(),
                gender: genderVal,
                insurance_no: regForm.insurance_no.value.trim(),
                address: regForm.address.value.trim(),
            };
            const { ok, data } = await postJSON(ENDPOINTS.register, payload);
            regBtn.disabled = false;
            regBtn.textContent = "Đăng ký";

            if (ok) {
                showAlert("success", "Đăng ký thành công! Đăng nhập nhé.");
                window.location.href = REDIRECTS.afterRegister;
            } else {
                showAlert("error", data?.detail || Object.values(data || {}).join(" • ") || "Đăng ký thất bại.");
            }
        });
        // Realtime validation for register button
        regForm.querySelectorAll("[data-validate]").forEach((input) => {
            input.addEventListener("input", () => updateButtonState(regBtn, "patient-register-form"));
        });
    }

    // ====== Logout ======
    const logoutLink = document.querySelector("#logoutLink");
    if (logoutLink) {
        logoutLink.addEventListener("click", async (e) => {
            e.preventDefault();

            const refreshToken = localStorage.getItem("refresh");
            console.log("Refresh Token:", refreshToken);
            if (!refreshToken) {
                showAlert("error", "Không tìm thấy refresh token. Vui lòng đăng nhập lại.");
                return;
            }

            const payload = { refresh: refreshToken };
            const { ok, data } = await postJSON(ENDPOINTS.logout, payload, true);

            if (ok) {
                localStorage.removeItem("access");
                localStorage.removeItem("refresh");
                document.getElementById("guest-buttons").style.display = "block";
                document.getElementById("user-avatar").style.display = "none";
                window.location.href = REDIRECTS.afterLogout;
            } else {
                showAlert("error", data?.detail || "Đăng xuất thất bại.");
            }
        });
    }

    // Toggle between sections
    const emailInput = document.querySelector("#register input[name='email']");
    const termsCheckbox = document.getElementById("terms");
    const sendOtpButton = document.getElementById("send-otp");
    const otpSection = document.getElementById("otp-section");
    const userEmail = document.getElementById("user-email");
    const otpInput = document.querySelector("#otp-section input[name='otp']");
    const verifyOtpButton = document.getElementById("verify-otp");
    const resendOtpLink = document.getElementById("resend-otp");
    const countdownElement = document.getElementById("countdown");
    const passwordSection = document.getElementById("password-section");
    const setPasswordButton = document.getElementById("set-password");
    const profileSection = document.getElementById("profile-section");
    const submitProfileButton = document.getElementById("submit-profile");

    function validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    function checkConditions() {
        const isValidEmail = validateEmail(emailInput.value);
        const isTermsChecked = termsCheckbox.checked;
        sendOtpButton.disabled = !(isValidEmail && isTermsChecked);
    }

    emailInput.addEventListener("input", checkConditions);
    termsCheckbox.addEventListener("change", checkConditions);

    function goToStep(stepNumber) {
        document.querySelectorAll(".step-content").forEach((el) => el.classList.add("hidden"));
        document.querySelector(`.step-content[data-step="${stepNumber}"]`).classList.remove("hidden");
        document.querySelectorAll(".steps .step").forEach((el) => el.classList.remove("active"));
        document.querySelector(`.steps .step[data-step="${stepNumber}"]`).classList.add("active");
    }

    sendOtpButton.addEventListener("click", async () => {
        const payload = { email: emailInput.value.trim() };

        sendOtpButton.disabled = true;
        sendOtpButton.textContent = "Đang xử lý...";

        if (!validateEmail(emailInput.value.trim())) {
            showAlert("error", "Vui lòng nhập đúng định dạng email.");
            sendOtpButton.disabled = false;
            sendOtpButton.textContent = "Gửi OTP";
            return;
        }

        const { ok, data } = await postJSON(ENDPOINTS.send_otp, payload);

        sendOtpButton.disabled = false;
        sendOtpButton.textContent = "Gửi OTP";

        if (ok) {
            document.querySelector(".form-container").classList.add("hidden");
            document.querySelector(".register-flow").classList.remove("hidden");
            document.getElementById("user-email").textContent = emailInput.value.trim();
            goToStep(1);
            startCountdown(300);
        } else {
            showAlert("error", data?.detail || "Gửi OTP thất bại.");
        }
    });

    resendOtpLink.addEventListener("click", async (e) => {
        e.preventDefault();
        if (countdownElement.dataset.counting === "true") return;
        const payload = { email: emailInput.value.trim() };
        const { ok, data } = await postJSON(ENDPOINTS.send_otp, payload);
        if (ok) {
            startCountdown(300);
        }
    });

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

    // Validate OTP and update button state
    const validateOtp = () => {
        const isValid = validateField(otpInput);
        verifyOtpButton.disabled = !isValid;
        return isValid;
    };
    if (otpInput) {
        otpInput.addEventListener("input", validateOtp);
    }

    verifyOtpButton.addEventListener("click", async (e) => {
        e.preventDefault();

        if (!validateOtp()) {
            showAlert("error", "Vui lòng nhập mã OTP hợp lệ.");
            return;
        }

        const payload = { email: emailInput.value.trim(), otp: otpInput.value.trim() };
        const { ok, data } = await postJSON(ENDPOINTS.verify_otp, payload);

        if (ok) {
            if (data.temp_token) {
                localStorage.setItem("temp_token", data.temp_token);
            }
            goToStep(2);
        } else {
            showAlert("error", data?.detail || "Xác thực OTP thất bại.");
        }
    });

    // ====== Set Password ======
    const validatePasswordForm = () => {
        const passwordForm = document.getElementById("password-form");
        if (!passwordForm) return false;

        const passwordInput = passwordForm.querySelector("input[name='password']");
        const confirmPasswordInput = passwordForm.querySelector("input[name='confirm_password']");
        const passwordError = document.getElementById("pass-error");
        const confirmError = document.getElementById("confirm-pass-error");

        const passwordValid = validateField(passwordInput);
        let confirmValid = true;

        if (confirmPasswordInput.value.trim().length > 0) {
            confirmValid = confirmPasswordInput.value === passwordInput.value;
            confirmError.textContent = confirmValid ? "" : "Mật khẩu xác nhận không khớp.";
            confirmError.style.display = confirmValid ? "none" : "block";
        } else {
            confirmError.textContent = "Trường này không được để trống.";
            confirmError.style.display = "block";
            confirmValid = false;
        }

        return passwordValid && confirmValid;
    };

    setPasswordButton.addEventListener("click", async (e) => {
        e.preventDefault();
        setPasswordButton.disabled = true;
        setPasswordButton.textContent = "Đang xử lý...";

        if (!validatePasswordForm()) {
            setPasswordButton.disabled = false;
            setPasswordButton.textContent = "Tiếp tục";
            showAlert("error", "Vui lòng nhập mật khẩu hợp lệ và xác nhận khớp.");
            return;
        }

        const passwordForm = document.getElementById("password-form");
        const payload = {
            email: emailInput.value.trim(),
            password1: passwordForm.querySelector("input[name='password']").value,
            password2: passwordForm.querySelector("input[name='confirm_password']").value,
            temp_token: localStorage.getItem("temp_token"),
        };

        const { ok } = await postJSON(ENDPOINTS.set_password, payload);

        if (ok) {
            const loginPayload = {
                email: emailInput.value.trim(),
                password: payload.password1,
            };
            const { ok: loginOk, data: loginData } = await postJSON(ENDPOINTS.login, loginPayload);

            if (loginOk) {
                localStorage.setItem("access", loginData.access);
                localStorage.setItem("refresh", loginData.refresh);
                goToStep(3);
            } else {
                showAlert("error", "Đặt mật khẩu thành công nhưng đăng nhập thất bại.");
            }
        } else {
            showAlert("error", "Đặt mật khẩu thất bại.");
        }

        setPasswordButton.disabled = false;
        setPasswordButton.textContent = "Tiếp tục";
    });

    submitProfileButton.addEventListener("click", async () => {
        submitProfileButton.disabled = true;
        submitProfileButton.textContent = "Đang xử lý...";

        if (!validateForm("profile-form")) {
            submitProfileButton.disabled = false;
            submitProfileButton.textContent = "Hoàn tất";
            showAlert("error", "Vui lòng điền đầy đủ và đúng thông tin hồ sơ.");
            return;
        }

        const profileForm = document.getElementById("profile-form");
        const genderElement = profileForm.querySelector("input[name='gender']:checked");
        const gender = genderElement ? genderElement.value : "";

        function getValue(selector, defaultValue = "") {
            const element = document.querySelector(selector);
            return element && element.value ? element.value : defaultValue;
        }

        const payload = {
            full_name: getValue("input[name='full_name']"),
            phone_number: getValue("input[name='phone_number']"),
            dob: getValue("input[name='dob']"),
            gender: gender,
            address_detail: getValue("input[name='address_detail']"),
            ward: getValue("#ward"),
            district: getValue("#district"),
            city: getValue("#city"),
            id_number: getValue("input[name='id_number']"),
            ethnicity: getValue("input[name='ethnicity']"),
            insurance_no: getValue("input[name='insurance_no']"),
            occupation: getValue("input[name='occupation']"),
        };

        console.log("Profile payload:", payload);

        const { ok, data } = await patchJSON(ENDPOINTS.patient_profile, payload, true);

        if (ok) {
            window.location.href = REDIRECTS.afterRegister;
        } else {
            showAlert("error", data?.detail || "Cập nhật hồ sơ thất bại.");
        }

        submitProfileButton.disabled = false;
        submitProfileButton.textContent = "Hoàn tất";
    });

    // ====== Tỉnh/Thành phố và Quận/Huyện, Phường/Xã ======
    async function getProvinces() {
        try {
            const res = await fetch("https://provinces.open-api.vn/api/p/");
            return res.ok ? await res.json() : [];
        } catch (error) {
            console.error("Lỗi khi lấy danh sách tỉnh/thành phố:", error);
            return [];
        }
    }

    async function getDistricts(provinceCode) {
        try {
            const res = await fetch(`https://provinces.open-api.vn/api/p/${provinceCode}?depth=2`);
            return res.ok ? await res.json() : null;
        } catch (error) {
            console.error("Lỗi khi lấy danh sách quận/huyện:", error);
            return null;
        }
    }

    async function getWards(districtCode) {
        try {
            const res = await fetch(`https://provinces.open-api.vn/api/d/${districtCode}?depth=2`);
            const data = res.ok ? await res.json() : null;
            return data?.wards || [];
        } catch (error) {
            console.error("Lỗi khi lấy danh sách phường/xã:", error);
            return [];
        }
    }

    // Khởi tạo danh sách tỉnh/thành phố
    async function initAddressSelects() {
        const citySelect = document.getElementById("city");
        const districtSelect = document.getElementById("district");
        const wardSelect = document.getElementById("ward");

        const provinces = await getProvinces();
        provinces.forEach((p) => {
            const opt = document.createElement("option");
            opt.value = p.code;
            opt.textContent = p.name;
            citySelect.appendChild(opt);
        });

        citySelect.addEventListener("change", async () => {
            districtSelect.innerHTML = '<option value="">-- Chọn Quận / Huyện --</option>';
            wardSelect.innerHTML = '<option value="">-- Chọn Phường / Xã --</option>';

            if (!citySelect.value) return;

            const provinceData = await getDistricts(citySelect.value);
            if (provinceData && provinceData.districts) {
                provinceData.districts.forEach((d) => {
                    const opt = document.createElement("option");
                    opt.value = d.code;
                    opt.textContent = d.name;
                    districtSelect.appendChild(opt);
                });
            }
        });

        districtSelect.addEventListener("change", async () => {
            wardSelect.innerHTML = '<option value="">-- Chọn Phường / Xã --</option>';

            if (!districtSelect.value) return;

            const wards = await getWards(districtSelect.value);
            wards.forEach((w) => {
                const opt = document.createElement("option");
                opt.value = w.code;
                opt.textContent = w.name;
                wardSelect.appendChild(opt);
            });
        });
    }

    // Gọi hàm khởi tạo và thêm validation realtime
    initAddressSelects();
});
