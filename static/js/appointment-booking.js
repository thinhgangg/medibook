// static/js/appointment-booking.js
document.addEventListener("DOMContentLoaded", function () {
    // ===== Helpers =====
    const pad2 = (n) => String(n).padStart(2, "0");
  
    // tạo nhãn hh:mm–hh:mm theo bước phút
    function makeSlotLabel(startHour, stepMin, index) {
      const startTotal = startHour * 60 + index * stepMin;
      const endTotal = startTotal + stepMin;
      const sh = Math.floor(startTotal / 60), sm = startTotal % 60;
      const eh = Math.floor(endTotal / 60),   em = endTotal % 60;
      return `${pad2(sh)}:${pad2(sm)}–${pad2(eh)}:${pad2(em)}`;
    }
  
    // sinh danh sách slot (mặc định disabled), truyền index enable nếu muốn
    let _idSeed = 100;
    function genSlots(startHour, stepMin, count, enabledIdxs = []) {
      const enableSet = new Set(enabledIdxs);
      return Array.from({ length: count }, (_, i) => ({
        id: _idSeed++,
        label: makeSlotLabel(startHour, stepMin, i),
        disabled: !enableSet.has(i),
      }));
    }
  
    // ===== DEMO DATA (có thể thay bằng API thật sau này) =====
    // Bạn có thể đổi enabledIdxs để bật nhiều slot hơn cho sinh động.
    const DAYS = [
      { id: "2025-09-08", title: "Th 2, 08-09", full: true,  slots: [] },
      { id: "2025-09-10", title: "Th 4, 10-09", full: true,  slots: [] },
  
      // Th 6, 12-09: còn đúng 1 khung giờ 19:48–20:00 (bật index 14)
      // 17:00→20:00, bước 12' => 15 slot (0..14)
      { id: "2025-09-12", title: "Th 6, 12-09", full: false, slots: genSlots(17, 12, 15, [14]) },
  
      // Các ngày còn lại: demo 36 khung (bước 5' từ 17:00 đến 20:00) – tất cả disabled để hiển thị xám
      { id: "2025-09-15", title: "Th 2, 15-09", full: false, slots: genSlots(17, 5, 36) },
      { id: "2025-09-17", title: "Th 4, 17-09", full: false, slots: genSlots(17, 5, 36) },
      { id: "2025-09-19", title: "Th 6, 19-09", full: false, slots: genSlots(17, 5, 36) },
    ];
  
    // ===== DOM =====
    const $dateList = document.getElementById("abkDateList");
    const $slotGrid = document.getElementById("abkSlotGrid");
    const $btnPrev  = document.getElementById("abkPrev");
    const $btnNext  = document.getElementById("abkNext");
    const $confirm  = document.getElementById("abkConfirm");
  
    // ===== State =====
    const VISIBLE = 6; // số ngày hiển thị đồng thời
    let start = 0;
    let activeIndex = DAYS.findIndex((d) => !d.full);
    if (activeIndex < 0) activeIndex = 0;
    if (activeIndex >= VISIBLE) start = Math.max(0, activeIndex - 2);
    let selectedSlotId = null;
  
    // ===== Render danh sách ngày =====
    function renderDates() {
      $dateList.innerHTML = "";
      const view = DAYS.slice(start, start + VISIBLE);
  
      view.forEach((d, i) => {
        const idx = start + i;
        const item = document.createElement("button");
        item.type = "button";
        item.className = [
          "abk-date-item",
          d.full ? "full" : "avail",
          idx === activeIndex ? "active" : "",
        ].join(" ");
  
        const availableCount = d.slots.filter((s) => !s.disabled).length;
  
        item.innerHTML = `
          <div class="abk-date-top">${d.title}</div>
          <div class="abk-date-sub">${d.full ? "Đã đầy lịch" : `${availableCount} khung giờ`}</div>
          <div class="abk-date-underline"></div>
        `;
  
        item.addEventListener("click", () => {
          activeIndex = idx;
          selectedSlotId = null;
          renderDates();
          renderSlots();
          updateConfirm();
        });
  
        $dateList.appendChild(item);
      });
  
      $btnPrev.disabled = start <= 0;
      $btnNext.disabled = start + VISIBLE >= DAYS.length;
    }
  
    // ===== Render khung giờ =====
    function renderSlots() {
      $slotGrid.innerHTML = "";
      const day = DAYS[activeIndex];
  
      if (day.full || day.slots.length === 0) {
        $slotGrid.innerHTML = `
          <div class="abk-empty">
            Không còn khung giờ phù hợp
          </div>`;
        return;
      }
  
      day.slots.forEach((s) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "abk-slot" +
                        (s.disabled ? " disabled" : "") +
                        (selectedSlotId === s.id ? " selected" : "");
        btn.textContent = s.label;
  
        if (!s.disabled) {
          btn.addEventListener("click", () => {
            selectedSlotId = s.id;
            renderSlots();
            updateConfirm();
          });
        }
        $slotGrid.appendChild(btn);
      });
    }
  
    // ===== Nút xác nhận =====
    function updateConfirm() {
      if (selectedSlotId) {
        $confirm.disabled = false;
        $confirm.classList.add("enabled");
        $confirm.setAttribute("aria-disabled", "false");
      } else {
        $confirm.disabled = true;
        $confirm.classList.remove("enabled");
        $confirm.setAttribute("aria-disabled", "true");
      }
    }
  
    // ===== Điều hướng ngày =====
    $btnPrev.addEventListener("click", () => {
      if (start > 0) { start--; renderDates(); }
    });
    $btnNext.addEventListener("click", () => {
      if (start + VISIBLE < DAYS.length) { start++; renderDates(); }
    });
  
    // ===== Xác nhận =====
    $confirm.addEventListener("click", () => {
      if (!selectedSlotId) return;
      const d = DAYS[activeIndex];
      const s = d.slots.find((x) => x.id === selectedSlotId);
      alert(`Bạn chọn: ${d.title} • ${s.label}\n(Tiếp theo: gọi API tạo lịch hẹn)`);
    });
  
    // ===== Init =====
    renderDates();
    renderSlots();
    updateConfirm();
  });
  