(() => {
    const API_BASE = "/api/admin";

    const UI = {
        toast(message, type = "success") {
            const container = document.getElementById("toast-container");
            const toast = document.createElement("div");
            toast.className = `toast ${type}`;
            toast.innerHTML = `
                <i class="fas ${type === "success" ? "fa-check-circle" : "fa-exclamation-triangle"}"></i>
                <span>${message}</span>
            `;
            container.appendChild(toast);
            setTimeout(() => toast.remove(), 3000);
        },

        showModal(title, contentHtml, onSubmit) {
            const modal = document.getElementById("main-modal");
            const form = document.getElementById("modal-form");
            document.getElementById("modal-title").textContent = title;
            document.getElementById("modal-body").innerHTML = contentHtml;

            modal.classList.add("open");

            form.onsubmit = async (e) => {
                e.preventDefault();
                await onSubmit(e.target);
            };
        },

        closeModals() {
            document.querySelectorAll(".modal-overlay").forEach((m) => m.classList.remove("open"));
        },

        confirm(title, desc, onConfirm) {
            const modal = document.getElementById("confirm-modal");
            document.getElementById("confirm-title").textContent = title;
            document.getElementById("confirm-desc").textContent = desc;
            modal.classList.add("open");

            const yesBtn = document.getElementById("btn-confirm-yes");
            const newYesBtn = yesBtn.cloneNode(true);
            yesBtn.parentNode.replaceChild(newYesBtn, yesBtn);

            newYesBtn.onclick = () => {
                onConfirm();
                UI.closeModals();
            };
        },

        // Hàm tạo bảng Generic giúp giảm lặp code
        createTable(columns, data, actionsCallback) {
            if (!data || data.length === 0) return '<div class="card"><p class="text-muted center">Không có dữ liệu.</p></div>';

            const headers = columns.map((c) => `<th>${c.label}</th>`).join("");
            const rows = data
                .map((item) => {
                    const cells = columns.map((c) => `<td>${c.render ? c.render(item) : item[c.key] || "-"}</td>`).join("");
                    const actionBtns = actionsCallback ? `<td class="text-right">${actionsCallback(item)}</td>` : "";
                    return `<tr>${cells}${actionBtns}</tr>`;
                })
                .join("");

            return `
                <div class="card">
                    <div class="table-responsive">
                        <table class="table">
                            <thead><tr>${headers}${actionsCallback ? "<th>Thao tác</th>" : ""}</tr></thead>
                            <tbody>${rows}</tbody>
                        </table>
                    </div>
                </div>`;
        },

        renderHeader(title, btnText = null, btnId = null) {
            return `
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 24px;">
                    <h2 style="font-size: 1.5rem; font-weight:700;">${title}</h2>
                    ${btnText ? `<button id="${btnId}" class="btn btn-primary"><i class="fas fa-plus"></i> ${btnText}</button>` : ""}
                </div>`;
        },
    };

    // --- API HANDLER ---
    const API = {
        async fetch(endpoint, options = {}) {
            const token = localStorage.getItem("access");
            try {
                const res = await fetch(`${API_BASE}${endpoint}`, {
                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...options.headers },
                    ...options,
                });
                if (!res.ok) {
                    const err = await res.json();
                    throw new Error(err.detail || "Có lỗi xảy ra");
                }
                return res.status === 204 ? null : res.json();
            } catch (e) {
                UI.toast(e.message, "error");
                throw e;
            }
        },
    };

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

    // --- RENDERERS ---
    const Pages = {
        async overview() {
            const container = document.getElementById("panel-container");
            container.innerHTML = "<p>Đang tải dữ liệu...</p>";

            const statusMap = {
                PENDING: "Đang chờ xác nhận",
                CONFIRMED: "Đã xác nhận",
                COMPLETED: "Đã hoàn thành",
                CANCELLED: "Đã hủy",
            };

            try {
                const [stats, apptStats] = await Promise.all([API.fetch("/statistics/"), API.fetch("/appointments/statistics/")]);

                container.innerHTML = `
                    ${UI.renderHeader("Tổng quan Hệ thống")}
                    <div class="stats-grid">
                        <div class="stat-card" onclick="location.hash='#users'">
                            <div class="stat-icon"><i class="fas fa-users"></i></div>
                            <div class="stat-info"><h4>${stats.total_users || 0}</h4><p>Người dùng</p></div>
                        </div>
                        <div class="stat-card" onclick="location.hash='#doctors'">
                            <div class="stat-icon"><i class="fas fa-user-md"></i></div>
                            <div class="stat-info"><h4>${stats.total_doctors || 0}</h4><p>Bác sĩ</p></div>
                        </div>
                        <div class="stat-card" onclick="location.hash='#appointments'">
                            <div class="stat-icon"><i class="fas fa-calendar-check"></i></div>
                            <div class="stat-info"><h4>${stats.total_appointments || 0}</h4><p>Lịch hẹn</p></div>
                        </div>
                         <div class="stat-card" onclick="location.hash='#reviews'">
                            <div class="stat-icon"><i class="fas fa-star"></i></div>
                            <div class="stat-info"><h4>${stats.total_reviews || 0}</h4><p>Đánh giá</p></div>
                        </div>
                    </div>
                    <div class="card">
                        <h3>Phân bố Trạng thái Lịch hẹn</h3>
                        <div style="height: 300px; margin-top: 20px;"><canvas id="chartOverview"></canvas></div>
                    </div>
                `;

                const labels = Object.keys(apptStats).map((key) => statusMap[key] || key);
                const data = Object.values(apptStats);

                new Chart(document.getElementById("chartOverview"), {
                    type: "doughnut",
                    data: {
                        labels: labels,
                        datasets: [
                            {
                                data: data,
                                backgroundColor: ["#4361ee", "#3a0ca3", "#10b981", "#ef4444", "#f59e0b"],
                            },
                        ],
                    },
                    options: { maintainAspectRatio: false, plugins: { legend: { position: "bottom" } } },
                });
            } catch (e) {
                console.error(e);
                container.innerHTML = "<p>Không thể tải dữ liệu.</p>";
            }
        },

        async users() {
            const container = document.getElementById("panel-container");
            try {
                const data = await API.fetch("/users/");
                const users = data.results || data;

                const html =
                    UI.renderHeader("Quản lý Người dùng") +
                    UI.createTable(
                        [
                            { label: "Họ tên", key: "full_name" },
                            { label: "Email", key: "email" },
                            {
                                label: "Vai trò",
                                render: (u) => {
                                    if (u.is_staff) return "Quản trị viên";
                                    if (u.role == "DOCTOR") return "Bác sĩ";
                                    return "Bệnh nhân";
                                },
                            },
                            {
                                label: "Trạng thái",
                                render: (u) =>
                                    `<span class="badge ${u.is_active ? "active" : "inactive"}">${u.is_active ? "Hoạt động" : "Đã khóa"}</span>`,
                            },
                        ],
                        users,
                        (u) => `
                        <button class="btn-icon toggle-active" data-id="${u.id}" data-endpoint="users" 
                                title="${u.is_active ? "Khóa tài khoản" : "Kích hoạt tài khoản"}">
                            <i class="fas ${u.is_active ? "fa-toggle-on text-success" : "fa-toggle-off"}" 
                               style="font-size: 1.2rem;"></i>
                        </button>
                        
                        <button class="btn-icon delete delete-item" data-id="${
                            u.id
                        }" data-endpoint="users" title="Xóa"><i class="fas fa-trash"></i></button>
                    `
                    );
                container.innerHTML = html;
            } catch (e) {}
        },

        async doctors() {
            const container = document.getElementById("panel-container");
            try {
                const data = await API.fetch("/doctors/");
                const doctors = data.results || data;

                const html =
                    UI.renderHeader("Danh sách Bác sĩ", "Thêm Bác sĩ", "btn-add-doctor") +
                    UI.createTable(
                        [
                            { label: "Họ tên", render: (d) => d.user?.full_name || "N/A" },
                            { label: "Chuyên khoa", render: (d) => d.specialty_name || "-" },
                            {
                                label: "Nổi bật",
                                render: (d) =>
                                    d.is_featured
                                        ? '<i class="fas fa-check-circle text-warning" style="background:#fff7ed; color:#d97706;" title="Bác sĩ nổi bật"></i>'
                                        : "-",
                            },
                            {
                                label: "Trạng thái",
                                render: (d) =>
                                    `<span class="badge ${d.user?.is_active ? "active" : "inactive"}">${
                                        d.user?.is_active ? "Hoạt động" : "Đã khóa"
                                    }</span>`,
                            },
                        ],
                        doctors,
                        (d) => `
                        <button class="btn-icon edit-doctor-btn" data-id="${d.id}" title="Chỉnh sửa thông tin">
                            <i class="fas fa-edit text-primary"></i>
                        </button>
                        
                        <button class="btn-icon toggle-featured" 
                                data-id="${d.id}" 
                                title="${d.is_featured ? "Bỏ nổi bật" : "Đặt làm nổi bật"}">
                            <i class="${d.is_featured ? "fas fa-star text-warning" : "far fa-star"}" 
                               style="font-size: 1.2rem; transition: transform 0.2s;"></i>
                        </button>

                        <button class="btn-icon toggle-active" 
                                data-id="${d.user?.id}" 
                                data-endpoint="users" 
                                title="${d.user?.is_active ? "Khóa tài khoản" : "Mở khóa tài khoản"}">
                            <i class="fas ${d.user?.is_active ? "fa-toggle-on text-success" : "fa-toggle-off"}" 
                               style="font-size: 1.2rem;"></i>
                        </button>

                        <button class="btn-icon delete delete-item" data-id="${
                            d.id
                        }" data-endpoint="doctors" title="Xóa"><i class="fas fa-trash"></i></button>
                    `
                    );
                container.innerHTML = html;

                // Add Doctor Event
                document.getElementById("btn-add-doctor")?.addEventListener("click", () => {
                    App.handleDoctorForm();
                });

                // Edit Doctor Events
                document.querySelectorAll(".edit-doctor-btn").forEach((btn) => {
                    btn.addEventListener("click", () => {
                        App.handleDoctorForm(btn.dataset.id);
                    });
                });
            } catch (e) {}
        },

        async specialties() {
            const container = document.getElementById("panel-container");
            try {
                const data = await API.fetch("/specialties/");

                const html =
                    UI.renderHeader("Quản lý Chuyên khoa", "Thêm Chuyên khoa", "btn-add-spec") +
                    UI.createTable(
                        [
                            {
                                label: "Ảnh",
                                render: (s) =>
                                    s.specialty_picture
                                        ? `<img src="${s.specialty_picture}" alt="${s.name}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 8px; border: 1px solid #e5e7eb;">`
                                        : `<div style="width: 50px; height: 50px; background: #f3f4f6; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #9ca3af;"><i class="fas fa-image"></i></div>`,
                            },
                            { label: "Tên chuyên khoa", key: "name" },
                            {
                                label: "Mô tả",
                                render: (s) => {
                                    const desc = s.description || "";
                                    const limit = 60;

                                    if (desc.length <= limit) return desc;

                                    return `
                                        <span title="${desc}">
                                            ${desc.substring(0, limit)}...
                                        </span>
                                    `;
                                },
                            },
                            {
                                label: "Trạng thái",
                                render: (s) => `<span class="badge ${s.is_active ? "active" : "inactive"}">${s.is_active ? "Hiện" : "Ẩn"}</span>`,
                            },
                        ],
                        data.results || data,
                        (s) => `
                        <button class="btn-icon toggle-active" 
                                data-id="${s.id}" 
                                data-endpoint="specialties" 
                                title="${s.is_active ? "Ẩn chuyên khoa này" : "Hiện chuyên khoa này"}">
                            <i class="fas ${s.is_active ? "fa-toggle-on text-success" : "fa-toggle-off"}" 
                               style="font-size: 1.2rem;"></i>
                        </button>

                        <button class="btn-icon edit-spec" data-id="${s.id}" title="Sửa">
                            <i class="fas fa-edit"></i>
                        </button>

                        <button class="btn-icon delete delete-item" data-id="${s.id}" data-endpoint="specialties" title="Xóa">
                            <i class="fas fa-trash"></i>
                        </button>
                    `
                    );
                container.innerHTML = html;

                // Add Specialty Event
                document.getElementById("btn-add-spec")?.addEventListener("click", () => {
                    App.handleSpecialtyForm();
                });

                // Edit Specialty Event
                document.querySelectorAll(".edit-spec").forEach((btn) => {
                    btn.addEventListener("click", () => {
                        App.handleSpecialtyForm(btn.dataset.id);
                    });
                });
            } catch (e) {
                UI.toast("Lỗi tải danh sách chuyên khoa: " + e.message, "error");
            }
        },

        async appointments() {
            const container = document.getElementById("panel-container");
            try {
                const data = await API.fetch("/appointments/");

                const statusConfig = {
                    PENDING: { text: "Đang chờ xác nhận", class: "badge-warning" },
                    CONFIRMED: { text: "Đã xác nhận", class: "badge-primary" },
                    COMPLETED: { text: "Đã hoàn thành", class: "badge-success" },
                    CANCELLED: { text: "Đã hủy", class: "badge-danger" },
                };

                const html =
                    UI.renderHeader("Quản lý Lịch hẹn") +
                    UI.createTable(
                        [
                            { label: "Bệnh nhân", key: "patient_name" },
                            { label: "Bác sĩ", key: "doctor_name" },
                            { label: "Thời gian hẹn", render: (a) => new Date(a.start_at).toLocaleString("vi-VN") },
                            { label: "Ngày tạo", render: (a) => new Date(a.created_at).toLocaleString("vi-VN") },
                            {
                                label: "Trạng thái",
                                render: (a) => {
                                    const config = statusConfig[a.status] || { text: a.status, class: "badge-secondary" };
                                    return `<span class="badge ${config.class}">${config.text}</span>`;
                                },
                            },
                        ],
                        data.results || data
                    );
                container.innerHTML = html;
            } catch (e) {}
        },

        async reviews() {
            const container = document.getElementById("panel-container");
            try {
                const data = await API.fetch("/reviews/");
                const reviews = data.results || data;

                const html =
                    UI.renderHeader("Đánh giá từ Bệnh nhân") +
                    UI.createTable(
                        [
                            {
                                label: "Bệnh nhân",
                                render: (r) => `${r.patient_name || "Ẩn danh"}`,
                            },
                            {
                                label: "Đánh giá Bác sĩ",
                                render: (r) => `${r.doctor_name || "N/A"}`,
                            },
                            {
                                label: "Xếp hạng",
                                render: (r) => {
                                    const rating = r.stars || r.rating || 0;
                                    const filled = '<i class="fas fa-star" style="color: #f59e0b;"></i>'.repeat(rating);
                                    const empty = '<i class="far fa-star" style="color: #cbd5e1;"></i>'.repeat(5 - rating);
                                    return `<div style="display:flex; gap:2px;">${filled}${empty}</div>`;
                                },
                            },
                            {
                                label: "Nội dung",
                                render: (r) => {
                                    const content = r.comment || "";
                                    const limit = 50;

                                    if (content.length <= limit) return content;

                                    return `
                                        <span title="${content}">
                                            ${content.substring(0, limit)}...
                                        </span>
                                    `;
                                },
                            },
                            {
                                label: "Trạng thái",
                                render: (r) =>
                                    `<span class="badge ${r.is_active ? "active" : "inactive"}">${r.is_active ? "Công khai" : "Đã ẩn"}</span>`,
                            },
                        ],
                        reviews,
                        (r) => `
                            <button class="btn-icon toggle-active" data-id="${r.id}" data-endpoint="reviews" 
                                title="${r.is_active ? "Ẩn đánh giá này" : "Duyệt/Hiển thị đánh giá"}">
                                <i class="fas ${r.is_active ? "fa-eye-slash" : "fa-eye"}"></i>
                            </button>
                        `
                    );
                container.innerHTML = html;
            } catch (e) {
                UI.toast("Không thể tải danh sách đánh giá", "error");
            }
        },

        async reports() {
            const container = document.getElementById("panel-container");

            container.innerHTML = `
                ${UI.renderHeader("Báo cáo & Thống kê")}
                
                <div class="card" style="margin-bottom: 24px; padding: 16px;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <i class="fas fa-filter text-muted"></i>
                        <span style="font-weight: 500;">Thời gian:</span>
                        <select id="report-range" class="form-control" style="width: 200px;">
                            <option value="this_month">Tháng này</option>
                            <option value="last_month">Tháng trước</option>
                            <option value="last_7_days">7 ngày qua</option>
                            <option value="all_time">Toàn thời gian</option>
                        </select>
                    </div>
                </div>

                <div id="report-dashboard">
                    <p class="text-center text-muted">Đang tải và phân tích dữ liệu...</p>
                </div>
            `;

            const renderReportData = (appointments, range) => {
                const dashboard = document.getElementById("report-dashboard");

                // --- A. Lọc dữ liệu theo ngày ---
                const now = new Date();
                let start = new Date(0);
                let end = new Date();
                end.setHours(23, 59, 59, 999);

                if (range === "this_month") {
                    start = new Date(now.getFullYear(), now.getMonth(), 1);
                } else if (range === "last_month") {
                    start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                    end = new Date(now.getFullYear(), now.getMonth(), 0);
                } else if (range === "last_7_days") {
                    start = new Date();
                    start.setDate(now.getDate() - 6);
                    start.setHours(0, 0, 0, 0);
                }

                const filtered = appointments.filter((a) => {
                    const d = new Date(a.start_at);
                    return d >= start && d <= end;
                });

                // --- B. Tính toán chỉ số (KPIs) ---
                const total = filtered.length;
                const completed = filtered.filter((a) => a.status === "COMPLETED" || a.status === "CONFIRMED").length;
                const cancelled = filtered.filter((a) => a.status === "CANCELLED").length;
                const cancelRate = total > 0 ? ((cancelled / total) * 100).toFixed(1) : 0;

                // --- C. Chuẩn bị dữ liệu biểu đồ ---
                // 1. Xu hướng theo ngày (Line Chart)
                const trendMap = {};
                filtered.forEach((a) => {
                    const date = new Date(a.start_at).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
                    trendMap[date] = (trendMap[date] || 0) + 1;
                });

                // 2. Top Bác sĩ (Bar Chart)
                const doctorMap = {};
                filtered.forEach((a) => {
                    const name = a.doctor_name || "Chưa phân công";
                    doctorMap[name] = (doctorMap[name] || 0) + 1;
                });
                // Sắp xếp lấy Top 5
                const topDoctors = Object.entries(doctorMap)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5);

                // --- D. Render HTML ---
                dashboard.innerHTML = `
                    <div class="stats-grid">
                        <div class="stat-card">
                            <div class="stat-icon" style="background: #e0e7ff; color: #4361ee;"><i class="fas fa-calendar-alt"></i></div>
                            <div class="stat-info"><h4>${total}</h4><p>Tổng lịch hẹn</p></div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon" style="background: #d1fae5; color: #10b981;"><i class="fas fa-check-circle"></i></div>
                            <div class="stat-info"><h4>${completed}</h4><p>Thành công</p></div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon" style="background: #fee2e2; color: #ef4444;"><i class="fas fa-times-circle"></i></div>
                            <div class="stat-info"><h4>${cancelled}</h4><p>Đã hủy</p></div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon" style="background: #fef3c7; color: #d97706;"><i class="fas fa-percent"></i></div>
                            <div class="stat-info"><h4>${cancelRate}%</h4><p>Tỷ lệ hủy</p></div>
                        </div>
                    </div>

                    <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 24px;">
                        <div class="card">
                            <h3 style="margin-bottom: 16px;">Xu hướng đặt lịch</h3>
                            <div style="height: 300px; position: relative;">
                                <canvas id="trendChart"></canvas>
                            </div>
                        </div>
                        
                        <div class="card">
                            <h3 style="margin-bottom: 16px;">Tỷ lệ trạng thái</h3>
                            <div style="height: 300px; position: relative;">
                                <canvas id="statusChart"></canvas>
                            </div>
                        </div>
                    </div>

                    <div class="card" style="margin-top: 24px;">
                        <h3 style="margin-bottom: 16px;">Top Bác sĩ có nhiều lịch hẹn nhất</h3>
                        <div style="height: 300px; position: relative;">
                            <canvas id="doctorChart"></canvas>
                        </div>
                    </div>
                `;

                // Helper hủy chart cũ nếu có để tránh lỗi hiển thị đè
                const destroyChart = (id) => {
                    const chartStatus = Chart.getChart(id);
                    if (chartStatus) chartStatus.destroy();
                };

                // 1. Trend Chart
                destroyChart("trendChart");
                new Chart(document.getElementById("trendChart"), {
                    type: "line",
                    data: {
                        labels: Object.keys(trendMap),
                        datasets: [
                            {
                                label: "Số lượng",
                                data: Object.values(trendMap),
                                borderColor: "#4361ee",
                                backgroundColor: "rgba(67, 97, 238, 0.1)",
                                fill: true,
                                tension: 0.4,
                            },
                        ],
                    },
                    options: {
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
                    },
                });

                // 2. Status Chart
                destroyChart("statusChart");
                new Chart(document.getElementById("statusChart"), {
                    type: "doughnut",
                    data: {
                        labels: ["Thành công", "Hủy", "Chờ xác nhận"],
                        datasets: [
                            {
                                data: [completed, cancelled, total - completed - cancelled],
                                backgroundColor: ["#10b981", "#ef4444", "#f59e0b"],
                                borderWidth: 0,
                            },
                        ],
                    },
                    options: { maintainAspectRatio: false, cutout: "70%", plugins: { legend: { position: "bottom" } } },
                });

                // 3. Doctor Chart
                destroyChart("doctorChart");
                new Chart(document.getElementById("doctorChart"), {
                    type: "bar",
                    data: {
                        labels: topDoctors.map((d) => d[0]),
                        datasets: [
                            {
                                label: "Số bệnh nhân",
                                data: topDoctors.map((d) => d[1]),
                                backgroundColor: "#3a0ca3",
                                borderRadius: 4,
                            },
                        ],
                    },
                    options: { maintainAspectRatio: false, indexAxis: "y", scales: { x: { beginAtZero: true } } },
                });
            };

            // 3. Khởi tạo dữ liệu
            try {
                const res = await API.fetch("/appointments/");
                const allAppointments = res.results || res;

                const select = document.getElementById("report-range");
                select.addEventListener("change", (e) => {
                    renderReportData(allAppointments, e.target.value);
                });

                renderReportData(allAppointments, "this_month");
            } catch (e) {
                container.innerHTML = `<div class="card"><p class="text-danger">Lỗi tải dữ liệu báo cáo: ${e.message}</p></div>`;
            }
        },
    };

    // --- MAIN APP LOGIC ---
    const App = {
        init() {
            this.handleRouting();
            window.addEventListener("hashchange", () => this.handleRouting());
            this.setupGlobalEvents();
        },

        handleRouting() {
            const page = location.hash.slice(1) || "overview";

            document.querySelectorAll(".sidebar-nav-item, .nav-item").forEach((el) => el.classList.remove("active"));
            const activeLink = document.querySelector(`.sidebar-nav-item[href="#${page}"], .nav-item[href="#${page}"]`);
            if (activeLink) activeLink.classList.add("active");

            if (Pages[page]) Pages[page]();
            else Pages.overview();
        },

        async handleDoctorForm(id = null) {
            let specialtyOptions = "";
            let doctorData = null;
            let specs = [];

            try {
                // 1. Lấy danh sách chuyên khoa
                const specsData = await API.fetch("/specialties/");
                specs = specsData.results || specsData;
                specialtyOptions = specs
                    .filter((s) => s.is_active)
                    .map((s) => `<option value="${s.id}">${s.name}</option>`)
                    .join("");

                // 2. Nếu đang sửa (có ID), tải thông tin bác sĩ
                if (id) {
                    doctorData = await API.fetch(`/doctors/${id}/`);
                }
            } catch (e) {
                console.error(e);
                UI.toast("Lỗi tải dữ liệu", "error");
                return;
            }

            // Helper lấy dữ liệu an toàn (tránh lỗi undefined)
            const val = (key) => (doctorData ? doctorData[key] || "" : "");
            const userVal = (key) => (doctorData && doctorData.user ? doctorData.user[key] || "" : "");

            // 3. HTML Form (Đã điền value)
            const formBody = `
                <div style="max-height: 70vh; overflow-y: auto; padding: 2px 10px;">
                    <div class="form-grid-2">
                        <div>
                            <h5 class="form-section-title">Thông tin tài khoản</h5>
                            
                            <div class="image-preview-wrapper">
                                <label for="profile_picture" class="image-preview-box" id="avatar-preview">
                                    ${
                                        val("profile_picture")
                                            ? `<img src="${val(
                                                  "profile_picture"
                                              )}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`
                                            : `<i class="fas fa-camera"></i>`
                                    }
                                </label>
                                <input type="file" id="profile_picture" accept="image/*" style="display: none;">
                                <small class="text-muted">${id ? "Nhấn để đổi ảnh mới" : "Nhấn để chọn ảnh đại diện"}</small>
                            </div>

                            <div class="form-group">
                                <label>Họ và tên <span style="color:red">*</span></label>
                                <input type="text" id="full_name" class="form-control" required value="${userVal("full_name")}">
                            </div>
                            <div class="form-group">
                                <label>Email đăng nhập <span style="color:red">*</span></label>
                                <input type="email" id="email" class="form-control" required value="${userVal("email")}" ${
                id ? "readonly style='background-color:#f3f4f6'" : ""
            }>
                            </div>
                            <div class="form-group">
                                <label>Mật khẩu ${
                                    id ? '<small class="text-muted">(Để trống nếu không đổi)</small>' : '<span style="color:red">*</span>'
                                }</label>
                                <input type="password" id="password" class="form-control" ${id ? "" : "required"} placeholder="••••••••">
                            </div>
                            <div class="form-group">
                                <label>Giới tính</label>
                                <select id="gender" class="form-control">
                                    <option value="MALE">Nam</option>
                                    <option value="FEMALE">Nữ</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Ngày sinh</label>
                                <input type="text" id="dob" class="form-control" placeholder="dd/mm/yyyy" value="${userVal("dob")}">
                            </div>
                            <div class="form-group"><label>Số điện thoại <span style="color:red">*</span></label><input type="text" id="phone_number" class="form-control" value="${userVal(
                                "phone_number"
                            )}"></div>
                        </div>

                        <div>
                            <h5 class="form-section-title">Thông tin hành nghề</h5>
                            <div class="form-group">
                                <label>Chuyên khoa <span style="color:red">*</span></label>
                                <select id="specialty_id" class="form-control" required>
                                    <option value="">-- Chọn chuyên khoa --</option>
                                    ${specialtyOptions}
                                </select>
                            </div>

                            <div class="form-group">
                                <label>Số phòng</label>
                                <input type="text" id="room_number" class="form-control" placeholder="VD: P.201" value="${val("room_number")}">
                            </div>
                            
                            <div class="form-group">
                                <label>CMND/CCCD</label>
                                <input type="text" id="id_number" class="form-control" value="${userVal("id_number")}">
                            </div>
                            
                            <div class="form-group">
                                <label>Ngày bắt đầu</label>
                                <input type="text" id="started_practice" class="form-control" placeholder="dd/mm/yyyy" value="${val(
                                    "started_practice"
                                )}">
                            </div>

                            <h5 class="form-section-title">Địa chỉ liên hệ</h5>
                            <div class="form-group"><select id="city" class="form-control"><option value="">-- Tỉnh / Thành phố --</option></select></div>
                            <div class="form-group"><select id="district" class="form-control"><option value="">-- Quận / Huyện --</option></select></div>
                            <div class="form-group"><select id="ward" class="form-control"><option value="">-- Phường / Xã --</option></select></div>
                            <div class="form-group">
                                <input type="text" id="address_detail" class="form-control" placeholder="Số nhà, tên đường..." value="${userVal(
                                    "address_detail"
                                )}">
                            </div>
                        </div>
                    </div>

                    <h5 class="form-section-title">Chi tiết bổ sung</h5>
                    <div class="form-grid-2">
                        <div class="form-group">
                            <label>Giới thiệu / Tiểu sử</label>
                            <textarea id="bio" class="form-control" rows="10" placeholder="Giới thiệu ngắn gọn...">${val("bio")}</textarea>
                        </div>
                        <div class="form-group">
                            <label>Chi tiết kinh nghiệm</label>
                            <textarea id="experience_detail" class="form-control" rows="10" placeholder="Các nơi từng công tác...">${val(
                                "experience_detail"
                            )}</textarea>
                        </div>
                    </div>
                </div>
            `;

            const title = id ? "Cập nhật thông tin Bác sĩ" : "Thêm Bác sĩ Mới";
            UI.showModal(title, formBody, () => {});

            if (doctorData) {
                const genderSelect = document.getElementById("gender");
                if (genderSelect && userVal("gender")) genderSelect.value = userVal("gender");

                let specId = val("specialty_id") || (doctorData.specialty ? doctorData.specialty.id : "");
                if (!specId && doctorData.specialty_name) {
                    const found = specs.find((s) => s.name === doctorData.specialty_name);
                    if (found) specId = found.id;
                }
                const specSelect = document.getElementById("specialty_id");
                if (specSelect && specId) specSelect.value = specId;
            }

            // 4. Cấu hình Flatpickr
            const fpConfig = { locale: "vn", dateFormat: "Y-m-d", altInput: true, altFormat: "d/m/Y", allowInput: true };
            flatpickr("#dob", fpConfig);
            flatpickr("#started_practice", fpConfig);

            // 5. Preview ảnh
            const fileInput = document.getElementById("profile_picture");
            const previewBox = document.getElementById("avatar-preview");
            fileInput.onchange = (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                        previewBox.innerHTML = `<img src="${ev.target.result}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`;
                        previewBox.style.border = "3px solid #4361ee";
                    };
                    reader.readAsDataURL(file);
                }
            };

            // 6. Xử lý Submit (Truyền ID vào)
            const form = document.getElementById("modal-form");
            form.onsubmit = (e) => {
                e.preventDefault();
                this.handleDoctorSubmit(form, id);
            };

            this.setupAddressSelectors(userVal("city"), userVal("district"), userVal("ward"));
        },

        async handleDoctorSubmit(form, id = null) {
            const formData = new FormData();
            const getText = (eid) => {
                const sel = form.querySelector(`#${eid}`);
                return sel.options[sel.selectedIndex]?.dataset?.name || "";
            };

            // --- GOM DỮ LIỆU ---
            // 1. Bắt buộc
            formData.append("full_name", form.querySelector("#full_name").value.trim());
            formData.append("phone_number", form.querySelector("#phone_number").value.trim());
            formData.append("gender", form.querySelector("#gender").value);
            formData.append("specialty_id", parseInt(form.querySelector("#specialty_id").value));

            // 2. Email & Password
            if (!id) {
                formData.append("email", form.querySelector("#email").value.trim());
                formData.append("password", form.querySelector("#password").value);
            } else {
                const newPass = form.querySelector("#password").value;
                if (newPass) formData.append("password", newPass);
            }

            // 3. Các trường tùy chọn
            const roomNumber = form.querySelector("#room_number").value.trim();
            if (roomNumber) formData.append("room_number", roomNumber);

            if (form.querySelector("#dob").value) formData.append("dob", form.querySelector("#dob").value);
            if (form.querySelector("#started_practice").value) formData.append("started_practice", form.querySelector("#started_practice").value);
            if (form.querySelector("#id_number").value) formData.append("id_number", form.querySelector("#id_number").value);

            formData.append("bio", form.querySelector("#bio").value.trim());
            formData.append("experience_detail", form.querySelector("#experience_detail").value.trim());

            // 4. Địa chỉ
            formData.append("address_detail", form.querySelector("#address_detail").value.trim());
            const city = getText("city");
            if (city) formData.append("city", city);
            const dist = getText("district");
            if (dist) formData.append("district", dist);
            const ward = getText("ward");
            if (ward) formData.append("ward", ward);

            // 5. File ảnh
            const fileInput = form.querySelector("#profile_picture");
            if (fileInput.files.length > 0) {
                formData.append("profile_picture", fileInput.files[0]);
            }

            try {
                const token = localStorage.getItem("access");

                let url, method;

                if (id) {
                    // Chế độ SỬA
                    url = `/api/admin/doctors/${id}/`;
                    method = "PATCH";
                } else {
                    // Chế độ THÊM MỚI
                    url = "/api/accounts/register/doctor/";
                    method = "POST";
                }

                const res = await fetch(url, {
                    method: method,
                    headers: { Authorization: `Bearer ${token}` },
                    body: formData,
                });

                if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    throw new Error(err.detail || JSON.stringify(err) || "Lỗi xử lý");
                }

                UI.toast(id ? "Cập nhật thành công!" : "Thêm bác sĩ thành công!");
                UI.closeModals();
                Pages.doctors();
            } catch (e) {
                UI.toast(`Lỗi: ${e.message}`);
            }
        },

        async setupAddressSelectors(oldCity, oldDist, oldWard) {
            const citySel = document.getElementById("city");
            const distSel = document.getElementById("district");
            const wardSel = document.getElementById("ward");

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

            const loadDistricts = async (pCode, selected = null) => {
                distSel.innerHTML = '<option value="">-- Quận/Huyện --</option>';
                if (!pCode) return;
                const data = await AddressAPI.getDistricts(pCode);
                data?.districts?.forEach((d) => {
                    const opt = document.createElement("option");
                    opt.value = d.code;
                    opt.textContent = d.name;
                    opt.dataset.name = d.name;
                    if (d.name === selected) opt.selected = true;
                    distSel.appendChild(opt);
                });
            };

            const loadWards = async (dCode, selected = null) => {
                wardSel.innerHTML = '<option value="">-- Phường/Xã --</option>';
                if (!dCode) return;
                const data = await AddressAPI.getWards(dCode);
                data?.wards?.forEach((w) => {
                    const opt = document.createElement("option");
                    opt.value = w.code;
                    opt.textContent = w.name;
                    opt.dataset.name = w.name;
                    if (w.name === selected) opt.selected = true;
                    wardSel.appendChild(opt);
                });
            };

            // Trigger load nếu có dữ liệu cũ
            if (citySel.value) {
                await loadDistricts(citySel.value, oldDist);
                if (distSel.value) await loadWards(distSel.value, oldWard);
            }

            // Sự kiện change
            citySel.onchange = () => {
                loadDistricts(citySel.value);
                wardSel.innerHTML = '<option value="">-- Phường/Xã --</option>';
            };
            distSel.onchange = () => {
                loadWards(distSel.value);
            };
        },

        async handleSpecialtyForm(id = null) {
            let specData = null;

            if (id) {
                try {
                    specData = await API.fetch(`/specialties/${id}/`);
                } catch (e) {
                    UI.toast("Lỗi lấy dữ liệu", "error");
                    return;
                }
            }

            const formBody = `
                <div style="padding: 0 10px;">
                    <div class="form-group">
                        <label>Tên chuyên khoa <span style="color:red">*</span></label>
                        <input type="text" id="s-name" class="form-control" 
                            value="${specData ? specData.name : ""}" required placeholder="Ví dụ: Tim mạch, Nhi khoa...">
                    </div>
                    
                    <div class="form-group">
                        <label>Ảnh minh họa</label>
                        <label for="s-image" class="image-preview-box specialty-preview-box" id="spec-preview">
                            ${
                                specData && specData.specialty_picture
                                    ? `<img src="${specData.specialty_picture}" style="width:100%; height:100%; object-fit:cover;">`
                                    : `<div style="
                                            display: flex;
                                            flex-direction: column;
                                            justify-content: center;
                                            align-items: center;
                                            height: 100%;
                                            color: #94a3b8;
                                        ">
                                            <i class="fas fa-cloud-upload-alt" style="font-size: 2rem; margin-bottom: 8px;"></i>
                                            Nhấn để tải ảnh lên
                                    </div>`
                            }
                        </label>
                        <input type="file" id="s-image" accept="image/*" style="display: none;">
                    </div>

                    <div class="form-group">
                        <label>Mô tả chi tiết</label>
                        <textarea id="s-desc" class="form-control" rows="5" placeholder="Mô tả về các bệnh lý chuyên khoa này điều trị...">${
                            specData ? specData.description || "" : ""
                        }</textarea>
                    </div>
                </div>
            `;

            const title = id ? "Cập nhật Chuyên Khoa" : "Thêm Chuyên Khoa Mới";
            UI.showModal(title, formBody, () => {});

            const fileInput = document.getElementById("s-image");
            const previewBox = document.getElementById("spec-preview");

            fileInput.onchange = (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                        previewBox.innerHTML = `<img src="${ev.target.result}" style="width:100%; height:100%; object-fit:cover; border-radius:10px;">`;
                        previewBox.style.border = "2px solid #4361ee";
                    };
                    reader.readAsDataURL(file);
                }
            };

            // Xử lý Submit
            const form = document.getElementById("modal-form");
            form.onsubmit = (e) => {
                e.preventDefault();
                this.handleSpecialtySubmit(id, form);
            };
        },

        async handleSpecialtySubmit(id, form) {
            const formData = new FormData();

            // 1. Lấy dữ liệu text
            const name = form.querySelector("#s-name").value.trim();
            const desc = form.querySelector("#s-desc").value.trim();

            formData.append("name", name);
            formData.append("description", desc);

            // 2. Lấy file ảnh
            const fileInput = form.querySelector("#s-image");
            if (fileInput.files.length > 0) {
                formData.append("specialty_picture", fileInput.files[0]);
            }

            try {
                const token = localStorage.getItem("access");
                const url = id ? `/api/admin/specialties/${id}/` : "/api/admin/specialties/";
                const method = id ? "PATCH" : "POST";

                // 3. Gửi Request
                const res = await fetch(url, {
                    method: method,
                    headers: { Authorization: `Bearer ${token}` },
                    body: formData,
                });

                if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    throw new Error(err.detail || JSON.stringify(err) || "Lỗi xử lý chuyên khoa");
                }

                UI.toast(id ? "Cập nhật thành công" : "Thêm mới thành công");
                UI.closeModals();
                Pages.specialties();
            } catch (e) {
                UI.toast(`Lỗi: ${e.message}`);
            }
        },

        setupGlobalEvents() {
            // Close modals
            document.querySelectorAll(".close-modal, .close-confirm").forEach((btn) => {
                btn.addEventListener("click", UI.closeModals);
            });

            // Global Actions Delegation
            document.getElementById("panel-container").addEventListener("click", (e) => {
                const btn = e.target.closest("button");
                if (!btn) return;

                // Delete Action
                if (btn.classList.contains("delete-item")) {
                    const { id, endpoint } = btn.dataset;
                    UI.confirm("Xác nhận xóa", "Hành động này không thể hoàn tác.", async () => {
                        try {
                            await API.fetch(`/${endpoint}/${id}/`, { method: "DELETE" });
                            UI.toast("Xóa thành công");
                            const page = location.hash.slice(1);
                            if (Pages[page]) Pages[page]();
                        } catch (e) {}
                    });
                }

                // Toggle Active Action
                if (btn.classList.contains("toggle-active")) {
                    const { id, endpoint } = btn.dataset;
                    UI.confirm("Đổi trạng thái", "Bạn muốn thay đổi trạng thái hoạt động?", async () => {
                        await API.fetch(`/${endpoint}/${id}/toggle_active/`, { method: "POST" });
                        UI.toast("Cập nhật thành công");
                        const page = location.hash.slice(1);
                        if (Pages[page]) Pages[page]();
                    });
                }

                // Toggle Featured Action
                if (btn.classList.contains("toggle-featured")) {
                    const { id } = btn.dataset;
                    API.fetch(`/doctors/${id}/toggle_featured/`, { method: "POST" }).then(() => {
                        UI.toast("Đã cập nhật trạng thái nổi bật");
                        Pages.doctors();
                    });
                }
            });
        },
    };

    App.init();
})();
