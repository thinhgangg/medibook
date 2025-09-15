// Toggling 2 panel ngay trong dashboard
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
    // Điều hướng bằng hash (#overview | #profile)
    const applyHash = () => {
      if (location.hash === '#profile') showPanel('profile');
      else showPanel('overview');
    };
    applyHash();
  
    // Sidebar click
    document.getElementById('nav-overview').addEventListener('click', (e) => { e.preventDefault(); history.replaceState(null, '', '#overview'); showPanel('overview'); });
    document.getElementById('nav-profile').addEventListener('click',  (e) => { e.preventDefault(); history.replaceState(null, '', '#profile');  showPanel('profile');  });
  
    // Nút "Edit Profile" trong card Overview
    const btnGo = document.getElementById('btn-go-profile');
    if (btnGo) btnGo.addEventListener('click', (e) => { e.preventDefault(); history.replaceState(null, '', '#profile'); showPanel('profile'); });
  
    // Nút "Chỉnh sửa hồ sơ" trong panel-profile (tùy bạn trỏ sang trang edit thật)
    const btnEdit = document.getElementById('btn-edit-profile');
    if (btnEdit) btnEdit.addEventListener('click', (e) => {
      e.preventDefault();
      alert('Chuyển đến trang chỉnh sửa hồ sơ bệnh nhân!');
      // ví dụ: window.location.href = "{% url 'patients:edit_profile' %}";
    });
  
    // Nếu user đổi hash thủ công
    window.addEventListener('hashchange', applyHash);
  });
  