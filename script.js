// --- 1. FIREBASE CONFIGURATION ---
const firebaseConfig = {
    apiKey: "AIzaSyBJsqogYmqzRM_T9r03PvtPAsENe8Q2g3w",
    authDomain: "community-connect-8e9e2.firebaseapp.com",
    projectId: "community-connect-8e9e2",
    storageBucket: "community-connect-8e9e2.firebasestorage.app",
    messagingSenderId: "635552107936",
    appId: "1:635552107936:web:d05d2f40accbf0e32ea8c5",
    measurementId: "G-X71PEH5QS4"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// --- 2. GLOBAL STATE ---
let currentUser = JSON.parse(sessionStorage.getItem('cc_user')) || null;

// --- 3. AUTH & DYNAMIC UI LOGIC ---
function setAuthMode(mode) {
    const isReg = mode === 'reg';
    document.getElementById('auth-title').innerText = isReg ? 'Register' : 'Login';
    document.getElementById('auth-submit').innerText = isReg ? 'Register' : 'Login';
    document.getElementById('reg-fields').style.display = isReg ? 'block' : 'none';
    
    document.getElementById('tab-login').classList.toggle('active', !isReg);
    document.getElementById('tab-reg').classList.toggle('active', isReg);
    
    if (isReg) updateRoleFields();
    
    const errorElement = document.getElementById('auth-error');
    if (errorElement) errorElement.style.display = 'none';
}

function updateRoleFields() {
    const role = document.getElementById('user-role').value;
    const container = document.getElementById('dynamic-questions');
    
    // Clear previous fields
    container.innerHTML = "";

    if (role === 'volunteer' || role === 'caregiver') {
        container.innerHTML = `
            <div class="name-row" style="display: flex; gap: 10px;">
                <input type="text" id="reg-fname" placeholder="First Name" style="flex: 1;">
                <input type="text" id="reg-lname" placeholder="Last Name" style="flex: 1;">
            </div>
            ${role === 'volunteer' ? 
                `<input type="text" id="reg-expertise" placeholder="Expertise (e.g. Nursing, Tech)">` : 
                `<input type="text" id="reg-care-need" placeholder="Primary Care Need">`
            }
        `;
    } else if (role === 'org') {
        container.innerHTML = `
            <input type="text" id="reg-org-name" placeholder="Organization Name">
            <input type="text" id="reg-website" placeholder="Website URL">
        `;
    }
}

async function handleAuth() {
    const rawUsername = document.getElementById('username').value.trim().toLowerCase();
    const pass = document.getElementById('password').value.trim();
    const errorElement = document.getElementById('auth-error');
    
    if (!rawUsername || !pass) return alert("Please enter both username and password");
    
    const fakeEmail = `${rawUsername}@community.connect`;
    const isRegMode = document.getElementById('reg-fields').style.display === 'block';

    try {
        if (isRegMode) {
            // 1. Create the account in Firebase Auth
            const userCredential = await auth.createUserWithEmailAndPassword(fakeEmail, pass);
        
            // --- START OF PART 2 ---
            const role = document.getElementById('user-role').value;
            let profileData = {
                username: rawUsername,
                role: role,
                details: {}
            };

            // If it's a person, get First/Last names
            if (role === 'volunteer' || role === 'caregiver') {
                profileData.firstName = document.getElementById('reg-fname').value.trim();
                profileData.lastName = document.getElementById('reg-lname').value.trim();
            
                if (role === 'volunteer') {
                    profileData.details.expertise = document.getElementById('reg-expertise').value;
                } else {
                    profileData.details.need = document.getElementById('reg-care-need').value;
                }
            } 
            // If it's an organization, get Org Name
            else if (role === 'org') {
                profileData.orgName = document.getElementById('reg-org-name').value.trim();
                profileData.details.website = document.getElementById('reg-website').value;
            }

            // 2. Save the personalized data to Firestore
            await db.collection("profiles").doc(userCredential.user.uid).set(profileData);
            // --- END OF PART 2 ---

            alert("Account created!");
            location.reload();
        } else {


            const userCredential = await auth.signInWithEmailAndPassword(fakeEmail, pass);
            const doc = await db.collection("profiles").doc(userCredential.user.uid).get();
            
            currentUser = { uid: userCredential.user.uid, ...doc.data() };
            sessionStorage.setItem('cc_user', JSON.stringify(currentUser));
            initApp();
        }
    } catch (error) {
        errorElement.style.display = 'block';
        if (error.code === 'auth/invalid-credential') {
            errorElement.innerText = "Incorrect username or password.";
        } else if (error.code === 'auth/email-already-in-use') {
            errorElement.innerText = "Username already taken.";
        } else {
            errorElement.innerText = error.message;
        }
    }
}

// --- 4. NAVIGATION & DASHBOARD ---
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

function renderDashboard() {
    let displayName = currentUser.username; // Fallback
    
    if (currentUser.role === 'org') {
        displayName = currentUser.orgName || currentUser.username;
    } else {
        displayName = currentUser.firstName || currentUser.username;
    }

    document.getElementById('dash-title').innerText = `Hello, ${displayName}!`;
    const btnContainer = document.getElementById('action-buttons');
    btnContainer.innerHTML = "";

    if (currentUser.role === 'org') {
        btnContainer.innerHTML = `<button class="primary-btn" onclick="postResource()">+ Create New Listing</button>`;
    }
    btnContainer.innerHTML += `<button class="primary-btn" style="margin-top:10px" onclick="showSection('search')">Browse Listings</button>`;
}

// --- 5. CLOUD FUNCTIONS ---
async function postResource() {
    const title = prompt("Resource Title:");
    const desc = prompt("Resource Description:");
    if (title && desc) {
        await db.collection("resources").add({
            title,
            desc,
            author: currentUser.username,
            authorId: currentUser.uid,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        alert("Published!");
        showSection('search');
    }
}

async function renderSearch() {
    const results = document.getElementById('search-results');
    results.innerHTML = "Loading...";
    const snapshot = await db.collection("resources").orderBy("timestamp", "desc").get();
    results.innerHTML = "";
    snapshot.forEach(doc => {
        const res = doc.data();
        results.innerHTML += `
            <div class="resource-card">
                <h3>${res.title}</h3>
                <p><b>From:</b> ${res.author}</p>
                <p>${res.desc}</p>
            </div>`;
    });
}

// --- 6. PROFILE LOGIC ---
function renderProfileForm() {
    const container = document.getElementById('profile-inputs');
    const d = currentUser.details || {};
    if (currentUser.role === 'caregiver') {
        container.innerHTML = `<input id="p-need" placeholder="Care Need" value="${d.need || ''}"><textarea id="p-story">${d.story || ''}</textarea>`;
    } else if (currentUser.role === 'volunteer') {
        container.innerHTML = `<input id="p-expertise" placeholder="Expertise" value="${d.expertise || ''}"><input id="p-hours" value="${d.hours || ''}">`;
    } else {
        container.innerHTML = `<input id="p-orgName" value="${d.orgName || ''}"><input id="p-website" value="${d.website || ''}">`;
    }
}

async function saveProfile() {
    const userRef = db.collection("profiles").doc(currentUser.uid);
    let details = {};
    if (currentUser.role === 'caregiver') {
        details = { need: document.getElementById('p-need').value, story: document.getElementById('p-story').value };
    } else if (currentUser.role === 'volunteer') {
        details = { expertise: document.getElementById('p-expertise').value, hours: document.getElementById('p-hours').value };
    } else {
        details = { orgName: document.getElementById('p-orgName').value, website: document.getElementById('p-website').value };
    }
    await userRef.update({ details });
    currentUser.details = details;
    sessionStorage.setItem('cc_user', JSON.stringify(currentUser));
    alert("Profile Saved!");
}

function toggleMenu() { document.getElementById('nav-dropdown').classList.toggle('show'); }
function logout() { sessionStorage.clear(); location.reload(); }

// Startup check
if (currentUser) initApp();

// Input listeners for cleaner UI
document.getElementById('username').addEventListener('input', () => {
    const err = document.getElementById('auth-error');
    if (err) err.style.display = 'none';
});
document.getElementById('password').addEventListener('input', () => {
    const err = document.getElementById('auth-error');
    if (err) err.style.display = 'none';
});