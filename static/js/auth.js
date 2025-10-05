document.addEventListener("DOMContentLoaded", () => {
    const ENDPOINTS = {
        me: "/api/accounts/me/",
        logout: "/api/accounts/logout/",
    };

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
                        const userNameEl = document.getElementById("user-name");
                        avatarContainer.style.display = "flex";
                        const avatarImg = avatarContainer.querySelector(".user-avatar");
                        if (data.role === "PATIENT") {
                            avatarImg.src = data.patient?.profile_picture_thumbs?.small || "/static/img/default-avatar.jpg";
                            userNameEl.textContent = data.patient?.user?.full_name || "Bệnh nhân";
                        } else if (data.role === "DOCTOR") {
                            avatarImg.src = data.profile_picture_thumbs?.small || "/static/img/default-avatar.jpg";
                            userNameEl.textContent = data.doctor?.user?.full_name || "Bác sĩ";
                        } else if (data.role === "ADMIN") {
                            avatarImg.src = data.profile_picture_thumbs?.small || "/static/img/default-avatar.jpg";
                            userNameEl.textContent = data.user?.full_name || "Admin";
                        }

                        const profileLink = document.getElementById("profileLink");
                        if (data.role === "PATIENT") {
                            profileLink.href = "/dashboard/";
                        } else if (data.role === "DOCTOR") {
                            profileLink.href = "/dashboard/";
                        } else if (data.role === "ADMIN") {
                            profileLink.href = "/dashboard/";
                        } else {
                            profileLink.href = "/dashboard/";
                        }
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

    const logoutLink = document.querySelector("#logoutLink");
    if (logoutLink) {
        logoutLink.addEventListener("click", async (e) => {
            e.preventDefault();

            const refreshToken = localStorage.getItem("refresh");
            if (!refreshToken) {
                console.error("Không tìm thấy refresh token. Vui lòng đăng nhập lại.");
                return;
            }

            const res = await fetch(ENDPOINTS.logout, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(document.cookie.includes("csrftoken") ? { "X-CSRFToken": document.cookie.split("csrftoken=")[1].split(";")[0] } : {}),
                    Authorization: `Bearer ${localStorage.getItem("access")}`,
                },
                body: JSON.stringify({ refresh: refreshToken }),
            });

            if (res.ok) {
                localStorage.removeItem("access");
                localStorage.removeItem("refresh");
                window.location.href = "/";
            } else {
                console.error("Đăng xuất thất bại.");
            }
        });
    }
});
