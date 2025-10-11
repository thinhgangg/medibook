// static/js/doctor-dashboard.js (Main File)

import {
    doctorProfile,
    allAppointments,
    availabilityList,
    daysOffList,
    mockNotifications,
    formatDateVN,
    showErrorModal,
    showLoadingOverlay,
    hideLoadingOverlay,
    fetchWithAuth,
    apiBase,
    setAllAppointments,
    setMockNotifications,
    showToast,
    formatTimeHM,
} from "./_config.js";

import { fetchDoctorProfile, loadAppointments, loadAvailability, loadDaysOff, loadNotifications } from "./_data_loader.js";

export function showPanel(name) {
    const panels = {
        overview: document.getElementById("panel-overview"),
        profile: document.getElementById("panel-profile"),
        appointments: document.getElementById("panel-appointments"),
        availability: document.getElementById("panel-availability"),
        "days-off": document.getElementById("panel-days-off"),
        notifications: document.getElementById("panel-notifications"),
        stats: document.getElementById("panel-stats"),
        messages: document.getElementById("panel-messages"),
    };

    const navs = {
        overview: document.getElementById("nav-overview"),
        profile: document.getElementById("nav-profile"),
        appointments: document.getElementById("nav-appointments"),
        availability: document.getElementById("nav-availability"),
        "days-off": document.getElementById("nav-days-off"),
        notifications: document.getElementById("nav-notifications"),
        stats: document.getElementById("nav-stats"),
        messages: document.getElementById("nav-messages"),
    };

    Object.values(panels).forEach((p) => p?.classList.add("hidden"));
    Object.values(navs).forEach((n) => n?.classList.remove("active"));

    panels[name]?.classList.remove("hidden");
    navs[name]?.classList.add("active");

    switch (name) {
        case "overview":
            renderOverview();
            break;
        case "profile":
            if (doctorProfile) renderDoctorProfilePanel(doctorProfile);
            else fetchDoctorProfile();
            break;
        case "appointments":
            renderAppointmentsPanelInit();
            loadAppointments(true);
            break;
        case "availability":
            renderAvailabilityPanelInit();
            loadAvailability(true);
            break;
        case "days-off":
            renderDaysOffPanelInit();
            loadDaysOff(true);
            break;
        case "notifications":
            renderNotificationsPanel();
            break;
        case "stats":
            renderStatsPanel();
            break;
        case "messages":
            // Nội dung tĩnh trong HTML
            break;
    }
}

export function renderOverview() {
    if (doctorProfile) renderProfileSummary(doctorProfile);
    loadAppointments();
}

export function renderProfileSummary(doc) {
    const profileSummary = document.getElementById("profile-summary");
    if (profileSummary) {
        profileSummary.classList.remove("skeleton-bars");
        profileSummary.innerHTML = `
            <ul class="overview-info">
                <li><strong>Họ và tên:</strong> <span>${doc.user?.full_name || "Chưa cập nhật"}</span></li>
                <li><strong>Số điện thoại:</strong> <span>${doc.user?.phone_number || "Chưa cập nhật"}</span></li>
                <li><strong>Email:</strong> <span>${doc.user?.email || "Chưa cập nhật"}</span></li>
                <li><strong>Chuyên khoa:</strong> <span>${doc.specialty?.name || "Chưa cập nhật"}</span></li>
                <li><strong>Kinh nghiệm:</strong> <span>${doc.experience_years ? doc.experience_years + " năm" : "Chưa cập nhật"}</span></li>
                <li><strong>Trạng thái:</strong> <span>${doc.is_active ? "Đang hoạt động" : "Đã khóa"}</span></li>
                <li><strong>Mã phòng:</strong> <span>${doc.code || "Chưa cập nhật"}</span></li>
            </ul>
        `;
    }
    document.getElementById("profile-error-overview")?.classList.add("hidden");
}

export function renderOverviewStats() {
    const container = document.getElementById("stats-overview");
    const errorEl = document.getElementById("stats-error-overview");
    if (!container) return;

    try {
        const total = allAppointments.length || 0;
        const confirmed = allAppointments.filter((a) => a.status === "CONFIRMED").length;
        const pending = allAppointments.filter((a) => a.status === "PENDING").length;
        const completed = allAppointments.filter((a) => a.status === "COMPLETED").length;
        const cancelled = allAppointments.filter((a) => a.status === "CANCELLED").length;

        container.classList.remove("skeleton-bars");
        container.innerHTML = `
            <div class="chart-container full-width">
                <canvas id="overview-appointment-chart"></canvas>
            </div>
        `;

        const ctx = document.getElementById("overview-appointment-chart")?.getContext("2d");
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
                    labels: ["Đã xác nhận", "Chờ xác nhận", "Hoàn tất", "Đã hủy"],
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

export function renderOverviewAppointments() {
    const container = document.getElementById("appointments-content");
    const loading = document.getElementById("appointments-loading");
    const errorEl = document.getElementById("appointments-error");
    if (!container || !loading) return;

    loading.classList.add("hidden");
    container.classList.remove("hidden");
    errorEl.classList.add("hidden");

    const now = new Date();

    const upcoming = (allAppointments || [])
        .map((apt) => {
            const start = apt.start_at.includes("T") ? apt.start_at : apt.start_at.replace(" ", "T");
            return { ...apt, start_at_parsed: new Date(start) };
        })
        .filter((apt) => (apt.start_at_parsed > now && apt.status === "CONFIRMED") || apt.status === "PENDING")
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
            const patientName = apt.patient?.user?.full_name || apt.patient_name || "Bệnh nhân";
            const statusText =
                {
                    PENDING: "Chờ xác nhận",
                    CONFIRMED: "Đã xác nhận",
                    COMPLETED: "Hoàn thành",
                    CANCELLED: "Đã hủy",
                }[apt.status] || apt.status;
            const statusClass = `status-${apt.status.toLowerCase()}`;

            return `
            <div class="row">
                <div>${startDate.toLocaleDateString("vi-VN")}</div>
                <div>${startDate.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })} - ${endDate.toLocaleTimeString("vi-VN", {
                hour: "2-digit",
                minute: "2-digit",
            })}</div>
                <div>${patientName}</div>
                <div><span class="status ${statusClass}">${statusText}</span></div>
                <div>
                    ${
                        apt.status === "PENDING"
                            ? `
                            <button class="btn-secondary btn-small" data-action="confirm" data-id="${apt.id}">Xác nhận</button>
                            <button class="btn-secondary btn-small" data-action="cancel" data-id="${apt.id}">Hủy</button>
                          `
                            : `
                            <button class="btn-secondary btn-small" data-action="detail" data-id="${apt.id}">Chi tiết</button>
                          `
                    }
                </div>
            </div>`;
        })
        .join("");

    container.querySelectorAll("button[data-action]").forEach((btn) => {
        btn.addEventListener("click", (e) => {
            const id = btn.getAttribute("data-id");
            const action = btn.getAttribute("data-action");

            if (action === "confirm") confirmAppointment(id, btn);
            else if (action === "cancel") cancelAppointment(id, btn);
            else if (action === "detail") {
                showErrorModal("Xem chi tiết đang được phát triển.");
            }
        });
    });
}

export function renderAvailabilityOverview(list) {
    const container = document.getElementById("stats-overview");
    if (!container) return;

    if (!list || list.length === 0) {
        return;
    }
}

export function renderDoctorProfilePanel(doc) {
    document.getElementById("profile-name").textContent = doc.user?.full_name || "Bác sĩ";
    document.querySelector("#panel-profile .profile-info .role").textContent = doc.specialty?.name || "Chưa cập nhật";

    const pic = document.querySelector("#panel-profile .profile-pic");
    if (pic) {
        if (doc.profile_picture) pic.innerHTML = `<img src="${doc.profile_picture}" alt="Ảnh bác sĩ" />`;
        else {
            const ch = doc.user?.full_name ? doc.user.full_name[0].toUpperCase() : "B";
            pic.innerHTML = `<div class="profile-placeholder">${ch}</div>`;
        }
    }

    const basic = document.getElementById("basic-info");
    if (basic) {
        basic.innerHTML = `
            <li><strong>Họ và tên:</strong> <span>${doc.user?.full_name || "Chưa cập nhật"}</span></li>
            <li><strong>Số điện thoại:</strong> <span>${doc.user?.phone_number || "Chưa cập nhật"}</span></li>
            <li><strong>Ngày sinh:</strong> <span>${formatDateVN(doc.user?.dob) || "Chưa cập nhật"}</span></li>
            <li><strong>Giới tính:</strong> <span>${doc.user?.gender ? (doc.user.gender === "MALE" ? "Nam" : "Nữ") : "Chưa cập nhật"}</span></li>
            <li><strong>Địa chỉ:</strong> <span>${doc.user?.full_address || "Chưa cập nhật"}</span></li>
        `;
    }

    const extra = document.getElementById("extra-info");
    if (extra) {
        extra.innerHTML = `
            <li><strong>Chuyên khoa:</strong> <span>${doc.specialty?.name || "Chưa cập nhật"}</span></li>
            <li><strong>Học vị:</strong> <span>${doc.degree || "Chưa cập nhật"}</span></li>
            <li><strong>Mã phòng:</strong> <span>${doc.code || "Chưa cập nhật"}</span></li>
            <li><strong>Giấy phép hành nghề:</strong> <span>${doc.license_no || "Chưa cập nhật"}</span></li>
        `;
    }
    document.getElementById("profile-error")?.classList.add("hidden");
    document.getElementById("btn-edit-profile")?.addEventListener("click", (e) => {
        e.preventDefault();
        showErrorModal("Chức năng chỉnh sửa hồ sơ đang được phát triển.");
    });
}

function renderAppointmentsPanelInit() {
    if (!document.getElementById("start-date-filter")._flatpickr) {
        flatpickr("#start-date-filter", { dateFormat: "d/m/Y", locale: "vn", allowInput: true });
        flatpickr("#end-date-filter", { dateFormat: "d/m/Y", locale: "vn", allowInput: true });
    }

    if (!document.getElementById("btn-refresh-appointments")._listenerAdded) {
        document.getElementById("btn-refresh-appointments")?.addEventListener("click", (e) => {
            e.preventDefault();
            loadAppointments(true);
        });
        document.getElementById("apply-filters")?.addEventListener("click", (e) => {
            e.preventDefault();
            renderAllAppointments();
        });
        document.getElementById("clear-filters")?.addEventListener("click", (e) => {
            e.preventDefault();
            document.getElementById("status-filter").value = "all";
            document.getElementById("start-date-filter").value = "";
            document.getElementById("end-date-filter").value = "";
            renderAllAppointments();
        });
        document.getElementById("btn-refresh-appointments")._listenerAdded = true;
    }
}

function filterAppointments(list) {
    const status = document.getElementById("status-filter")?.value || "all";
    const startDate = document.getElementById("start-date-filter")?.value || "";
    const endDate = document.getElementById("end-date-filter")?.value || "";
    let filtered = [...list];

    if (status && status !== "all") filtered = filtered.filter((a) => a.status === status);

    if (startDate) {
        const [d, m, y] = startDate.split("/").map(Number);
        const s = new Date(y, m - 1, d);
        filtered = filtered.filter((a) => new Date(a.start_at) >= s);
    }
    if (endDate) {
        const [d, m, y] = endDate.split("/").map(Number);
        const e = new Date(y, m - 1, d);
        e.setHours(23, 59, 59, 999);
        filtered = filtered.filter((a) => new Date(a.start_at) <= e);
    }

    return filtered.sort((a, b) => new Date(b.start_at) - new Date(a.start_at));
}

export function renderAllAppointments() {
    const content = document.getElementById("all-appointments-content");
    const loading = document.getElementById("all-appointments-loading");
    if (!content) return;
    if (loading) loading.classList.add("hidden");
    content.classList.remove("hidden");

    const list = filterAppointments(allAppointments);
    if (!list.length) {
        content.innerHTML = `<div class="no-data">Không có lịch hẹn phù hợp.</div>`;
        return;
    }

    content.innerHTML = list
        .map((apt) => {
            const start = new Date(apt.start_at);
            const end = apt.end_at ? new Date(apt.end_at) : null;
            const patientName = apt?.patient_name || `#${apt.patient_id || "?"}`;
            const statusClass = `status-${apt.status?.toLowerCase()}`;
            let statusLabel = apt.status;
            switch (apt.status) {
                case "PENDING":
                    statusLabel = "Chờ xác nhận";
                    break;
                case "CONFIRMED":
                    statusLabel = "Đã xác nhận";
                    break;
                case "COMPLETED":
                    statusLabel = "Hoàn tất";
                    break;
                case "CANCELLED":
                    statusLabel = "Đã hủy";
                    break;
            }

            const actions = [];
            if (apt.status === "PENDING") {
                actions.push(`<button class="btn-secondary btn-small" data-action="confirm" data-id="${apt.id}">Xác nhận</button>`);
                actions.push(`<button class="btn-secondary btn-small" data-action="cancel" data-id="${apt.id}">Hủy</button>`);
            } else if (apt.status === "CONFIRMED") {
                actions.push(`<button class="btn-secondary btn-small" data-action="complete" data-id="${apt.id}">Hoàn tất</button>`);
                actions.push(`<button class="btn-secondary btn-small" data-action="cancel" data-id="${apt.id}">Hủy</button>`);
            } else {
                actions.push(`<button class="btn-secondary btn-small" data-action="detail" data-id="${apt.id}">Chi tiết</button>`);
            }

            return `
                <div class="row" data-id="${apt.id}">
                    <div data-label="Ngày">${start.toLocaleDateString("vi-VN")}</div>
                    <div data-label="Giờ">
                        ${start.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                        ${end ? " - " + end.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : ""}
                    </div>
                    <div data-label="Bệnh nhân" class="patient-name">${patientName}</div>
                    <div data-label="Trạng thái"><span class="status ${statusClass}">${statusLabel}</span></div>
                    <div data-label="Thao tác">${actions.join(" ")}</div>
                </div>
            `;
        })
        .join("");

    content.querySelectorAll("button[data-action]").forEach((btn) => {
        btn.addEventListener("click", (e) => {
            const id = btn.getAttribute("data-id");
            const action = btn.getAttribute("data-action");
            if (action === "confirm") confirmAppointment(id, btn);
            else if (action === "complete") completeAppointment(id, btn);
            else if (action === "cancel") cancelAppointment(id, btn);
            else if (action === "detail") showErrorModal("Xem chi tiết đang được phát triển.");
        });
    });
}

async function confirmAppointment(id, btnEl) {
    try {
        btnEl.disabled = true;
        showLoadingOverlay("Đang xác nhận lịch hẹn...");

        const res = await fetchWithAuth(`${apiBase}/appointments/${id}/confirm/`, { method: "POST" });

        if (!res.ok) {
            let message = `HTTP ${res.status}`;
            try {
                const data = await res.json();
                if (data.detail) message = data.detail;
                else if (data.non_field_errors) message = data.non_field_errors.join(" ");
            } catch {
                const txt = await res.text();
                if (txt) message = txt;
            }
            throw new Error(message);
        }

        setAllAppointments(allAppointments.map((a) => (String(a.id) === String(id) ? { ...a, status: "CONFIRMED" } : a)));

        renderAllAppointments();
        renderOverviewAppointments();
        renderOverviewStats();
        showToast("Xác nhận lịch hẹn thành công!", "success");
    } catch (err) {
        showErrorModal(err.message || "Không thể xác nhận lịch hẹn. Vui lòng thử lại sau.");
        btnEl.disabled = false;
        btnEl.textContent = "Xác nhận";
    } finally {
        hideLoadingOverlay();
    }
}

async function completeAppointment(id, btnEl) {
    try {
        btnEl.disabled = true;
        showLoadingOverlay("Đang hoàn tất lịch hẹn...");

        const res = await fetchWithAuth(`${apiBase}/appointments/${id}/complete/`, { method: "POST" });
        if (!res.ok) {
            let errorMessage = `Đã xảy ra lỗi (HTTP ${res.status})`;
            try {
                const data = await res.json();
                if (data?.detail) {
                    errorMessage = data.detail;
                } else if (data?.message) {
                    errorMessage = data.message;
                }
            } catch {
                const text = await res.text();
                if (text) errorMessage = text;
            }
            throw new Error(errorMessage);
        }
        setAllAppointments(allAppointments.map((a) => (String(a.id) === String(id) ? { ...a, status: "COMPLETED" } : a)));
        renderAllAppointments();
        renderOverviewAppointments();
        renderOverviewStats();
        showToast("Hoàn tất lịch hẹn thành công!", "success");
    } catch (err) {
        showErrorModal(err.message || "Không thể hoàn tất lịch hẹn. Vui lòng thử lại sau.");
        btnEl.disabled = false;
        btnEl.textContent = "Hoàn tất";
    } finally {
        hideLoadingOverlay();
    }
}

function cancelAppointment(id, triggerBtn) {
    const modal = document.getElementById("cancelModal");
    const confirmBtn = document.getElementById("cancelConfirmBtn");
    const closeBtn = document.getElementById("cancelCloseBtn");
    if (!modal || !confirmBtn || !closeBtn) return;

    modal.style.display = "flex";

    const cleanup = () => {
        modal.style.display = "none";
        confirmBtn.onclick = null;
        closeBtn.onclick = null;
        window.onclick = null;
    };

    closeBtn.onclick = () => cleanup();
    window.onclick = (e) => {
        if (e.target === modal) cleanup();
    };

    confirmBtn.onclick = async () => {
        cleanup();
        showLoadingOverlay("Đang hủy lịch hẹn...");
        if (triggerBtn) {
            triggerBtn.disabled = true;
        }

        try {
            const res = await fetchWithAuth(`${apiBase}/appointments/${id}/cancel/`, { method: "POST" });
            if (!res.ok) {
                let errorMessage = `Đã xảy ra lỗi (HTTP ${res.status})`;
                try {
                    const data = await res.json();
                    if (data?.detail) {
                        errorMessage = data.detail;
                    } else if (data?.message) {
                        errorMessage = data.message;
                    }
                } catch {
                    const text = await res.text();
                    if (text) errorMessage = text;
                }
                throw new Error(errorMessage);
            }

            setAllAppointments(allAppointments.map((a) => (String(a.id) === String(id) ? { ...a, status: "CANCELLED" } : a)));
            renderAllAppointments();
            renderOverviewAppointments();
            renderOverviewStats();
            showToast("Hủy lịch hẹn thành công!", "success");
        } catch (err) {
            showErrorModal(err.message || "Không thể hủy lịch hẹn. Vui lòng thử lại sau.");
            if (triggerBtn) {
                triggerBtn.disabled = false;
                triggerBtn.textContent = "Hủy";
            }
        } finally {
            hideLoadingOverlay();
        }
    };
}

function renderAvailabilityPanelInit() {
    const startInput = document.getElementById("avail-start");
    const endInput = document.getElementById("avail-end");

    if (startInput && startInput.type !== "time") startInput.type = "time";
    if (endInput && endInput.type !== "time") endInput.type = "time";

    startInput?.setAttribute("placeholder", "Giờ bắt đầu");
    endInput?.setAttribute("placeholder", "Giờ kết thúc");

    const refreshBtn = document.getElementById("btn-refresh-avail");
    if (refreshBtn && !refreshBtn._listenerAdded) {
        refreshBtn.addEventListener("click", (e) => {
            e.preventDefault();
            loadAvailability(true);
        });

        document.getElementById("availability-form")?.addEventListener("submit", async (e) => {
            e.preventDefault();
            await submitAvailability();
        });

        refreshBtn._listenerAdded = true;
    }
}

export function renderAvailabilityList() {
    const content = document.getElementById("availability-content");
    const loading = document.getElementById("availability-loading");
    if (loading) loading.classList.add("hidden");
    if (!content) return;
    content.classList.remove("hidden");

    if (!availabilityList.length) {
        content.innerHTML = `<div class="no-data">Chưa có lịch làm việc.</div>`;
        return;
    }

    const weekdayLabel = (n) => {
        switch (Number(n)) {
            case 0:
                return "Thứ 2";
            case 1:
                return "Thứ 3";
            case 2:
                return "Thứ 4";
            case 3:
                return "Thứ 5";
            case 4:
                return "Thứ 6";
            case 5:
                return "Thứ 7";
            case 6:
                return "Chủ nhật";
            default:
                return `Thứ ${n}`;
        }
    };

    content.innerHTML = availabilityList
        .map((a) => {
            const statusLabel = a.is_active ? "Đang bật" : "Đã tắt";
            const statusClass = a.is_active ? "status-confirmed" : "status-cancelled";
            const [hour, minute] = a.start_time.split(":").map(Number);
            const shift = hour < 12 ? `<span class="shift shift-morning">Sáng</span>` : `<span class="shift shift-afternoon">Chiều</span>`;
            return `
                <div class="row">
                    <div>${weekdayLabel(a.weekday)}</div>
                    <div>${shift}</div>
                    <div>${a.start_time}</div>
                    <div>${a.end_time}</div>
                    <div>${a.slot_minutes} phút</div>
                    <div><span class="status ${statusClass}">${statusLabel}</span></div>
                    <div>
                        <button class="btn-small btn-secondary" data-act="toggle" data-id="${a.id}">${a.is_active ? "Tắt" : "Bật"}</button>
                        <button class="btn-small btn-secondary" data-act="update" data-id="${a.id}">Sửa</button>
                        <button class="btn-small btn-secondary" data-act="delete" data-id="${a.id}">Xóa</button>
                    </div>
                </div>
            `;
        })
        .join("");

    content.querySelectorAll("button[data-act]").forEach((btn) => {
        btn.addEventListener("click", async (e) => {
            const act = btn.getAttribute("data-act");
            const id = btn.getAttribute("data-id");
            if (act === "toggle") {
                await toggleAvailability(id, btn);
            } else if (act === "update") {
                showErrorModal("Chức năng sửa lịch làm việc đang được phát triển.");
            } else if (act === "delete") {
                await deleteAvailability(id, btn);
            }
        });
    });
}

async function submitAvailability() {
    showLoadingOverlay("Đang thêm lịch làm việc...");

    const w = document.getElementById("avail-weekday")?.value;
    const start = document.getElementById("avail-start")?.value;
    const end = document.getElementById("avail-end")?.value;
    const slot = document.getElementById("avail-slot")?.value || 30;

    if (!w || start.trim() === "" || end.trim() === "") {
        showErrorModal("Vui lòng nhập đầy đủ thông tin lịch làm việc.");
        hideLoadingOverlay();
        return;
    }

    const startTime = new Date(`2000/01/01 ${start}`);
    const endTime = new Date(`2000/01/01 ${end}`);
    if (startTime >= endTime) {
        showErrorModal("Thời gian bắt đầu phải trước thời gian kết thúc.");
        hideLoadingOverlay();
        return;
    }

    const payload = {
        weekday: Number(w),
        start_time: `${start.trim()}:00`,
        end_time: `${end.trim()}:00`,
        slot_minutes: Number(slot),
        is_active: true,
    };

    const hasOverlap = availabilityList.some((a) => {
        if (a.weekday !== Number(w)) return false;
        const s1 = new Date(`2000/01/01 ${a.start_time}`);
        const e1 = new Date(`2000/01/01 ${a.end_time}`);
        return !(endTime <= s1 || startTime >= e1);
    });

    if (hasOverlap) {
        showErrorModal(
            "Khung giờ bị chồng lấp với lịch làm việc khác trong cùng ngày. Hãy chỉnh sửa hoặc xóa lịch cũ trước khi thêm mới.",
            "warning"
        );
        hideLoadingOverlay();
        return;
    }

    try {
        const res = await fetchWithAuth(`${apiBase}/doctors/availability/`, {
            method: "POST",
            body: JSON.stringify(payload),
        });

        if (!res.ok) {
            let errorMessage = `Đã xảy ra lỗi (HTTP ${res.status})`;
            try {
                const data = await res.json();
                if (data?.detail) errorMessage = data.detail;
                else if (data?.message) errorMessage = data.message;
                else if (Array.isArray(data?.non_field_errors)) errorMessage = data.non_field_errors.join(" ");
                else if (typeof data === "object") errorMessage = Object.values(data).flat().join(" ");
            } catch {
                const text = await res.text();
                if (text) errorMessage = text;
            }
            throw new Error(errorMessage);
        }

        await loadAvailability(true);
        document.getElementById("avail-weekday").value = "";
        document.getElementById("avail-start").value = "";
        document.getElementById("avail-end").value = "";
        document.getElementById("avail-slot").value = 30;
        showToast("Thêm lịch làm việc thành công!", "success");
    } catch (err) {
        showErrorModal(err.message || "Không thể thêm lịch làm việc. Vui lòng thử lại sau.", "error");
    } finally {
        hideLoadingOverlay();
    }
}

async function toggleAvailability(id, btn) {
    try {
        btn.disabled = true;
        showLoadingOverlay("Đang cập nhật lịch làm việc...");
        const target = availabilityList.find((a) => String(a.id) === String(id));
        if (!target) throw new Error("Không tìm thấy availability");
        const payload = { is_active: !target.is_active };
        const res = await fetchWithAuth(`${apiBase}/doctors/availability/${id}/`, {
            method: "PATCH",
            body: JSON.stringify(payload),
        });
        if (!res.ok) {
            const txt = await res.text();
            throw new Error(txt || `HTTP ${res.status}`);
        }
        await loadAvailability(true);
        showToast("Cập nhật lịch làm việc thành công!", "success");
    } catch (err) {
        showErrorModal(`Cập nhật thất bại: ${err.message}`);
        btn.disabled = false;
    } finally {
        hideLoadingOverlay();
    }
}

async function deleteAvailability(id, triggerBtn) {
    const modal = document.getElementById("deleteModal");
    const confirmBtn = document.getElementById("deleteConfirmBtn");
    const closeBtn = document.getElementById("deleteCloseBtn");
    if (!modal || !confirmBtn || !closeBtn) return;

    modal.style.display = "flex";

    const cleanup = () => {
        modal.style.display = "none";
        confirmBtn.onclick = null;
        closeBtn.onclick = null;
        window.onclick = null;
    };

    closeBtn.onclick = () => cleanup();
    window.onclick = (e) => {
        if (e.target === modal) cleanup();
    };

    confirmBtn.onclick = async () => {
        cleanup();
        showLoadingOverlay("Đang xóa lịch làm việc...");
        if (triggerBtn) {
            triggerBtn.disabled = true;
        }

        try {
            const res = await fetchWithAuth(`${apiBase}/doctors/availability/${id}/`, { method: "DELETE" });
            if (!res.ok) {
                let errorMessage = `Đã xảy ra lỗi (HTTP ${res.status})`;
                try {
                    const data = await res.json();
                    if (data?.detail) {
                        errorMessage = data.detail;
                    } else if (data?.message) {
                        errorMessage = data.message;
                    }
                } catch {
                    const text = await res.text();
                    if (text) errorMessage = text;
                }
                throw new Error(errorMessage);
            }
            await loadAvailability(true);
            showToast("Xóa lịch làm việc thành công!", "success");
        } catch (err) {
            showErrorModal(err.message || "Không thể xóa lịch làm việc. Vui lòng thử lại sau.");
            if (triggerBtn) {
                triggerBtn.disabled = false;
                triggerBtn.textContent = "Xóa";
            }
        } finally {
            hideLoadingOverlay();
        }
    };
}

function renderDaysOffPanelInit() {
    const startInput = document.getElementById("dayoff-start");
    const endInput = document.getElementById("dayoff-end");

    if (!document.getElementById("dayoff-date")._flatpickr) {
        flatpickr("#dayoff-date", { dateFormat: "d/m/Y", locale: "vn", allowInput: true, placeholder: "dd/mm/yyyy" });
    }

    if (startInput && startInput.type !== "time") startInput.type = "time";
    if (endInput && endInput.type !== "time") endInput.type = "time";

    startInput?.setAttribute("placeholder", "Giờ bắt đầu");
    endInput?.setAttribute("placeholder", "Giờ kết thúc");

    const refreshBtn = document.getElementById("btn-refresh-days-off");
    if (refreshBtn && !refreshBtn._listenerAdded) {
        refreshBtn.addEventListener("click", (e) => {
            e.preventDefault();
            loadDaysOff(true);
        });

        document.getElementById("dayoff-form")?.addEventListener("submit", async (e) => {
            e.preventDefault();
            await submitDayOff();
        });

        refreshBtn._listenerAdded = true;
    }
}

export function renderDaysOffList() {
    const content = document.getElementById("days-off-content");
    const loading = document.getElementById("days-off-loading");
    if (loading) loading.classList.add("hidden");
    if (!content) return;
    content.classList.remove("hidden");

    if (!daysOffList.length) {
        content.innerHTML = `<div class="no-data">Chưa có ngày nghỉ.</div>`;
        return;
    }

    content.innerHTML = daysOffList
        .map((d) => {
            const dateDisplay = d.date ? formatDateVN(d.date) : "—";
            const timeDisplay = d.start_time && d.end_time ? `${formatTimeHM(d.start_time)} - ${formatTimeHM(d.end_time)}` : "Cả ngày";
            return `
                <div class="row">
                    <div data-label="Ngày">${dateDisplay}</div>
                    <div data-label="Thời gian">${timeDisplay}</div>
                    <div data-label="Lý do">${d.reason || "-"}</div>
                    <div data-label="Thao tác">
                        <button class="btn-small btn-secondary" data-act="detail" data-id="${d.id}">Chi tiết</button>
                        <button class="btn-small btn-secondary" data-act="update" data-id="${d.id}">Sửa</button>
                        <button class="btn-small btn-secondary" data-act="delete" data-id="${d.id}">Xóa</button>
                    </div>
                </div>
            `;
        })
        .join("");

    content.querySelectorAll("button[data-act='delete']").forEach((btn) => {
        btn.addEventListener("click", async (e) => {
            const id = btn.getAttribute("data-id");
            if (!confirm("Xóa ngày nghỉ này?")) return;
            showLoadingOverlay("Đang xóa ngày nghỉ...");
            try {
                btn.disabled = true;
                const res = await fetchWithAuth(`${apiBase}/doctors/days-off/${id}/`, { method: "DELETE" });
                if (!res.ok) {
                    const txt = await res.text();
                    throw new Error(txt || `HTTP ${res.status}`);
                }
                await loadDaysOff(true);
                showToast("Xóa ngày nghỉ thành công!", "success");
            } catch (err) {
                showErrorModal(`Xóa thất bại: ${err.message}`);
                btn.disabled = false;
            } finally {
                hideLoadingOverlay();
            }
        });
    });
}

async function submitDayOff() {
    showLoadingOverlay("Đang thêm ngày nghỉ...");
    const dateStr = document.getElementById("dayoff-date")?.value;
    const start = document.getElementById("dayoff-start")?.value;
    const end = document.getElementById("dayoff-end")?.value;
    const reason = document.getElementById("dayoff-reason")?.value || "";

    if (!dateStr) {
        showErrorModal("Vui lòng chọn ngày nghỉ.");
        hideLoadingOverlay();
        return;
    }
    const parts = dateStr.split("/");
    if (parts.length !== 3) {
        showErrorModal("Ngày không đúng định dạng dd/mm/yyyy.");
        hideLoadingOverlay();
        return;
    }
    if (start && end) {
        const startTime = new Date(`2000/01/01 ${start}`);
        const endTime = new Date(`2000/01/01 ${end}`);
        if (startTime >= endTime) {
            showErrorModal("Thời gian bắt đầu phải trước thời gian kết thúc.");
            hideLoadingOverlay();
            return;
        }
    }

    const payload = {
        date: `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`,
        reason: reason,
    };
    if (start) payload.start_time = `${start}:00`;
    if (end) payload.end_time = `${end}:00`;

    try {
        const res = await fetchWithAuth(`${apiBase}/doctors/days-off/`, { method: "POST", body: JSON.stringify(payload) });
        if (!res.ok) {
            const txt = await res.text();
            throw new Error(txt || `HTTP ${res.status}`);
        }
        await loadDaysOff(true);
        document.getElementById("dayoff-date").value = "";
        document.getElementById("dayoff-start").value = "";
        document.getElementById("dayoff-end").value = "";
        document.getElementById("dayoff-reason").value = "";
    } catch (err) {
        showErrorModal(`Thêm ngày nghỉ thất bại: ${err.message}`);
    } finally {
        hideLoadingOverlay();
    }
}

export function generateMockNotifications() {
    const now = new Date();
    setMockNotifications([
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
    ]);
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

    loadNotifications();

    setTimeout(() => {
        renderNotifications(mockNotifications);
    }, 500);
}

export function renderStatsPanel() {
    const statsFull = document.getElementById("stats-full");
    const errorEl = document.getElementById("stats-error");
    if (!statsFull) return;

    statsFull.innerHTML = `
        <div class="bar w-75 shimmer"></div>
        <div class="bar w-60 shimmer"></div>
        <div class="bar w-50 shimmer"></div>
    `;
    errorEl?.classList.add("hidden");

    setTimeout(() => {
        try {
            const total = allAppointments.length || 0;
            const confirmed = allAppointments.filter((a) => a.status === "CONFIRMED").length;
            const pending = allAppointments.filter((a) => a.status === "PENDING").length;
            const completed = allAppointments.filter((a) => a.status === "COMPLETED").length;
            const cancelled = allAppointments.filter((a) => a.status === "CANCELLED").length;
            const upcoming = allAppointments.filter((a) => new Date(a.start_at) > new Date()).length;

            if (!statsFull) return;
            statsFull.innerHTML = `
                <div class="stat-card"><div class="stat-label">Tổng lịch</div><div class="stat-value">${total}</div></div>
                <div class="stat-card"><div class="stat-label">Đã xác nhận</div><div class="stat-value">${confirmed}</div></div>
                <div class="stat-card"><div class="stat-label">Chờ xác nhận</div><div class="stat-value">${pending}</div></div>
                <div class="stat-card"><div class="stat-label">Hoàn tất</div><div class="stat-value">${completed}</div></div>
                <div class="stat-card"><div class="stat-label">Đã hủy</div><div class="stat-value">${cancelled}</div></div>
                <div class="stat-card"><div class="stat-label">Sắp tới</div><div class="stat-value">${upcoming}</div></div>
            `;
        } catch (err) {
            console.error("renderStatsPanel error:", err);
            if (errorEl) {
                errorEl.classList.remove("hidden");
                errorEl.innerHTML = `<p>Lỗi tải thống kê: ${err.message}</p>`;
            }
        }
    }, 300);
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
            window.scrollTo({ top: 0, behavior: "smooth" });
        });
    });

    document.getElementById("view-all-appointments-overview")?.addEventListener("click", (e) => {
        e.preventDefault();
        window.location.hash = "#appointments";
    });

    document.getElementById("view-stats-overview")?.addEventListener("click", (e) => {
        e.preventDefault();
        window.location.hash = "#stats";
    });

    window.addEventListener("hashchange", () => {
        const h = location.hash.slice(1) || "overview";
        showPanel(h);
    });

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

    fetchDoctorProfile();
    loadAppointments();
    loadAvailability();
    generateMockNotifications();
});
