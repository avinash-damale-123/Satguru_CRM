function toggleProfileMenu() {
  const dropdown = document.getElementById('profileDropdown');
  if (!dropdown) return;
  dropdown.classList.toggle('show');
}

window.addEventListener('click', function (e) {
  const menu = document.querySelector('.profile-menu');
  const dropdown = document.getElementById('profileDropdown');
  if (!menu || !dropdown) return;
  if (!menu.contains(e.target)) {
    dropdown.classList.remove('show');
  }
});

function setActiveNav() {
  const links = document.querySelectorAll('.nav-link');
  links.forEach(function (link) {
    const href = link.getAttribute('href');
    if (!href) return;
    if (window.location.pathname.endsWith(href)) {
      link.classList.add('active');
    }
  });
}

window.addEventListener('DOMContentLoaded', setActiveNav);
