document.addEventListener("DOMContentLoaded", () => {
    // API ENDPOINTS
    const ENDPOINTS = {
        login: "/api/accounts/login/",
        register: "/api/accounts/register/patient/",
        logout: "/api/accounts/logout/",
        me: "/api/accounts/me/",
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

    // ====== Login ======
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

                localStorage.setItem("access", access);
                localStorage.setItem("refresh", refresh);

                window.location.href = "/";
            } else {
                showAlert("error", data?.detail || "Đăng nhập thất bại.");
            }
        });
    }

    // ====== Register ======
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
                showAlert("success", "Đăng ký thành công! Đăng nhập nhé.");
                window.location.href = REDIRECTS.afterRegister;
            } else {
                showAlert("error", data?.detail || Object.values(data || {}).join(" • ") || "Đăng ký thất bại.");
            }
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

    // Function to show alert messages
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

    // ====== Aside Slider ======
    (function initSlider(scope = document) {
        scope.querySelectorAll("[data-slider]").forEach((slider) => {
            const slides = slider.querySelectorAll(".slide");
            const dotsBox = slider.querySelector("[data-dots]");
            let i = 0,
                timer;

            function renderDots() {
                if (!dotsBox) return;
                dotsBox.innerHTML = Array.from(slides, (_, k) => `<button aria-label="Ảnh ${k + 1}"></button>`).join("");
                dotsBox.querySelectorAll("button").forEach((b, idx) => {
                    b.addEventListener("click", () => {
                        go(idx);
                        reset();
                    });
                });
            }
            function markActive() {
                slides.forEach((s, idx) => s.classList.toggle("is-active", idx === i));
                if (dotsBox) dotsBox.querySelectorAll("button").forEach((b, idx) => b.classList.toggle("active", idx === i));
            }
            function go(n) {
                i = (n + slides.length) % slides.length;
                markActive();
            }
            function next() {
                go(i + 1);
            }
            function prev() {
                go(i - 1);
            }
            function reset() {
                clearInterval(timer);
                timer = setInterval(next, 4000);
            }

            slider.querySelector("[data-next]")?.addEventListener("click", () => {
                next();
                reset();
            });
            slider.querySelector("[data-prev]")?.addEventListener("click", () => {
                prev();
                reset();
            });

            let startX = 0;
            slider.addEventListener(
                "touchstart",
                (e) => {
                    startX = e.touches[0].clientX;
                },
                { passive: true }
            );
            slider.addEventListener("touchend", (e) => {
                const dx = e.changedTouches[0].clientX - startX;
                if (Math.abs(dx) > 40) {
                    dx < 0 ? next() : prev();
                    reset();
                }
            });

            renderDots();
            markActive();
            reset();
        });
    })();

    checkAuthStatus();
});
