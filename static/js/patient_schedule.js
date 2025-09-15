document.querySelector('.logout').addEventListener('click', function() {
    if (confirm('Bạn có chắc chắn muốn đăng xuất?')) {
      alert('Đăng xuất thành công!');
      window.location.href = '/login';
    }
  });
  
  document.querySelectorAll('.appointment-form input').forEach(input => {
    input.addEventListener('focus', function() {
      this.placeholder = '';
    });
    input.addEventListener('blur', function() {
      if (!this.value) {
        this.placeholder = this.getAttribute('data-placeholder') || this.defaultPlaceholder;
      }
    });
  });
  
  document.querySelector('.buttons').addEventListener('click', function(e) {
    if (e.target.tagName === 'BUTTON') {
      alert(`Bạn đã chọn: ${e.target.textContent}`);
    }
  });