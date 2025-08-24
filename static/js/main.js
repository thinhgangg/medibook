document.addEventListener('DOMContentLoaded', function () {
  // ready
});

/* ====== HERO search ====== */
const form = document.getElementById('searchForm');
const input = document.getElementById('searchInput');
if (form && input) {
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const q = input.value.trim();
    if (!q) { input.focus(); return; }
    alert(`Tìm kiếm: ${q}`); // TODO: điều hướng thật
  });
}

/* ====== Header: burger + dropdown a11y ====== */
(function(){
  const burger = document.getElementById('navBurger');
  const mobile = document.getElementById('mobileNav');
  if (burger && mobile){
    burger.addEventListener('click', ()=>{
      const open = mobile.classList.toggle('is-open');
      burger.setAttribute('aria-expanded', String(open));
    });
  }
  mobile?.querySelectorAll('a').forEach(a=>{
    a.addEventListener('click', ()=>{
      mobile.classList.remove('is-open');
      burger?.setAttribute('aria-expanded','false');
    });
  });
  document.querySelectorAll('.has-dropdown > .nav-link').forEach(btn=>{
    const parent = btn.parentElement;
    btn.addEventListener('focus', ()=> btn.setAttribute('aria-expanded','true'));
    btn.addEventListener('blur',  ()=> btn.setAttribute('aria-expanded','false'));
    parent?.addEventListener('mouseenter', ()=> btn.setAttribute('aria-expanded','true'));
    parent?.addEventListener('mouseleave', ()=> btn.setAttribute('aria-expanded','false'));
  });
})();

/* ===== Mock data (Doctors) ===== */
const DOCTORS = [
  { id:1, initials:"LMH", title:"BS. CK2", full_name:"Lê Thị Minh Hồng", specialties:["Nhi khoa"], hospital:"Bệnh viện Nhi Đồng 2" },
  { id:2, initials:"LVT", title:"PGS. TS.", full_name:"Lâm Việt Trung", specialties:["Tiêu hoá","Ngoại tiết niệu"], hospital:"Bệnh viện Chợ Rẫy" },
  { id:3, initials:"NTH", title:"BS. CK2", full_name:"Nguyễn Thị Thu Hà", specialties:["Nhi khoa"], hospital:"BV Nhi Đồng TP.HCM" },
  { id:4, initials:"VDH", title:"BS. CK2", full_name:"Võ Đức Hiếu", specialties:["Ung bướu"], hospital:"BV Ung Bướu TP.HCM" }
];

function renderDoctors(list){
  const rail = document.getElementById('doctorRail');
  if(!rail) return;
  rail.innerHTML = list.map(d=>{
    const tags = (d.specialties||[]).map(t=>`<span class="dm-tag">${t}</span>`).join("");
    return `
      <article class="dm-card" role="option" tabindex="0" data-doctor-id="${d.id}">
        <div class="dm-card__avatar"><span>${d.initials}</span></div>
        <h3 class="dm-card__name">${d.title} ${d.full_name}</h3>
        <div class="dm-card__tags">${tags}</div>
        <div class="dm-card__org">${d.hospital}</div>
        <a href="#" class="dm-btn dm-btn--ghost" data-book="${d.id}">Đặt lịch khám</a>
      </article>
    `;
  }).join("");

  rail.querySelectorAll('[data-book]').forEach(btn=>{
    btn.addEventListener('click',e=>{
      e.preventDefault();
      alert(`(Demo) Đặt lịch bác sĩ ID: ${btn.dataset.book}`);
    });
  });
}

/* ===== Generic rail controls ===== */
function setupRail(railId, progressId){
  const rail = document.getElementById(railId);
  const bar  = document.getElementById(progressId);
  if(!rail || !bar) return;
  const prev = document.querySelector(`.dm-nav--prev[data-for="${railId}"]`);
  const next = document.querySelector(`.dm-nav--next[data-for="${railId}"]`);
  const step = () => Math.min(rail.clientWidth * 0.9, 600);

  function update(){
    const max = rail.scrollWidth - rail.clientWidth;
    const x   = rail.scrollLeft;
    if (prev) prev.disabled = x <= 2;
    if (next) next.disabled = x >= max - 2;
    bar.style.width = `${(x / Math.max(1,max)) * 100}%`;
  }
  prev?.addEventListener('click', ()=> rail.scrollBy({left: -step(), behavior:'smooth'}));
  next?.addEventListener('click', ()=> rail.scrollBy({left:  step(), behavior:'smooth'}));
  rail.addEventListener('scroll', update);
  window.addEventListener('resize', update);
  update();

  // drag to scroll
  let down=false, sx=0, sl=0;
  rail.addEventListener('pointerdown', e=>{ down=true; sx=e.clientX; sl=rail.scrollLeft; rail.setPointerCapture(e.pointerId); });
  rail.addEventListener('pointermove',  e=>{ if(!down) return; rail.scrollLeft = sl - (e.clientX - sx); });
  rail.addEventListener('pointerup',    ()=> down=false);
  rail.addEventListener('pointercancel',()=> down=false);

  // vertical wheel -> horizontal scroll
  rail.addEventListener('wheel', (e)=>{
    if (Math.abs(e.deltaX) < Math.abs(e.deltaY)) {
      rail.scrollLeft += e.deltaY;
      e.preventDefault();
    }
  }, {passive:false});
}

/* ===== Mock data (Hospitals) ===== */
const HOSPITALS = [
  {
    id:'ub', name:'Bệnh viện Ung Bướu TPHCM',
    address:'47 Nguyễn Huy Lượng, Phường Bình Thạnh, TP. Hồ Chí Minh',
    cover:'/static/img/hospitals/ub-cover.jpg',
    logo:'/static/img/hospitals/ub-logo.png',
    hours:['Thứ 2 - Thứ 6: 7h30 - 16h30','Thứ 7 - CN: 7h30 - 11h30']
  },
  {
    id:'175', name:'Bệnh viện Quân Y 175',
    address:'786 Nguyễn Kiệm, P.3, Gò Vấp, TP. Hồ Chí Minh',
    cover:'/static/img/hospitals/175-cover.jpg',
    logo:'/static/img/hospitals/175-logo.png',
    hours:['Thứ 2 - Thứ 6: 7h - 16h30','Thứ 7: 7h - 16h']
  },
  {
    id:'yhct', name:'Bệnh viện Y Học Cổ Truyền TP.HCM',
    address:'179-187 Nam Kỳ Khởi Nghĩa, Q.3, TP. Hồ Chí Minh',
    cover:'/static/img/hospitals/yhct-cover.jpg',
    logo:'/static/img/hospitals/yhct-logo.png',
    hours:['Thứ 2 - Thứ 7: 7h - 19h','Chủ nhật: 7h - 11h30']
  },
  {
    id:'td', name:'Bệnh viện Đa Khoa Thủ Đức',
    address:'29 Phú Châu, TP. Thủ Đức, TP. Hồ Chí Minh',
    cover:'/static/img/hospitals/td-cover.jpg',
    logo:'/static/img/hospitals/td-logo.png',
    hours:['Thứ 2 - Thứ 6: 7h - 16h30']
  }
];

function renderHospitals(list){
  const rail = document.getElementById('hospitalRail');
  if (!rail) return;

  rail.innerHTML = list.map(h => {
    const cover = h.cover ? `<img class="hv-cover" src="${h.cover}" alt="${h.name}">` : `<div class="hv-cover"></div>`;
    const logo  = h.logo  ? `<img src="${h.logo}" alt="${h.name} logo">`
                          : `<span style="font-weight:800;color:#1040C5">${(h.name||'').split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase()}</span>`;
    const hours = (h.hours||[]).map(line => `<div>${line}</div>`).join('');

    return `
      <article class="hv-card" role="option" tabindex="0" data-hospital-id="${h.id}">
        ${cover}
        <div class="hv-body">
          <div class="hv-logo">${logo}</div>
          <h3 class="hv-title">${h.name}</h3>
          <div class="hv-addr">${h.address || ''}</div>
          <div class="hv-hours">${hours}</div>
          <div class="hv-actions">
            <a href="#" class="dm-btn dm-btn--ghost" data-book-hospital="${h.id}">Đặt lịch khám</a>
          </div>
        </div>
      </article>
    `;
  }).join('');

  rail.querySelectorAll('[data-book-hospital]').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      e.preventDefault();
      alert(`(Demo) Đặt lịch bệnh viện ID: ${btn.dataset.bookHospital}`);
    });
  });

  // cập nhật trạng thái nút & progress
  window.dispatchEvent(new Event('resize'));
}

/* ===== Init all ===== */
document.addEventListener('DOMContentLoaded', ()=>{
  // Doctors
  renderDoctors(DOCTORS);
  setupRail('doctorRail','doctorProgress');

  // Hospitals
  renderHospitals(HOSPITALS);
  setupRail('hospitalRail','hospitalProgress');
});
/* ===== Clinics (mock) ===== */
const CLINICS = [
  {
    id:'pk13', name:'Phòng khám Sản Phụ Khoa 13 Cao Thắng',
    address:'13 Cao Thắng, Phường Bàn Cờ',
    cover:'/static/img/clinics/13ct-cover.jpg',
    logo:'/static/img/clinics/13ct-logo.png'
  },
  {
    id:'mymy', name:'Phòng khám Nhi Mỹ Mỹ',
    address:'105/10 Nguyễn Thị Tú, Bình Tân, TP.HCM',
    cover:'/static/img/clinics/mymy-cover.jpg',
    logo:'/static/img/clinics/mymy-logo.png'
  },
  {
    id:'chac', name:'Trung Tâm Chăm Sóc Sức Khoẻ Cộng Đồng - CHAC',
    address:'110A Ngô Quyền, P.8, Q.5, TP.HCM',
    cover:'/static/img/clinics/chac-cover.jpg',
    logo:'/static/img/clinics/chac-logo.png'
  },
  {
    id:'shine', name:'Shine Clinic By TS.BS Trần Ngọc Ánh since 1987',
    address:'06 Trương Quyền, P.6, Q.3, TP.HCM',
    cover:'/static/img/clinics/shine-cover.jpg',
    logo:'/static/img/clinics/shine-logo.png'
  }
];

function renderClinics(list){
  const rail = document.getElementById('clinicRail');
  if(!rail) return;
  rail.innerHTML = list.map(c=>{
    const cover = c.cover ? `<img class="cl-cover" src="${c.cover}" alt="${c.name}">` : `<div class="cl-cover"></div>`;
    const logo  = c.logo  ? `<img src="${c.logo}" alt="${c.name} logo">`
                          : `<span style="font-weight:800;color:#1040C5">${(c.name||'').split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase()}</span>`;
    return `
      <article class="cl-card" role="option" tabindex="0" data-clinic-id="${c.id}">
        ${cover}
        <div class="cl-body">
          <div class="cl-logo">${logo}</div>
          <h3 class="cl-title">${c.name}</h3>
          <div class="cl-addr">${c.address||''}</div>
          <div class="cl-actions">
            <a href="#" class="dm-btn dm-btn--ghost" data-book-clinic="${c.id}">Đặt lịch khám</a>
          </div>
        </div>
      </article>
    `;
  }).join('');

  rail.querySelectorAll('[data-book-clinic]').forEach(btn=>{
    btn.addEventListener('click', e=>{
      e.preventDefault();
      alert(`(Demo) Đặt lịch phòng khám ID: ${btn.dataset.bookClinic}`);
    });
  });

  window.dispatchEvent(new Event('resize'));
}

/* ===== Specialties (mock) ===== */
const SPECIALTIES = [
  { id:'yhct',  name:'Y học cổ truyền',     icon:'/static/img/specs/yhct.png'  },
  { id:'truyen',name:'Truyền nhiễm',        icon:'/static/img/specs/truyen.png'},
  { id:'tim',   name:'Tim mạch',            icon:'/static/img/specs/timmach.png'},
  { id:'lao',   name:'Lão khoa',            icon:'/static/img/specs/laokhoa.png'},
  { id:'chan',  name:'Chấn thương chỉnh hình', icon:'/static/img/specs/chanthuong.png'},
  { id:'hoisuc',name:'Hồi sức - cấp cứu',   icon:'/static/img/specs/hoisuc.png'}
];

function renderSpecialties(list){
  const ul = document.getElementById('specList');
  if(!ul) return;
  ul.innerHTML = list.map(s=>`
    <li class="spec-item">
      <a href="#" class="spec-link" data-spec="${s.id}" aria-label="${s.name}">
        <div class="spec-thumb">
          ${s.icon ? `<img src="${s.icon}" alt="${s.name}">` : ''}
        </div>
        <div class="spec-name">${s.name}</div>
      </a>
    </li>
  `).join('');

  ul.querySelectorAll('[data-spec]').forEach(a=>{
    a.addEventListener('click', e=>{
      e.preventDefault();
      alert('(Demo) Chuyên khoa: ' + a.dataset.spec);
    });
  });
}

/* ===== Init 2 phần mới ===== */
document.addEventListener('DOMContentLoaded', ()=>{
  renderClinics(CLINICS);
  setupRail('clinicRail','clinicProgress');

  renderSpecialties(SPECIALTIES);
});
/* ===== Health News (mock data) ===== */
const NEWS = [
  { id:1, cat:'thuoc',  title:'Thuốc Lomexin 1000 mg là gì? Công dụng, cách dùng và lưu ý khi sử dụng',
    author:'Dược sĩ Bùi Hoàng Ngọc Khánh', updated:'25/12/2024',
    img:'/static/img/news/lomexin-1000.jpg' },
  { id:2, cat:'thuoc',  title:'Lomexin 200 mg là thuốc gì? Công dụng, cách dùng và lưu ý khi dùng',
    author:'Dược sĩ Bùi Hoàng Ngọc Khánh', updated:'24/12/2024',
    img:'/static/img/news/lomexin-200.jpg' },
  { id:3, cat:'thuoc',  title:'Thuốc NextG Cal: Bổ sung canxi và điều trị loãng xương',
    author:'Dược sĩ Trần Văn Thy', updated:'20/04/2022',
    img:'/static/img/news/nextgcal.jpg' },
  { id:4, cat:'thuoc',  title:'Thuốc Velaxin là thuốc gì? Công dụng, cách dùng và lưu ý khi sử dụng',
    author:'Dược sĩ Trần Thị Thùy Linh', updated:'29/05/2024',
    img:'/static/img/news/velaxin.jpg' },
  { id:5, cat:'duoclieu', title:'Cây đinh lăng: vị thuốc quý trong dân gian – công dụng & cách dùng',
    author:'DS. Nguyễn Minh', updated:'12/08/2024',
    img:'/static/img/news/dinhlang.jpg' },
  { id:6, cat:'benh', title:'Tăng huyết áp: nguyên nhân, triệu chứng và hướng điều trị',
    author:'BS. CK2 Phạm H.', updated:'01/09/2024',
    img:'/static/img/news/hypertension.jpg' },
  { id:7, cat:'cothe', title:'Xương khớp: những điều cần biết để giữ gìn hệ vận động',
    author:'ThS. Nguyễn Thảo', updated:'15/10/2024',
    img:'/static/img/news/bones.jpg' },
  { id:8, cat:'duoclieu', title:'Nghệ vàng: hoạt chất curcumin và tác dụng với sức khỏe',
    author:'DS. Bảo Long', updated:'21/07/2024',
    img:'/static/img/news/turmeric.jpg' }
];

let currentCat = 'thuoc';
let newsQuery   = '';

function filterNews(){
  return NEWS.filter(n =>
    (n.cat === currentCat) &&
    (!newsQuery || n.title.toLowerCase().includes(newsQuery))
  );
}

function renderNews(items){
  const rail = document.getElementById('newsRail');
  if(!rail) return;
  rail.innerHTML = items.map(n => `
    <article class="n-card" role="article">
      ${n.img ? `<img class="n-thumb" src="${n.img}" alt="${n.title}">` : `<div class="n-thumb"></div>`}
      <div class="n-body">
        <h3 class="n-title">${n.title}</h3>
        <div class="n-meta">${n.author} · Cập nhật: ${n.updated}</div>
      </div>
    </article>
  `).join('');

  window.dispatchEvent(new Event('resize')); // cập nhật progress/nút
}

function initHealthNewsUI(){
  // Tabs
  document.querySelectorAll('.hn-tab').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      document.querySelectorAll('.hn-tab').forEach(b=>b.classList.remove('is-active'));
      btn.classList.add('is-active');
      currentCat = btn.dataset.cat;
      renderNews(filterNews());
    });
  });

  // Search
  const f = document.getElementById('hnSearchForm');
  const q = document.getElementById('hnQuery');
  if(f && q){
    f.addEventListener('submit', e=>e.preventDefault());
    q.addEventListener('input', ()=>{
      newsQuery = q.value.trim().toLowerCase();
      renderNews(filterNews());
    });
  }

  // First render
  renderNews(filterNews());
  setupRail('newsRail', 'newsProgress');
}

document.addEventListener('DOMContentLoaded', initHealthNewsUI);
