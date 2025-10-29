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
                        const avatarImg = avatarContainer.querySelector(".user-avatar");

                        avatarContainer.style.display = "flex";

                        let userFullName = "";
                        let profilePic = "";

                        if (data.role === "PATIENT") {
                            userFullName = data.patient?.user?.full_name || "Bệnh nhân";
                            profilePic = data.patient?.profile_picture_thumbs?.small;
                        } else if (data.role === "DOCTOR") {
                            userFullName = data.doctor?.user?.full_name || "Bác sĩ";
                            profilePic = data.doctor?.profile_picture_thumbs?.small;
                        } else if (data.role === "ADMIN") {
                            userFullName = data.user?.full_name || "Admin";
                            profilePic = data.admin?.profile_picture_thumbs?.small;
                        }

                        userNameEl.textContent = userFullName;

                        if (profilePic) {
                            avatarImg.outerHTML = `<img src="${profilePic}" alt="Avatar" class="user-avatar">`;
                        } else {
                            const firstChar = userFullName.charAt(0).toUpperCase();
                            avatarImg.outerHTML = `
                            <div class="avatar-placeholder">${firstChar}</div>
                        `;
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

                        const newAppointmentsLink = document.getElementById("newAppointmentsLink");
                        if (data.role === "PATIENT") {
                            newAppointmentsLink.style.display = "block";
                            newAppointmentsLink.href = "/appointments/";
                        } else {
                            newAppointmentsLink.style.display = "none";
                        }

                        const myAppointmentsLink = document.getElementById("myAppointmentsLink");
                        if (data.role === "PATIENT") {
                            myAppointmentsLink.style.display = "block";
                            myAppointmentsLink.href = "/dashboard/#appointments";
                        } else if (data.role === "DOCTOR") {
                            myAppointmentsLink.style.display = "block";
                            myAppointmentsLink.href = "/dashboard/#appointments";
                        } else {
                            myAppointmentsLink.style.display = "none";
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
