let wallpapers = [];
let activeCategory = 'all';
let currentUser = null;
let pendingVerificationCode = null;

const STORAGE_KEYS = {
    users: 'wallpaper-hub-users',
    currentUser: 'wallpaper-hub-current-user',
};

async function initGallery() {
    try {
        const response = await fetch('wallpapers.json');
        const data = await response.json();
        wallpapers = Array.isArray(data) ? data : [];
        renderWallpapers(getFilteredWallpapers());
        setupCategoryFilters();
        setupPreviewModal();
        await ensureSeedUsers();
        setupAuthModal();
        restoreUserSession();
    } catch (error) {
        console.error('Error loading wallpapers from wallpapers.json:', error);
        document.getElementById('gallery').innerHTML = '<p class="empty-state">Unable to load wallpaper data.</p>';
    }
}

function getFilteredWallpapers() {
    if (activeCategory === 'all') {
        return wallpapers;
    }

    return wallpapers.filter((wallpaper) => {
        const category = (wallpaper.category || wallpaper.type || '').toLowerCase();
        return category === activeCategory;
    });
}

function renderWallpapers(items) {
    const gallery = document.getElementById('gallery');
    if (!gallery) return;

    gallery.innerHTML = '';

    if (!items.length) {
        gallery.innerHTML = '<p class="empty-state">No wallpapers found in this category.</p>';
        return;
    }

    items.forEach((wallpaper) => {
        const card = document.createElement('div');
        card.className = 'wallpaper-card';
        card.innerHTML = `
            <div class="card-content">
                <div class="card-meta">
                    <span class="pill">${wallpaper.type || 'Wallpaper'}</span>
                    <span class="pill secondary">${wallpaper.category || 'General'}</span>
                </div>
                <h3>${wallpaper.title}</h3>
                <p class="card-author">By ${wallpaper.author}</p>
                <div class="stats-row">
                    <span>❤️ ${wallpaper.likes || 0}</span>
                    <span>⬇️ ${wallpaper.installs || 0}</span>
                    <span>👁 ${wallpaper.views || 0}</span>
                </div>
                <div class="card-actions">
                    <button class="btn preview-btn" data-id="${wallpaper.id}" type="button">Preview</button>
                    <a class="btn secondary-link" href="${wallpaper.download}" target="_blank" rel="noreferrer">Download</a>
                </div>
            </div>
        `;
        gallery.appendChild(card);
    });
}

function setupCategoryFilters() {
    const buttons = document.querySelectorAll('.menu-item');

    buttons.forEach((button) => {
        button.addEventListener('click', () => {
            buttons.forEach((item) => item.classList.remove('active'));
            button.classList.add('active');
            activeCategory = button.getAttribute('data-category') || 'all';
            renderWallpapers(getFilteredWallpapers());
        });
    });
}

function setupPreviewModal() {
    const modal = document.getElementById('modal');
    const closeButton = document.getElementById('close-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalType = document.getElementById('modal-type');
    const downloadLink = document.getElementById('download-link');
    const previewLink = document.getElementById('preview-link');
    const appLink = document.getElementById('app-link');
    const iframe = document.getElementById('modal-iframe');

    const openModal = (wallpaper) => {
        modalTitle.textContent = wallpaper.title;
        modalType.textContent = `${wallpaper.type} • ${wallpaper.category}`;
        downloadLink.href = wallpaper.download;
        previewLink.href = wallpaper.preview;
        appLink.href = wallpaper.appLink;
        iframe.src = wallpaper.preview;
        modal.classList.remove('hidden');
        modal.setAttribute('aria-hidden', 'false');
    };

    const closeModal = () => {
        modal.classList.add('hidden');
        modal.setAttribute('aria-hidden', 'true');
        iframe.src = '';
    };

    closeButton.addEventListener('click', closeModal);
    modal.querySelector('.modal-backdrop').addEventListener('click', closeModal);

    document.addEventListener('click', (event) => {
        const button = event.target.closest('.preview-btn');
        if (!button) return;

        const wallpaper = wallpapers.find((item) => String(item.id) === button.dataset.id);
        if (wallpaper) {
            openModal(wallpaper);
        }
    });
}

function setupAuthModal() {
    const loginModal = document.getElementById('login-modal');
    const openButton = document.getElementById('open-login-btn');
    const closeButton = document.getElementById('close-login-modal');
    const tabs = document.querySelectorAll('.auth-tab');
    const signinView = document.getElementById('signin-view');
    const registerView = document.getElementById('register-view');
    const signinForm = document.getElementById('signin-form');
    const registerForm = document.getElementById('register-form');
    const sendCodeButton = document.getElementById('send-code-btn');
    const verificationStatus = document.getElementById('verification-status');
    const savedUsersList = document.getElementById('saved-users-list');

    const openAuthModal = () => {
        loginModal.classList.remove('hidden');
        loginModal.setAttribute('aria-hidden', 'false');
        renderSavedUsers();
    };

    const closeAuthModal = () => {
        loginModal.classList.add('hidden');
        loginModal.setAttribute('aria-hidden', 'true');
    };

    openButton.addEventListener('click', openAuthModal);
    closeButton.addEventListener('click', closeAuthModal);
    loginModal.querySelector('.modal-backdrop').addEventListener('click', closeAuthModal);

    tabs.forEach((tab) => {
        tab.addEventListener('click', () => {
            tabs.forEach((item) => item.classList.remove('active'));
            tab.classList.add('active');
            const target = tab.dataset.tab;
            signinView.classList.toggle('active', target === 'signin');
            registerView.classList.toggle('active', target === 'register');
        });
    });

    signinForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const username = document.getElementById('signin-username').value.trim();
        const password = document.getElementById('signin-password').value;
        const users = getStoredUsers();
        const matchedUser = users.find((user) => user.username.toLowerCase() === username.toLowerCase());
        const passwordHash = await hashPassword(password);

        if (!matchedUser || matchedUser.passwordHash !== passwordHash) {
            alert('Invalid username or password.');
            return;
        }

        currentUser = matchedUser;
        saveCurrentUser(currentUser);
        updateUserBadge();
        closeAuthModal();
    });

    sendCodeButton.addEventListener('click', async () => {
        const emailInput = document.getElementById('register-email');
        const email = emailInput ? emailInput.value.trim() : '';

        if (!email) {
            alert("Please enter a valid email address first!");
            return;
        }

        // Immediately lock button & update state
        sendCodeButton.disabled = true;
        sendCodeButton.style.opacity = '0.5';
        sendCodeButton.style.cursor = 'not-allowed';
        sendCodeButton.textContent = "Sending email...";
        verificationStatus.textContent = "Connecting to mail server...";

        try {
            const response = await fetch('http://127.0.0.1:8000/api/send-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email })
            });

            const result = await response.json();

            if (response.ok) {
                verificationStatus.textContent = `✅ Verification code sent to ${email}. Check your Inbox/Spam!`;
                
                // 30-second countdown loop
                let countdown = 30;
                sendCodeButton.textContent = `Resend in ${countdown}s`;

                const timer = setInterval(() => {
                    countdown--;
                    if (countdown > 0) {
                        sendCodeButton.textContent = `Resend in ${countdown}s`;
                    } else {
                        clearInterval(timer);
                        sendCodeButton.disabled = false;
                        sendCodeButton.style.opacity = '1';
                        sendCodeButton.style.cursor = 'pointer';
                        sendCodeButton.textContent = 'Resend Verification Code';
                    }
                }, 1000);

            } else {
                alert(`Error: ${result.detail || "Failed to send code"}`);
                sendCodeButton.disabled = false;
                sendCodeButton.style.opacity = '1';
                sendCodeButton.style.cursor = 'pointer';
                sendCodeButton.textContent = 'Send Verification Code';
            }
        } catch (err) {
            console.error(err);
            alert("Could not connect to server! Ensure 'python server.py' is running.");
            sendCodeButton.disabled = false;
            sendCodeButton.style.opacity = '1';
            sendCodeButton.style.cursor = 'pointer';
            sendCodeButton.textContent = 'Send Verification Code';
        }
    });

    registerForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const username = document.getElementById('register-username').value.trim();
        const email = document.getElementById('register-email').value.trim();
        const password = document.getElementById('register-password').value;
        const code = document.getElementById('register-code').value.trim();

        if (!username || !email || !password || !code) {
            alert("Please fill in all fields including the verification code!");
            return;
        }

        try {
            const response = await fetch('http://127.0.0.1:8000/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: username,
                    email: email,
                    password: password,
                    code: code
                })
            });

            const result = await response.json();

            if (response.ok) {
                alert(`🎉 Account created successfully for @${result.username}!`);
                
                // Update logged-in state locally and close modal
                currentUser = { username: result.username, email: email };
                saveCurrentUser(currentUser);
                updateUserBadge();
                closeAuthModal();
            } else {
                alert(`❌ Registration Failed: ${result.detail}`);
            }
        } catch (err) {
            console.error(err);
            alert("Server connection error.");
        }
    });

    function renderSavedUsers() {
        const users = getStoredUsers();
        if (!users.length) {
            savedUsersList.innerHTML = '<p class="helper-text">No saved users yet. Register one to get started.</p>';
            return;
        }

        savedUsersList.innerHTML = users
            .map((user) => `
                <button class="saved-user-btn" type="button" data-username="${user.username}">
                    ${user.username}
                </button>
            `)
            .join('');

        savedUsersList.querySelectorAll('.saved-user-btn').forEach((button) => {
            button.addEventListener('click', () => {
                const selectedUser = users.find((user) => user.username === button.dataset.username);
                if (selectedUser) {
                    currentUser = selectedUser;
                    saveCurrentUser(currentUser);
                    updateUserBadge();
                    closeAuthModal();
                }
            });
        });
    }
}

function restoreUserSession() {
    const storedUser = localStorage.getItem(STORAGE_KEYS.currentUser);
    if (storedUser) {
        currentUser = JSON.parse(storedUser);
    } else {
        currentUser = null;
    }
    updateUserBadge();
}

function updateUserBadge() {
    const badge = document.getElementById('current-user-display');
    const button = document.getElementById('open-login-btn');

    if (!badge || !button) return;

    if (currentUser) {
        badge.textContent = `👤 ${currentUser.username}`;
        button.textContent = 'Switch User';
    } else {
        badge.textContent = 'Guest';
        button.textContent = 'Switch / Add User';
    }
}

function saveCurrentUser(user) {
    localStorage.setItem(STORAGE_KEYS.currentUser, JSON.stringify(user));
}

async function ensureSeedUsers() {
    const existingUsers = localStorage.getItem(STORAGE_KEYS.users);
    if (existingUsers) {
        return;
    }

    const defaultUsers = [
        { username: 'Tharun', email: 'tharun@example.com', passwordHash: await hashPassword('Tharun@123'), isVerified: true },
        { username: 'Alex', email: 'alex@example.com', passwordHash: await hashPassword('Alex@123'), isVerified: true },
    ];

    localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(defaultUsers));
}

function getStoredUsers() {
    const raw = localStorage.getItem(STORAGE_KEYS.users);
    if (!raw) {
        return [];
    }

    try {
        return JSON.parse(raw);
    } catch (error) {
        console.warn('Unable to parse saved users:', error);
        return [];
    }
}

async function hashPassword(password) {
    const data = new TextEncoder().encode(password);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

document.addEventListener('DOMContentLoaded', initGallery);