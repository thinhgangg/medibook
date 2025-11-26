// static/js/patient-dashboard.js (Main File)

import {
    doctorsMap,
    allAppointments,
    mockNotifications,
    formatDateVN,
    showErrorModal,
    showReviewModal,
    showAppointmentDetailModal,
    showLoadingOverlay,
    hideLoadingOverlay,
    showToast,
    API_BASE_URL,
    fetchWithAuth,
    setAllAppointments,
    setMockNotifications,
} from "./_config.js";

import { fetchPatientProfile, fetchAppointmentsAndDoctors, loadNotificationsData } from "./_data_loader.js";

export function showPanel(name) {
    const panels = {
        overview: document.getElementById("panel-overview"),
        profile: document.getElementById("panel-profile"),
        appointments: document.getElementById("panel-appointments"),
        stats: document.getElementById("panel-stats"),
        messages: document.getElementById("panel-messages"),
        notifications: document.getElementById("panel-notifications"),
    };
    const navs = {
        overview: document.getElementById("nav-overview"),
        profile: document.getElementById("nav-profile"),
        appointments: document.getElementById("nav-appointments"),
        stats: document.getElementById("nav-stats"),
        messages: document.getElementById("nav-messages"),
        notifications: document.getElementById("nav-notifications"),
    };

    Object.values(panels).forEach((panel) => panel?.classList.add("hidden"));
    Object.values(navs).forEach((nav) => nav?.classList.remove("active"));

    panels[name]?.classList.remove("hidden");
    navs[name]?.classList.add("active");

    switch (name) {
        case "appointments":
            initAppointmentPanelListeners();
            fetchAppointmentsAndDoctors(true);
            break;
        case "stats":
            renderStatsPanel();
            break;
        case "notifications":
            renderNotificationsPanel();
            break;
    }
}

export function renderPatientProfile(patient) {
    const profileSummary = document.getElementById("profile-summary");
    if (profileSummary) {
        profileSummary.classList.remove("skeleton-bars");
        profileSummary.innerHTML = `
            <ul class="overview-info">
                <li><strong>Họ và tên:</strong> <span>${patient.user?.full_name || "Chưa có thông tin"}</span></li>
                <li><strong>Số điện thoại:</strong> <span>${patient.user?.phone_number || "Chưa có thông tin"}</span></li>
                <li><strong>Ngày sinh:</strong> <span>${formatDateVN(patient.user?.dob) || "Chưa có thông tin"}</span></li>
                <li><strong>Giới tính:</strong> <span>${
                    patient.user?.gender ? (patient.user.gender === "MALE" ? "Nam" : "Nữ") : "Chưa có thông tin"
                }</span></li>
                <li><strong>Địa chỉ:</strong> <span>${patient.user?.full_address || "Chưa có thông tin"}</span></li>
            </ul>
        `;
    }
    document.getElementById("profile-error-overview")?.classList.add("hidden");

    const profilePicContainer = document.querySelector("#panel-profile .profile-pic");
    if (profilePicContainer) {
        if (patient.profile_picture) {
            profilePicContainer.innerHTML = `<img src="${patient.profile_picture}" alt="Ảnh hồ sơ">`;
        } else {
            const firstChar = patient.user?.full_name ? patient.user.full_name[0].toUpperCase() : "?";
            profilePicContainer.innerHTML = `<div class="profile-placeholder">${firstChar}</div>`;
        }
    }

    const profileNameEl = document.getElementById("profile-name");
    if (profileNameEl) profileNameEl.textContent = patient.user?.full_name || "Bệnh nhân";

    const basicList = document.getElementById("basic-info");
    if (basicList) {
        basicList.innerHTML = `
            <li><strong>Họ và tên:</strong> <span>${patient.user?.full_name || "Chưa có thông tin"}</span></li>
            <li><strong>Số điện thoại:</strong> <span>${patient.user?.phone_number || "Chưa có thông tin"}</span></li>
            <li><strong>Ngày sinh:</strong> <span>${formatDateVN(patient.user?.dob) || "Chưa có thông tin"}</span></li>
            <li><strong>Giới tính:</strong> <span>${
                patient.user?.gender ? (patient.user.gender === "MALE" ? "Nam" : "Nữ") : "Chưa có thông tin"
            }</span></li>
            <li><strong>Địa chỉ:</strong> <span>${patient.user?.full_address || "Chưa có thông tin"}</span></li>
        `;
    }

    const extraList = document.getElementById("extra-info");
    if (extraList) {
        extraList.innerHTML = `
            <li><strong>Mã BHYT:</strong> <span>${patient.insurance_no || "Chưa có thông tin"}</span></li>
            <li><strong>Số CMND/CCCD:</strong> <span>${patient.user?.id_number || "Chưa có thông tin"}</span></li>
            <li><strong>Dân tộc:</strong> <span>${patient.user?.ethnicity || "Chưa có thông tin"}</span></li>
            <li><strong>Nghề nghiệp:</strong> <span>${patient.occupation || "Chưa có thông tin"}</span></li>
            <li><strong>Email:</strong> <span>${patient.user?.email || "Chưa có thông tin"}</span></li>
        `;
    }
    document.getElementById("profile-error")?.classList.add("hidden");
}

export function renderOverviewAppointments(appointments) {
    const container = document.getElementById("appointments-content");
    const loading = document.getElementById("appointments-loading");
    const errorEl = document.getElementById("appointments-error");

    loading.classList.add("hidden");
    container.classList.remove("hidden");
    errorEl.classList.add("hidden");

    const now = new Date();

    const upcoming = appointments
        .map((apt) => {
            let start = apt.start_at.includes("T") ? apt.start_at : apt.start_at.replace(" ", "T");
            return { ...apt, start_at_parsed: new Date(start) };
        })
        .filter((apt) => apt.start_at_parsed > now && (apt.status === "CONFIRMED" || apt.status === "PENDING"))
        .sort((a, b) => a.start_at_parsed - b.start_at_parsed)
        .slice(0, 3);

    if (upcoming.length === 0) {
        container.innerHTML = `<div class="no-data">Không có lịch hẹn sắp tới.</div>`;
        return;
    }

    container.innerHTML = upcoming
        .map((apt) => {
            const startDate = apt.start_at_parsed;
            const endDate = new Date(apt.end_at.includes("T") ? apt.end_at : apt.end_at.replace(" ", "T"));
            const doctorName = doctorsMap[apt.doctor_id]?.user?.full_name || `Doctor ID: ${apt.doctor_id}`;

            let statusText;
            switch (apt.status) {
                case "PENDING":
                    statusText = "Chờ xác nhận";
                    break;
                case "CONFIRMED":
                    statusText = "Đã xác nhận";
                    break;
                case "COMPLETED":
                    statusText = "Hoàn thành";
                    break;
                case "CANCELLED":
                    statusText = "Đã hủy";
                    break;
                default:
                    statusText = apt.status;
            }

            const statusClass = `status-${apt.status.toLowerCase()}`;

            return `
            <div class="row">
                <div>${startDate.toLocaleDateString("vi-VN")}</div>
                <div>${startDate.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })} - ${endDate.toLocaleTimeString("vi-VN", {
                hour: "2-digit",
                minute: "2-digit",
            })}</div>
                <div>${doctorName}</div>
                <div><span class="status ${statusClass}">${statusText}</span></div>
            </div>
            `;
        })
        .join("");
}

function filterAppointments(appointments, status, startDate, endDate) {
    let filteredAppointments = [...appointments];
    if (status && status !== "all") {
        filteredAppointments = filteredAppointments.filter((apt) => apt.status === status);
    }

    if (startDate) {
        const [day, month, year] = startDate.split("/");
        const start = new Date(`${year}-${month}-${day}`);
        if (!isNaN(start)) {
            filteredAppointments = filteredAppointments.filter((apt) => new Date(apt.start_at) >= start);
        }
    }
    if (endDate) {
        const [day, month, year] = endDate.split("/");
        const end = new Date(`${year}-${month}-${day}`);
        if (!isNaN(end)) {
            end.setHours(23, 59, 59, 999);
            filteredAppointments = filteredAppointments.filter((apt) => new Date(apt.start_at) <= end);
        }
    }

    return filteredAppointments.sort((a, b) => new Date(b.start_at) - new Date(a.start_at));
}

export function renderAllAppointments(appointments, statusFilter = "all", startDate = null, endDate = null) {
    const container = document.getElementById("all-appointments-content");
    const loading = document.getElementById("all-appointments-loading");
    const errorEl = document.getElementById("all-appointments-error");
    container.classList.add("appointments-list");

    loading.classList.add("hidden");
    container.classList.remove("hidden");
    errorEl.classList.add("hidden");

    const filteredAppointments = filterAppointments(appointments, statusFilter, startDate, endDate);

    if (filteredAppointments.length === 0) {
        container.classList.remove("appointments-list");
        container.innerHTML = `<div class="no-data">Không tìm thấy lịch hẹn phù hợp.</div>`;
        return;
    }

    container.innerHTML = filteredAppointments
        .map((apt) => {
            const startDate = new Date(apt.start_at);
            const endDate = new Date(apt.end_at);
            const doctor = doctorsMap[apt.doctor_id]?.user?.full_name || `Doctor ID: ${apt.doctor_id}`;
            const specialty = doctorsMap[apt.doctor_id]?.specialty?.name || "N/A";
            const room_number = doctorsMap[apt.doctor_id]?.room_number || "Chưa cập nhật";
            const statusClass = `status-${apt.status.toLowerCase()}`;
            let statusText;
            switch (apt.status) {
                case "CONFIRMED":
                    statusText = "Đã xác nhận";
                    break;
                case "PENDING":
                    statusText = "Chờ xác nhận";
                    break;
                case "COMPLETED":
                    statusText = "Hoàn thành";
                    break;
                case "CANCELLED":
                    statusText = "Đã hủy";
                    break;
                default:
                    statusText = apt.status;
            }

            let actionsHtml = "";
            actionsHtml += `<button class="btn btn-detail" data-appointment-id="${apt.id}">Chi tiết</button> `;
            if (apt.status === "PENDING") {
                actionsHtml += `<button class="btn btn-cancel" data-appointment-id="${apt.id}">Hủy lịch hẹn</button>`;
            } else if (apt.status === "COMPLETED") {
                if (apt.has_review) {
                    actionsHtml += `<span class="has-review">Đã đánh giá</span>`;
                } else {
                    actionsHtml += `<button class="btn btn-review" data-action="review" data-appointment-id="${apt.id}">Viết đánh giá</button>`;
                }
            }

            return `
                <div class="appointment-card">
                    
                    <div class="appointment-header">
                        <div><strong>Ngày:</strong> ${startDate.toLocaleDateString("vi-VN")}</div>
                        <div><strong>Giờ:</strong> ${startDate.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })} - 
                            ${endDate.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                        </div>
                    </div>

                    <div class="appointment-info">
                        <div><strong>Bác sĩ:</strong> ${doctor}</div>
                        <div><strong>Chuyên khoa:</strong> ${specialty}</div>
                        <div><strong>Phòng:</strong> ${room_number}</div>
                        <div><strong>Trạng thái:</strong> <span class="status ${statusClass}">${statusText}</span></div>
                    </div>

                    <div class="appointment-actions">
                        ${actionsHtml}
                    </div>
                </div>
            `;
        })
        .join("");

    container.querySelectorAll(".appointment-actions button").forEach((button) => {
        button.addEventListener("click", (e) => {
            const aptId = e.target.dataset.appointmentId;
            const action = e.target.dataset.action;

            if (action === "review") {
                showReviewModal(aptId);
                return;
            }

            if (e.target.classList.contains("btn-cancel")) {
                cancelAppointment(aptId, e.target);
                return;
            }

            if (e.target.classList.contains("btn-detail")) {
                showAppointmentDetailModal(aptId);
                return;
            }
        });
    });
}

function cancelAppointment(appointmentId, buttonEl) {
    const modal = document.getElementById("cancelModal");
    const confirmBtn = document.getElementById("cancelConfirmBtn");
    const closeBtn = document.getElementById("cancelCloseBtn");

    modal.querySelector(".modal-close-btn").onclick = () => {
        modal.style.display = "none";
    };

    modal.style.display = "flex";

    return new Promise((resolve, reject) => {
        closeBtn.onclick = () => {
            modal.style.display = "none";
            if (buttonEl) buttonEl.disabled = false;
            reject("User canceled");
        };

        window.onclick = (event) => {
            if (event.target === modal) {
                modal.style.display = "none";
                if (buttonEl) buttonEl.disabled = false;
                reject("User canceled");
            }
        };

        confirmBtn.onclick = async () => {
            modal.style.display = "none";
            showLoadingOverlay("Đang hủy lịch hẹn...");
            try {
                if (buttonEl) {
                    buttonEl.disabled = true;
                }

                const res = await fetchWithAuth(`${API_BASE_URL}/appointments/${appointmentId}/cancel/`, {
                    method: "POST",
                });

                if (!res.ok) {
                    const text = await res.text();
                    throw new Error(`HTTP ${res.status}: ${text || "Hủy lịch hẹn thất bại"}`);
                }

                setAllAppointments(allAppointments.map((apt) => (apt.id === Number(appointmentId) ? { ...apt, status: "CANCELLED" } : apt)));

                renderAllAppointments(allAppointments);
                renderOverviewAppointments(allAppointments);
                renderOverviewStats();

                if (buttonEl) {
                    buttonEl.disabled = false;
                    buttonEl.textContent = "Đã hủy";
                    buttonEl.classList.add("btn-disabled");
                }

                showToast("Hủy lịch hẹn thành công!", "success");
                resolve("Canceled");
            } catch (err) {
                showToast("Hủy lịch hẹn thất bại!", "error");
                if (buttonEl) {
                    buttonEl.disabled = false;
                    buttonEl.textContent = "Hủy";
                }
                reject(err);
            } finally {
                hideLoadingOverlay();
            }
        };
    });
}

function initAppointmentPanelListeners() {
    if (!document.getElementById("start-date-filter")._flatpickr) {
        flatpickr("#start-date-filter", { dateFormat: "d/m/Y", locale: "vn", placeholder: "dd/mm/yyyy", allowInput: true });
        flatpickr("#end-date-filter", { dateFormat: "d/m/Y", locale: "vn", placeholder: "dd/mm/yyyy", allowInput: true });
    }

    const applyFilterBtn = document.getElementById("apply-filters");
    const clearFilterBtn = document.getElementById("clear-filters");

    if (!applyFilterBtn._listenerAdded) {
        applyFilterBtn.addEventListener("click", () => {
            const statusFilter = document.getElementById("status-filter").value;
            const startDate = document.getElementById("start-date-filter").value;
            const endDate = document.getElementById("end-date-filter").value;

            const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
            if ((startDate && !dateRegex.test(startDate)) || (endDate && !dateRegex.test(endDate))) {
                showErrorModal("Vui lòng nhập ngày theo định dạng dd/mm/yyyy.");
                return;
            }
            if (startDate && endDate) {
                const [startDay, startMonth, startYear] = startDate.split("/").map(Number);
                const [endDay, endMonth, endYear] = endDate.split("/").map(Number);
                const start = new Date(startYear, startMonth - 1, startDay);
                const end = new Date(endYear, endMonth - 1, endDay);
                if (start > end) {
                    showErrorModal("Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc.");
                    return;
                }
            }

            renderAllAppointments(allAppointments, statusFilter, startDate, endDate);
        });

        clearFilterBtn.addEventListener("click", () => {
            document.getElementById("status-filter").value = "all";
            document.getElementById("start-date-filter").value = "";
            document.getElementById("end-date-filter").value = "";
            renderAllAppointments(allAppointments);
        });
        applyFilterBtn._listenerAdded = true;
    }
}

/* -------------------------
   Stats Render
   ------------------------- */

export function renderOverviewStats() {
    const container = document.getElementById("stats-overview");
    const errorEl = document.getElementById("stats-error-overview");
    if (!container) return;

    try {
        const total = allAppointments.length;
        const confirmed = allAppointments.filter((a) => a.status === "CONFIRMED").length;
        const pending = allAppointments.filter((a) => a.status === "PENDING").length;
        const completed = allAppointments.filter((a) => a.status === "COMPLETED").length;
        const cancelled = allAppointments.filter((a) => a.status === "CANCELLED").length;

        container.classList.remove("skeleton-bars");
        container.innerHTML = `
            <div class="chart-container full-width">
                <canvas id="appointment-chart"></canvas>
            </div>
        `;
        const ctx = document.getElementById("appointment-chart")?.getContext("2d");
        if (ctx) {
            Chart.register({
                id: "centerText",
                afterDraw: function (chart) {
                    const ctx = chart.ctx;
                    ctx.save();
                    const centerX = (chart.chartArea.left + chart.chartArea.right) / 2;
                    const centerY = (chart.chartArea.top + chart.chartArea.bottom) / 2;

                    ctx.font = "bold 24px sans-serif";
                    ctx.fillStyle = "#333333";
                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";
                    ctx.fillText(`${total}`, centerX, centerY - 10);

                    ctx.font = "14px sans-serif";
                    ctx.fillStyle = "#666666";
                    ctx.fillText("Tổng lịch hẹn", centerX, centerY + 20);
                    ctx.restore();
                },
            });

            new Chart(ctx, {
                type: "doughnut",
                data: {
                    labels: ["Đã xác nhận", "Chờ xác nhận", "Hoàn thành", "Đã hủy"],
                    datasets: [
                        {
                            data: [confirmed, pending, completed, cancelled],
                            backgroundColor: ["#36A2EB", "#FFCE56", "#4CAF50", "#FF6384"],
                            borderColor: ["#FFFFFF", "#FFFFFF", "#FFFFFF", "#FFFFFF"],
                            borderWidth: 2,
                        },
                    ],
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: "bottom", labels: { color: "#333333", font: { size: 14 } } },
                        tooltip: {
                            callbacks: {
                                label: function (context) {
                                    const value = context.parsed;
                                    const percentage = ((value / total) * 100).toFixed(2) + "%";
                                    return `${context.label}: ${value} (${percentage})`;
                                },
                            },
                        },
                    },
                    cutout: "60%",
                },
                plugins: ["centerText"],
            });
        }
        errorEl?.classList.add("hidden");
    } catch (e) {
        if (errorEl) {
            errorEl.classList.remove("hidden");
            errorEl.innerHTML = `<p>Lỗi tải thống kê.</p>`;
        }
    }
}

export function renderStatsPanel() {
    const container = document.getElementById("stats-full");
    const errorEl = document.getElementById("stats-error");
    if (!container) return;

    try {
        const total = allAppointments.length;
        const confirmed = allAppointments.filter((a) => a.status === "CONFIRMED").length;
        const pending = allAppointments.filter((a) => a.status === "PENDING").length;
        const completed = allAppointments.filter((a) => a.status === "COMPLETED").length;
        const cancelled = allAppointments.filter((a) => a.status === "CANCELLED").length;
        const upcoming = allAppointments.filter((a) => new Date(a.start_at) > new Date()).length;

        container.innerHTML = `
            <div class="stat-card">
                <div class="stat-label">Tổng lịch hẹn</div>
                <div class="stat-value">${total}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Đã xác nhận</div>
                <div class="stat-value">${confirmed}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Chờ xác nhận</div>
                <div class="stat-value">${pending}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Hoàn thành</div>
                <div class="stat-value">${completed}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Đã hủy</div>
                <div class="stat-value">${cancelled}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Sắp tới</div>
                <div class="stat-value">${upcoming}</div>
            </div>
        `;
        errorEl?.classList.add("hidden");
    } catch (e) {
        if (errorEl) {
            errorEl.classList.remove("hidden");
            errorEl.innerHTML = `<p>Lỗi tải thống kê.</p>`;
        }
    }
}

export function generateMockNotifications() {
    const now = new Date();
    const samples = [
        {
            id: 1,
            content: "Lịch hẹn lúc 09:00 hôm nay đã được xác nhận",
            type: "APPOINTMENT",
            status: "UNREAD",
            created_at: new Date(now.getTime() - 15 * 60 * 1000).toISOString(),
        },
        {
            id: 2,
            content: "Bác sĩ đã cập nhật ghi chú khám gần nhất",
            type: "NOTE",
            status: "UNREAD",
            created_at: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
        },
        {
            id: 3,
            content: "Lịch hẹn ngày mai 14:30 - nhắc bạn đến đúng giờ",
            type: "REMINDER",
            status: "READ",
            created_at: new Date(now.getTime() - 26 * 60 * 60 * 1000).toISOString(),
        },
    ];
    setMockNotifications(samples);
}

export function renderNotifications(notifications) {
    const container = document.getElementById("notifications-content");
    const loading = document.getElementById("notifications-loading");
    const errorEl = document.getElementById("notifications-error");

    if (loading) loading.classList.add("hidden");
    if (!container) return;
    container.classList.remove("hidden");
    errorEl.classList.add("hidden");

    if (!notifications || notifications.length === 0) {
        container.innerHTML = `<div class="no-data">Không có thông báo.</div>`;
        return;
    }

    const sorted = [...notifications].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const typeLabel = (t) => {
        switch (t) {
            case "APPOINTMENT":
                return "Lịch hẹn";
            case "REMINDER":
                return "Nhắc nhở";
            case "NOTE":
                return "Ghi chú";
            default:
                return t || "Khác";
        }
    };

    const statusBadge = (s) => {
        const map = { UNREAD: "status-confirmed", READ: "status-completed" };
        const label = s === "UNREAD" ? "Chưa đọc" : "Đã đọc";
        const cls = map[s] || "status-pending";
        return `<span class="status ${cls}">${label}</span>`;
    };

    const fmtTime = (iso) => {
        const d = new Date(iso);
        return `${d.toLocaleDateString("vi-VN")} ${d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}`;
    };

    container.innerHTML = sorted
        .map(
            (n) => `
            <div class="row">
                <div>${n.content}</div>
                <div>${fmtTime(n.created_at)}</div>
                <div>${typeLabel(n.type)}</div>
                <div>${statusBadge(n.status)}</div>
            </div>
        `
        )
        .join("");
}

export function renderNotificationsPanel() {
    const loading = document.getElementById("notifications-loading");
    const container = document.getElementById("notifications-content");
    if (!loading || !container) return;
    loading.classList.remove("hidden");
    container.classList.add("hidden");

    loadNotificationsData();

    setTimeout(() => {
        renderNotifications(mockNotifications);
    }, 500);
}

document.addEventListener("DOMContentLoaded", () => {
    const applyHash = () => {
        const hash = location.hash.slice(1) || "overview";
        showPanel(hash);
    };
    applyHash();

    document.querySelectorAll(".sidebar-nav-item").forEach((nav) => {
        nav.addEventListener("click", (e) => {
            e.preventDefault();
            const panel = nav.getAttribute("href").slice(1);
            history.replaceState(null, "", `#${panel}`);
            showPanel(panel);
        });
    });

    document.getElementById("btn-edit-profile")?.addEventListener("click", (e) => {
        e.preventDefault();
        showErrorModal("Chuyển đến trang chỉnh sửa hồ sơ bệnh nhân!");
    });

    window.addEventListener("hashchange", applyHash);

    document.querySelectorAll('a[href^="#"]').forEach((link) => {
        link.addEventListener("click", (e) => {
            const target = link.getAttribute("href").substring(1);
            if (["overview", "profile", "appointments", "notifications", "stats", "messages"].includes(target)) {
                e.preventDefault();

                showPanel(target);

                window.location.hash = `#${target}`;

                window.scrollTo({ top: 0, behavior: "smooth" });
            }
        });
    });

    fetchPatientProfile();
    fetchAppointmentsAndDoctors();
    loadNotificationsData();
});
