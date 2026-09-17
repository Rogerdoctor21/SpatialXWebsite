
const toggle = document.querySelector('[data-menu-toggle]');
const nav = document.querySelector('[data-nav]');
if (toggle && nav) {
  toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
  });
  nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    nav.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
  }));
}
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => { if (entry.isIntersecting) entry.target.classList.add('visible'); });
}, { threshold: 0.08 });
document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
const form = document.querySelector('[data-contact-form]');
if (form) {
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const note = form.querySelector('[data-form-note]');
    const button = form.querySelector('button[type="submit"]');
    if (!form.reportValidity()) return;
    const data = Object.fromEntries(new FormData(form).entries());
    note.className = 'form-note';
    note.textContent = 'Sending your inquiry…';
    button.disabled = true;
    const originalLabel = button.textContent;
    button.textContent = 'Sending…';
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data)
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) throw new Error(result.message || 'Unable to send inquiry.');
      form.reset();
      note.className = 'form-note success';
      note.innerHTML = result.delivery === 'email'
        ? 'Thanks — your inquiry has been sent to SpatialX Solutions.'
        : 'Thanks — your inquiry has been received securely. For time-sensitive matters, you can also email <a href="mailto:info@SpatialXSolutions.com">info@SpatialXSolutions.com</a>.';
    } catch (error) {
      note.className = 'form-note error';
      note.innerHTML = 'We could not submit the form right now. Please email <a href="mailto:info@SpatialXSolutions.com">info@SpatialXSolutions.com</a> directly.';
    } finally {
      button.disabled = false;
      button.textContent = originalLabel;
    }
  });
}
if (window.location.hash === '#inquiry') setTimeout(() => document.querySelector('#inquiry input')?.focus(), 450);
