document.addEventListener("DOMContentLoaded", () => {
    const ENDPOINTS = {
        login: "/api/accounts/login/",
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

    function getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return decodeURIComponent(parts.pop().split(";").shift());
    }
    const csrfToken = getCookie("csrftoken");

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

    const loginForm = document.querySelector("#login-form");
    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const btn = loginForm.querySelector("button[type=submit]");
            btn.disabled = true;

            const payload = {
                email: loginForm.email.value.trim(),
                password: loginForm.password.value,
            };
            const { ok, data } = await postJSON(ENDPOINTS.login, payload);

            btn.disabled = false;
            btn.textContent = "Đăng nhập";

            if (ok) {
                const { access, refresh, user } = data;

                localStorage.setItem("access", access);
                localStorage.setItem("refresh", refresh);

                window.location.href = "/";
            } else {
                console.error("Đăng nhập thất bại.");
            }
        });
    }

    const regForm = document.querySelector("#patient-register-form");
    if (regForm) {
        const btn = regForm.querySelector("button[type=submit]");
        regForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            btn.disabled = true;
            btn.textContent = "Đang xử lý...";

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
            btn.disabled = false;
            btn.textContent = "Đăng ký";

            if (ok) {
                console.info("Đăng ký thành công!");
                window.location.href = REDIRECTS.afterRegister;
            } else {
                console.error("Đăng ký thất bại.");
            }
        });
    }

    const emailInput = document.querySelector("#register input[name='email']");
    const termsCheckbox = document.getElementById("terms");
    const sendOtpButton = document.getElementById("send-otp");
    const otpInput = document.querySelector("#otp-section input[name='otp']");
    const verifyOtpButton = document.getElementById("verify-otp");
    const resendOtpLink = document.getElementById("resend-otp");
    const countdownElement = document.getElementById("countdown");
    const setPasswordButton = document.getElementById("set-password");
    const submitProfileButton = document.getElementById("submit-profile");
    const regEmailErrorSpan = document.getElementById("reg-email-error");

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

        console.log(regEmailErrorSpan);
        regEmailErrorSpan.textContent = "";

        sendOtpButton.disabled = true;
        sendOtpButton.textContent = "Đang xử lý...";

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

    verifyOtpButton.addEventListener("click", async (e) => {
        e.preventDefault();

        const otp = otpInput.value.trim();
        if (!otp) {
            console.error("Vui lòng nhập OTP.");
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
            console.error("Xác thực OTP thất bại.");
        }
    });

    setPasswordButton.addEventListener("click", async (e) => {
        e.preventDefault();

        const passwordForm = document.getElementById("password-form");
        const password = passwordForm.querySelector("input[name='password']").value;
        const confirmPassword = passwordForm.querySelector("input[name='confirm_password']").value;

        if (password !== confirmPassword) {
            console.error("Mật khẩu không khớp!");
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
            const loginPayload = {
                email: emailInput.value.trim(),
                password: password,
            };
            const { ok: loginOk, data: loginData } = await postJSON(ENDPOINTS.login, loginPayload);

            if (loginOk) {
                localStorage.setItem("access", loginData.access);
                localStorage.setItem("refresh", loginData.refresh);

                goToStep(3);
            } else {
                console.error("Đặt mật khẩu thành công nhưng đăng nhập thất bại.");
            }
        } else {
            console.error("Đặt mật khẩu thất bại.");
        }
    });

    submitProfileButton.addEventListener("click", async () => {
        const profileForm = document.getElementById("profile-form");

        const genderElement = profileForm.querySelector("input[name='gender']:checked");
        const gender = genderElement ? genderElement.value : "";

        function getValue(selector, defaultValue = "") {
            const element = document.querySelector(selector);
            return element && element.value ? element.value : defaultValue;
        }

        const citySelect = document.getElementById("city");
        const districtSelect = document.getElementById("district");
        const wardSelect = document.getElementById("ward");

        const cityName = citySelect.options[citySelect.selectedIndex]?.textContent || "";
        const districtName = districtSelect.options[districtSelect.selectedIndex]?.textContent || "";
        const wardName = wardSelect.options[wardSelect.selectedIndex]?.textContent || "";

        const addressDetail = getValue("input[name='address_detail']");

        let fullAddressParts = [];
        if (addressDetail) fullAddressParts.push(addressDetail);
        if (wardName && wardName !== "-- Chọn Phường / Xã --") fullAddressParts.push(wardName);
        if (districtName && districtName !== "-- Chọn Quận / Huyện --") fullAddressParts.push(districtName);
        if (cityName && cityName !== "-- Chọn Tỉnh / Thành phố --") fullAddressParts.push(cityName);

        const fullAddress = fullAddressParts.join(", ");

        const payload = {
            full_name: getValue("input[name='full_name']"),
            phone_number: getValue("input[name='phone_number']"),
            dob: getValue("input[name='dob']"),
            gender: gender,
            address_detail: addressDetail,
            ward: wardName,
            district: districtName,
            city: cityName,
            full_address: fullAddress,
            id_number: getValue("input[name='id_number']"),
            ethnicity: getValue("input[name='ethnicity']"),
            insurance_no: getValue("input[name='insurance_no']"),
            occupation: getValue("input[name='occupation']"),
        };

        console.log("Profile payload:", payload);

        const { ok, data } = await patchJSON(ENDPOINTS.patient_profile, payload, true);

        if (ok) {
            localStorage.removeItem("access");
            localStorage.removeItem("refresh");
            localStorage.removeItem("temp_token");

            window.location.href = REDIRECTS.afterRegister;
        } else {
            console.error("Cập nhật hồ sơ thất bại.", data);
        }
    });

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

    initAddressSelects();
});
