// static/js/auth.js
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

    // Xử lý logout
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
