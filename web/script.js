// Kaydirinca beliren bolumler
const revealEls = document.querySelectorAll('.reveal');
if (revealEls.length && 'IntersectionObserver' in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
  );
  revealEls.forEach((el) => observer.observe(el));
} else {
  revealEls.forEach((el) => el.classList.add('visible'));
}

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
