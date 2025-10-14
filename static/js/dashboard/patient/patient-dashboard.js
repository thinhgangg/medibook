import {
    doctorsMap,
    allAppointments,
    mockNotifications,
    formatDateVN,
    showErrorModal,
    showLoadingOverlay,
    hideLoadingOverlay,
    showToast,
    API_BASE_URL,
    fetchWithAuth,
    setAllAppointments,
    setMockNotifications,
} from "./_config.js";

import { fetchPatientProfile, fetchAppointmentsAndDoctors, loadNotificationsData, updatePatientProfile } from "./_data_loader.js";

// *** BƯỚC 1: TẠO BỘ NGÔN NGỮ TÙY CHỈNH CHO FLATICKR ***
const customVnLocale = {
    ...flatpickr.l10ns.vn,
    months: {
        ...flatpickr.l10ns.vn.months,
        longhand: [
            "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
            "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12",
        ],
    },
};

// MỚI: API để lấy dữ liệu địa chỉ của Việt Nam
const ADDRESS_API_BASE_URL = "https://provinces.open-api.vn/api/";

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
        case "profile":
            fetchPatientProfile();
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
                <li><strong>Ngày sinh:</strong> <span>${patient.user?.dob ? formatDateVN(patient.user.dob) : "Chưa có thông tin"}</span></li>
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
            <li><strong>Ngày sinh:</strong> <span>${patient.user?.dob ? formatDateVN(patient.user.dob) : "Chưa có thông tin"}</span></li>
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

    // Add edit profile button event listener
    const editButton = document.getElementById("btn-edit-profile");
    if (editButton && !editButton._listenerAdded) {
        editButton.addEventListener("click", (e) => {
            e.preventDefault();
            handleEditProfile(patient);
        });
        editButton._listenerAdded = true;
    }
}

// ... (các hàm renderOverviewAppointments, filterAppointments, renderAllAppointments, cancelAppointment, initAppointmentPanelListeners giữ nguyên)
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

    loading.classList.add("hidden");
    container.classList.remove("hidden");
    errorEl.classList.add("hidden");

    const filteredAppointments = filterAppointments(appointments, statusFilter, startDate, endDate);

    if (filteredAppointments.length === 0) {
        container.innerHTML = `<div class="no-data">Không tìm thấy lịch hẹn phù hợp.</div>`;
        return;
    }

    container.innerHTML = filteredAppointments
        .map((apt) => {
            const startDate = new Date(apt.start_at);
            const endDate = new Date(apt.end_at);
            const doctor = doctorsMap[apt.doctor_id]?.user?.full_name || `Doctor ID: ${apt.doctor_id}`;
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
            if (apt.status === "PENDING" || apt.status === "CONFIRMED") {
                 actionsHtml = `<button class="btn-secondary btn-small btn-cancel-appointment" data-appointment-id="${apt.id}">Hủy</button>`;
            } else {
                 actionsHtml = `<button class="btn-secondary btn-small" data-appointment-id="${apt.id}">Chi tiết</button>`;
            }


            return `
            <div class="row">
                <div>${startDate.toLocaleDateString("vi-VN")}</div>
                <div>${startDate.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })} - ${endDate.toLocaleTimeString("vi-VN", {
                hour: "2-digit",
                minute: "2-digit",
            })}</div>
                <div>${doctor}</div>
                <div><span class="status ${statusClass}">${statusText}</span></div>
                <div>${actionsHtml}</div>
            </div>
        `;
        })
        .join("");

    container.querySelectorAll(".btn-cancel-appointment").forEach((button) => {
        button.addEventListener("click", (e) => {
            const aptId = e.target.dataset.appointmentId;
            cancelAppointment(aptId, e.target);
        });
    });

    container.querySelectorAll(".btn-small:not(.btn-cancel-appointment)").forEach((button) => {
        button.addEventListener("click", (e) => {
             showErrorModal("Chức năng xem chi tiết lịch hẹn đang được phát triển.");
        });
    });
}

function cancelAppointment(appointmentId, buttonEl) {
    const modal = document.getElementById("cancelModal");
    const confirmBtn = document.getElementById("cancelConfirmBtn");
    const closeBtn = document.getElementById("cancelCloseBtn");

    modal.style.display = "flex";

    const closeHandler = () => {
        modal.style.display = "none";
        confirmBtn.onclick = null;
        closeBtn.onclick = null;
        window.onclick = null;
    };

    closeBtn.onclick = closeHandler;
    window.onclick = (event) => {
        if (event.target === modal) {
            closeHandler();
        }
    };

    confirmBtn.onclick = async () => {
        closeHandler();
        showLoadingOverlay("Đang hủy lịch hẹn...");
        try {
            if (buttonEl) buttonEl.disabled = true;

            const res = await fetchWithAuth(`${API_BASE_URL}/appointments/${appointmentId}/cancel/`, {
                method: "POST",
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({ detail: "Hủy lịch hẹn thất bại" }));
                throw new Error(`HTTP ${res.status}: ${errorData.detail}`);
            }

            // Cập nhật lại trạng thái trong mảng allAppointments
            const updatedAppointments = allAppointments.map((apt) =>
                apt.id === Number(appointmentId) ? { ...apt, status: "CANCELLED" } : apt
            );
            setAllAppointments(updatedAppointments);


            renderAllAppointments(allAppointments);
            renderOverviewAppointments(allAppointments);
            renderOverviewStats();
            renderStatsPanel();


            showToast("Hủy lịch hẹn thành công!", "success");
        } catch (err) {
            showErrorModal(err.message || "Có lỗi xảy ra, vui lòng thử lại.");
            showToast("Hủy lịch hẹn thất bại!", "error");
            if (buttonEl) buttonEl.disabled = false;
        } finally {
            hideLoadingOverlay();
        }
    };
}


function initAppointmentPanelListeners() {
    if (!document.getElementById("start-date-filter")._flatpickr) {
        flatpickr("#start-date-filter", { dateFormat: "d/m/Y", locale: customVnLocale, placeholder: "dd/mm/yyyy", allowInput: true });
        flatpickr("#end-date-filter", { dateFormat: "d/m/Y", locale: customVnLocale, placeholder: "dd/mm/yyyy", allowInput: true });
    }

    const applyFilterBtn = document.getElementById("apply-filters");
    const clearFilterBtn = document.getElementById("clear-filters");

    if (!applyFilterBtn._listenerAdded) {
        applyFilterBtn.addEventListener("click", () => {
            const statusFilter = document.getElementById("status-filter").value;
            const startDate = document.getElementById("start-date-filter").value;
            const endDate = document.getElementById("end-date-filter").value;

            const dateRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
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
        applyFilterBtn._listenerAdded = true;
    }

     if (!clearFilterBtn._listenerAdded) {
        clearFilterBtn.addEventListener("click", () => {
            document.getElementById("status-filter").value = "all";
            document.getElementById("start-date-filter")._flatpickr.clear();
            document.getElementById("end-date-filter")._flatpickr.clear();
            renderAllAppointments(allAppointments);
        });
        clearFilterBtn._listenerAdded = true;
    }
}
// ... (Các hàm thống kê và thông báo giữ nguyên)

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
             // Hủy chart cũ nếu đã tồn tại để tránh lỗi
            if (window.myDoughnutChart) {
                window.myDoughnutChart.destroy();
            }

            Chart.register({
                id: "centerText",
                afterDraw: function (chart) {
                    if (chart.config.type !== 'doughnut') return;
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

            window.myDoughnutChart = new Chart(ctx, {
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
                                    const percentage = total > 0 ? ((value / total) * 100).toFixed(2) + "%" : "0.00%";
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
        const upcoming = allAppointments.filter((a) => new Date(a.start_at) > new Date() && (a.status === "CONFIRMED" || a.status === "PENDING")).length;


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


// MỚI: Hàm fetch dữ liệu từ API địa chỉ
async function fetchAddressData(endpoint) {
    try {
        const response = await fetch(`${ADDRESS_API_BASE_URL}${endpoint}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error("Failed to fetch address data:", error);
        return [];
    }
}

// MỚI: Hàm điền option vào select
function populateSelectWithOptions(selectElement, options, placeholder) {
    selectElement.innerHTML = `<option value="">-- ${placeholder} --</option>`;
    options.forEach(item => {
        const option = document.createElement('option');
        option.value = item.code; // Lưu code làm value
        option.textContent = item.name; // Hiển thị name
        selectElement.appendChild(option);
    });
}

// MỚI: Các hàm để tải và hiển thị từng cấp địa chỉ
async function initializeAddressDropdowns(patient) {
    const citySelect = document.getElementById('city');
    const districtSelect = document.getElementById('district');
    const wardSelect = document.getElementById('ward');

    // Tải danh sách Tỉnh/Thành phố
    const cities = await fetchAddressData('p/');
    populateSelectWithOptions(citySelect, cities, 'Chọn Tỉnh/Thành phố');

    // Nếu có dữ liệu tỉnh/thành phố của bệnh nhân
    if (patient.user?.city_code) {
        citySelect.value = patient.user.city_code;
        // Tải danh sách Quận/Huyện tương ứng
        const districts = await fetchAddressData(`p/${patient.user.city_code}?depth=2`);
        if (districts.districts) {
             populateSelectWithOptions(districtSelect, districts.districts, 'Chọn Quận/Huyện');
        }

        // Nếu có dữ liệu quận/huyện
        if (patient.user?.district_code) {
            districtSelect.value = patient.user.district_code;
            // Tải danh sách Phường/Xã tương ứng
            const wards = await fetchAddressData(`d/${patient.user.district_code}?depth=2`);
            if(wards.wards){
                populateSelectWithOptions(wardSelect, wards.wards, 'Chọn Phường/Xã');
            }
             // Nếu có dữ liệu phường/xã
            if(patient.user?.ward_code){
                wardSelect.value = patient.user.ward_code;
            }
        }
    }
}

// MỚI: Hàm reset trạng thái validation của form
function resetFormValidation(formElement) {
    const fields = formElement.querySelectorAll("[data-validate]");
    fields.forEach(field => {
        field.style.borderColor = ""; // Trả về màu viền mặc định
        const errorElement = document.getElementById(`${field.name}-error`);
        if (errorElement) {
            errorElement.textContent = "";
            errorElement.style.display = "none";
        }
    });
}

// ---------- SỬA LẠI HOÀN TOÀN HÀM handleEditProfile ----------
async function handleEditProfile(patient) {
    const modal = document.getElementById('edit-profile-modal');
    const form = document.getElementById('edit-profile-form');
    if (!modal || !form || !patient) return;

    // MỚI: Reset validation UI trước khi điền dữ liệu
    resetFormValidation(form);

    // --- Phần điền dữ liệu vào form ---
    form.querySelector("#edit-full-name").value = patient.user?.full_name || '';
    form.querySelector("#edit-phone-number").value = patient.user?.phone_number || '';
    form.querySelector("#edit-dob").value = patient.user?.dob ? formatDateVN(patient.user.dob, 'dd/mm/yyyy') : '';
    form.querySelector("#edit-gender").value = patient.user?.gender || '';
    form.querySelector("#edit-address-detail").value = patient.user?.address_detail || '';
    form.querySelector("#edit-email").value = patient.user?.email || '';
    form.querySelector("#edit-id-number").value = patient.user?.id_number || '';
    form.querySelector("#edit-ethnicity").value = patient.user?.ethnicity || '';
    form.querySelector("#edit-insurance-no").value = patient.insurance_no || '';
    form.querySelector("#edit-occupation").value = patient.occupation || '';

    // MỚI: Khởi tạo và điền dữ liệu cho dropdown địa chỉ
    await initializeAddressDropdowns(patient);

    // Khởi tạo Flatpickr cho ngày sinh
    const dobInput = document.querySelector("#edit-dob");
    if (dobInput._flatpickr) {
        dobInput._flatpickr.destroy();
    }
    flatpickr(dobInput, {
        dateFormat: "d/m/Y",
        locale: customVnLocale,
        allowInput: true,
        maxDate: "today",
    });

    // Hiển thị modal
    modal.style.display = "flex";

    // Nút Hủy
    const cancelBtn = modal.querySelector("#edit-profile-cancel-btn");
    cancelBtn.onclick = () => { modal.style.display = "none"; };

    // Xử lý submit form
    form.onsubmit = async (e) => {
        e.preventDefault();
        
        // Validate form trước khi submit
        const validator = new FormValidator();
        if (!validator.validateForm(form)) {
            showToast("Vui lòng kiểm tra lại các trường thông tin", "warning");
            return;
        }

        showLoadingOverlay("Đang cập nhật hồ sơ...");

        const formData = new FormData(form);
        const dobValue = formData.get('dob');
        let formattedDob = null;
        if (dobValue) {
            const parts = dobValue.split("/");
            if (parts.length === 3) {
                formattedDob = `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
            }
        }

        // MỚI: Lấy cả text và value của các select địa chỉ
        const citySelect = form.querySelector("#city");
        const districtSelect = form.querySelector("#district");
        const wardSelect = form.querySelector("#ward");

        const city_code = citySelect.value;
        const city_name = city_code ? citySelect.options[citySelect.selectedIndex].text : '';
        const district_code = districtSelect.value;
        const district_name = district_code ? districtSelect.options[districtSelect.selectedIndex].text : '';
        const ward_code = wardSelect.value;
        const ward_name = ward_code ? wardSelect.options[wardSelect.selectedIndex].text : '';

        // Ghép full_address
        const address_detail = formData.get('address_detail').trim();
        const fullAddress = [address_detail, ward_name, district_name, city_name].filter(Boolean).join(", ");

        const payload = {
            full_name: formData.get('full_name').trim(),
            phone_number: formData.get('phone_number').trim(),
            dob: formattedDob,
            gender: formData.get('gender'),
            email: formData.get('email').trim(),
            id_number: formData.get('id_number').trim(),
            ethnicity: formData.get('ethnicity').trim(),
            
            // Dữ liệu địa chỉ chi tiết
            address_detail: address_detail,
            ward: ward_name,
            district: district_name,
            city: city_name,
            full_address: fullAddress,

            // Giả sử backend chấp nhận các code này để lưu trữ
            ward_code: ward_code,
            district_code: district_code,
            city_code: city_code,

            patient: {
                insurance_no: formData.get('insurance_no').trim(),
                occupation: formData.get('occupation').trim(),
            },
        };

        try {
            await updatePatientProfile(payload);
            modal.style.display = "none";
            showToast("Cập nhật hồ sơ thành công!", "success");
        } catch (err) {
            showErrorModal(`Lỗi: ${err.message || "Không thể cập nhật hồ sơ"}`);
        } finally {
            hideLoadingOverlay();
        }
    };
}
// ---------------------------------------------------------------------

// ... (phần DOMContentLoaded và FormValidator giữ nguyên)
document.addEventListener("DOMContentLoaded", () => {
    const applyHash = () => {
        const hash = location.hash.slice(1) || "overview";
        showPanel(hash);
    };
    applyHash();

    document.querySelectorAll(".sidebar-nav-item").forEach((nav) => {
        if (!nav._listenerAdded) {
            nav.addEventListener("click", (e) => {
                e.preventDefault();
                const panel = nav.getAttribute("href").slice(1);
                history.replaceState(null, "", `#${panel}`);
                showPanel(panel);
                nav._listenerAdded = true;
            });
        }
    });

    window.addEventListener("hashchange", applyHash);

    document.querySelectorAll('a[href^="#"]').forEach((link) => {
        if (!link._listenerAdded) {
            link.addEventListener("click", (e) => {
                const target = link.getAttribute("href").substring(1);
                if (["overview", "profile", "appointments", "notifications", "stats", "messages"].includes(target)) {
                    e.preventDefault();
                    showPanel(target);
                    window.location.hash = `#${target}`;
                    window.scrollTo({ top: 0, behavior: "smooth" });
                }
                link._listenerAdded = true;
            });
        }
    });
    
     // MỚI: Thêm event listener cho các dropdown địa chỉ trong modal
    const citySelect = document.getElementById('city');
    const districtSelect = document.getElementById('district');
    const wardSelect = document.getElementById('ward');

    citySelect.addEventListener('change', async () => {
        const cityCode = citySelect.value;
        // Reset quận và phường
        populateSelectWithOptions(districtSelect, [], 'Chọn Quận/Huyện');
        populateSelectWithOptions(wardSelect, [], 'Chọn Phường/Xã');
        if (cityCode) {
            const data = await fetchAddressData(`p/${cityCode}?depth=2`);
            if(data.districts) {
                populateSelectWithOptions(districtSelect, data.districts, 'Chọn Quận/Huyện');
            }
        }
    });

    districtSelect.addEventListener('change', async () => {
        const districtCode = districtSelect.value;
        // Reset phường
        populateSelectWithOptions(wardSelect, [], 'Chọn Phường/Xã');
        if (districtCode) {
            const data = await fetchAddressData(`d/${districtCode}?depth=2`);
            if (data.wards) {
                populateSelectWithOptions(wardSelect, data.wards, 'Chọn Phường/Xã');
            }
        }
    });


    fetchPatientProfile();
    fetchAppointmentsAndDoctors();
    loadNotificationsData();
});

class FormValidator {
    constructor() {
        this.rules = {
            name: {
                minLength: 2,
                pattern: /^[a-zA-ZÀ-ỹ\s]+$/,
                message: "Tên không hợp lệ",
            },
            email: {
                pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                message: "Vui lòng nhập email hợp lệ",
            },
            password: {
                minLength: 8,
                pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
                message: "Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt",
            },
            confirm_password: {
                message: "Mật khẩu xác nhận không khớp",
            },
            phone: {
                pattern: /^(0[3|5|7|8|9])+([0-9]{8})$/,
                message: "Số điện thoại không hợp lệ",
            },
            id: {
                pattern: /^[0-9]{9,12}$/,
                message: "CMND/CCCD phải có 9-12 chữ số",
            },
            otp: {
                pattern: /^[0-9]{6}$/,
                message: "Mã OTP phải có 6 chữ số",
            },
            insurance_no: {
                pattern: /^[A-Z0-9]{15}$/,
                message: "Mã BHYT không hợp lệ (ví dụ: GD4797924181234)",
            },
            ethnicity: {
                minLength: 2,
                pattern: /^[a-zA-ZÀ-ỹ\s]+$/,
                message: "Dân tộc không hợp lệ",
            },
            address_detail: {
                minLength: 2,
                message: "Địa chỉ không hợp lệ",
            },
            occupation: {
                minLength: 2,
                pattern: /^[a-zA-ZÀ-ỹ\s]+$/,
                message: "Nghề nghiệp không hợp lệ",
            },
        };

        this.init();
    }

    init() {
        this.bindEvents();
    }

    bindEvents() {
        document.addEventListener("input", (e) => {
            if (e.target.hasAttribute("data-validate")) {
                this.validateField(e.target);
            }
        });
         document.addEventListener("change", (e) => {
            if (e.target.hasAttribute("data-validate") && e.target.tagName === 'SELECT') {
                this.validateField(e.target);
            }
        });
    }

    validateField(field) {
        const validateType = field.getAttribute("data-validate");
        const value = field.value.trim();
        const errorElement = document.getElementById(this.getErrorId(field));

        let isValid = true;
        let errorMessage = "";

        if (validateType === "select") {
            if (!value) {
                isValid = false;
                errorMessage = "Vui lòng chọn một tùy chọn";
            }
        } else if (validateType === "date") {
            if (!value) {
                isValid = field.required ? false : true;
                if (!isValid) errorMessage = "Vui lòng chọn ngày sinh";
            } else if (!/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(value)) {
                 isValid = false;
                 errorMessage = "Định dạng ngày dd/mm/yyyy không đúng";
            } else {
                const age = this.calculateAge(value);
                if (age < 16) {
                    isValid = false;
                    errorMessage = "Bạn phải từ 16 tuổi trở lên";
                } else if (age > 120) {
                    isValid = false;
                    errorMessage = "Ngày sinh không hợp lệ";
                }
            }
        } else {
            const rule = this.rules[validateType];
            if (rule) {
                if (field.required && !value) {
                    isValid = false;
                    errorMessage = "Trường này là bắt buộc";
                } else if (value) { // Chỉ validate nếu có giá trị
                    if (rule.minLength && value.length < rule.minLength) {
                        isValid = false;
                        errorMessage = rule.message || `Phải có ít nhất ${rule.minLength} ký tự`;
                    } else if (rule.pattern && !rule.pattern.test(value)) {
                        isValid = false;
                        errorMessage = rule.message;
                    }
                }
            }
        }

        this.updateFieldValidation(field, errorElement, isValid, errorMessage);
        return isValid;
    }

    updateFieldValidation(field, errorElement, isValid, errorMessage) {
        if (isValid) {
            field.style.borderColor = "#10b981";
            if (errorElement) {
                errorElement.style.display = "none";
                errorElement.textContent = "";
            }
        } else {
            field.style.borderColor = "#ef4444";
            if (errorElement) {
                errorElement.style.display = "block";
                errorElement.textContent = errorMessage;
            }
        }
    }

    getErrorId(field) {
        return `${field.name}-error`;
    }

    calculateAge(dobString) { // dobString is "dd/mm/yyyy"
        const parts = dobString.split("/");
        if (parts.length !== 3) return 0;
        const birthDate = new Date(+parts[2], parts[1] - 1, +parts[0]);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    }

    validateForm(form) {
        const fields = form.querySelectorAll("[data-validate]");
        let isFormValid = true;
        fields.forEach((field) => {
            if (!this.validateField(field)) {
                isFormValid = false;
            }
        });
        return isFormValid;
    }
}

document.addEventListener("DOMContentLoaded", () => {
    new FormValidator();
});