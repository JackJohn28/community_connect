// --- INITIALIZATION ---
let currentUser = JSON.parse(sessionStorage.getItem('cc_user')) || null;
let profiles = JSON.parse(localStorage.getItem('cc_profiles')) || {};
let resources = JSON.parse(localStorage.getItem('cc_resources')) || [
    { title: "Weekend Sensory Play", desc: "A quiet environment for kids.", org: "City Park" },
    { title: "Special Needs Tutoring", desc: "Math and Reading help.", org: "Study Helpers" }
];

// --- AUTH LOGIC ---
function setAuthMode(mode) {
    const isReg = mode === 'reg';
    document.getElementById('tab-login').classList.toggle('active', !isReg);
    document.getElementById('tab-reg').classList.toggle('active', isReg);
    document.getElementById('reg-fields').style.display = isReg ? 'block' : 'none';
    document.getElementById('auth-title').innerText = isReg ? 'Create Account' : 'Login';
    document.getElementById('auth-submit').innerText = isReg ? 'Register' : 'Login';
}

function handleAuth() {
    const username = document.getElementById('username').value.toLowerCase().trim();
    if (!username) return alert("Please enter a username");

    const isRegMode = document.getElementById('reg-fields').style.display === 'block';

    if (isRegMode) {
        if (profiles[username]) return alert("Username already exists!");
        profiles[username] = { 
            role: document.getElementById('user-role').value,
            details: {} 
        };
        saveData();
        alert("Account created! You can now login.");
        location.reload();
    } else {
        if (!profiles[username]) return alert("User not found. Please register.");
        currentUser = { name: username, ...profiles[username] };
        sessionStorage.setItem('cc_user', JSON.stringify(currentUser));
        initApp();
    }
}

// --- NAVIGATION ---
function initApp() {
    document.getElementById('auth-section').style.display = 'none';
    document.getElementById('main-nav').style.display = 'block';
    showSection('dashboard');
}

function showSection(id) {
    document.querySelectorAll('main > section').forEach(s => s.style.display = 'none');
    document.getElementById(id).style.display = 'block';
    document.getElementById('nav-dropdown').classList.remove('show');

    if (id === 'dashboard') renderDashboard();
    if (id === 'search') renderSearch();
    if (id === 'profile') renderProfileForm();
}

// --- DASHBOARD & ACTIONS ---
function renderDashboard() {
    document.getElementById('dash-title').innerText = `Hello, ${currentUser.name}!`;
    const btnContainer = document.getElementById('action-buttons');
    btnContainer.innerHTML = "";

    if (currentUser.role === 'org') {
        btnContainer.innerHTML = `<button class="primary-btn" onclick="postResource()">+ Create New Listing</button>`;
    }
    btnContainer.innerHTML += `<button class="primary-btn" style="margin-top:10px" onclick="showSection('search')">Browse Listings</button>`;
}

function postResource() {
    const title = prompt("Resource Title:");
    const desc = prompt("Resource Description:");
    if (title && desc) {
        resources.push({ title, desc, org: currentUser.name });
        localStorage.setItem('cc_resources', JSON.stringify(resources));
        alert("Listing Published!");
        showSection('search');
    }
}

function renderSearch() {
    const results = document.getElementById('search-results');
    results.innerHTML = "";
    resources.forEach(res => {
        results.innerHTML += `
            <div class="resource-card">
                <h3>${res.title}</h3>
                <p><b>From:</b> ${res.org}</p>
                <p>${res.desc}</p>
            </div>
        `;
    });
}

// --- PROFILE ---
function renderProfileForm() {
    const container = document.getElementById('profile-inputs');
    const d = currentUser.details;
    if (currentUser.role === 'caregiver') {
        container.innerHTML = `
            <input id="p-child" placeholder="Family Member Name" value="${d.child || ''}">
            <textarea id="p-needs" placeholder="Primary Needs">${d.needs || ''}</textarea>
        `;
    } else {
        container.innerHTML = `
            <input id="p-skills" placeholder="My Skills" value="${d.skills || ''}">
            <textarea id="p-avail" placeholder="My Availability">${d.avail || ''}</textarea>
        `;
    }
}

function saveProfile() {
    const d = profiles[currentUser.name].details;
    if (currentUser.role === 'caregiver') {
        d.child = document.getElementById('p-child').value;
        d.needs = document.getElementById('p-needs').value;
    } else {
        d.skills = document.getElementById('p-skills').value;
        d.avail = document.getElementById('p-avail').value;
    }
    saveData();
    alert("Profile Updated!");
}

// --- UTILS ---
function toggleMenu() { document.getElementById('nav-dropdown').classList.toggle('show'); }
function saveData() { localStorage.setItem('cc_profiles', JSON.stringify(profiles)); }
function logout() { sessionStorage.clear(); location.reload(); }

// Keep user logged in on refresh
if (currentUser) initApp();