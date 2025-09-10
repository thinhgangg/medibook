// ===== CSRF (Django) =====
function getCookie(name) {
    const v = `; ${document.cookie}`.split(`; ${name}=`);
    if (v.length === 2) return decodeURIComponent(v.pop().split(";").shift());
}
const CSRF = getCookie("csrftoken");

// ===== Helpers =====
function toast(msg) {
    const t = document.getElementById("toast");
    if (!t) return;
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.remove("show"), 2200);
}

async function apiFetch(url, opts = {}) {
    const headers = Object.assign({ "X-CSRFToken": CSRF }, opts.headers || {});
    const res = await fetch(url, Object.assign({ headers }, opts));
    if (!res.ok) throw new Error("Request failed");
    return res.status === 204 ? null : res.json().catch(() => null);
}

// Fallback demo (no BE)
async function fakeFetch() {
    return new Promise((r) => setTimeout(r, 400));
}

// ===== Search box =====
(function () {
    const box = document.getElementById("searchBox");
    if (!box) return;
    const input = box.querySelector("input");
    const clear = box.querySelector(".clear");
    const setState = () => box.classList.toggle("has-text", !!input.value);
    input.addEventListener("input", setState);
    clear.addEventListener("click", () => {
        input.value = "";
        setState();
        input.focus();
    });
    setState();

    // submit on Enter
    input.addEventListener("keydown", async (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            const q = input.value.trim();
            const url = window.APPT_API && APPT_API.search ? APPT_API.search(q) : "#";
            try {
                if (url !== "#") await apiFetch(url);
                else await fakeFetch();
                toast("Đã tìm kiếm");
                // TODO: render lại list từ response
            } catch {
                toast("Không thể tìm kiếm");
            }
        }
    });
})();

// ===== Filter popover =====
(function () {
    const btn = document.getElementById("btnFilter");
    const pop = document.getElementById("filterPop");
    if (!btn || !pop) return;

    btn.addEventListener("click", () => {
        const open = !pop.classList.contains("open");
        pop.classList.toggle("open", open);
        btn.setAttribute("aria-expanded", open);
    });
    document.addEventListener("click", (e) => {
        if (!pop.contains(e.target) && !btn.contains(e.target)) {
            pop.classList.remove("open");
            btn.setAttribute("aria-expanded", "false");
        }
    });
    document.getElementById("btnClearFilter").onclick = () => {
        ["fStatus", "fClinic", "fFrom", "fTo"].forEach((id) => {
            const el = document.getElementById(id);
            if (el) el.value = "";
        });
    };
    document.getElementById("btnApplyFilter").onclick = async () => {
        pop.classList.remove("open");
        btn.setAttribute("aria-expanded", "false");
        toast("Đã áp dụng bộ lọc");
        // TODO: call API with current filter values then re-render
    };
})();

// ===== Modal Reschedule (shared) =====
let currentResId = null;
(function () {
    const modal = document.getElementById("resModal");
    if (!modal) return;
    const btnClose = document.getElementById("btnCloseRes");
    const btnSave = document.getElementById("btnSaveRes");
    const rsDate = document.getElementById("rsDate");
    const rsTime = document.getElementById("rsTime");

    function open(id) {
        currentResId = id;
        modal.classList.add("open");
        modal.setAttribute("aria-hidden", "false");
    }
    function close() {
        modal.classList.remove("open");
        modal.setAttribute("aria-hidden", "true");
    }

    btnClose && btnClose.addEventListener("click", close);
    modal.addEventListener("click", (e) => {
        if (e.target === modal) close();
    });

    // open via button
    document.addEventListener("click", (e) => {
        const btn = e.target.closest(".js-reschedule");
        if (!btn) return;
        open(btn.dataset.id);
    });

    btnSave &&
        btnSave.addEventListener("click", async () => {
            const date = rsDate && rsDate.value;
            const time = rsTime && rsTime.value;
            if (!date || !time) {
                toast("Vui lòng chọn ngày & giờ");
                return;
            }
            const url = window.APPT_API && APPT_API.reschedule ? APPT_API.reschedule(currentResId) : "#";
            try {
                if (url !== "#")
                    await apiFetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date, time }) });
                else await fakeFetch();
                toast("Đã đổi lịch");
                close();
                // TODO: update UI for the item
            } catch {
                toast("Không thể đổi lịch");
            }
        });
})();

// ===== Cancel appointment (shared) =====
document.addEventListener("click", async (e) => {
    const btn = e.target.closest(".js-cancel");
    if (!btn) return;
    const id = btn.dataset.id;
    if (!confirm("Bạn muốn hủy lịch này?")) return;
    const url = window.APPT_API && APPT_API.cancel ? APPT_API.cancel(id) : "#";
    try {
        if (url !== "#") await apiFetch(url, { method: "POST" });
        else await fakeFetch();
        toast("Đã hủy lịch");
        // remove item from DOM
        const card = btn.closest(".item");
        if (card) card.remove();
    } catch {
        toast("Không thể hủy lịch");
    }
});

// ===== Tabs (doctor) + forms =====
(function () {
    if (window.APPT_ROLE !== "doctor") return;

    // Tabs
    const tabs = document.querySelector("[data-tabs]");
    if (tabs) {
        tabs.addEventListener("click", (e) => {
            const btn = e.target.closest(".tab-btn");
            if (!btn) return;
            tabs.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
            btn.classList.add("active");
            const target = btn.getAttribute("data-target");
            tabs.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
            const panel = tabs.querySelector(target);
            if (panel) panel.classList.add("active");
        });
    }

    // Timeoff type toggle
    const tfForm = document.getElementById("formTimeoff");
    if (tfForm) {
        const typeSel = tfForm.querySelector('select[name="type"]');
        const rangeBox = tfForm.querySelector("[data-range]");
        const toggleRange = () => (rangeBox.style.display = typeSel.value === "range" ? "grid" : "none");
        toggleRange();
        typeSel.addEventListener("change", toggleRange);

        tfForm.addEventListener("click", async (e) => {
            const btn = e.target.closest('[data-action="add_timeoff"]');
            if (!btn) return;
            e.preventDefault();
            const data = Object.fromEntries(new FormData(tfForm));
            const url = window.APPT_API && APPT_API.addTimeoff ? APPT_API.addTimeoff() : "#";
            try {
                if (url !== "#") await apiFetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
                else await fakeFetch();
                toast("Đã thêm ngày nghỉ");
                tfForm.reset();
                toggleRange();
                // TODO: append new timeoff to list
            } catch {
                toast("Không thể thêm ngày nghỉ");
            }
        });
    }

    // Update working hours
    document.addEventListener("click", async (e) => {
        const btn = e.target.closest('[data-action="update_hours"]');
        if (!btn) return;
        e.preventDefault();
        const card = btn.closest(".item");
        const id = btn.getAttribute("data-id");
        const payload = {
            weekday: card.querySelector('select[name="weekday"]').value,
            start_time: card.querySelector('input[name="start_time"]').value,
            end_time: card.querySelector('input[name="end_time"]').value,
            is_active: card.querySelector('input[name="is_active"]').checked,
        };
        const url = window.APPT_API && APPT_API.updateHours ? APPT_API.updateHours(id) : "#";
        try {
            if (url !== "#") await apiFetch(url, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
            else await fakeFetch();
            toast("Đã lưu giờ làm");
        } catch {
            toast("Không thể lưu giờ làm");
        }
    });
})();
