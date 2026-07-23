const wallpapers = [
  {
    id: 1,
    title: 'Nebula Drift',
    type: 'solid',
    image: makeSvgDataUrl('#0f172a', '#7c3aed', 'Nebula Drift'),
    download: 'https://example.com/download/nebula-drift',
    preview: 'https://example.com/preview/nebula-drift',
    appLink: 'https://example.com/app/nebula-drift'
  },
  {
    id: 2,
    title: 'Aurora Pulse',
    type: 'live',
    image: makeSvgDataUrl('#020617', '#38bdf8', 'Aurora Pulse'),
    download: 'https://example.com/download/aurora-pulse',
    preview: 'https://example.com/preview/aurora-pulse',
    appLink: 'https://example.com/app/aurora-pulse'
  },
  {
    id: 3,
    title: 'Cursor Halo',
    type: 'cursor',
    image: 'templates/cursor-trail/cursor_halo_preview.png',
    download: 'downloads/cursor_trail_lively.zip',
    preview: 'templates/cursor-trail/index.html',
    appLink: 'my-wallpaper-app://open?id=3'
  },
  {
    id: 4,
    title: 'Midnight Bloom',
    type: 'solid',
    image: makeSvgDataUrl('#030712', '#ec4899', 'Midnight Bloom'),
    download: 'https://example.com/download/midnight-bloom',
    preview: 'https://example.com/preview/midnight-bloom',
    appLink: 'https://example.com/app/midnight-bloom'
  },
  {
    id: 5,
    title: 'Cosmic Wave',
    type: 'live',
    image: makeSvgDataUrl('#02040a', '#22c55e', 'Cosmic Wave'),
    download: 'https://example.com/download/cosmic-wave',
    preview: 'https://example.com/preview/cosmic-wave',
    appLink: 'https://example.com/app/cosmic-wave'
  },
  {
    id: 6,
    title: 'Trail Sync',
    type: 'cursor',
    image: makeSvgDataUrl('#0b1120', '#8b5cf6', 'Trail Sync'),
    download: 'https://example.com/download/trail-sync',
    preview: 'https://example.com/preview/trail-sync',
    appLink: 'https://example.com/app/trail-sync'
  }
];

const gallery = document.getElementById('gallery');
const menuItems = Array.from(document.querySelectorAll('.menu-item'));
const modal = document.getElementById('modal');
const closeButton = document.getElementById('close-modal');
const modalTitle = document.getElementById('modal-title');
const modalType = document.getElementById('modal-type');
const modalImage = document.getElementById('modal-image');
const downloadLink = document.getElementById('download-link');
const previewLink = document.getElementById('preview-link');
const appLink = document.getElementById('app-link');

let activeCategory = 'all';

function makeSvgDataUrl(background, accent, label) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
      <rect width="1200" height="800" fill="${background}" />
      <circle cx="260" cy="250" r="180" fill="${accent}" opacity="0.35" />
      <circle cx="880" cy="540" r="200" fill="#ffffff" opacity="0.1" />
      <path d="M140 640C320 480 500 420 660 470C820 520 980 630 1080 720" stroke="${accent}" stroke-width="20" fill="none" stroke-linecap="round" />
      <rect x="120" y="120" width="960" height="560" rx="32" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="8" />
      <text x="600" y="390" text-anchor="middle" font-family="Segoe UI, sans-serif" font-size="54" fill="#f8fafc">${label}</text>
    </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function renderGallery() {
  const filtered = activeCategory === 'all'
    ? wallpapers
    : wallpapers.filter((wallpaper) => wallpaper.type === activeCategory);

  gallery.innerHTML = filtered.map((wallpaper) => `
    <article class="card" data-id="${wallpaper.id}">
      <img class="card-image" src="${wallpaper.image}" alt="${wallpaper.title}">
      <div class="card-body">
        <h3 class="card-title">${wallpaper.title}</h3>
        <span class="card-type">${wallpaper.type}</span>
      </div>
    </article>
  `).join('');

  gallery.querySelectorAll('.card').forEach((card) => {
    card.addEventListener('click', () => {
      const wallpaper = wallpapers.find((item) => item.id === Number(card.dataset.id));
      if (wallpaper) openModal(wallpaper);
    });
  });
}

function openModal(wallpaper) {
  modalTitle.textContent = wallpaper.title;
  modalType.textContent = wallpaper.type;
  modalImage.src = wallpaper.image;
  modalImage.alt = `${wallpaper.title} wallpaper preview`;
  downloadLink.href = wallpaper.download;
  previewLink.href = wallpaper.preview;
  appLink.href = wallpaper.appLink || wallpaper.preview;
  modal.classList.remove('hidden');
}

function closeModal() {
  modal.classList.add('hidden');
}

menuItems.forEach((button) => {
  button.addEventListener('click', () => {
    activeCategory = button.dataset.category;
    menuItems.forEach((item) => item.classList.toggle('active', item === button));
    renderGallery();
  });
});

closeButton.addEventListener('click', closeModal);
modal.addEventListener('click', (event) => {
  if (event.target === modal || event.target.classList.contains('modal-backdrop')) {
    closeModal();
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeModal();
});

renderGallery();
