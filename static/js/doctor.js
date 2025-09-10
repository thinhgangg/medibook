// Toggle Yêu thích
const favBtn = document.getElementById('btn-fav');
if (favBtn) {
  favBtn.addEventListener('click', () => {
    const pressed = favBtn.getAttribute('aria-pressed') === 'true';
    favBtn.setAttribute('aria-pressed', (!pressed).toString());
  });
}

// Read more
const area = document.querySelector('.readmore');
const btnMore = document.getElementById('btn-readmore');
if (area && btnMore) {
  area.classList.add('clamped');
  btnMore.addEventListener('click', () => {
    area.classList.toggle('clamped');
    btnMore.textContent = area.classList.contains('clamped') ? '…Xem thêm' : 'Thu gọn';
  });
}

// Select slot
document.querySelectorAll('.slot').forEach(b=>{
  b.addEventListener('click', ()=>{
    document.querySelectorAll('.slot').forEach(x=>x.classList.remove('active'));
    b.classList.add('active');
  });
});

// Horizontal scroller arrows
const track = document.getElementById('date-track');
const prev = document.querySelector('.scroller .prev');
const next = document.querySelector('.scroller .next');
if (track && prev && next) {
  const step = 180;
  prev.addEventListener('click', ()=> track.scrollBy({left: -step, behavior:'smooth'}));
  next.addEventListener('click', ()=> track.scrollBy({left: step, behavior:'smooth'}));
}
