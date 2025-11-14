export const apiBase = "http://127.0.0.1:8000/api";
export let doctorProfile = null;
export let allAppointments = [];
export let availabilityList = [];
export let daysOffList = [];
export let mockNotifications = [];

export const setDoctorProfile = (data) => (doctorProfile = data);
export const setAllAppointments = (data) => (allAppointments = data);
export const setAvailabilityList = (data) => (availabilityList = data);
export const setDaysOffList = (data) => (daysOffList = data);
export const setMockNotifications = (data) => (mockNotifications = data);

export function fetchWithAuth(url, options = {}) {
    const token = localStorage.getItem("access");
    const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {}),
    };
    if (token) headers.Authorization = `Bearer ${token}`;
    return fetch(url, { ...options, headers });
}

export function formatDateVN(dateStr) {
    if (!dateStr) return "Chưa có thông tin";
    const date = new Date(dateStr);
    if (isNaN(date)) return "Chưa có thông tin";
    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const yyyy = date.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
}

export function formatTimeHM(timeStr) {
    if (!timeStr) return "";
    const [h, m] = timeStr.split(":");
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function showErrorModal(message) {
    const modal = document.getElementById("errorModal");
    const messageEl = document.getElementById("errorModalMessage");
    const closeBtn = document.getElementById("errorModalCloseBtn");
    if (!modal || !messageEl || !closeBtn) return;
    messageEl.textContent = message;
    modal.querySelector(".modal-close-btn").onclick = () => (modal.style.display = "none");
    modal.style.display = "flex";
    closeBtn.onclick = () => (modal.style.display = "none");
    modal.onclick = (e) => {
        if (e.target === modal) modal.style.display = "none";
    };
}

export const showLoadingOverlay = (message = "Đang xử lý...", subMessage = "Quá trình này có thể mất một chút thời gian.") => {
    const loadingOverlay = document.getElementById("loadingOverlay");
    if (loadingOverlay) {
        loadingOverlay.querySelector(".loading-text").textContent = message;
        loadingOverlay.querySelector(".loading-subtext").textContent = subMessage;
        loadingOverlay.classList.add("visible");
    }
};

export const hideLoadingOverlay = () => {
    const loadingOverlay = document.getElementById("loadingOverlay");
    if (loadingOverlay) {
        loadingOverlay.classList.remove("visible");
    }
};

export const showToast = (message, type = "", duration = 3000) => {
    const toastContainer = document.getElementById("ToastContainer");
    if (!toastContainer) return;

    const toast = document.createElement("div");
    toast.classList.add("toast");
    if (type === "success") {
        toast.classList.add("success");
    } else if (type === "error") {
        toast.classList.add("error");
    }
    toast.textContent = message;
    toastContainer.appendChild(toast);

    void toast.offsetWidth;

    toast.classList.add("show");

    setTimeout(() => {
        toast.classList.add("hide");
        toast.addEventListener("transitionend", () => {
            toast.remove();
        });
    }, duration);
};

export async function showAppointmentDetailModal(appointmentId) {
    const existing = document.getElementById("appointmentDetailModal");
    if (existing) existing.remove();

    showLoadingOverlay("Đang tải chi tiết lịch hẹn...");

    try {
        const res = await fetchWithAuth(`${apiBase}/appointments/${appointmentId}/`);
        hideLoadingOverlay();

        if (!res.ok) {
            showErrorModal("Không thể tải chi tiết lịch hẹn.");
            return;
        }

        const apt = await res.json();
        const startDate = new Date(apt.start_at);
        const endDate = new Date(apt.end_at);
        apt.start_at = `${startDate.toLocaleDateString("vi-VN")} ${startDate.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}`;
        apt.end_at = `${endDate.toLocaleDateString("vi-VN")} ${endDate.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}`;
        let statusText;
        switch (apt.status) {
            case "PENDING":
                statusText = "Đang chờ xác nhận";
                break;
            case "CONFIRMED":
                statusText = "Đã xác nhận";
                break;
            case "COMPLETED":
                statusText = "Đã hoàn thành";
                break;
            case "CANCELLED":
                statusText = "Đã hủy";
                break;
            default:
                statusText = "Không xác định";
        }

        const modal = document.createElement("div");
        modal.id = "appointmentDetailModal";
        modal.classList.add("modal");

        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Chi tiết lịch hẹn</h2>
                    <span class="modal-close-btn">✕</span>
                </div>

                <div class="modal-body" id="appointment-detail-body">
                    <p><strong>Bác sĩ:</strong> ${apt.doctor_name}</p>
                    <p><strong>Ngày: </strong> ${startDate.toLocaleDateString("vi-VN")}</p>
                    <p><strong>Thời gian:</strong> ${startDate.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })} - 
                    ${endDate.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</p>
                    <p><strong>Trạng thái:</strong> ${statusText}</p>
                    <p><strong>Ghi chú:</strong> ${apt.note || "Không có ghi chú"}</p>
                    <h3 style="margin-top:20px;">Hình ảnh đính kèm</h3>
                    ${
                        apt.images.length === 0
                            ? `<p>Không có hình ảnh đính kèm</p>`
                            : `<div class="detail-images">
                                ${apt.images
                                    .map(
                                        (img) => `
                                    <img src="${img.image}" alt="Ảnh" 
                                         onclick="window.open('${img.image}', '_blank')" />
                                `
                                    )
                                    .join("")}
                               </div>`
                    }
                </div>

                <div class="modal-actions" style="margin-top:20px;">
                    <button id="appointmentDetailCloseBtn" class="btn btn-close">Đóng</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        modal.querySelector(".modal-close-btn").onclick = () => modal.remove();
        modal.style.display = "flex";

        document.getElementById("appointmentDetailCloseBtn").onclick = () => {
            modal.remove();
        };

        modal.onclick = (e) => {
            if (e.target.id === "appointmentDetailModal") modal.remove();
        };
    } catch (err) {
        hideLoadingOverlay();
        showErrorModal("Không thể tải chi tiết lịch hẹn.");
    }
}
