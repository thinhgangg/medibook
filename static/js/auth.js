document.addEventListener("DOMContentLoaded", () => {
  // ====== API ENDPOINTS cho bệnh nhân ======
  const ENDPOINTS = {
    login:    "/api/login/patient/",
    register: "/api/register/patient/"
  };  
  const REDIRECTS = {
    afterLogin:    "/dashboard/",
    afterRegister: "/accounts/login/"
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

  // ====== Login (patient) ======
  const loginForm = document.querySelector("#patient-login-form");
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const payload = {
        username: loginForm.username.value.trim(),
        password: loginForm.password.value
      };
      const { ok, data } = await postJSON(ENDPOINTS.login, payload);
      if (ok) { showAlert("success","Đăng nhập thành công!"); window.location.href = REDIRECTS.afterLogin; }
      else { showAlert("error", data?.detail || "Đăng nhập thất bại."); }
    });
  }

  // ====== Register (patient) ======
  const regForm = document.querySelector("#patient-register-form");
  if (regForm) {
    const btn = regForm.querySelector("button[type=submit]");
    regForm.addEventListener("submit", async (e) => {
      e.preventDefault(); btn.disabled = true;
      const genderVal = regForm.querySelector("input[name='gender']:checked")?.value || "";
      const payload = {
        username:      regForm.username.value.trim(),
        email:         regForm.email.value.trim(),
        password:      regForm.password.value,
        full_name:     regForm.full_name.value.trim(),
        dob:           regForm.dob.value,
        phone_number:  regForm.phone_number.value.trim(),
        gender:        genderVal,   // "male" | "female"
        insurance_no:  regForm.insurance_no.value.trim(),
        address:       regForm.address.value.trim() // New address field added
      };
      const { ok, data } = await postJSON(ENDPOINTS.register, payload);
      btn.disabled = false;
      if (ok) { showAlert("success","Đăng ký thành công! Đăng nhập nhé."); window.location.href = REDIRECTS.afterRegister; }
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
