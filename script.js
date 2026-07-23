let wallpapers = [];

async function initGallery() {
    try {
        const response = await fetch('wallpapers.json');
        wallpapers = await response.json();
        renderWallpapers(wallpapers);
        setupCategoryFilters();
    } catch (error) {
        console.error("Error loading wallpapers from database JSON:", error);
    }
}

function renderWallpapers(items) {
    const gallery = document.getElementById('gallery');
    if (!gallery) return;

    gallery.innerHTML = '';

    if (items.length === 0) {
        gallery.innerHTML = `<p style="color: #aaa; grid-column: 1/-1;">No wallpapers found in this category.</p>`;
        return;
    }

    items.forEach(wp => {
        const card = document.createElement('div');
        card.className = 'wallpaper-card';
        card.innerHTML = `
            <div class="card-content" style="background: rgba(255,255,255,0.05); padding: 1.25rem; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);">
                <h3 style="color: #fff; margin-bottom: 0.5rem;">${wp.title}</h3>
                <p style="color: #aaa; font-size: 0.9rem; margin-bottom: 0.25rem;">Type: <span style="color: #818cf8;">${wp.type}</span></p>
                <p style="color: #aaa; font-size: 0.9rem; margin-bottom: 1rem;">By ${wp.author}</p>
                <div style="display: flex; gap: 0.5rem;">
                    <a href="${wp.preview}" class="btn" style="padding: 0.4rem 0.8rem; background: #6366f1; color: white; border-radius: 6px; text-decoration: none; font-size: 0.85rem;">Preview</a>
                    <a href="${wp.download}" class="btn" style="padding: 0.4rem 0.8rem; background: rgba(255,255,255,0.1); color: white; border-radius: 6px; text-decoration: none; font-size: 0.85rem;">Download</a>
                </div>
            </div>
        `;
        gallery.appendChild(card);
    });
}

function setupCategoryFilters() {
    const buttons = document.querySelectorAll('.menu-item');
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            buttons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const category = btn.getAttribute('data-category');
            if (category === 'all') {
                renderWallpapers(wallpapers);
            } else {
                const filtered = wallpapers.filter(w => w.type === category);
                renderWallpapers(filtered);
            }
        });
    });
}

document.addEventListener('DOMContentLoaded', initGallery);