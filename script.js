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
let roleCount = 0;

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
            <div style="display: flex; gap: 10px; margin-bottom: 10px;">
                <input type="text" id="reg-fname" placeholder="First Name" style="flex: 1;">
                <input type="text" id="reg-lname" placeholder="Last Name" style="flex: 1;">
            </div>`;
    } else if (role === 'org') {
        container.innerHTML = `<input type="text" id="reg-org-name" placeholder="Organization Name">`;
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
            const userCred = await auth.createUserWithEmailAndPassword(fakeEmail, pass);
            const role = document.getElementById('user-role').value;
            let profileData = { username: userIn, role: role };
            if (role === 'org') profileData.orgName = document.getElementById('reg-org-name').value;
            else {
                profileData.firstName = document.getElementById('reg-fname').value;
                profileData.lastName = document.getElementById('reg-lname').value;
            }
            await db.collection("profiles").doc(userCred.user.uid).set(profileData);
        } else {
            await auth.signInWithEmailAndPassword(fakeEmail, pass);
        }
    } catch (e) { alert(e.message); }
}

// --- 5. NAVIGATION ---
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
    btnContainer.innerHTML = (currentUser.role === 'org') ? `<button class="primary-btn" onclick="showSection('create-listing')">+ Create New Listing</button>` : "";
    btnContainer.innerHTML += `<button class="primary-btn" style="margin-top:10px" onclick="showSection('search')">Browse All Listings</button>`;
}

// --- 6. MULTI-ROLE LISTING LOGIC ---
function addVolunteerRoleField() {
    roleCount++;
    const container = document.getElementById('volunteer-positions-container');
    const roleDiv = document.createElement('div');
    roleDiv.className = 'role-input-group';
    roleDiv.innerHTML = `
        <div style="border: 1px dashed #6e84a3; padding: 15px; border-radius: 8px; margin-bottom: 15px; background: #f8f9fa; position: relative;">
            <button type="button" onclick="this.parentElement.remove()" style="position: absolute; right: 10px; top: 10px; border: none; background: none; cursor: pointer; color: red;">✕</button>
            <h4 style="margin: 0 0 10px 0;">Volunteer Role</h4>
            <input type="text" class="vol-role-name" placeholder="Role Name (e.g. Driver)">
            <textarea class="vol-role-desc" placeholder="What will they do?" rows="2"></textarea>
            <div style="display: flex; gap: 10px;">
                <input type="text" class="vol-skill" placeholder="Skill Required" style="flex: 2;">
                <input type="number" class="vol-slots" placeholder="Slots" style="flex: 1;">
            </div>
            <label style="font-size: 0.8em;">Urgency:</label>
            <select class="vol-urgency">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
            </select>
        </div>`;
    container.appendChild(roleDiv);
}

async function submitListing() {
    const title = document.getElementById('post-title').value.trim();
    const desc = document.getElementById('post-desc').value.trim();
    const type = document.getElementById('post-type').value;

    if (!title || !desc) return alert("Title and Description are required");

    const roleGroups = document.querySelectorAll('.role-input-group');
    const positions = [];
    roleGroups.forEach(group => {
        positions.push({
            roleName: group.querySelector('.vol-role-name').value,
            roleDesc: group.querySelector('.vol-role-desc').value,
            skill: group.querySelector('.vol-skill').value,
            slots: parseInt(group.querySelector('.vol-slots').value) || 1,
            urgency: group.querySelector('.vol-urgency').value,
            volunteers: [] 
        });
    });

    try {
        await db.collection("resources").add({
            title, desc, type,
            author: currentUser.orgName || currentUser.username,
            authorId: currentUser.uid,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            positions: positions
        });
        alert("Published!");
        document.getElementById('volunteer-positions-container').innerHTML = "";
        showSection('search');
    } catch (e) { alert(e.message); }
}

async function renderSearch() {
    const results = document.getElementById('search-results');
    results.innerHTML = "Loading...";
    const snapshot = await db.collection("resources").orderBy("timestamp", "desc").get();
    results.innerHTML = "";

    snapshot.forEach(doc => {
        const res = doc.data();
        let rolesHTML = "";

        if (res.positions && res.positions.length > 0) {
            res.positions.forEach((pos, idx) => {
                const filled = pos.volunteers ? pos.volunteers.length : 0;
                const isFull = filled >= pos.slots;
                const userSigned = pos.volunteers && pos.volunteers.includes(currentUser.uid);

                rolesHTML += `
                    <div style="background: #f1f4f9; padding: 10px; border-radius: 8px; margin-top: 10px; border-left: 4px solid #6e84a3;">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <div>
                                <h4 style="margin:0;">${pos.roleName} <small class="urgency-${pos.urgency}">(${pos.urgency})</small></h4>
                                <p style="font-size:0.85em; margin:2px 0;">${pos.roleDesc}</p>
                                <p style="font-size:0.8em; color:#666;"><b>${filled} / ${pos.slots} slots filled</b></p>
                            </div>
                            ${currentUser.role === 'volunteer' ? `
                                <button class="primary-btn" style="width:auto; padding:5px 10px;" 
                                    onclick="signUpForRole('${doc.id}', ${idx})" ${isFull || userSigned ? 'disabled' : ''}>
                                    ${userSigned ? 'Joined' : (isFull ? 'Full' : 'Join')}
                                </button>` : ''}
                        </div>
                    </div>`;
            });
        }

        results.innerHTML += `
            <div class="resource-card">
                <span class="tag ${res.type}">${res.type}</span>
                <h3>${res.title}</h3>
                <p>${res.desc}</p>
                ${rolesHTML}
                <p><small>By: ${res.author}</small></p>
            </div>`;
    });
}

async function signUpForRole(docId, roleIdx) {
    const docRef = db.collection("resources").doc(docId);
    const snap = await docRef.get();
    const positions = snap.data().positions;
    if (!positions[roleIdx].volunteers.includes(currentUser.uid)) {
        positions[roleIdx].volunteers.push(currentUser.uid);
        await docRef.update({ positions: positions });
        alert("Signed up!");
        renderSearch();
    }
}

function toggleMenu() { document.getElementById('nav-dropdown').classList.toggle('show'); }
function logout() { auth.signOut(); }