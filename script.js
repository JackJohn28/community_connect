
// --- 1. FIREBASE CONFIGURATION (Corrected from Config screen) ---
const firebaseConfig = {
  apiKey: "AIzaSyBJsqogYmqzRM_T9r03PvtPAsENe8Q2g3w", // Fixed the 'q' typo
  authDomain: "community-connect-8e9e2.firebaseapp.com",
  projectId: "community-connect-8e9e2",
  storageBucket: "community-connect-8e9e2.firebasestorage.app",
  messagingSenderId: "635552107936",
  appId: "1:635552107936:web:d05d2f40accbf0e32ea8c5",
  measurementId: "G-X71PEH5QS4"
};

// Initialize the 'Compat' services
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// --- 2. GLOBAL STATE ---
let currentUser = JSON.parse(sessionStorage.getItem('cc_user')) || null;

// --- 3. AUTH LOGIC ---
function setAuthMode(mode) {
    const isReg = mode === 'reg';
    document.getElementById('auth-title').innerText = isReg ? 'Register' : 'Login';
    document.getElementById('auth-submit').innerText = isReg ? 'Register' : 'Login';
    document.getElementById('reg-fields').style.display = isReg ? 'block' : 'none';
    
    // Switch active tab styling
    document.getElementById('tab-login').classList.toggle('active', !isReg);
    document.getElementById('tab-reg').classList.toggle('active', isReg);
    
    // Clear any error messages when switching modes
    const errorElement = document.getElementById('auth-error');
    if (errorElement) errorElement.style.display = 'none';
}

// Requirement ID # - Implementation for Username/Password [cite: 2026-02-28]

async function handleAuth() {
    const rawUsername = document.getElementById('username').value.trim().toLowerCase();
    const pass = document.getElementById('password').value.trim();
    
    if (!rawUsername || !pass) return alert("Please enter both username and password");
    
    const fakeEmail = `${rawUsername}@community.connect`;
    const isRegMode = document.getElementById('reg-fields').style.display === 'block';

    try {
        if (isRegMode) {
            // Use the 'auth' variable we defined at the top
            const userCredential = await auth.createUserWithEmailAndPassword(fakeEmail, pass);
            
            await db.collection("profiles").doc(userCredential.user.uid).set({
                username: rawUsername,
                role: document.getElementById('user-role').value,
                details: {}
            });
            
            alert("Account created!");
            location.reload();
        } else {
            // Validating the password
            const userCredential = await auth.signInWithEmailAndPassword(fakeEmail, pass);
            const doc = await db.collection("profiles").doc(userCredential.user.uid).get();
            
            currentUser = { uid: userCredential.user.uid, ...doc.data() };
            sessionStorage.setItem('cc_user', JSON.stringify(currentUser));
            initApp();
        }
    } catch (error) {
        console.error("Firebase Auth Error:", error.code);
        
        const errorElement = document.getElementById('auth-error');
        errorElement.style.display = 'block';

        // Requirement ID # - Friendly Error Mapping [cite: 2026-02-28]
        switch (error.code) {
            case 'auth/invalid-credential':
                errorElement.innerText = "Incorrect username or password. Please try again.";
                break;
            case 'auth/user-not-found':
                errorElement.innerText = "That username doesn't exist yet. Want to register?";
                break;
            case 'auth/wrong-password':
                errorElement.innerText = "The password you entered is incorrect.";
                break;
            case 'auth/weak-password':
                errorElement.innerText = "Password is too short. Try at least 6 characters.";
                break;
            case 'auth/email-already-in-use':
                errorElement.innerText = "That username is already taken.";
                break;
            default:
                errorElement.innerText = "Oops! Something went wrong. Please check your connection.";
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
    document.getElementById('dash-title').innerText = `Hello, ${currentUser.name}!`;
    const btnContainer = document.getElementById('action-buttons');
    btnContainer.innerHTML = "";

    if (currentUser.role === 'org') {
        btnContainer.innerHTML = `<button class="primary-btn" onclick="postResource()">+ Create New Listing</button>`;
    }
    btnContainer.innerHTML += `<button class="primary-btn" style="margin-top:10px" onclick="showSection('search')">Browse Listings</button>`;
}

// --- 5. CLOUD FUNCTIONS (RESOURCES) ---
async function postResource() {
    const title = prompt("Resource Title:");
    const desc = prompt("Resource Description:");
    if (title && desc) {
        await db.collection("resources").add({
            title,
            desc,
            author: currentUser.username, // Using the saved username
            authorId: currentUser.uid,    // Using the secure ID
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
                <p><b>From:</b> ${res.org}</p>
                <p>${res.desc}</p>
            </div>`;
    });
}

// --- 6. PROFILE LOGIC ---
function renderProfileForm() {
    const container = document.getElementById('profile-inputs');
    const d = currentUser.details || {};
    if (currentUser.role === 'caregiver') {
        container.innerHTML = `<input id="p-child" placeholder="Family Member Name" value="${d.child || ''}"><textarea id="p-needs" placeholder="Needs">${d.needs || ''}</textarea>`;
    } else {
        container.innerHTML = `<input id="p-skills" placeholder="Skills" value="${d.skills || ''}"><textarea id="p-avail" placeholder="Availability">${d.avail || ''}</textarea>`;
    }
}

async function saveProfile() {
    const userRef = db.collection("profiles").doc(currentUser.name);
    let details = {};
    if (currentUser.role === 'caregiver') {
        details = { child: document.getElementById('p-child').value, needs: document.getElementById('p-needs').value };
    } else {
        details = { skills: document.getElementById('p-skills').value, avail: document.getElementById('p-avail').value };
    }
    await userRef.update({ details });
    currentUser.details = details;
    sessionStorage.setItem('cc_user', JSON.stringify(currentUser));
    alert("Cloud Profile Saved!");
}

function toggleMenu() { document.getElementById('nav-dropdown').classList.toggle('show'); }
function logout() { sessionStorage.clear(); location.reload(); }
if (currentUser) initApp();

// This clears the error message as soon as the user starts typing again
document.getElementById('username').addEventListener('input', () => {
    const errorElement = document.getElementById('auth-error');
    if (errorElement) errorElement.style.display = 'none';
});

document.getElementById('password').addEventListener('input', () => {
    const errorElement = document.getElementById('auth-error');
    if (errorElement) errorElement.style.display = 'none';
});