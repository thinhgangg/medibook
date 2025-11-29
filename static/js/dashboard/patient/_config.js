export const API_BASE_URL = "http://127.0.0.1:8000/api";
export let doctorsMap = {};
export let allAppointments = [];
export let allDoctors = [];
export let mockNotifications = [];

export const setDoctorsMap = (map) => (doctorsMap = map);
export const setAllAppointments = (data) => (allAppointments = data);
export const setAllDoctors = (data) => (allDoctors = data);
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

export function formatDateVN(dateStr) {
    if (!dateStr) return "Chưa có thông tin";
    const date = new Date(dateStr);
    if (isNaN(date)) return "Chưa có thông tin";

    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

export function showErrorModal(message) {
    const modal = document.getElementById("errorModal");

    const messageEl = document.getElementById("errorModalMessage");
    const closeBtn = document.getElementById("errorModalCloseBtn");
    modal.querySelector(".modal-close-btn").onclick = () => modal.remove();

    if (modal && messageEl && closeBtn) {
        messageEl.textContent = message;
        modal.style.display = "flex";

        closeBtn.onclick = () => {
            modal.style.display = "none";
        };

        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.style.display = "none";
            }
        };
    }
}

export async function showReviewModal(appointmentId) {
    const existing = document.getElementById("reviewModal");
    if (existing) existing.remove();

    showLoadingOverlay("Đang kiểm tra đánh giá...");

    try {
        const checkRes = await fetchWithAuth(`${API_BASE_URL}/doctors/appointments/${appointmentId}/review/`, {
            method: "GET",
        });

        hideLoadingOverlay();

        if (checkRes.ok) {
            const data = await checkRes.json();
            showToast("Bạn đã đánh giá cuộc hẹn này rồi.", "error");
            return;
        }
    } catch (err) {
        hideLoadingOverlay();
        if (!String(err).includes("404")) {
            showErrorModal(`Không thể kiểm tra trạng thái đánh giá: ${err.message}`);
            return;
        }
    }

    const modal = document.createElement("div");
    modal.id = "reviewModal";
    modal.classList.add("modal");

    modal.innerHTML = `
    <div class="modal-content review-form">
        <div class="modal-header">  
            <h2>Đánh giá bác sĩ</h2>
            <span class="modal-close-btn">✕</span>
        </div>

        <div class="modal-body">
            <p class="subtitle">Chia sẻ trải nghiệm của bạn để giúp cải thiện dịch vụ</p>

            <div class="form-section">
                <label>Đánh giá của bạn</label>
                <div class="star-rating" id="reviewStars">
                    <span data-value="5">★</span>
                    <span data-value="4">★</span>
                    <span data-value="3">★</span>
                    <span data-value="2">★</span>
                    <span data-value="1">★</span>
                </div>
            </div>

            <div class="form-section">
                <label for="reviewComment">Nhận xét của bạn</label>
                <textarea id="reviewComment" rows="5" placeholder="Chia sẻ chi tiết về trải nghiệm của bạn với bác sĩ..."></textarea>
            </div>
        </div>

        <div class="modal-actions">
            <button id="reviewCloseBtn" class="btn btn-close">Hủy</button>
            <button id="reviewSubmitBtn" class="btn btn-primary">Gửi</button>
        </div>
    </div>
    `;
    document.body.appendChild(modal);
    modal.querySelector(".modal-close-btn").onclick = () => modal.remove();

    let selectedStars = 0;
    const starContainer = modal.querySelector("#reviewStars");

    starContainer.querySelectorAll("span").forEach((star) => {
        star.addEventListener("click", () => {
            selectedStars = parseInt(star.dataset.value);
            starContainer.querySelectorAll("span").forEach((s) => s.classList.remove("selected"));
            star.classList.add("selected");
            let next = star.nextElementSibling;
            while (next) {
                next.classList.add("selected");
                next = next.nextElementSibling;
            }
        });
    });

    modal.style.display = "flex";

    modal.addEventListener("click", (e) => {
        if (e.target.id === "reviewModal" || e.target.id === "reviewCloseBtn") {
            modal.remove();
        }
    });

    modal.querySelector("#reviewSubmitBtn").addEventListener("click", async () => {
        const stars = selectedStars;
        const comment = document.getElementById("reviewComment").value.trim();

        if (!stars || stars < 1) {
            showToast("Vui lòng chọn số sao đánh giá.", "error");
            return;
        }

        try {
            showLoadingOverlay("Đang gửi đánh giá...");
            const res = await fetchWithAuth(`${API_BASE_URL}/doctors/appointments/${appointmentId}/review/`, {
                method: "POST",
                body: JSON.stringify({ stars, comment }),
            });
            hideLoadingOverlay();

            if (res.status === 400) {
                const data = await res.json();
                if (data?.non_field_errors?.[0]) {
                    showToast(data.non_field_errors[0], "error");
                    modal.remove();
                    return;
                }
            }

            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            showToast("Cảm ơn bạn đã đánh giá!", "success");
            modal.remove();

            const button = document.querySelector(`button[data-appointment-id="${appointmentId}"][data-action="review"]`);
            if (button) {
                const wrapper = button.parentElement;
                wrapper.innerHTML = `<span class="has-review">Đã đánh giá</span>`;
            }
        } catch (err) {
            hideLoadingOverlay();
            showErrorModal(`Không thể gửi đánh giá: ${err.message}`);
        }
    });
}

export async function showAppointmentDetailModal(appointmentId) {
    const existing = document.getElementById("appointmentDetailModal");
    if (existing) existing.remove();

    showLoadingOverlay("Đang tải chi tiết lịch hẹn...");

    try {
        const res = await fetchWithAuth(`${API_BASE_URL}/appointments/${appointmentId}/`);
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
        const room_number = doctorsMap[apt.doctor_id]?.room_number || "Chưa cập nhật";
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
                    <p><strong>Phòng:</strong> ${room_number}</p>
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
