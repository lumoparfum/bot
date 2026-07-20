// Mobil menü aç/kapa
const menuBtn = document.querySelector('.nav-menu-btn');
const navLinks = document.querySelector('.nav-links');
if (menuBtn && navLinks) {
  menuBtn.addEventListener('click', () => {
    navLinks.classList.toggle('open');
  });
  navLinks.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => navLinks.classList.remove('open'));
  });
}

// Bekleme listesi formu - Firebase'e (waitlist koleksiyonu) yazar.
// firebase-init.js modülü, window.stop82Waitlist fonksiyonunu ekler.
document.querySelectorAll('.waitlist-form').forEach((form) => {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = form.querySelector('input[type="email"]');
    const button = form.querySelector('button');
    const email = input.value.trim();
    if (!email) return;

    button.disabled = true;
    button.textContent = 'Gönderiliyor...';

    try {
      await window.stop82Waitlist(email);
      form.style.display = 'none';
      const success = form.parentElement.querySelector('.form-success');
      if (success) success.classList.add('visible');
    } catch (err) {
      button.disabled = false;
      button.textContent = 'Haber Ver';
      alert('Bir şeyler ters gitti, birazdan tekrar dener misin?');
    }
  });
});
