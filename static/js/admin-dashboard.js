// File: static/js/admin-dashboard.js
(() => {
    const apiBase = "/api/admin";

    // --- UTILITY FUNCTIONS ---
    const fetchAPI = async (endpoint, options = {}) => {
        const token = localStorage.getItem("access");
        if (!token) throw new Error("Authentication credentials were not provided.");

        const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...options.headers };
        const response = await fetch(`${apiBase}${endpoint}`, { ...options, headers });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: `Request failed: ${response.statusText}` }));
            throw new Error(errorData.detail);
        }
        return response.status === 204 ? null : response.json();
    };

    const hideAllModals = () => document.querySelectorAll(".modal").forEach((modal) => modal.classList.add("hidden"));

    const showModal = (id, title, bodyContent) => {
        const modal = document.getElementById(id);
        if (title) modal.querySelector("h2").textContent = title;
        if (bodyContent) modal.querySelector(".modal-body, #form-modal-body").innerHTML = bodyContent;
        modal.classList.remove("hidden");
        return modal;
    };

    const showConfirm = (title, body, onConfirm) => {
        const modal = document.getElementById("confirm-modal");
        modal.querySelector("#confirm-modal-title").textContent = title;
        modal.querySelector("#confirm-modal-body").textContent = body;
        modal.classList.remove("hidden");
        const okBtn = modal.querySelector("#confirm-ok-btn");
        const newOkBtn = okBtn.cloneNode(true);
        okBtn.parentNode.replaceChild(newOkBtn, okBtn);
        newOkBtn.addEventListener("click", () => {
            onConfirm();
            hideAllModals();
        });
    };

    // --- RENDER FUNCTIONS FOR EACH PANEL ---
    const renderers = {
        async overview() {
            const panel = document.getElementById("panel-overview");
            panel.innerHTML = `<div class="card"><p>Đang tải thống kê...</p></div>`;
            try {
                const [stats, appointmentsStats] = await Promise.all([fetchAPI("/statistics/"), fetchAPI("/appointments/statistics/")]);

                // SỬA LỖI: Thêm data-target để xác định trang cần chuyển hướng
                panel.innerHTML = `
                    <div class="stats-grid">
                        <div class="stat-card" data-target="users"><div class="icon"><i class="fas fa-users"></i></div><div class="stat-info"><div class="value">${
                            stats.total_users || 0
                        }</div><div class="label">Tổng Users</div></div></div>
                        <div class="stat-card" data-target="doctors"><div class="icon"><i class="fas fa-user-md"></i></div><div class="stat-info"><div class="value">${
                            stats.total_doctors || 0
                        }</div><div class="label">Tổng Bác sĩ</div></div></div>
                        <div class="stat-card" data-target="reviews"><div class="icon"><i class="fas fa-star"></i></div><div class="stat-info"><div class="value">${
                            stats.total_reviews || 0
                        }</div><div class="label">Tổng Đánh giá</div></div></div>
                        <div class="stat-card" data-target="appointments"><div class="icon"><i class="fas fa-calendar-check"></i></div><div class="stat-info"><div class="value">${
                            stats.total_appointments || 0
                        }</div><div class="label">Tổng Lịch hẹn</div></div></div>
                    </div>
                    <div class="card">
                        <div class="section-header"><h1>Thống kê Lịch hẹn theo Trạng thái</h1></div>
                        <div class="chart-container"><canvas id="appointmentsChart"></canvas></div>
                    </div>`;

                new Chart(document.getElementById("appointmentsChart").getContext("2d"), {
                    type: "doughnut",
                    data: {
                        labels: Object.keys(appointmentsStats),
                        datasets: [
                            {
                                data: Object.values(appointmentsStats),
                                backgroundColor: ["#FFCE56", "#36A2EB", "#4CAF50", "#FF6384", "#9966FF"],
                                hoverOffset: 4,
                            },
                        ],
                    },
                    options: { responsive: true, maintainAspectRatio: false },
                });
            } catch (e) {
                panel.innerHTML = `<div class="card error-message"><p>Không thể tải thống kê: ${e.message}</p></div>`;
            }
        },

        async users() {
            const panel = document.getElementById("panel-users");
            panel.innerHTML = `<div class="card"><div class="section-header"><h1>Quản lý Users</h1></div><div class="table-wrapper"><table class="table"><thead><tr><th>Họ tên</th><th>Email</th><th>Vai trò</th><th>Trạng thái</th><th>Hành động</th></tr></thead><tbody><tr><td colspan="5">Đang tải...</td></tr></tbody></table></div></div>`;
            try {
                const data = await fetchAPI("/users/");
                const users = data.results || data;
                const tableBody = panel.querySelector("tbody");
                tableBody.innerHTML =
                    users
                        .map(
                            (u) => `
                    <tr>
                        <td>${u.full_name || "N/A"}</td><td>${u.email}</td><td>${u.role || "N/A"}</td>
                        <td><span class="status-badge status-${u.is_active}">${u.is_active ? "Hoạt động" : "Vô hiệu"}</span></td>
                        <td class="action-buttons"><button class="btn-icon toggle-active-btn" data-id="${
                            u.id
                        }" data-type="users" title="Đổi trạng thái"><i class="fas fa-power-off"></i></button></td>
                    </tr>`
                        )
                        .join("") || `<tr><td colspan="5">Không có user nào.</td></tr>`;
            } catch (e) {
                panel.querySelector("tbody").innerHTML = `<tr><td colspan="5" class="error-message">${e.message}</td></tr>`;
            }
        },

        async doctors() {
            const panel = document.getElementById("panel-doctors");
            panel.innerHTML = `<div class="card"><div class="section-header"><h1>Quản lý Bác sĩ</h1></div><div class="table-wrapper"><table class="table"><thead><tr><th>Họ tên</th><th>Chuyên khoa</th><th>Nổi bật</th><th>Trạng thái</th><th>Hành động</th></tr></thead><tbody><tr><td colspan="5">Đang tải...</td></tr></tbody></table></div></div>`;
            try {
                const data = await fetchAPI("/doctors/");
                const doctors = data.results || data;
                const tableBody = panel.querySelector("tbody");
                tableBody.innerHTML =
                    doctors
                        .map(
                            (d) => `
                    <tr>
                        <td>${d.user?.full_name || "N/A"}</td>
                        <td>${d.specialty?.name || "Chưa có"}</td>
                        <td><span class="status-badge status-${d.is_featured}">${d.is_featured ? "Có" : "Không"}</span></td>
                        <td><span class="status-badge status-${d.user?.is_active}">${d.user?.is_active ? "Hoạt động" : "Vô hiệu"}</span></td>
                        <td class="action-buttons">
                            <button class="btn-icon toggle-featured-btn" data-id="${d.id}" title="Đổi nổi bật"><i class="fas fa-star"></i></button>
                            <button class="btn-icon toggle-active-btn" data-id="${
                                d.id
                            }" data-type="doctors" title="Đổi trạng thái"><i class="fas fa-power-off"></i></button>
                        </td>
                    </tr>`
                        )
                        .join("") || `<tr><td colspan="5">Không có bác sĩ nào.</td></tr>`;
            } catch (e) {
                panel.querySelector("tbody").innerHTML = `<tr><td colspan="5" class="error-message">${e.message}</td></tr>`;
            }
        },

        async appointments() {
            const panel = document.getElementById("panel-appointments");
            panel.innerHTML = `<div class="card"><div class="section-header"><h1>Quản lý Lịch hẹn</h1></div><div class="table-wrapper"><table class="table"><thead><tr><th>Bệnh nhân</th><th>Bác sĩ</th><th>Ngày hẹn</th><th>Trạng thái</th></tr></thead><tbody><tr><td colspan="4">Đang tải...</td></tr></tbody></table></div></div>`;
            try {
                const data = await fetchAPI("/appointments/");
                const appointments = data.results || data;
                const tableBody = panel.querySelector("tbody");
                tableBody.innerHTML =
                    appointments
                        .map(
                            (a) => `
                    <tr>
                        <td>${a.patient_name || "N/A"}</td><td>${a.doctor_name || "N/A"}</td>
                        <td>${new Date(a.start_at).toLocaleString("vi-VN")}</td>
                        <td><span class="status-badge status-${a.status.toLowerCase()}">${a.status}</span></td>
                    </tr>`
                        )
                        .join("") || `<tr><td colspan="4">Không có lịch hẹn nào.</td></tr>`;
            } catch (e) {
                panel.querySelector("tbody").innerHTML = `<tr><td colspan="4" class="error-message">${e.message}</td></tr>`;
            }
        },

        async specialties() {
            const panel = document.getElementById("panel-specialties");
            panel.innerHTML = `<div class="card"><div class="section-header"><h1>Quản lý Chuyên khoa</h1><button id="add-specialty-btn" class="btn-primary"><i class="fas fa-plus"></i> Thêm mới</button></div><div class="table-wrapper"><table class="table"><thead><tr><th>Tên</th><th>Mô tả</th><th>Trạng thái</th><th>Hành động</th></tr></thead><tbody><tr><td colspan="4">Đang tải...</td></tr></tbody></table></div></div>`;
            try {
                const data = await fetchAPI("/specialties/");
                const specialties = data.results || data;
                panel.querySelector("tbody").innerHTML =
                    specialties
                        .map(
                            (s) => `
                    <tr>
                        <td>${s.name}</td><td>${s.description ? s.description.substring(0, 70) + "..." : ""}</td>
                        <td><span class="status-badge status-${s.is_active}">${s.is_active ? "Hoạt động" : "Ẩn"}</span></td>
                        <td class="action-buttons">
                            <button class="btn-icon edit-btn" data-id="${s.id}" data-type="specialties"><i class="fas fa-edit"></i></button>
                            <button class="btn-icon delete-btn" data-id="${s.id}" data-type="specialties"><i class="fas fa-trash"></i></button>
                        </td>
                    </tr>`
                        )
                        .join("") || `<tr><td colspan="4">Chưa có chuyên khoa nào.</td></tr>`;
            } catch (e) {
                panel.querySelector("tbody").innerHTML = `<tr><td colspan="4" class="error-message">${e.message}</td></tr>`;
            }
        },

        async reviews() {
            const panel = document.getElementById("panel-reviews");
            panel.innerHTML = `<div class="card"><div class="section-header"><h1>Quản lý Đánh giá</h1></div><div class="table-wrapper"><table class="table"><thead><tr><th>Bệnh nhân</th><th>Bác sĩ</th><th>Số sao</th><th>Nội dung</th><th>Trạng thái</th><th>Hành động</th></tr></thead><tbody><tr><td colspan="6">Đang tải...</td></tr></tbody></table></div></div>`;
            try {
                const data = await fetchAPI("/reviews/");
                const reviews = data.results || data;
                panel.querySelector("tbody").innerHTML =
                    reviews
                        .map(
                            (r) => `
                    <tr>
                        <td>${r.patient_name || "N/A"}</td><td>${r.doctor_name || "N/A"}</td>
                        <td>${"⭐".repeat(r.stars)}</td>
                        <td>${r.comment.substring(0, 50)}...</td><td><span class="status-badge status-${r.is_active}">${
                                r.is_active ? "Hiện" : "Ẩn"
                            }</span></td>
                        <td class="action-buttons"><button class="btn-icon toggle-active-btn" data-id="${
                            r.id
                        }" data-type="reviews"><i class="fas fa-eye-slash"></i></button></td>
                    </tr>`
                        )
                        .join("") || `<tr><td colspan="6">Không có đánh giá nào.</td></tr>`;
            } catch (e) {
                panel.querySelector("tbody").innerHTML = `<tr><td colspan="6" class="error-message">${e.message}</td></tr>`;
            }
        },

        async reports() {
            const panel = document.getElementById("panel-reports");
            panel.innerHTML = `<div class="card"><div class="section-header"><h1>Báo cáo & Thống kê</h1></div><div class="filter-controls"><div class="form-group"><label>Khoảng thời gian</label><select id="report-range"><option value="this_month">Tháng này</option><option value="last_month">Tháng trước</option><option value="last_7_days">7 ngày qua</option></select></div></div><div id="report-content"></div></div>`;
            document.getElementById("report-range").onchange = (e) => App.fetchAndProcessReportData(e.target.value);
            App.fetchAndProcessReportData("this_month");
        },
    };

    const App = {
        init() {
            this.setupEventListeners();
            this.handleRouting();
        },
        setupEventListeners() {
            window.addEventListener("popstate", () => this.handleRouting());
            document.querySelectorAll(".sidebar-nav-item").forEach((nav) =>
                nav.addEventListener("click", (e) => {
                    e.preventDefault();
                    const panelName = nav.getAttribute("href").slice(1);
                    history.pushState({ panel: panelName }, "", `#${panelName}`);
                    this.showPanel(panelName);
                })
            );
            document.querySelectorAll(".modal-close-btn, #confirm-cancel-btn").forEach((btn) => btn.addEventListener("click", hideAllModals));

            // SỬA LỖI: Thêm sự kiện click cho các thẻ thống kê
            document.querySelector(".content").addEventListener("click", (e) => {
                const button = e.target.closest("button");
                const statCard = e.target.closest(".stat-card");

                if (statCard) {
                    const targetPanel = statCard.dataset.target;
                    if (targetPanel) {
                        history.pushState({ panel: targetPanel }, "", `#${targetPanel}`);
                        this.showPanel(targetPanel);
                    }
                    return;
                }

                if (!button) return;

                const { id, type } = button.dataset;
                if (button.id === "add-specialty-btn") this.handleSpecialtyForm();
                else if (button.classList.contains("edit-btn")) this.handleSpecialtyForm(id);
                else if (button.classList.contains("delete-btn")) this.handleSpecialtyDelete(id);
                else if (button.classList.contains("toggle-active-btn")) this.handleToggleActive(id, type);
                else if (button.classList.contains("toggle-featured-btn")) this.handleToggleFeatured(id);
            });

            document.getElementById("modal-form").addEventListener("submit", (e) => {
                e.preventDefault();
                this.handleSpecialtySubmit();
            });
        },
        handleRouting() {
            this.showPanel(location.hash.slice(1) || "overview");
        },
        showPanel(name) {
            document.querySelectorAll(".panel, .sidebar-nav-item.active").forEach((el) => el.classList.remove("active"));
            document.querySelectorAll(".panel").forEach((p) => p.classList.add("hidden"));

            const panel = document.getElementById(`panel-${name}`);
            const nav = document.getElementById(`nav-${name}`);

            if (panel) panel.classList.remove("hidden");
            if (nav) nav.classList.add("active");

            if (renderers[name]) renderers[name]();
        },
        async handleToggleActive(id, type) {
            showConfirm("Xác nhận", "Bạn có chắc muốn thay đổi trạng thái mục này?", async () => {
                try {
                    await fetchAPI(`/${type}/${id}/toggle_active/`, { method: "POST" });
                    renderers[type]();
                } catch (e) {
                    alert(`Lỗi: ${e.message}`);
                }
            });
        },
        async handleToggleFeatured(id) {
            showConfirm("Xác nhận", "Bạn có chắc muốn thay đổi trạng thái nổi bật?", async () => {
                try {
                    await fetchAPI(`/doctors/${id}/toggle_featured/`, { method: "POST" });
                    renderers.doctors();
                } catch (e) {
                    alert(`Lỗi: ${e.message}`);
                }
            });
        },
        async handleSpecialtyForm(id = null) {
            const formBody = `<div class="form-group"><label for="name">Tên</label><input type="text" id="name" required></div><div class="form-group"><label for="description">Mô tả</label><textarea id="description"></textarea></div>`;
            const modal = showModal("form-modal", id ? "Sửa Chuyên khoa" : "Thêm Chuyên khoa", formBody);
            const form = modal.querySelector("form");
            form.querySelector("#edit-id").value = id || "";
            form.reset();
            if (id) {
                const specialty = await fetchAPI(`/specialties/${id}/`);
                form.querySelector("#name").value = specialty.name;
                form.querySelector("#description").value = specialty.description;
            }
        },
        async handleSpecialtySubmit() {
            const form = document.getElementById("modal-form");
            const id = form.querySelector("#edit-id").value;
            const data = { name: form.querySelector("#name").value, description: form.querySelector("#description").value };
            try {
                await fetchAPI(`/specialties/${id ? id + "/" : ""}`, { method: id ? "PATCH" : "POST", body: JSON.stringify(data) });
                hideAllModals();
                renderers.specialties();
            } catch (e) {
                alert(`Lỗi: ${e.message}`);
            }
        },
        handleSpecialtyDelete(id) {
            showConfirm("Xác nhận xóa", "Bạn có chắc muốn xóa chuyên khoa này?", async () => {
                try {
                    await fetchAPI(`/specialties/${id}/`, { method: "DELETE" });
                    renderers.specialties();
                } catch (e) {
                    alert(`Lỗi: ${e.message}`);
                }
            });
        },
        async fetchAndProcessReportData(rangeKey) {
            const contentDiv = document.getElementById("report-content");
            contentDiv.innerHTML = `<p>Đang tải dữ liệu báo cáo...</p>`;
            try {
                const data = await fetchAPI("/appointments/");
                const allAppointments = data.results || data;
                const { start, end } = this.getDateRange(rangeKey);
                const filteredAppointments = allAppointments.filter((a) => new Date(a.start_at) >= start && new Date(a.start_at) <= end);
                contentDiv.innerHTML = `
                    <div class="stats-grid"><div class="stat-card"><div class="icon"><i class="fas fa-calendar-check"></i></div><div class="stat-info"><div class="value">${filteredAppointments.length}</div><div class="label">Tổng lịch hẹn</div></div></div></div>
                    <div class="card" style="margin-top: 2rem;"><div class="section-header"><h2>Lịch hẹn theo ngày</h2></div><div class="chart-container"><canvas id="appointmentsTrendChart"></canvas></div></div>
                    <div class="card" style="margin-top: 2rem;"><div class="section-header"><h2>Lịch hẹn theo Bác sĩ</h2></div><div class="chart-container"><canvas id="appointmentsByDoctorChart"></canvas></div></div>`;

                const appointmentsByDate = filteredAppointments.reduce((acc, curr) => {
                    const date = new Date(curr.start_at).toISOString().split("T")[0];
                    acc[date] = (acc[date] || 0) + 1;
                    return acc;
                }, {});
                this.renderChart("appointmentsTrendChart", "line", Object.keys(appointmentsByDate), "Số lịch hẹn", Object.values(appointmentsByDate));

                const appointmentsByDoctor = filteredAppointments.reduce((acc, curr) => {
                    const doctorName = curr.doctor_name || "Chưa xác định";
                    acc[doctorName] = (acc[doctorName] || 0) + 1;
                    return acc;
                }, {});
                this.renderChart(
                    "appointmentsByDoctorChart",
                    "bar",
                    Object.keys(appointmentsByDoctor),
                    "Số lịch hẹn",
                    Object.values(appointmentsByDoctor)
                );
            } catch (e) {
                contentDiv.innerHTML = `<p class="error-message">Lỗi tải dữ liệu báo cáo: ${e.message}</p>`;
            }
        },
        getDateRange(rangeKey) {
            const now = new Date();
            let start = new Date();
            let end = new Date();
            if (rangeKey === "this_month") {
                start = new Date(now.getFullYear(), now.getMonth(), 1);
                end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            }
            if (rangeKey === "last_month") {
                start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                end = new Date(now.getFullYear(), now.getMonth(), 0);
            }
            if (rangeKey === "last_7_days") {
                start = new Date();
                start.setDate(now.getDate() - 6);
            }
            end.setHours(23, 59, 59, 999);
            start.setHours(0, 0, 0, 0);
            return { start, end };
        },
        renderChart(canvasId, type, labels, label, data) {
            const canvas = document.getElementById(canvasId);
            if (!canvas) return;
            const ctx = canvas.getContext("2d");
            if (canvas.chartInstance) canvas.chartInstance.destroy();
            canvas.chartInstance = new Chart(ctx, {
                type,
                data: {
                    labels,
                    datasets: [
                        {
                            label,
                            data,
                            backgroundColor: type === "bar" ? "rgba(37, 99, 235, 0.6)" : "rgba(37, 99, 235, 0.1)",
                            borderColor: "#2563eb",
                            fill: type === "line",
                            tension: 0.4,
                        },
                    ],
                },
                options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } },
            });
        },
    };

    App.init();
})();
