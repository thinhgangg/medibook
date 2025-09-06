document.addEventListener("DOMContentLoaded", () => {
    // ====== API ENDPOINTS cho bệnh nhân ======
    const ENDPOINTS = {
        login: "/api/accounts/login/",
        register: "/api/accounts/register/patient/",
        logout: "/api/accounts/logout/", // Thêm đường dẫn API logout
    };
    const REDIRECTS = {
        afterLogin: "/dashboard/",
        afterRegister: "/accounts/login/",
    };

    // ====== CSRF for Django ======
    function getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);

        if (parts.length === 2) return decodeURIComponent(parts.pop().split(";").shift());
    }
    const csrfToken = getCookie("csrftoken");

    // ====== Toggle password eye ======
    document.querySelectorAll(".toggle-eye").forEach((btn) => {
        const input = document.querySelector(btn.getAttribute("data-target"));
        if (!input) return;
        btn.addEventListener("click", () => {
            input.type = input.type === "password" ? "text" : "password";
        });
    });

    // ====== Alerts (Toast message) ======
    const showAlert = (type, text) => {
        let box = document.querySelector(".django-messages");
        if (!box) {
            box = document.createElement("ul");
            box.className = "django-messages";
            document.body.prepend(box);
        }
        const li = document.createElement("li");
        li.className = `msg ${type}`;
        li.textContent = text;
        box.appendChild(li);
        setTimeout(() => {
            li.style.opacity = "0";
        }, 4500);
        setTimeout(() => {
            li.remove();
        }, 5200);
    };

    // ====== POST JSON ======
    async function postJSON(url, payload) {
        const res = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(csrfToken ? { "X-CSRFToken": csrfToken } : {}),
            },
            body: JSON.stringify(payload),
        });
        let data = null;
        try {
            data = await res.json();
        } catch (_e) {}
        return { ok: res.ok, status: res.status, data };
    }

    // ====== Login (patient) ======
    const loginForm = document.querySelector("#patient-login-form");
    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const btn = loginForm.querySelector("button[type=submit]");
            btn.disabled = true;

            const payload = {
                username: loginForm.username.value.trim(),
                password: loginForm.password.value,
            };
            const { ok, data } = await postJSON(ENDPOINTS.login, payload);

            btn.disabled = false;
            btn.textContent = "Đăng nhập";

            if (ok) {
                const { access, refresh, user } = data;

                // Lưu token
                localStorage.setItem("access", access);
                localStorage.setItem("refresh", refresh);

                // Redirect
                window.location.href = "/dashboard/"; // Redirect to dashboard after login
            } else {
                // Hiển thị Toast message khi đăng nhập thất bại
                showAlert("error", data?.detail || "Sai tài khoản hoặc mật khẩu.");
            }
        });
    }

    // ====== Register (patient) ======
    const regForm = document.querySelector("#patient-register-form");
    if (regForm) {
        const btn = regForm.querySelector("button[type=submit]");
        regForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            btn.disabled = true;

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
                showAlert("success", "Đăng ký thành công! Đăng nhập nhé.");
                window.location.href = "/accounts/login/"; // Redirect to login after registration
            } else {
                // Hiển thị Toast message khi đăng ký thất bại
                showAlert("error", data?.detail || Object.values(data || {}).join(" • ") || "Đăng ký thất bại.");
            }
        });
    }

    // ====== Logout ======
    const logoutBtn = document.querySelector("#logoutButton");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", async () => {
            // Gửi yêu cầu POST tới API logout
            const { ok, data } = await postJSON(ENDPOINTS.logout, {});

            if (ok) {
                // Xóa token khỏi localStorage
                localStorage.removeItem("access");
                localStorage.removeItem("refresh");

                // Redirect về trang đăng nhập hoặc trang chủ
                window.location.href = "/accounts/login/";
            } else {
                // Hiển thị thông báo lỗi nếu đăng xuất không thành công
                showAlert("error", data?.detail || "Có lỗi xảy ra khi đăng xuất.");
            }
        });
    }
});
