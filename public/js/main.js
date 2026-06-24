const menuToggle = document.querySelector('[data-menu-toggle]');
const nav = document.querySelector('[data-primary-nav]');

if (menuToggle && nav) {
  menuToggle.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('open');
    menuToggle.setAttribute('aria-expanded', String(isOpen));
  });
}

document.querySelectorAll('[data-year]').forEach(el => {
  el.textContent = new Date().getFullYear();
});

const contactForm = document.querySelector('[data-contact-form]');
if (contactForm) {
  contactForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const status = contactForm.querySelector('[data-form-status]');
    const submit = contactForm.querySelector('button[type="submit"]');
    status.textContent = 'Sending...';
    submit.disabled = true;

    const payload = Object.fromEntries(new FormData(contactForm).entries());

    try {
      const response = await fetch('/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      status.textContent = result.message || 'Thanks. Your message was received.';
      if (response.ok) contactForm.reset();
    } catch (error) {
      status.textContent = 'Something went wrong. Please email hello@spatialxsolutions.com.';
    } finally {
      submit.disabled = false;
    }
  });
}

const tabs = document.querySelectorAll('[data-filter]');
const articleCards = document.querySelectorAll('[data-category]');

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const filter = tab.dataset.filter;
    tabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');

    articleCards.forEach(card => {
      const category = card.dataset.category;
      card.style.display = filter === 'all' || category === filter ? '' : 'none';
    });
  });
});
