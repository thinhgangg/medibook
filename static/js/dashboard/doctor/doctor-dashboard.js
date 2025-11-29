// static/js/doctor-dashboard.js (Main File)

import {
    doctorProfile,
    allAppointments,
    availabilityList,
    daysOffList,
    mockNotifications,
    formatDateVN,
    showErrorModal,
    showAppointmentDetailModal,
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
const AddressAPI = {
    async getProvinces() {
        try {
            return (await fetch("https://provinces.open-api.vn/api/p/")).json();
        } catch {
            return [];
        }
    },
    async getDistricts(code) {
        try {
            return (await fetch(`https://provinces.open-api.vn/api/p/${code}?depth=2`)).json();
        } catch {
            return null;
        }
    },
    async getWards(code) {
        try {
            return (await fetch(`https://provinces.open-api.vn/api/d/${code}?depth=2`)).json();
        } catch {
            return null;
        }
    },
};

async function setupAddressSelectors(oldCity, oldDist, oldWard) {
    const citySel = document.getElementById("edit-city");
    const distSel = document.getElementById("edit-district");
    const wardSel = document.getElementById("edit-ward");

    if (!citySel || !distSel || !wardSel) return;

    // Reset
    citySel.innerHTML = '<option value="">-- Tỉnh / Thành phố --</option>';
    distSel.innerHTML = '<option value="">-- Quận / Huyện --</option>';
    wardSel.innerHTML = '<option value="">-- Phường / Xã --</option>';

    // Load Tỉnh
    const provinces = await AddressAPI.getProvinces();
    provinces.forEach((p) => {
        const opt = document.createElement("option");
        opt.value = p.code;
        opt.textContent = p.name;
        opt.dataset.name = p.name;
        if (p.name === oldCity) opt.selected = true;
        citySel.appendChild(opt);
    });

    const loadDistricts = async (pCode, selectedName = null) => {
        distSel.innerHTML = '<option value="">-- Quận / Huyện --</option>';
        if (!pCode) return;
        const data = await AddressAPI.getDistricts(pCode);
        data?.districts?.forEach((d) => {
            const opt = document.createElement("option");
            opt.value = d.code;
            opt.textContent = d.name;
            opt.dataset.name = d.name;
            if (d.name === selectedName) opt.selected = true;
            distSel.appendChild(opt);
        });
    };

    const loadWards = async (dCode, selectedName = null) => {
        wardSel.innerHTML = '<option value="">-- Phường / Xã --</option>';
        if (!dCode) return;
        const data = await AddressAPI.getWards(dCode);
        data?.wards?.forEach((w) => {
            const opt = document.createElement("option");
            opt.value = w.code;
            opt.textContent = w.name;
            opt.dataset.name = w.name;
            if (w.name === selectedName) opt.selected = true;
            wardSel.appendChild(opt);
        });
    };

    // Load dữ liệu cũ
    if (citySel.value) {
        await loadDistricts(citySel.value, oldDist);
        if (distSel.value) await loadWards(distSel.value, oldWard);
    }

    // Sự kiện thay đổi
    citySel.onchange = () => {
        loadDistricts(citySel.value);
        wardSel.innerHTML = '<option value="">-- Phường / Xã --</option>';
    };
    distSel.onchange = () => {
        loadWards(distSel.value);
    };
}

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
                <li><strong>Mã phòng:</strong> <span>${doc.room_number || "Chưa cập nhật"}</span></li>
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
            <div class="row" data-id="${apt.id}" data-status="${apt.status}">
                <div>${startDate.toLocaleDateString("vi-VN")}</div>
                <div>${startDate.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })} - ${endDate.toLocaleTimeString("vi-VN", {
                hour: "2-digit",
                minute: "2-digit",
            })}</div>
                <div>${patientName}</div>
                <div><span class="status ${statusClass}">${statusText}</span></div>
                <div class="action-cell">
                    <button class="btn-action-menu" data-id="${apt.id}" data-status="${apt.status}">⋮</button>
                </div>
            </div>`;
        })
        .join("");
}

function setupAppointmentActionsPopup() {
    const popup = document.getElementById("appointmentActionsPopup");
    const container = document.getElementById("appointments-content");

    let currentAppointmentId = null;

    document.addEventListener("click", (e) => {
        if (!popup.contains(e.target)) {
            popup.classList.add("hidden");
        }
    });

    container.addEventListener("click", (e) => {
        const menuButton = e.target.closest(".btn-action-menu");
        if (!menuButton) {
            popup.classList.add("hidden");
            return;
        }

        e.stopPropagation();

        currentAppointmentId = menuButton.dataset.id;
        const status = menuButton.dataset.status;

        // 1. Cập nhật các nút hành động trong popup dựa trên trạng thái
        const confirmBtn = popup.querySelector('[data-action="confirm"]');
        const cancelBtn = popup.querySelector('[data-action="cancel"]');

        if (status === "PENDING") {
            confirmBtn.classList.remove("hidden");
            cancelBtn.classList.remove("hidden");
        } else {
            confirmBtn.classList.add("hidden");
            cancelBtn.classList.add("hidden");
        }

        // 2. Tính toán vị trí Popup
        const rect = menuButton.getBoundingClientRect();
        let popupLeft = rect.right + window.scrollX + 5;
        let popupTop = rect.top + window.scrollY;

        const popupWidth = popup.offsetWidth || 140;
        if (popupLeft + popupWidth > window.innerWidth + window.scrollX - 10) {
            popupLeft = rect.left + window.scrollX - popupWidth - 5;
        }

        // 3. Hiển thị Popup
        popup.style.top = `${popupTop}px`;
        popup.style.left = `${popupLeft}px`;
        popup.classList.remove("hidden");

        e.stopPropagation();
    });

    // 4. Lắng nghe sự kiện trong Popup
    popup.addEventListener("click", (e) => {
        const actionBtn = e.target.closest("button[data-action]");
        if (!actionBtn || !currentAppointmentId) return;

        e.stopPropagation();
        const action = actionBtn.dataset.action;
        const targetButton = document.querySelector(`.btn-action-menu[data-id="${currentAppointmentId}"]`);

        popup.classList.add("hidden");

        if (action === "confirm") confirmAppointment(currentAppointmentId, targetButton);
        else if (action === "cancel") cancelAppointment(currentAppointmentId, targetButton);
        else if (action === "detail") showAppointmentDetailModal(currentAppointmentId);
    });
}
export function renderDoctorProfilePanel(doc) {
    // 1. Render thông tin cơ bản (Code cũ của bạn)
    document.getElementById("profile-name").textContent = doc.user?.full_name || "Bác sĩ";
    document.querySelector("#panel-profile .profile-info .role").textContent = doc.specialty?.name || "Chưa cập nhật";

    // Render Avatar
    const pic = document.querySelector("#panel-profile .profile-pic");
    if (pic) {
        if (doc.profile_picture) pic.innerHTML = `<img src="${doc.profile_picture}" alt="Ảnh bác sĩ" />`;
        else {
            const ch = doc.user?.full_name ? doc.user.full_name[0].toUpperCase() : "B";
            pic.innerHTML = `<div class="profile-placeholder">${ch}</div>`;
        }
    }

    // Render thông tin chi tiết
    const basic = document.getElementById("basic-info");
    if (basic) {
        basic.innerHTML = `
            <li><strong>Email:</strong> <span>${doc.user?.email || "Chưa cập nhật"}</span></li>
            <li><strong>Số điện thoại:</strong> <span>${doc.user?.phone_number || "Chưa cập nhật"}</span></li>
            <li><strong>Ngày sinh:</strong> <span>${formatDateVN(doc.user?.dob) || "Chưa cập nhật"}</span></li>
            <li><strong>Giới tính:</strong> <span>${doc.user?.gender ? (doc.user.gender === "MALE" ? "Nam" : "Nữ") : "Chưa cập nhật"}</span></li>
            <li><strong>Địa chỉ:</strong> <span>${doc.user?.full_address || "Chưa cập nhật"}</span></li>
        `;
    }

    document.getElementById("doctor-bio").textContent = doc.bio || "Bác sĩ chưa có thông tin giới thiệu chung.";
    document.getElementById("doctor-experience").innerHTML = `<p>${doc.experience_detail || "Bác sĩ chưa có chi tiết kinh nghiệm chuyên môn."}</p>`;

    const extra = document.getElementById("extra-info");
    if (extra) {
        extra.innerHTML = `
            <li><strong>Chuyên khoa:</strong> <span>${doc.specialty?.name || "Chưa cập nhật"}</span></li>
            <li><strong>Kinh nghiệm:</strong> <span>${doc.experience_years ? `${doc.experience_years} năm` : "Chưa cập nhật"}</span></li>
            <li><strong>Mã phòng:</strong> <span>${doc.room_number || "Chưa cập nhật"}</span></li>
            <li><strong>Trạng thái:</strong> <span>${doc.is_active ? "Đang hoạt động" : "Đã khóa"}</span></li>
        `;
    }

    document.getElementById("profile-error")?.classList.add("hidden");

    const editBtn = document.getElementById("btn-edit-profile");
    if (editBtn) {
        const newEditBtn = editBtn.cloneNode(true);
        editBtn.parentNode.replaceChild(newEditBtn, editBtn);

        newEditBtn.addEventListener("click", (e) => {
            e.preventDefault();
            console.log("Button Edit Clicked!");
            openEditProfileModal();
        });
    } else {
        console.error("Lỗi: Không tìm thấy nút có ID 'btn-edit-profile' trong HTML");
    }
}

function openEditProfileModal() {
    const modal = document.getElementById("editProfileModal");
    if (!modal) return;

    if (doctorProfile) {
        const user = doctorProfile.user || {};

        // --- 1. ĐIỀN THÔNG TIN CƠ BẢN ---
        document.getElementById("edit-fullname").value = user.full_name || "";
        document.getElementById("edit-email").value = user.email || "";
        document.getElementById("edit-phone").value = user.phone_number || "";
        document.getElementById("edit-gender").value = user.gender || "MALE";

        // Xử lý hiển thị Ngày sinh (Flatpickr)
        const dobInput = document.getElementById("edit-dob");
        if (dobInput._flatpickr) {
            dobInput._flatpickr.setDate(user.dob || "");
        } else {
            dobInput.value = formatDateVN(user.dob);
        }

        // --- 2. ĐIỀN THÔNG TIN HÀNH NGHỀ ---
        document.getElementById("edit-specialty-display").value = doctorProfile.specialty?.name || "Chưa cập nhật";
        document.getElementById("edit-room").value = doctorProfile.room_number || "";
        document.getElementById("edit-id-number").value = user.id_number || "";

        // Xử lý hiển thị Ngày bắt đầu
        const startInput = document.getElementById("edit-started-practice");
        if (startInput._flatpickr) {
            // Flatpickr cần format YYYY-MM-DD để hiển thị đúng
            startInput._flatpickr.setDate(doctorProfile.started_practice || "");
        } else {
            startInput.value = formatDateVN(doctorProfile.started_practice);
        }

        // --- 3. ĐIỀN THÔNG TIN BỔ SUNG ---
        document.getElementById("edit-bio").value = doctorProfile.bio || "";
        document.getElementById("edit-experience-detail").value = doctorProfile.experience_detail || "";

        // --- 4. XEM TRƯỚC ẢNH ---
        const previewDiv = document.getElementById("preview-avatar");
        if (doctorProfile.profile_picture) {
            previewDiv.innerHTML = `<img src="${doctorProfile.profile_picture}" style="width:100%; height:100%; object-fit:cover;">`;
            previewDiv.style.border = "2px solid #4361ee";
        } else {
            previewDiv.innerHTML = `<i class="fas fa-camera"></i>`;
        }

        // --- 5. ĐIỀN ĐỊA CHỈ & GỌI API ---
        document.getElementById("edit-address-detail").value = user.address_detail || user.full_address || "";

        setupAddressSelectors(user.city, user.district, user.ward);
    }

    // Hiển thị Modal
    modal.classList.remove("hidden");
    modal.style.display = "flex";
    modal.style.opacity = "1";
    modal.style.visibility = "visible";

    // Xử lý đóng/hủy
    const closeModal = () => {
        modal.classList.add("hidden");
        modal.style.display = "none";
    };
    document.getElementById("closeEditProfileBtn").onclick = closeModal;
    document.getElementById("cancelEditProfileBtn").onclick = closeModal;

    // Xử lý khi chọn file ảnh mới
    document.getElementById("edit-avatar").onchange = function (e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function (e) {
                document.getElementById(
                    "preview-avatar"
                ).innerHTML = `<img src="${e.target.result}" style="width:100%; height:100%; object-fit:cover;">`;
            };
            reader.readAsDataURL(file);
        }
    };

    // Gắn sự kiện cho nút Lưu
    document.getElementById("saveProfileBtn").onclick = saveDoctorProfile;
}
async function saveDoctorProfile() {
    showLoadingOverlay("Đang cập nhật hồ sơ...");

    try {
        const formData = new FormData();

        // Helper lấy text từ select box
        const getText = (id) => {
            const sel = document.getElementById(id);
            return sel.options[sel.selectedIndex]?.dataset?.name || "";
        };

        // --- 1. THÔNG TIN CƠ BẢN ---
        formData.append("full_name", document.getElementById("edit-fullname").value.trim());
        formData.append("phone_number", document.getElementById("edit-phone").value.trim());
        formData.append("gender", document.getElementById("edit-gender").value);

        // --- 2. XỬ LÝ NGÀY THÁNG (DOB) ---
        const dobEl = document.getElementById("edit-dob");
        let dobVal = "";
        if (dobEl._flatpickr) {
            dobVal = dobEl._flatpickr.input.value;
        } else {
            dobVal = dobEl.value;
        }
        if (dobVal) formData.append("dob", dobVal);

        // --- 3. XỬ LÝ NGÀY BẮT ĐẦU (Started Practice) ---
        const startPracEl = document.getElementById("edit-started-practice");
        let startPracVal = "";
        if (startPracEl._flatpickr) {
            startPracVal = startPracEl._flatpickr.input.value;
        } else {
            startPracVal = startPracEl.value;
        }
        // Chỉ gửi nếu có giá trị (tránh gửi chuỗi rỗng gây lỗi backend)
        if (startPracVal) formData.append("started_practice", startPracVal);

        // --- 4. THÔNG TIN KHÁC ---
        const roomNum = document.getElementById("edit-room").value.trim();
        if (roomNum) formData.append("room_number", roomNum);

        const idNum = document.getElementById("edit-id-number").value.trim();
        if (idNum) formData.append("id_number", idNum);

        formData.append("bio", document.getElementById("edit-bio").value.trim());
        formData.append("experience_detail", document.getElementById("edit-experience-detail").value.trim());

        // --- 6. ĐỊA CHỈ (Gửi 4 trường) ---
        formData.append("address_detail", document.getElementById("edit-address-detail").value.trim());

        const city = getText("edit-city");
        if (city) formData.append("city", city);

        const dist = getText("edit-district");
        if (dist) formData.append("district", dist);

        const ward = getText("edit-ward");
        if (ward) formData.append("ward", ward);

        // --- 7. ẢNH ĐẠI DIỆN ---
        const avatarFile = document.getElementById("edit-avatar").files[0];
        if (avatarFile) {
            formData.append("profile_picture", avatarFile);
        }

        // --- 8. GỬI REQUEST ---
        const token = localStorage.getItem("access");
        if (!token) throw new Error("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");

        const response = await fetch(`${apiBase}/accounts/me/`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.detail || JSON.stringify(errData));
        }

        showToast("Cập nhật hồ sơ thành công!", "success");

        // Ẩn Modal
        const modal = document.getElementById("editProfileModal");
        modal.classList.add("hidden");
        modal.style.display = "none";

        fetchDoctorProfile(); // Tải lại dữ liệu mới
    } catch (err) {
        console.error(err);
        showErrorModal("Cập nhật thất bại: " + err.message);
    } finally {
        hideLoadingOverlay();
    }
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

    content.classList.add("appointments-list");

    if (loading) loading.classList.add("hidden");
    content.classList.remove("hidden");

    const list = filterAppointments(allAppointments);

    if (!list.length) {
        container.classList.remove("appointments-list");
        content.innerHTML = `<div class="no-data">Không có lịch hẹn phù hợp.</div>`;
        return;
    }

    content.innerHTML = list
        .map((apt) => {
            const startDate = new Date(apt.start_at);
            const endDate = new Date(apt.end_at);
            const patientName = apt?.patient_name || `#${apt.patient_id || "?"}`;
            const statusClass = `status-${apt.status?.toLowerCase()}`;
            const roomNumber = apt?.room_number || "-";
            console.log(apt);

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

            const actions = [];

            actions.push(`<button class="btn btn-detail" data-action="detail" data-id="${apt.id}">Chi tiết</button>`);

            if (apt.status === "PENDING") {
                actions.push(`<button class="btn btn-confirm" data-action="confirm" data-id="${apt.id}">Xác nhận</button>`);
                actions.push(`<button class="btn btn-cancel" data-action="cancel" data-id="${apt.id}">Hủy lịch hẹn</button>`);
            } else if (apt.status === "CONFIRMED") {
                actions.push(`<button class="btn btn-complete" data-action="complete" data-id="${apt.id}">Hoàn tất</button>`);
                actions.push(`<button class="btn btn-cancel" data-action="cancel" data-id="${apt.id}">Hủy lịch hẹn</button>`);
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
                        <div><strong>Bệnh nhân:</strong> ${patientName}</div>
                        <div><strong>Ghi chú:</strong> ${apt.note || "-"}</div>
                        <div><strong>Phòng:</strong> ${roomNumber}</div>
                        <div><strong>Trạng thái:</strong> <span class="status ${statusClass}">${statusText}</span></div>
                    </div>

                    <div class="appointment-actions">
                        ${actions.join(" ")}
                    </div>
                </div>
            `;
        })
        .join("");

    content.querySelectorAll("button[data-action]").forEach((btn) => {
        btn.addEventListener("click", async () => {
            const id = btn.dataset.id;
            const action = btn.dataset.action;

            if (action === "confirm") return confirmAppointment(id, btn);
            if (action === "complete") return completeAppointment(id, btn);
            if (action === "cancel") return cancelAppointment(id, btn);
            if (action === "detail") return showAppointmentDetailModal(id);
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

    modal.querySelector(".modal-close-btn").onclick = () => {
        modal.style.display = "none";
    };

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
    const calendarContainer = document.getElementById("availability-calendar-grid");
    const loading = document.getElementById("availability-loading");
    const errorEl = document.getElementById("availability-error");

    if (!calendarContainer) {
        console.error("Availability calendar grid container not found.");
        return;
    }

    const existingTimeLabels = calendarContainer.querySelectorAll(".time-label");
    const existingDayColumns = calendarContainer.querySelectorAll(".calendar-day-column");
    const existingNoData = calendarContainer.querySelector(".no-data-calendar");

    existingTimeLabels.forEach((el) => el.remove());
    existingDayColumns.forEach((el) => el.remove());
    if (existingNoData) existingNoData.remove();

    if (loading) loading.classList.remove("hidden");
    if (errorEl) errorEl.classList.add("hidden");

    const weekdaysFull = ["Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy", "Chủ Nhật"];
    const now = new Date();
    const currentDayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1;

    const headerCells = document.querySelectorAll(".calendar-weekday-header");
    headerCells.forEach((header, index) => {
        if (header.classList.contains("time-column-header")) return;

        const dayDate = new Date(now);
        dayDate.setDate(now.getDate() + (index - currentDayOfWeek));

        header.innerHTML = `
            <span class="day-of-week">${weekdaysFull[index]}</span>
            <span class="date-number">${dayDate.getDate()}</span>
        `;
        header.classList.remove("today");
        if (index === currentDayOfWeek) {
            header.classList.add("today");
        }
    });

    const startHourDisplay = 6; // Bắt đầu từ 6 AM
    const endHourDisplay = 21; // Kết thúc vào 9 PM
    const numberOfHoursToDisplay = endHourDisplay - startHourDisplay + 1;

    calendarContainer.style.gridTemplateRows = `repeat(${numberOfHoursToDisplay}, 1fr)`;

    for (let hour = startHourDisplay; hour <= endHourDisplay; hour++) {
        const timeLabel = document.createElement("div");
        timeLabel.classList.add("time-label");
        timeLabel.style.gridRow = `${hour - startHourDisplay + 1}`;
        timeLabel.textContent = `${hour === 0 ? 12 : hour > 12 ? hour - 12 : hour} ${hour < 12 ? "AM" : "PM"}`;
        calendarContainer.appendChild(timeLabel);
    }

    const groupedAvailabilities = weekdaysFull.map(() => []);
    availabilityList.forEach((a) => {
        if (a.weekday >= 0 && a.weekday <= 6) {
            groupedAvailabilities[a.weekday].push(a);
        }
    });

    groupedAvailabilities.forEach((dayList) => {
        dayList.sort((a, b) => {
            const timeA = a.start_time.split(":").map(Number);
            const timeB = b.start_time.split(":").map(Number);
            if (timeA[0] !== timeB[0]) return timeA[0] - timeB[0];
            return timeA[1] - timeB[1];
        });
    });

    let allDaysEmpty = true;

    groupedAvailabilities.forEach((dayAvailabilities, index) => {
        const dayColumn = document.createElement("div");
        dayColumn.classList.add("calendar-day-column");
        dayColumn.style.gridColumn = `${index + 2}`;
        dayColumn.style.gridRow = `1 / ${numberOfHoursToDisplay + 1}`;

        for (let i = 0; i < numberOfHoursToDisplay; i++) {
            const cell = document.createElement("div");
            cell.classList.add("calendar-grid-cell");
            dayColumn.appendChild(cell);
        }

        if (dayAvailabilities.length > 0) {
            allDaysEmpty = false;
            dayAvailabilities.forEach((a) => {
                const statusClass = a.is_active ? "" : "inactive";

                const startHour = parseInt(a.start_time.split(":")[0]);
                const startMinute = parseInt(a.start_time.split(":")[1]);
                const endHour = parseInt(a.end_time.split(":")[0]);
                const endMinute = parseInt(a.end_time.split(":")[1]);

                if (endHour < startHourDisplay || startHour > endHourDisplay) {
                    return;
                }

                const effectiveStartHour = Math.max(startHour, startHourDisplay);
                const effectiveStartMinute = startHour < startHourDisplay ? 0 : startMinute;

                const effectiveEndHour = Math.min(endHour, endHourDisplay);
                const effectiveEndMinute = endHour > endHourDisplay ? 59 : endMinute;

                const startOffsetMinutes = effectiveStartHour * 60 + effectiveStartMinute;
                const endOffsetMinutes = effectiveEndHour * 60 + effectiveEndMinute;
                const durationMinutes = endOffsetMinutes - startOffsetMinutes;

                const top = (startOffsetMinutes / 60 - startHourDisplay) * 90;
                const height = (durationMinutes / 60) * 90;

                const eventDiv = document.createElement("div");
                eventDiv.classList.add("availability-event");
                if (!a.is_active) {
                    eventDiv.classList.add("inactive");
                }

                if (height > 0) {
                    eventDiv.style.top = `${top}px`;
                    eventDiv.style.height = `${height}px`;
                    eventDiv.style.zIndex = 10 + effectiveStartHour;

                    eventDiv.innerHTML = `
                        <div class="event-header">
                            <div class="event-time">${formatTimeHM(a.start_time)} - ${formatTimeHM(a.end_time)}</div>
                            <div class="event-actions-wrapper">
                                <button class="btn-menu" data-id="${a.id}" data-active="${a.is_active}">⋮</button>
                            </div>
                        </div>
                        <div class="event-details">
                            <span>Slot: ${a.slot_minutes} phút</span>
                            <span class="event-status ${statusClass}">${a.is_active ? "Đang hoạt động" : "Đã tắt"}</span>
                        </div>
                    `;
                    dayColumn.appendChild(eventDiv);
                }
            });
        }
        calendarContainer.appendChild(dayColumn);
    });

    if (allDaysEmpty) {
        const noDataEl = document.createElement("div");
        noDataEl.classList.add("no-data-calendar");
        noDataEl.textContent = "Chưa có lịch làm việc.";
        calendarContainer.appendChild(noDataEl);
    }

    if (loading) loading.classList.add("hidden");

    calendarContainer.querySelectorAll("button[data-act]").forEach((btn) => {
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

    const skeletonLoader = document.getElementById("availability-loading");
    if (skeletonLoader) {
        skeletonLoader.innerHTML = "";
        for (let i = 0; i < numberOfHoursToDisplay * 7; i++) {
            const shimmerCell = document.createElement("div");
            shimmerCell.classList.add("shimmer-cell");
            skeletonLoader.appendChild(shimmerCell);
        }
    }
}

function setupAvailabilityPopup() {
    const popup = document.getElementById("availabilityActionsPopup");
    let currentAvailabilityId = null;
    let currentActiveState = null;

    document.addEventListener("click", (e) => {
        const isMenuButton = e.target.closest(".availability-event .btn-menu");
        const isEventDiv = e.target.closest(".availability-event");

        if (!popup.contains(e.target) && !isMenuButton && !isEventDiv) {
            popup.classList.add("hidden");
        }
    });

    document.getElementById("availability-calendar-grid").addEventListener("click", (e) => {
        // 1. Xác định phần tử sự kiện chính
        const eventDiv = e.target.closest(".availability-event");
        if (!eventDiv) {
            popup.classList.add("hidden");
            return;
        }

        // 2. Tìm nút menu thực tế bên trong sự kiện đó
        const actualMenuButton = eventDiv.querySelector(".btn-menu");
        if (!actualMenuButton) return;

        // 3. Lấy dữ liệu ID và trạng thái từ nút menu
        currentAvailabilityId = actualMenuButton.dataset.id;
        currentActiveState = actualMenuButton.dataset.active === "true";

        const toggleActionBtn = popup.querySelector('[data-action="toggle"]');
        toggleActionBtn.setAttribute("data-active", currentActiveState);
        toggleActionBtn.querySelector(".text").textContent = currentActiveState ? "Tắt" : "Bật";

        // 4. Tính toán vị trí popup
        const rect = actualMenuButton.getBoundingClientRect();

        let popupLeft = rect.right + window.scrollX + 5;
        let popupTop = rect.top + window.scrollY;

        // 5. Kiểm tra tràn màn hình (Tràn lề phải)
        const popupWidth = popup.offsetWidth || 140;
        if (popupLeft + popupWidth > window.innerWidth + window.scrollX - 10) {
            popupLeft = rect.left + window.scrollX - popupWidth - 5;
        }

        // 6. Hiển thị popup tại vị trí đã tính
        popup.style.top = `${popupTop}px`;
        popup.style.left = `${popupLeft}px`;
        popup.classList.remove("hidden");

        e.stopPropagation();
    });

    popup.querySelector('[data-action="toggle"]').addEventListener("click", async () => {
        if (currentAvailabilityId) {
            const actualMenuButton = document.querySelector(`.btn-menu[data-id="${currentAvailabilityId}"]`);
            await toggleAvailability(currentAvailabilityId, actualMenuButton);
            popup.classList.add("hidden");
        }
    });

    popup.querySelector('[data-action="edit"]').addEventListener("click", () => {
        if (currentAvailabilityId) {
            openEditAvailabilityModal(currentAvailabilityId);
            popup.classList.add("hidden");
        }
    });

    popup.querySelector('[data-action="delete"]').addEventListener("click", async () => {
        if (currentAvailabilityId) {
            const actualMenuButton = document.querySelector(`.btn-menu[data-id="${currentAvailabilityId}"]`);
            await deleteAvailability(currentAvailabilityId, actualMenuButton);
            popup.classList.add("hidden");
        }
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

        const newIsActive = !target.is_active;
        if (btn) {
            btn.setAttribute("data-active", newIsActive);
        }
    } catch (err) {
        showErrorModal(`Cập nhật thất bại: ${err.message}`);
        if (btn) btn.disabled = false;
    } finally {
        hideLoadingOverlay();
    }
}

function openEditAvailabilityModal(id) {
    const modal = document.getElementById("editAvailabilityModal");
    const form = document.getElementById("edit-availability-form");
    const closeBtn = document.getElementById("editAvailabilityCloseBtn");

    modal.querySelector(".modal-close-btn").onclick = () => {
        modal.style.display = "none";
    };

    if (!modal || !form) return;

    const availability = availabilityList.find((a) => String(a.id) === String(id));
    if (!availability) {
        showErrorModal("Không tìm thấy lịch làm việc để chỉnh sửa.");
        return;
    }

    document.getElementById("edit-avail-id").value = availability.id;
    document.getElementById("edit-avail-weekday").value = availability.weekday;
    document.getElementById("edit-avail-start").value = availability.start_time.substring(0, 5);
    document.getElementById("edit-avail-end").value = availability.end_time.substring(0, 5);
    document.getElementById("edit-avail-slot").value = availability.slot_minutes;

    modal.style.display = "flex";

    const cleanup = () => {
        modal.style.display = "none";
        form.removeEventListener("submit", submitHandler);
        closeBtn.onclick = null;
        window.onclick = null;
    };

    const submitHandler = async (e) => {
        e.preventDefault();
        await submitEditAvailability(id);
        cleanup();
    };

    form.addEventListener("submit", submitHandler);
    closeBtn.onclick = () => cleanup();
    window.onclick = (e) => {
        if (e.target === modal) cleanup();
    };
}

async function submitEditAvailability(id) {
    showLoadingOverlay("Đang cập nhật lịch làm việc...");

    const w = document.getElementById("edit-avail-weekday")?.value;
    const start = document.getElementById("edit-avail-start")?.value;
    const end = document.getElementById("edit-avail-end")?.value;
    const slot = document.getElementById("edit-avail-slot")?.value;

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
    };

    // 1. Lấy dữ liệu gốc của lịch làm việc đang được chỉnh sửa
    const originalAvailability = availabilityList.find((a) => String(a.id) === String(id));

    // 2. So sánh payload mới với dữ liệu gốc để kiểm tra xem có thay đổi nào không
    let hasChanges = false;
    if (originalAvailability) {
        const originalStartTime = originalAvailability.start_time.substring(0, 5);
        const originalEndTime = originalAvailability.end_time.substring(0, 5);

        if (
            payload.weekday !== originalAvailability.weekday ||
            payload.start_time.substring(0, 5) !== originalStartTime ||
            payload.end_time.substring(0, 5) !== originalEndTime ||
            payload.slot_minutes !== originalAvailability.slot_minutes
        ) {
            hasChanges = true;
        }
    }

    // 3. Nếu không có thay đổi, hiển thị toast và thoát mà không gọi API hay kiểm tra trùng lặp
    if (!hasChanges) {
        hideLoadingOverlay();
        showToast("Cập nhật lịch làm việc thành công!", "success");
        return;
    }

    const hasOverlap = availabilityList.some((a) => {
        if (String(a.id) === String(id)) return false;
        if (a.weekday !== Number(w)) return false;
        const s1 = new Date(`2000/01/01 ${a.start_time}`);
        const e1 = new Date(`2000/01/01 ${a.end_time}`);
        return !(endTime <= s1 || startTime >= e1);
    });

    if (hasOverlap) {
        showErrorModal(
            "Khung giờ bị chồng lấp với lịch làm việc khác trong cùng ngày. Hãy chỉnh sửa hoặc xóa lịch cũ trước khi cập nhật.",
            "warning"
        );
        hideLoadingOverlay();
        return;
    }

    try {
        const res = await fetchWithAuth(`${apiBase}/doctors/availability/${id}/`, {
            method: "PATCH",
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
        showToast("Cập nhật lịch làm việc thành công!", "success");
    } catch (err) {
        showErrorModal(err.message || "Không thể cập nhật lịch làm việc. Vui lòng thử lại sau.", "error");
    } finally {
        hideLoadingOverlay();
    }
}

async function deleteAvailability(id, triggerBtn) {
    const modal = document.getElementById("deleteModal");
    const confirmBtn = document.getElementById("deleteConfirmBtn");
    const closeBtn = document.getElementById("deleteCloseBtn");
    if (!modal || !confirmBtn || !closeBtn) return;

    modal.querySelector(".modal-close-btn").onclick = () => {
        modal.style.display = "none";
    };

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
        content.innerHTML = `<div class="no-data">Chưa có lịch nghỉ.</div>`;
        return;
    }

    const sortedDaysOff = [...daysOffList].sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);

        return dateB.getTime() - dateA.getTime();
    });

    content.innerHTML = sortedDaysOff
        .map((d) => {
            const dateDisplay = d.date ? formatDateVN(d.date) : "—";
            const timeDisplay = d.start_time && d.end_time ? `${formatTimeHM(d.start_time)} - ${formatTimeHM(d.end_time)}` : "Cả ngày";
            const reasonText = d.reason || "Không có lý do";

            return `
                <div class="row">
                    <div data-label="Ngày">${dateDisplay}</div>
                    <div data-label="Thời gian">${timeDisplay}</div>
                    <div data-label="Lý do" class="reason-container">
                        <div class="reason-cell-display">${reasonText}</div>
                        <span class="reason-tooltip hidden">${reasonText}</span>
                    </div>
                    <div data-label="Thao tác">
                        <button class="btn btn-small btn-cancel" data-act="delete" data-id="${d.id}">Xóa</button>
                    </div>
                </div>
            `;
        })
        .join("");

    content.querySelectorAll(".reason-container").forEach((container) => {
        const displayCell = container.querySelector(".reason-cell-display");
        const tooltip = container.querySelector(".reason-tooltip");

        container.addEventListener("mouseenter", () => {
            if (displayCell.offsetWidth < displayCell.scrollWidth) {
                tooltip.classList.remove("hidden");
            }
        });

        container.addEventListener("mouseleave", () => {
            tooltip.classList.add("hidden");
        });
    });

    content.querySelectorAll("button[data-act]").forEach((btn) => {
        btn.addEventListener("click", async (e) => {
            const act = btn.getAttribute("data-act");
            const id = btn.getAttribute("data-id");
            if (act === "delete") {
                await deleteDayOff(id, btn);
            }
        });
    });
}

async function submitDayOff() {
    showLoadingOverlay("Đang thêm lịch nghỉ...");
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
        await loadDaysOff(true);
        document.getElementById("dayoff-date").value = "";
        document.getElementById("dayoff-start").value = "";
        document.getElementById("dayoff-end").value = "";
        document.getElementById("dayoff-reason").value = "";
    } catch (err) {
        showErrorModal(err.message || "Không thể thêm lịch nghỉ. Vui lòng thử lại sau.");
    } finally {
        hideLoadingOverlay();
    }
}

async function deleteDayOff(id, triggerBtn) {
    const modal = document.getElementById("deleteDaysOffModal");
    const confirmBtn = document.getElementById("deleteDaysOffConfirmBtn");
    const closeBtn = document.getElementById("deleteDaysOffCloseBtn");
    if (!modal || !confirmBtn || !closeBtn) return;

    modal.querySelector(".modal-close-btn").onclick = () => {
        modal.style.display = "none";
    };

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
        showLoadingOverlay("Đang xóa lịch nghỉ...");
        if (triggerBtn) {
            triggerBtn.disabled = true;
        }

        try {
            const res = await fetchWithAuth(`${apiBase}/doctors/days-off/${id}/`, { method: "DELETE" });
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
            await loadDaysOff(true);
            showToast("Xóa lịch nghỉ thành công!", "success");
        } catch (err) {
            showErrorModal(err.message || "Không thể xóa lịch nghỉ. Vui lòng thử lại sau.");
            if (triggerBtn) {
                triggerBtn.disabled = false;
                triggerBtn.textContent = "Xóa";
            }
        } finally {
            hideLoadingOverlay();
        }
    };
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
    if (typeof flatpickr !== "undefined") {
        flatpickr("#edit-dob", { locale: "vn", dateFormat: "Y-m-d", altInput: true, altFormat: "d/m/Y", allowInput: true });
        flatpickr("#edit-started-practice", { locale: "vn", dateFormat: "Y-m-d", altInput: true, altFormat: "d/m/Y", allowInput: true });
    }
    fetchDoctorProfile();
    loadAppointments();
    loadAvailability();
    setupAvailabilityPopup();
    setupAppointmentActionsPopup();
    generateMockNotifications();
});
