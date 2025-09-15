// Toggle 2 panel trong Doctor Dashboard
function showPanel(name) {
    const over = document.getElementById('panel-overview');
    const prof = document.getElementById('panel-profile');
    const navOver = document.getElementById('nav-overview');
    const navProf = document.getElementById('nav-profile');
  
    if (name === 'profile') {
      over.classList.add('hidden');
      prof.classList.remove('hidden');
      navOver.classList.remove('is-active');
      navProf.classList.add('is-active');
    } else {
      prof.classList.add('hidden');
      over.classList.remove('hidden');
      navProf.classList.remove('is-active');
      navOver.classList.add('is-active');
    }
  }
  
  document.addEventListener('DOMContentLoaded', () => {
    const applyHash = () => {
      if (location.hash === '#profile') showPanel('profile');
      else showPanel('overview');
    };
    applyHash();
  
    // sidebar
    document.getElementById('nav-overview').addEventListener('click', (e) => { e.preventDefault(); history.replaceState(null, '', '#overview'); showPanel('overview'); });
    document.getElementById('nav-profile').addEventListener('click',  (e) => { e.preventDefault(); history.replaceState(null, '', '#profile');  showPanel('profile');  });
  
    // nút ở card Overview
    const btnGo = document.getElementById('btn-go-profile');
    if (btnGo) btnGo.addEventListener('click', (e) => { e.preventDefault(); history.replaceState(null, '', '#profile'); showPanel('profile'); });
  
    // nút chỉnh sửa hồ sơ trong panel profile
    const btnEdit = document.getElementById('btn-edit-doctor');
    if (btnEdit) btnEdit.addEventListener('click', (e) => {
      e.preventDefault();
      alert('Đi đến trang chỉnh sửa hồ sơ bác sĩ!');
      // ví dụ: window.location.href = "{% url 'doctors:edit_profile' %}";
    });
  
    // hash thay đổi thủ công
    window.addEventListener('hashchange', applyHash);
  });
  