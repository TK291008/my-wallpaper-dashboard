window.addEventListener("beforeunload", () => {
    console.error("🚨 PAGE IS UNLOADING");
});

console.trace       ("🚀 Main gallery script loaded");

let wallpapers = [];
let activeCategory = 'all';
let currentUser = null;
let pendingVerificationCode = null;
let openWallpaperModal = null;

const STORAGE_KEYS = {
    users: 'wallpaper-hub-users',
    currentUser: 'wallpaper-hub-current-user',
};

const BACKEND_BASE =
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname === "localhost"
        ? "http://127.0.0.1:8000"
        : "https://wallpaperhub-api.onrender.com";

// Helper function to turn relative image and file paths into working backend URLs
function getFullUrl(path) {
    if (!path) return '#';
    if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(path)) return path;
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    return `${BACKEND_BASE}/${cleanPath}`;
}

function isRenderablePreview(path) {
    return !!path && /\.(?:html|htm|jpeg|jpg|gif|png|webp)(?:$|\?)/i.test(path);
}

function getInteractiveThumbnail(wallpaper) {
    const previewPath = wallpaper.preview || wallpaper.image || '';
    if (!previewPath || !previewPath.endsWith('.html')) {
        return null;
    }

    const previewFolder = previewPath.substring(0, previewPath.lastIndexOf('/') + 1);
    const titleSlug = (wallpaper.title || '').toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    const candidates = [
        `${previewFolder}${titleSlug}_preview.png`,
        `${previewFolder}preview.png`,
        `${previewFolder}thumbnail.png`,
        `${previewFolder}thumb.png`,
    ];
    return candidates.find((candidate) => candidate) || null;
}

const CARD_PLACEHOLDER_SVG = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 250">
        <rect width="400" height="250" fill="#111827"/>
        <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#9ca3af" font-family="Arial, sans-serif" font-size="20">No preview available</text>
    </svg>`
)}`;

async function initGallery() {
    try {
        const response = await fetch(`${getFullUrl('wallpapers')}`);
        const data = await response.json();
        wallpapers = Array.isArray(data) ? data : [];
        setupPreviewModal();
        renderWallpapers(getFilteredWallpapers());
        setupCategoryFilters();
        await ensureSeedUsers();
        setupAuthModal();
        restoreUserSession();
    } catch (error) {
        console.error('Error loading wallpapers from backend:', error);
        document.getElementById('gallery').innerHTML = '<p class="empty-state">Unable to load wallpaper data</p>';
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

        const previewCandidate = wallpaper.preview || wallpaper.image || wallpaper.thumbnail || '';
        const interactiveThumbnail = getInteractiveThumbnail(wallpaper);
        const hasStaticPreview = /\.(?:jpeg|jpg|gif|png|webp)(?:$|\?)/i;

        const thumbnailPath =
            wallpaper.thumbnail ||
            wallpaper.image ||
            interactiveThumbnail ||
            (hasStaticPreview.test(previewCandidate) ? previewCandidate : '') ||
            wallpaper.download ||
            previewCandidate ||
            wallpaper.appLink ||
            '';

        const thumbnailUrl = thumbnailPath
            ? getFullUrl(thumbnailPath)
            : CARD_PLACEHOLDER_SVG;

        const card = document.createElement('div');
        card.className = 'wallpaper-card';
        card.dataset.id = wallpaper.id;

        card.innerHTML = `
            <div class="card-thumbnail">
                <img
                    class="card-thumb"
                    src="${thumbnailUrl}"
                    alt="${wallpaper.title || 'Wallpaper preview'}"
                    onerror="this.onerror=null; this.src='${CARD_PLACEHOLDER_SVG}';"
                />
            </div>

            <div class="card-content">

                <div class="card-meta">
                    <span class="pill">${wallpaper.type || 'Wallpaper'}</span>
                    <span class="pill secondary">${wallpaper.category || 'General'}</span>
                </div>

                <h3>${wallpaper.title}</h3>

                <p class="card-author">
                    By ${wallpaper.author || 'Unknown'}
                </p>

                <div class="stats-row">
                    <span class="like-count">
                        ❤️ ${wallpaper.likes || 0}
                    </span>

                    <span class="download-count" data-id="${wallpaper.id}">
                        ⬇️ ${wallpaper.downloads || 0}
                    </span>

                    <span class="view-count">
                        👁 ${wallpaper.views || 0}
                    </span>
                </div>

                <div class="card-actions">
                    <button
                        class="btn preview-btn"
                        data-id="${wallpaper.id}"
                        type="button">
                        Preview
                    </button>

                    <a
                        class="btn secondary-link"
                        href="#"
                        target="_blank"
                        rel="noreferrer">
                        Download    
                    </a>
                </div>

            </div>
        `;

        // Preview button
        const previewButton = card.querySelector(".preview-btn");

        previewButton.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();

            console.log("1 - Button clicked");
            console.log("2 - openWallpaperModal =", window.openWallpaperModal);

            try {
                window.openWallpaperModal(wallpaper);
                console.log("3 - openWallpaperModal returned");
            } catch (err) {
                console.error("ERROR:", err);
            }

            console.log("4 - End of click");
        });

        // Download button
        const downloadLink = card.querySelector(".secondary-link");

        if (downloadLink) {

            downloadLink.href = getFullUrl(
                wallpaper.download ||
                wallpaper.preview ||
                wallpaper.image ||
                ""
            );

            downloadLink.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();

                fetch(`${BACKEND_BASE}/api/download`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        wallpaper_id: wallpaper.id
                    })
                })
                .then(res => res.json())
                .then(data => {

                    wallpaper.downloads = data.downloads;

                    card.querySelector(".download-count").textContent =
                        `⬇️ ${data.downloads}`;

                })
                .catch(console.error);

            });

        }

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
    const modal = document.getElementById("modal");
    const backdrop = modal.querySelector(".modal-backdrop");
    const closeButton = document.getElementById("close-modal");

    const iframe = document.getElementById("modal-iframe");
    const modalTitle = document.getElementById("modal-title");
    const modalType = document.getElementById("modal-type");

    const downloadLink = document.getElementById("download-link");
    const previewLink = document.getElementById("preview-link");
    const appLink = document.getElementById("app-link");

    function closeModal() {

        console.trace("CloseModal called");

        modal.classList.add("hidden");
        modal.classList.remove("active");
        modal.setAttribute("aria-hidden", "true");

        iframe.removeAttribute("srcdoc");
        iframe.src = "about:blank";
    }

    function openModal(wallpaper) {

        console.trace("OpenModal called", wallpaper);
        console.log("Sending view request ...");
        console.log(`${BACKEND_BASE}/api/view`);

        fetch(`${BACKEND_BASE}/api/view`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                wallpaper_id: wallpaper.id
            })
        })
        .then(res => res.json())
        .then(data => {
            wallpaper.views = data.views;

            const viewElement = document.querySelector(
                `[data-id="${wallpaper.id}"] .view-count`
            );

            if (viewElement) {
                viewElement.textContent = `👁 ${data.views}`;
            }
        })
        .catch(console.error);
        


        modalTitle.textContent = wallpaper.title || "";
        modalType.textContent =
            `${wallpaper.type || "Wallpaper"} • ${wallpaper.category || ""}`;

        const previewPath =
            wallpaper.appLink ||
            wallpaper.preview ||
            wallpaper.image ||
            "";

        const url = getFullUrl(previewPath);
        console.log("Preview URL:", url);

        downloadLink.href = getFullUrl(
            wallpaper.download ||
            wallpaper.preview ||
            wallpaper.image ||
            ""
        );

        previewLink.href = url;
        appLink.href = getFullUrl(
            wallpaper.appLink ||
            wallpaper.preview ||
            wallpaper.image ||
            ""
        );

        iframe.removeAttribute("srcdoc");

        if (/\.(html?|php)$/i.test(previewPath)) {

            iframe.src = url;

        } else if (/\.(png|jpg|jpeg|gif|webp|bmp|svg)$/i.test(previewPath)) {

            iframe.srcdoc = `
    <!DOCTYPE html>
    <html>
    <head>
    <style>
    html,body{
    margin:0;
    height:100%;
    display:flex;
    align-items:center;
    justify-content:center;
    background:#111;
    overflow:hidden;
    }
    img{
    max-width:100%;
    max-height:100%;
    object-fit:contain;
    }
    </style>
    </head>
    <body>
    <img src="${url}">
    </body>
    </html>
    `;

        } else {

            iframe.src = url;

        }

        modal.classList.remove("hidden");
        modal.classList.add("active");
        modal.setAttribute("aria-hidden", "false");
    }

    closeButton.addEventListener("click", closeModal);

    modal.addEventListener("click", (e) => {
        if (e.target === backdrop) {
            closeModal();
        }
    });

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") closeModal();
    });

    window.openWallpaperModal = openModal;
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
    const registerUsernameInput = document.getElementById('register-username');
    const registerEmailInput = document.getElementById('register-email');
    const usernameFeedback = document.getElementById('username-field-feedback');
    const emailFeedback = document.getElementById('email-field-feedback');
    let resendTimer = null;
    let availabilityTimer = null;
    let usernameAvailable = true;
    let emailAvailable = true;

    const resetCodeButton = () => {
        sendCodeButton.disabled = false;
        sendCodeButton.style.opacity = '1';
        sendCodeButton.style.cursor = 'pointer';
        sendCodeButton.textContent = 'Send Verification Code';
    };

    const setFieldFeedback = (element, message, type = 'error') => {
        if (!element) return;
        element.textContent = message;
        element.className = `field-feedback ${type}`;
    };

    const clearFieldFeedback = (element) => {
        if (!element) return;
        element.textContent = '';
        element.className = 'field-feedback';
    };

    const updateCodeButtonState = () => {
        const username = registerUsernameInput ? registerUsernameInput.value.trim() : '';
        const email = registerEmailInput ? registerEmailInput.value.trim() : '';

        if (!username || !email) {
            sendCodeButton.disabled = true;
            sendCodeButton.style.opacity = '0.5';
            sendCodeButton.style.cursor = 'not-allowed';
            sendCodeButton.textContent = 'Send Verification Code';
            return;
        }

        if (usernameAvailable === false || emailAvailable === false) {
            sendCodeButton.disabled = true;
            sendCodeButton.style.opacity = '0.5';
            sendCodeButton.style.cursor = 'not-allowed';
            sendCodeButton.textContent = 'Unavailable';
            return;
        }

        resetCodeButton();
    };

    const switchToSignIn = () => {
        const signInTab = document.querySelector('.auth-tab[data-tab="signin"]');
        if (signInTab) {
            signInTab.click();
        }
    };

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

    const scheduleAvailabilityCheck = () => {
        if (availabilityTimer) {
            clearTimeout(availabilityTimer);
        }

        availabilityTimer = setTimeout(async () => {
            const username = registerUsernameInput ? registerUsernameInput.value.trim() : '';
            const email = registerEmailInput ? registerEmailInput.value.trim() : '';

            if (!username && !email) {
                clearFieldFeedback(usernameFeedback);
                clearFieldFeedback(emailFeedback);
                verificationStatus.textContent = 'A 6-digit code will be sent to your email.';
                usernameAvailable = true;
                emailAvailable = true;
                updateCodeButtonState();
                return;
            }

            sendCodeButton.disabled = true;
            sendCodeButton.style.opacity = '0.5';
            sendCodeButton.style.cursor = 'not-allowed';
            sendCodeButton.textContent = 'Checking details...';
            verificationStatus.textContent = 'Checking availability...';

            try {
                const response = await fetch('http://127.0.0.1:8000/api/check-availability', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, email })
                });

                const result = await response.json().catch(() => ({}));

                usernameAvailable = result.usernameAvailable !== false;
                emailAvailable = result.emailAvailable !== false;

                if (username && result.usernameMessage) {
                    setFieldFeedback(usernameFeedback, result.usernameMessage, 'error');
                } else if (username) {
                    clearFieldFeedback(usernameFeedback);
                }

                if (!username && !email) {
                    clearFieldFeedback(usernameFeedback);
                    clearFieldFeedback(emailFeedback);
                }

                if (email) {
                    if (result.emailMessage) {
                        const message = result.emailMessage.includes('already registered')
                            ? `${result.emailMessage} <span class="field-feedback-link" data-action="signin">Sign in</span>`
                            : result.emailMessage;
                        emailFeedback.innerHTML = message;
                        emailFeedback.className = 'field-feedback error';
                        const signInLink = emailFeedback.querySelector('[data-action="signin"]');
                        if (signInLink) {
                            signInLink.addEventListener('click', (event) => {
                                event.preventDefault();
                                switchToSignIn();
                            });
                        }
                    } else {
                        clearFieldFeedback(emailFeedback);
                    }
                }

                if (!response.ok) {
                    verificationStatus.textContent = 'Unable to verify availability right now.';
                    updateCodeButtonState();
                    return;
                }

                verificationStatus.textContent = usernameAvailable && emailAvailable
                    ? 'Looks good. You can request a verification code.'
                    : 'Please choose a different username or email.';
                updateCodeButtonState();
            } catch (err) {
                console.error(err);
                verificationStatus.textContent = 'Unable to verify availability right now.';
                usernameAvailable = true;
                emailAvailable = true;
                updateCodeButtonState();
            }
        }, 400);
    };

    [registerUsernameInput, registerEmailInput].forEach((input) => {
        if (input) {
            input.addEventListener('input', () => {
                if (input === registerUsernameInput) {
                    clearFieldFeedback(emailFeedback);
                }
                scheduleAvailabilityCheck();
            });
        }
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
        const usernameInput = document.getElementById('register-username');

        const email = emailInput ? emailInput.value.trim() : '';
        const username = usernameInput ? usernameInput.value.trim() : '';

        if (!email || !username) {
            alert("Please enter both your username and email address first!");
            return;
        }

        sendCodeButton.disabled = true;
        sendCodeButton.style.opacity = '0.5';
        sendCodeButton.style.cursor = 'not-allowed';
        sendCodeButton.textContent = "Checking details...";
        verificationStatus.textContent = "Connecting to mail server...";

        try {
            const response = await fetch('http://127.0.0.1:8000/api/send-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, username })
            });

            const result = await response.json();

            if (response.ok) {
                verificationStatus.textContent = `✅ Verification code sent to ${email}. Check your Inbox/Spam!`;
                
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
                alert(`⚠️ ${result.detail || "Failed to send code"}`);
                verificationStatus.textContent = "";
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
                const detail = result.detail || 'Unable to complete registration.';
                if (/already registered|already in use|already taken/i.test(detail)) {
                    setFieldFeedback(usernameFeedback, 'This username already exists.', 'error');
                    setFieldFeedback(emailFeedback, 'This email is already in use.', 'error');
                    alert('This username or email already exists. Please choose a different one.');
                } else {
                    alert(`❌ Registration Failed: ${detail}`);
                }
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

    localStorage.setItem(STORAGE_KEYS.users, JSON.stringify([]));
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