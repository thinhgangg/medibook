import {
    apiBase,
    setDoctorProfile,
    setAllAppointments,
    setAvailabilityList,
    setDaysOffList,
    setMockNotifications,
    fetchWithAuth,
    showErrorModal,
    allAppointments,
    availabilityList,
    daysOffList,
    mockNotifications,
} from "./_config.js";

import {
    renderProfileSummary,
    renderDoctorProfilePanel,
    renderAllAppointments,
    renderOverviewAppointments,
    renderOverviewStats,
    renderAvailabilityList,
    renderAvailabilityOverview,
    renderDaysOffList,
    generateMockNotifications,
    renderNotifications,
} from "./doctor-dashboard.js";

export async function fetchDoctorProfile() {
    try {
        const res = await fetchWithAuth(`${apiBase}/doctors/me/`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setDoctorProfile(data);
        renderProfileSummary(data);
        renderDoctorProfilePanel(data);
    } catch (err) {
        console.error("fetchDoctorProfile error:", err);
        document.getElementById("profile-error-overview")?.classList.remove("hidden");
        document.getElementById("profile-error-overview").innerHTML = `<p class="error-message">Không thể tải hồ sơ bác sĩ: ${err.message}</p>`;
        document.getElementById("profile-error")?.classList.remove("hidden");
        document.getElementById("profile-error").innerHTML = `<p class="error-message">Không thể tải hồ sơ bác sĩ: ${err.message}</p>`;
        document.getElementById("profile-summary")?.classList.remove("skeleton-bars");
    }
}

export async function loadAppointments(forceReload = false) {
    const loading = document.getElementById("all-appointments-loading");
    const content = document.getElementById("all-appointments-content");
    const err = document.getElementById("all-appointments-error");

    if (!forceReload && allAppointments.length > 0) {
        renderAllAppointments();
        renderOverviewAppointments();
        renderOverviewStats();
        return;
    }

    if (loading) loading.classList.remove("hidden");
    if (content) content.classList.add("hidden");
    if (err) err.classList.add("hidden");

    try {
        const res = await fetchWithAuth(`${apiBase}/appointments/`);

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();

        setAllAppointments(Array.isArray(data.results) ? data.results : data);

        renderAllAppointments();
        renderOverviewAppointments();
        renderOverviewStats();
    } catch (error) {
        console.error("loadAppointments error:", error);
        if (loading) loading.classList.add("hidden");
        if (err) {
            err.classList.remove("hidden");
            err.innerHTML = `<p>Lỗi tải lịch: ${error.message}</p>`;
        }
        document.getElementById("stats-overview").innerHTML = `<div class="no-data">Không thể tải thống kê.</div>`;
    }
}

export async function loadAvailability(forceReload = false) {
    const loading = document.getElementById("availability-loading");
    const content = document.getElementById("availability-content");
    const err = document.getElementById("availability-error");

    if (!forceReload && availabilityList.length > 0) {
        renderAvailabilityList();
        renderAvailabilityOverview(availabilityList);
        return;
    }

    if (loading) loading.classList.remove("hidden");
    if (content) content.classList.add("hidden");
    if (err) err.classList.add("hidden");

    try {
        const res = await fetchWithAuth(`${apiBase}/doctors/availability/`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        let data = await res.json();
        setAvailabilityList(Array.isArray(data.results) ? data.results : data);
        renderAvailabilityList();
        renderAvailabilityOverview(availabilityList);
    } catch (error) {
        console.error("loadAvailability error:", error);
        if (loading) loading.classList.add("hidden");
        if (err) {
            const eEl = document.getElementById("availability-error");
            eEl.classList.remove("hidden");
            eEl.innerHTML = `<p>Lỗi tải lịch làm việc: ${error.message}</p>`;
        }
        document.getElementById("availability-overview").innerHTML = `<div class="no-data">Lỗi tải lịch.</div>`;
    }
}

export async function loadDaysOff(forceReload = false) {
    const loading = document.getElementById("days-off-loading");
    const content = document.getElementById("days-off-content");
    const err = document.getElementById("days-off-error");

    if (!forceReload && daysOffList.length > 0) {
        renderDaysOffList();
        return;
    }

    if (loading) loading.classList.remove("hidden");
    if (content) content.classList.add("hidden");
    if (err) err.classList.add("hidden");

    try {
        const res = await fetchWithAuth(`${apiBase}/doctors/days-off/`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        let data = await res.json();
        setDaysOffList(Array.isArray(data.results) ? data.results : data);
        renderDaysOffList();
    } catch (error) {
        console.error("loadDaysOff error:", error);
        if (loading) loading.classList.add("hidden");
        const eEl = document.getElementById("days-off-error");
        if (eEl) {
            eEl.classList.remove("hidden");
            eEl.innerHTML = `<p>Lỗi tải ngày nghỉ: ${error.message}</p>`;
        }
    }
}

export function loadNotifications(forceReload = false) {
    const loading = document.getElementById("notifications-loading");
    const container = document.getElementById("notifications-content");
    if (!loading || !container) return;
    loading.classList.remove("hidden");
    container.classList.add("hidden");
    document.getElementById("notifications-error")?.classList.add("hidden");

    setTimeout(() => {
        if (!mockNotifications.length || forceReload) generateMockNotifications();
        renderNotifications(mockNotifications);
    }, 400);
}
