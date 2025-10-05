document.addEventListener("DOMContentLoaded", function () {
    //region - Helpers
    const pad2 = (n) => String(n).padStart(2, "0");

    const makeSlotLabel = (start, end) => {
        const startDate = new Date(start);
        const endDate = new Date(end);
        const sh = startDate.getHours();
        const sm = startDate.getMinutes();
        const eh = endDate.getHours();
        const em = endDate.getMinutes();
        return `${pad2(sh)}:${pad2(sm)}–${pad2(eh)}:${pad2(em)}`;
    };

    const formatDateTitle = (dateString) => {
        const daysOfWeek = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
        const today = new Date();
        const date = new Date(dateString + "T00:00:00");

        today.setHours(0, 0, 0, 0);
        date.setHours(0, 0, 0, 0);

        const day = pad2(date.getDate());
        const month = pad2(date.getMonth() + 1);
        const dayName = daysOfWeek[date.getDay()];

        if (date.getTime() === today.getTime()) {
            return { top: "Hôm nay", sub: `${day}/${month}` };
        }
        return { top: dayName, sub: `${day}/${month}` };
    };
    //endregion

    //region - DOM Elements
    const dom = {
        stepper: document.getElementById("abkStepper"),
        schedule: {
            item: document.getElementById("abkScheduleItem"),
            header: document.getElementById("abkScheduleHeader"),
            body: document.getElementById("abkScheduleBody"),
        },
        profile: {
            item: document.getElementById("abkProfileItem"),
            header: document.getElementById("abkProfileHeader"),
            body: document.getElementById("abkProfileBody"),
        },
        dateNav: document.querySelector(".abk-date-nav"),
        dateList: document.getElementById("abkDateList"),
        slotGrid: document.getElementById("abkSlotGrid"),
        confirmBtn: document.getElementById("abkConfirmBtn"),
        confirmDetails: document.getElementById("abkConfirmDetails"),
        confirmDate: document.getElementById("abkConfirmDate"),
        confirmTime: document.getElementById("abkConfirmTime"),
        fileLabel: document.getElementById("abkFileLabel"),
        fileInput: document.getElementById("abkFileInput"),
        fileDropArea: document.getElementById("abkFileDropArea"),
        filePreview: document.getElementById("abkFilePreview"),
        notesInput: document.getElementById("abkNotes"),
        loadingOverlay: document.getElementById("loadingOverlay"), // New
        toastContainer: document.getElementById("abkToastContainer"), // New
    };
    //endregion

    //region - State
    let state = {
        currentStep: 1,
        activeDateIndex: 0,
        selectedSlotLabel: null,
        selectedSlotStart: null,
        selectedSlotEnd: null,
        uploadedFiles: [],
        days: [],
    };
    const MAX_FILES = 5;

    const doctorSlug = document.querySelector(".appointment-page")?.dataset.doctorSlug || null;
    const doctorId = document.querySelector(".appointment-page")?.dataset.doctorId || null;
    const token = localStorage.getItem("access");
    //endregion

    //region - UI Utility Functions (New)
    const showLoadingOverlay = (
        message = "Đang xử lý đặt lịch...",
        subMessage = "Quá trình này có thể mất một chút thời gian nếu có tệp đính kèm."
    ) => {
        if (dom.loadingOverlay) {
            dom.loadingOverlay.querySelector(".abk-loading-text").textContent = message;
            dom.loadingOverlay.querySelector(".abk-loading-subtext").textContent = subMessage;
            dom.loadingOverlay.classList.add("visible");
        }
    };

    const hideLoadingOverlay = () => {
        if (dom.loadingOverlay) {
            dom.loadingOverlay.classList.remove("visible");
        }
    };

    const showToast = (message, type = "success", duration = 3000) => {
        if (!dom.toastContainer) return;

        const toast = document.createElement("div");
        toast.classList.add("abk-toast");
        if (type === "error") {
            toast.classList.add("error");
        }
        toast.textContent = message;
        dom.toastContainer.appendChild(toast);

        // Force reflow for transition
        void toast.offsetWidth;

        toast.classList.add("show");

        setTimeout(() => {
            toast.classList.add("hide");
            toast.addEventListener("transitionend", () => {
                toast.remove();
            });
        }, duration);
    };
    //endregion

    //region - API Fetch Function
    async function fetchSlots() {
        if (!doctorSlug) {
            console.error("Doctor slug is missing");
            dom.dateList.innerHTML = `<p class="abk-empty">Không thể tải lịch khám: Thiếu thông tin bác sĩ.</p>`;
            return;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, "0");
        const day = String(today.getDate()).padStart(2, "0");

        const startDate = `${year}-${month}-${day}`;

        const endDateObj = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
        const endYear = endDateObj.getFullYear();
        const endMonth = String(endDateObj.getMonth() + 1).padStart(2, "0");
        const endDay = String(endDateObj.getDate()).padStart(2, "0");
        const endDate = `${endYear}-${endMonth}-${endDay}`;

        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        try {
            dom.dateList.innerHTML = `<p class="abk-empty">Đang tải lịch khám...</p>`;

            const response = await fetch(`/api/doctors/${doctorSlug}/slots/?start=${startDate}&end=${endDate}`, {
                headers: headers,
            });

            if (!response.ok) {
                if (response.status === 401) {
                    window.location.href = `/accounts/login/?next=${encodeURIComponent(window.location.href)}`;
                    return;
                }
                throw new Error("Failed to fetch slots");
            }

            const data = await response.json();

            state.days = data
                .map((day) => ({
                    id: day.date,
                    slots: day.slots
                        .filter((slot) => new Date(slot.start_at) >= new Date())
                        .map((slot) => ({
                            label: makeSlotLabel(slot.start_at, slot.end_at),
                            start_at: slot.start_at,
                            end_at: slot.end_at,
                            is_booked: slot.is_booked || false,
                        })),
                    formattedTitle: formatDateTitle(day.date),
                }))
                .filter((day) => {
                    const dayDate = new Date(day.id + "T00:00:00");
                    dayDate.setHours(0, 0, 0, 0);
                    return dayDate.getTime() >= today.getTime();
                })
                .sort((a, b) => new Date(a.id) - new Date(b.id));
        } catch (error) {
            console.error("Error fetching slots:", error);
            state.days = [];
            dom.dateList.innerHTML = `<p class="abk-empty">Không thể tải lịch khám. Vui lòng thử lại.</p>`;
        }
    }
    //endregion

    //region - Render Functions
    const renderStepper = () => {
        const steps = [
            { id: 1, text: "Thời gian khám" },
            { id: 2, text: "Bệnh nhân" },
        ];
        dom.stepper.innerHTML = steps
            .map((step, index) => {
                if (!state.selectedSlotLabel && step.id === 2) return ""; // Only show step 2 if a slot is selected
                const isCompleted = state.currentStep > step.id;
                const isActive = state.currentStep === step.id;
                const statusClass = isCompleted ? "completed" : isActive ? "active" : "";
                const line = index < steps.length - 1 && state.selectedSlotLabel ? '<div class="abk-stepper-line"></div>' : "";
                return `<div class="abk-step ${statusClass}">
                            <div class="abk-step-icon">${isCompleted ? '<i class="fa fa-check"></i>' : step.id}</div>
                            <span class="abk-step-text">${step.text}</span>
                        </div>${line}`;
            })
            .join("");
    };

    const toggleAccordion = (stepToOpen) => {
        state.currentStep = stepToOpen;
        if (state.currentStep === 1) {
            dom.schedule.item.classList.add("active");
            dom.profile.item.classList.remove("active");
            dom.profile.item.style.display = "none";
            state.uploadedFiles = []; // Clear files when going back to step 1
            renderFilePreview();
        } else {
            dom.schedule.item.classList.remove("active");
            dom.profile.item.classList.add("active");
            dom.profile.item.style.display = "block";
        }
        renderStepper();
    };

    const renderDates = () => {
        if (state.days.length === 0) {
            dom.dateList.innerHTML = `<p class="abk-empty">Hiện tại chưa có lịch khám nào.</p>`;
            return;
        }
        dom.dateList.innerHTML = state.days
            .map((day, index) => {
                const isDisabled = day.slots.every((slot) => slot.is_booked) ? "disabled" : "";
                return `
                <button type="button" class="abk-date-item ${index === state.activeDateIndex ? "active" : ""} ${isDisabled}"
                    data-index="${index}" ${isDisabled ? "disabled" : ""}>
                    <div class="abk-date-top">${day.formattedTitle.top}</div>
                    <div class="abk-date-sub">${day.formattedTitle.sub}</div>
                </button>
            `;
            })
            .join("");
    };

    const renderSlots = () => {
        if (state.days.length === 0) {
            dom.slotGrid.innerHTML = `<div class="abk-empty">Hiện tại chưa có lịch khám nào.</div>`;
            return;
        }
        const day = state.days[state.activeDateIndex];
        if (!day || day.slots.length === 0) {
            dom.slotGrid.innerHTML = `<div class="abk-empty">Không có khung giờ phù hợp</div>`;
            return;
        }
        dom.slotGrid.innerHTML = day.slots
            .map((slot) => {
                const isDisabled = slot.is_booked ? "disabled" : "";
                const tooltip = slot.is_booked ? 'title="Khung giờ đã được đặt"' : "";
                const selectedClass = slot.label === state.selectedSlotLabel ? "selected" : "";
                return `
                    <button type="button" class="abk-slot ${selectedClass} ${isDisabled}"
                        data-label="${slot.label}" data-start="${slot.start_at}" data-end="${slot.end_at}" ${tooltip} ${
                    slot.is_booked ? "disabled" : ""
                }>
                        ${slot.label}
                    </button>
                `;
            })
            .join("");
    };

    const updateSidebar = () => {
        if (state.selectedSlotLabel && state.days.length > 0) {
            dom.confirmDetails.style.display = "flex";
            const day = state.days[state.activeDateIndex];
            dom.confirmDate.textContent = `${day.formattedTitle.top}, ${day.formattedTitle.sub}`;
            dom.confirmTime.textContent = state.selectedSlotLabel;
            dom.confirmBtn.disabled = false;
        } else {
            dom.confirmDetails.style.display = "none";
            dom.confirmBtn.disabled = true;
        }
    };

    const handleFiles = (files) => {
        for (const file of files) {
            if (state.uploadedFiles.length < MAX_FILES) {
                state.uploadedFiles.push(file);
            } else {
                showToast(`Chỉ được tải lên tối đa ${MAX_FILES} tệp.`, "error");
                break;
            }
        }
        renderFilePreview();
    };

    const renderFilePreview = () => {
        dom.filePreview.innerHTML = state.uploadedFiles
            .map((file, index) => {
                const displayEl = file.type.startsWith("image/")
                    ? `<img src="${URL.createObjectURL(file)}" class="abk-file-thumbnail" alt="File thumbnail">`
                    : `<div class="abk-file-icon"><i class="fa fa-file-text-o"></i></div>`;
                return `<div class="abk-file-item">${displayEl}<button type="button" class="abk-file-remove" data-index="${index}">&times;</button></div>`;
            })
            .join("");
        dom.fileLabel.textContent = `Tệp tin đính kèm (${state.uploadedFiles.length}/${MAX_FILES})`;
        dom.fileInput.value = ""; // Clear file input
    };
    //endregion

    //region - Preselect from URL
    const preselectSlotFromUrl = () => {
        const params = new URLSearchParams(window.location.search);
        const startAt = params.get("start_at");
        const endAt = params.get("end_at");
        const notes = params.get("notes");

        if (startAt && endAt) {
            state.days.forEach((day, index) => {
                const slot = day.slots.find((slot) => slot.start_at === startAt && slot.end_at === endAt);
                if (slot) {
                    state.activeDateIndex = index;
                    state.selectedSlotLabel = slot.label;
                    state.selectedSlotStart = slot.start_at;
                    state.selectedSlotEnd = slot.end_at;
                    renderDates();
                    renderSlots();
                    updateSidebar();
                    toggleAccordion(2); // Move to patient info step
                    if (notes) {
                        dom.notesInput.value = decodeURIComponent(notes);
                    }
                }
            });
        }
    };
    //endregion

    //region - Event Handlers
    const handleDateClick = (e) => {
        const target = e.target.closest(".abk-date-item");
        if (target && !target.hasAttribute("disabled")) {
            state.activeDateIndex = parseInt(target.dataset.index);
            state.selectedSlotLabel = null;
            state.selectedSlotStart = null;
            state.selectedSlotEnd = null;
            updateSidebar();
            renderDates();
            renderSlots();
        }
    };

    const handleSlotClick = (e) => {
        const target = e.target.closest(".abk-slot");
        if (target && !target.hasAttribute("disabled")) {
            state.selectedSlotLabel = target.dataset.label;
            state.selectedSlotStart = target.dataset.start;
            state.selectedSlotEnd = target.dataset.end;
            dom.profile.item.style.display = "block";
            renderSlots();
            updateSidebar();
            toggleAccordion(2);
        }
    };

    const handleRemoveFile = (e) => {
        const removeButton = e.target.closest(".abk-file-remove");
        if (removeButton) {
            state.uploadedFiles.splice(parseInt(removeButton.dataset.index), 1);
            renderFilePreview();
        }
    };

    const handleFileDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        handleFiles(e.dataTransfer.files);
    };

    const handleConfirmAppointment = async (e) => {
        e.preventDefault();
        if (!state.selectedSlotLabel || !doctorSlug) {
            showToast("Vui lòng chọn khung giờ và đảm bảo thông tin bác sĩ hợp lệ.", "error");
            return;
        }

        dom.confirmBtn.disabled = true;
        dom.confirmBtn.textContent = "Đang xử lý...";
        showLoadingOverlay(); // Show loading overlay

        if (!window.isAuthenticated) {
            const notes = dom.notesInput.value;
            const bookingUrl = `/appointments/new/?doctor=${encodeURIComponent(doctorSlug)}&start_at=${encodeURIComponent(
                state.selectedSlotStart
            )}&end_at=${encodeURIComponent(state.selectedSlotEnd)}${notes ? `&notes=${encodeURIComponent(notes)}` : ""}`;
            const loginUrl = `/accounts/login/?next=${encodeURIComponent(bookingUrl)}`;
            setTimeout(() => {
                hideLoadingOverlay(); // Hide loading overlay before redirect
                window.location.href = loginUrl;
            }, 500);
            return;
        }

        if (!token) {
            showToast("Không tìm thấy token xác thực. Vui lòng đăng nhập lại.", "error");
            const bookingUrl = `/appointments/new/?doctor=${encodeURIComponent(doctorSlug)}&start_at=${encodeURIComponent(
                state.selectedSlotStart
            )}&end_at=${encodeURIComponent(state.selectedSlotEnd)}`;
            hideLoadingOverlay(); // Hide loading overlay
            window.location.href = `/accounts/login/?next=${encodeURIComponent(bookingUrl)}`;
            return;
        }

        try {
            // 1. Create appointment (JSON)
            const appointmentResponse = await fetch("/api/appointments/", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    doctor: doctorId,
                    start_at: state.selectedSlotStart,
                    end_at: state.selectedSlotEnd,
                    note: dom.notesInput.value,
                }),
            });

            if (!appointmentResponse.ok) {
                if (appointmentResponse.status === 401) {
                    localStorage.removeItem("access");
                    showToast("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.", "error");
                    const bookingUrl = `/appointments/new/?doctor=${encodeURIComponent(doctorSlug)}&start_at=${encodeURIComponent(
                        state.selectedSlotStart
                    )}&end_at=${encodeURIComponent(state.selectedSlotEnd)}`;
                    hideLoadingOverlay(); // Hide loading overlay
                    window.location.href = `/accounts/login/?next=${encodeURIComponent(bookingUrl)}`;
                    return;
                }
                const errorData = await appointmentResponse.json().catch(() => ({}));
                throw new Error(`Lỗi khi đặt lịch: ${errorData.detail || "Vui lòng thử lại."}`);
            }

            const appointment = await appointmentResponse.json();

            // 2. Upload image files (if any)
            if (state.uploadedFiles.length > 0) {
                showLoadingOverlay();
                for (const file of state.uploadedFiles) {
                    const formData = new FormData();
                    formData.append("appointment", appointment.id);
                    formData.append("image", file);

                    const imageUploadResponse = await fetch("/api/appointment-images/", {
                        method: "POST",
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                        body: formData,
                    });

                    if (!imageUploadResponse.ok) {
                        console.warn(`Failed to upload file ${file.name}. Continuing with other files.`);
                        showToast(`Không thể tải lên tệp: ${file.name}`, "error");
                    }
                }
            }

            // 3. Reset UI, show toast, and redirect
            showToast("Đặt lịch thành công!", "success");
            state.currentStep = 1;
            state.selectedSlotLabel = null;
            state.selectedSlotStart = null;
            state.selectedSlotEnd = null;
            state.uploadedFiles = [];
            dom.notesInput.value = "";
            renderStepper();
            renderDates();
            renderSlots();
            updateSidebar();
            renderFilePreview();
            toggleAccordion(1);

            setTimeout(() => {
                window.location.href = `/dashboard/`;
            }, 1500);
        } catch (error) {
            console.error("Error creating appointment:", error);
            showToast(error.message || "Lỗi khi đặt lịch. Vui lòng thử lại.", "error");
        } finally {
            dom.confirmBtn.disabled = false;
            dom.confirmBtn.textContent = "Xác nhận đặt khám";
            hideLoadingOverlay();
        }
    };
    //endregion

    //region - Event Listeners
    const addEventListeners = () => {
        dom.schedule.header.addEventListener("click", () => toggleAccordion(1));
        dom.profile.header.addEventListener("click", () => toggleAccordion(2));

        dom.dateList.addEventListener("click", handleDateClick);
        dom.slotGrid.addEventListener("click", handleSlotClick);

        dom.dateNav.addEventListener("wheel", (e) => {
            e.preventDefault();
            dom.dateNav.scrollLeft += e.deltaY;
        });

        dom.fileDropArea.addEventListener("click", () => dom.fileInput.click());
        dom.fileInput.addEventListener("change", (e) => handleFiles(e.target.files));
        dom.filePreview.addEventListener("click", handleRemoveFile);

        ["dragenter", "dragover", "dragleave"].forEach((evt) =>
            dom.fileDropArea.addEventListener(evt, (e) => {
                e.preventDefault();
                e.stopPropagation();
                // Add/remove visual feedback if desired
            })
        );
        dom.fileDropArea.addEventListener("drop", handleFileDrop);

        dom.confirmBtn.addEventListener("click", handleConfirmAppointment);
    };
    //endregion

    //region - Initialization
    const init = async () => {
        if (!doctorSlug) {
            dom.dateList.innerHTML = `<p class="abk-empty">Không thể tải lịch khám: Thiếu thông tin bác sĩ.</p>`;
            return;
        }

        await fetchSlots();
        dom.profile.item.style.display = "none"; // Hide profile section initially
        renderStepper();
        renderDates();
        renderSlots();
        preselectSlotFromUrl();
        dom.schedule.item.classList.add("active"); // Ensure schedule step is active by default
        updateSidebar();
        addEventListeners();
    };

    init();
    //endregion
});
