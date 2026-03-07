// --- 1. FIREBASE CONFIG ---
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
let currentUser = null;

// --- 3. PERSISTENCE OBSERVER ---
auth.onAuthStateChanged(async (user) => {
    if (user) {
        const doc = await db.collection("profiles").doc(user.uid).get();
        if (doc.exists) {
            currentUser = { uid: user.uid, ...doc.data() };
            initApp();
        }
    } else {
        currentUser = null;
        document.getElementById('auth-section').style.display = 'block';
        document.getElementById('main-nav').style.display = 'none';
        document.getElementById('dashboard').style.display = 'none';
    }
});

// --- 4. AUTH & REGISTRATION ---
function setAuthMode(mode) {
    const isReg = mode === 'reg';
    document.getElementById('auth-title').innerText = isReg ? 'Register' : 'Login';
    document.getElementById('auth-submit').innerText = isReg ? 'Register' : 'Login';
    document.getElementById('reg-fields').style.display = isReg ? 'block' : 'none';
    document.getElementById('tab-login').classList.toggle('active', !isReg);
    document.getElementById('tab-reg').classList.toggle('active', isReg);
    if (isReg) updateRoleFields();
}

function updateRoleFields() {
    const role = document.getElementById('user-role').value;
    const container = document.getElementById('dynamic-questions');
    container.innerHTML = "";

    if (role === 'volunteer' || role === 'caregiver') {
        container.innerHTML = `
            <div class="name-row" style="display: flex; gap: 10px; margin-bottom: 10px;">
                <input type="text" id="reg-fname" placeholder="First Name" style="flex: 1;">
                <input type="text" id="reg-lname" placeholder="Last Name" style="flex: 1;">
            </div>
            ${role === 'volunteer' ? `<input type="text" id="reg-expertise" placeholder="Expertise">` : `<input type="text" id="reg-care-need" placeholder="Primary Need">`}`;
    } else if (role === 'org') {
        container.innerHTML = `<input type="text" id="reg-org-name" placeholder="Org Name"><input type="text" id="reg-website" placeholder="Website">`;
    }
}

async function handleAuth() {
    const userIn = document.getElementById('username').value.trim().toLowerCase();
    const pass = document.getElementById('password').value.trim();
    if (!userIn || !pass) return alert("Fill all fields");
    const fakeEmail = `${userIn}@community.connect`;
    const isRegMode = document.getElementById('reg-fields').style.display === 'block';

    try {
        if (isRegMode) {
            const userCredential = await auth.createUserWithEmailAndPassword(fakeEmail, pass);
            const role = document.getElementById('user-role').value;
            let profileData = { username: userIn, role: role, details: {} };

            if (role === 'volunteer' || role === 'caregiver') {
                profileData.firstName = document.getElementById('reg-fname').value;
                profileData.lastName = document.getElementById('reg-lname').value;
            } else {
                profileData.orgName = document.getElementById('reg-org-name').value;
            }
            await db.collection("profiles").doc(userCredential.user.uid).set(profileData);
        } else {
            await auth.signInWithEmailAndPassword(fakeEmail, pass);
        }
    } catch (e) { alert(e.message); }
}

// --- 5. DASHBOARD & NAVIGATION ---
function initApp() {
    document.getElementById('auth-section').style.display = 'none';
    document.getElementById('main-nav').style.display = 'block';
    showSection('dashboard');
}

function showSection(id) {
    document.querySelectorAll('main > section').forEach(s => s.style.display = 'none');
    document.getElementById(id).style.display = 'block';
    if (id === 'dashboard') renderDashboard();
    if (id === 'search') renderSearch();
}

function renderDashboard() {
    const name = currentUser.firstName || currentUser.orgName || currentUser.username;
    document.getElementById('dash-title').innerText = `Hello, ${name}!`;
    const btnContainer = document.getElementById('action-buttons');
    btnContainer.innerHTML = (currentUser.role === 'org') ? `<button class="primary-btn" onclick="showSection('create-listing')">+ Create Listing</button>` : "";
    btnContainer.innerHTML += `<button class="primary-btn" style="margin-top:10px" onclick="showSection('search')">Browse Listings</button>`;
}

// --- 6. LISTINGS & SIGNUPS ---
function toggleVolunteerNeeded() {
    const type = document.getElementById('post-type').value;
    document.getElementById('volunteer-details').style.display = (type === 'volunteer_job') ? 'block' : 'none';
}

async function submitListing() {
    const title = document.getElementById('post-title').value;
    const desc = document.getElementById('post-desc').value;
    const type = document.getElementById('post-type').value;

    const data = {
        title, desc, type, 
        author: currentUser.orgName || currentUser.username,
        authorId: currentUser.uid,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        volunteers: [] // Req 501
    };
    
    if (type === 'volunteer_job') {
        data.skill = document.getElementById('post-skill').value;
        data.urgency = document.getElementById('post-urgency').value;
    }

    await db.collection("resources").add(data);
    alert("Published!");
    showSection('search');
}

async function renderSearch() {
    const results = document.getElementById('search-results');
    results.innerHTML = "Loading...";
    const snapshot = await db.collection("resources").orderBy("timestamp", "desc").get();
    results.innerHTML = "";
    
    snapshot.forEach(doc => {
        const res = doc.data();
        const isVolJob = res.type === 'volunteer_job';
        const alreadySigned = res.volunteers && res.volunteers.includes(currentUser.uid);

        results.innerHTML += `
            <div class="resource-card">
                <span class="tag ${res.type}">${res.type}</span>
                <h3>${res.title}</h3>
                <p>${res.desc}</p>
                <p><small>Posted by: ${res.author}</small></p>
                ${isVolJob && currentUser.role === 'volunteer' ? 
                    `<button class="primary-btn" onclick="signUp('${doc.id}')" ${alreadySigned ? 'disabled' : ''}>
                        ${alreadySigned ? 'Signed Up ✓' : 'Sign Up to Volunteer'}
                    </button>` : ''}
            </div>`;
    });
}

async function signUp(listingId) {
    if (currentUser.role !== 'volunteer') return alert("Only volunteers can sign up!");
    
    try {
        await db.collection("resources").doc(listingId).update({
            volunteers: firebase.firestore.FieldValue.arrayUnion(currentUser.uid)
        });
        alert("Success! You are signed up.");
        renderSearch(); // Refresh the list
    } catch (e) { alert("Error signing up."); }
}

function toggleMenu() { document.getElementById('nav-dropdown').classList.toggle('show'); }
function logout() { auth.signOut(); }