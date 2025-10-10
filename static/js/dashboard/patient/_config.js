// static/js/patient/_config.js

export const API_BASE_URL = "http://127.0.0.1:8000/api";

// Global state variables (mutable)
export let doctorsMap = {};
export let allAppointments = [];
export let allDoctors = [];
export let mockNotifications = [];

// State setters
export const setDoctorsMap = (map) => (doctorsMap = map);
export const setAllAppointments = (data) => (allAppointments = data);
export const setAllDoctors = (data) => (allDoctors = data);
export const setMockNotifications = (data) => (mockNotifications = data);

export function fetchWithAuth(url, options = {}) {
    const token = localStorage.getItem("access");
    return fetch(url, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...options.headers,
        },
    });
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
