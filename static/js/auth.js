document.addEventListener("DOMContentLoaded", () => {
    // ====== API ENDPOINTS (đổi cho khớp backend của bạn) ======
    const ENDPOINTS = {
      patientLogin:    "/api/login/patient/",
      doctorLogin:     "/api/login/doctor/",
      patientRegister: "/api/register/patient/",
      doctorRegister:  "/api/register/doctor/"
    };
    const REDIRECTS = {
      afterPatientLogin:   "/dashboard/",
      afterDoctorLogin:    "/dashboard/",
      afterPatientRegister:"/accounts/login/",
      afterDoctorRegister: "/accounts/login/"
    };
  
    // ====== CSRF for Django ======
    function getCookie(name) {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return decodeURIComponent(parts.pop().split(";").shift());
    }
    const csrfToken = getCookie("csrftoken");
  
    // ====== Toggle password eye ======
    document.querySelectorAll(".toggle-eye").forEach(btn => {
      const input = document.querySelector(btn.getAttribute("data-target"));
      if (!input) return;
      btn.addEventListener("click", () => {
        input.type = input.type === "password" ? "text" : "password";
      });
    });
  
    // ====== In-page switch (patient <-> doctor) ======
    function initSwitchers(){
      document.querySelectorAll("[data-auth-group]").forEach(group=>{
        group.addEventListener("click", (e)=>{
          const sw = e.target.closest("[data-switch]");
          if (!sw) return;
          e.preventDefault();
          const target = sw.getAttribute("data-switch"); // "patient" | "doctor"
          group.querySelectorAll("[data-view]").forEach(v=>{
            v.classList.toggle("hidden", v.getAttribute("data-view") !== target);
          });
          // focus first input of shown view
          const first = group.querySelector(`[data-view="${target}"] input`);
          first && first.focus();
        });
      });
    }
    initSwitchers();
  
    // ====== Alerts ======
    const showAlert = (type, text) => {
      let box = document.querySelector(".django-messages");
      if (!box) {
        box = document.createElement("ul");
        box.className = "django-messages";
        document.body.prepend(box);
      }
      const li = document.createElement("li");
      li.className = `msg ${type}`;
      li.textContent = text;
      box.appendChild(li);
      setTimeout(()=>{ li.style.opacity="0"; }, 4500);
      setTimeout(()=>{ li.remove(); }, 5200);
    };
  
    // ====== POST JSON ======
    async function postJSON(url, payload) {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(csrfToken ? {"X-CSRFToken": csrfToken} : {})
        },
        body: JSON.stringify(payload)
      });
      let data = null;
      try { data = await res.json(); } catch(_e){}
      return { ok: res.ok, status: res.status, data };
    }
  
    // ====== Patient Login ======
    const patientLoginForm = document.querySelector("#patient-login-form");
    if (patientLoginForm) {
      patientLoginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const payload = {
          username: patientLoginForm.username.value.trim(),
          password: patientLoginForm.password.value
        };
        const { ok, data } = await postJSON(ENDPOINTS.patientLogin, payload);
        if (ok) { showAlert("success","Đăng nhập thành công!"); window.location.href = REDIRECTS.afterPatientLogin; }
        else { showAlert("error", data?.detail || "Đăng nhập thất bại."); }
      });
    }
  
    // ====== Doctor Login ======
    const doctorLoginForm = document.querySelector("#doctor-login-form");
    if (doctorLoginForm) {
      doctorLoginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const payload = {
          username: doctorLoginForm.username.value.trim(),
          password: doctorLoginForm.password.value
        };
        const { ok, data } = await postJSON(ENDPOINTS.doctorLogin, payload);
        if (ok) { showAlert("success","Đăng nhập bác sĩ thành công!"); window.location.href = REDIRECTS.afterDoctorLogin; }
        else { showAlert("error", data?.detail || "Đăng nhập thất bại."); }
      });
    }
  
    // ====== Patient Register ======
    const patientRegForm = document.querySelector("#patient-register-form");
    if (patientRegForm) {
      const btn = patientRegForm.querySelector("button[type=submit]");
      patientRegForm.addEventListener("submit", async (e) => {
        e.preventDefault(); btn.disabled = true;
        const genderVal = patientRegForm.querySelector("input[name='gender']:checked")?.value || "";
        const payload = {
          username:      patientRegForm.username.value.trim(),
          email:         patientRegForm.email.value.trim(),
          password:      patientRegForm.password.value,
          full_name:     patientRegForm.full_name.value.trim(),
          dob:           patientRegForm.dob.value,
          phone_number:  patientRegForm.phone_number.value.trim(),
          gender:        genderVal,   // "male" | "female"
          insurance_no:  patientRegForm.insurance_no.value.trim()
        };
        const { ok, data } = await postJSON(ENDPOINTS.patientRegister, payload);
        btn.disabled = false;
        if (ok) { showAlert("success","Đăng ký thành công! Đăng nhập nhé."); window.location.href = REDIRECTS.afterPatientRegister; }
        else { showAlert("error", data?.detail || Object.values(data||{}).join(" • ") || "Đăng ký thất bại."); }
      });
    }
  
    // ====== Doctor Register ======
    const doctorRegForm = document.querySelector("#doctor-register-form");
    if (doctorRegForm) {
      const btn = doctorRegForm.querySelector("button[type=submit]");
      doctorRegForm.addEventListener("submit", async (e) => {
        e.preventDefault(); btn.disabled = true;
        const genderVal = doctorRegForm.querySelector("input[name='gender']:checked")?.value || "";
        const payload = {
          username:     doctorRegForm.username.value.trim(),
          email:        doctorRegForm.email.value.trim(),
          password:     doctorRegForm.password.value,
          full_name:    doctorRegForm.full_name.value.trim(),
          phone_number: doctorRegForm.phone_number.value.trim(),
          gender:       genderVal,   // "male" | "female"
          specialty:    doctorRegForm.specialty.value.trim(),
          bio:          doctorRegForm.bio.value.trim(),
          hospital:     doctorRegForm.hospital.value.trim()
        };
        const { ok, data } = await postJSON(ENDPOINTS.doctorRegister, payload);
        btn.disabled = false;
        if (ok) { showAlert("success","Đăng ký bác sĩ thành công!"); window.location.href = REDIRECTS.afterDoctorRegister; }
        else { showAlert("error", data?.detail || Object.values(data||{}).join(" • ") || "Đăng ký thất bại."); }
      });
    }
  
    // ====== Aside Slider ======
    (function initSlider(scope=document){
      scope.querySelectorAll("[data-slider]").forEach(slider=>{
        const slides = slider.querySelectorAll(".slide");
        const dotsBox = slider.querySelector("[data-dots]");
        let i = 0, timer;
  
        function renderDots(){
          if (!dotsBox) return;
          dotsBox.innerHTML = Array.from(slides,(_,k)=>`<button aria-label="Ảnh ${k+1}"></button>`).join("");
          dotsBox.querySelectorAll("button").forEach((b,idx)=>{
            b.addEventListener("click", ()=>{ go(idx); reset(); });
          });
        }
        function markActive(){
          slides.forEach((s,idx)=> s.classList.toggle("is-active", idx===i));
          if (dotsBox) dotsBox.querySelectorAll("button").forEach((b,idx)=> b.classList.toggle("active", idx===i));
        }
        function go(n){ i = (n+slides.length)%slides.length; markActive(); }
        function next(){ go(i+1); }
        function prev(){ go(i-1); }
        function reset(){ clearInterval(timer); timer = setInterval(next, 4000); }
  
        slider.querySelector("[data-next]")?.addEventListener("click", ()=>{ next(); reset(); });
        slider.querySelector("[data-prev]")?.addEventListener("click", ()=>{ prev(); reset(); });
  
        let startX=0;
        slider.addEventListener("touchstart", e=>{ startX = e.touches[0].clientX; }, {passive:true});
        slider.addEventListener("touchend", e=>{
          const dx = e.changedTouches[0].clientX - startX;
          if (Math.abs(dx) > 40){ dx < 0 ? next() : prev(); reset(); }
        });
  
        renderDots(); markActive(); reset();
      });
    })();
  });
  