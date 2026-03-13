// --- 1. FIREBASE CONFIG ---
const firebaseConfig = {
  apiKey: "AIzaSyBJsqogYmqzRM_T9r03PvtPAsENe8Q2g3w",
  authDomain: "community-connect-8e9e2.firebaseapp.com",
  projectId: "community-connect-8e9e2",
  storageBucket: "community-connect-8e9e2.firebasestorage.app",
  messagingSenderId: "635552107936",
  appId: "1:635552107936:web:d05d2f40accbf0e32ea8c5",
  measurementId: "G-X71PEH5QS4",
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
    document
      .querySelectorAll("main > section")
      .forEach((s) => (s.style.display = "none"));
    document.getElementById("auth-section").style.display = "block";
    document.getElementById("main-nav").style.display = "none";
  }
});

// --- 4. AUTH & REGISTRATION ---
function setAuthMode(mode) {
  const isReg = mode === "reg";
  document.getElementById("auth-title").innerText = isReg
    ? "Register"
    : "Login";
  document.getElementById("auth-submit").innerText = isReg
    ? "Register"
    : "Login";
  document.getElementById("reg-fields").style.display = isReg
    ? "block"
    : "none";
  document.getElementById("tab-login").classList.toggle("active", !isReg);
  document.getElementById("tab-reg").classList.toggle("active", isReg);
  if (isReg) updateRoleFields();
}

function updateRoleFields() {
  const role = document.getElementById("user-role").value;
  const container = document.getElementById("dynamic-questions");
  container.innerHTML = "";

  if (role === "volunteer" || role === "caregiver") {
    container.innerHTML = `
      <div style="display: flex; gap: 10px; margin-bottom: 10px;">
        <input type="text" id="reg-fname" placeholder="First Name" style="flex: 1;">
        <input type="text" id="reg-lname" placeholder="Last Name" style="flex: 1;">
      </div>
      ${
        role === "volunteer"
          ? `<input type="text" id="reg-expertise" placeholder="Expertise (e.g. Nursing, Tech)">`
          : `<input type="text" id="reg-care-need" placeholder="Primary Care Need">`
      }`;
  } else if (role === "org") {
    container.innerHTML = `
      <input type="text" id="reg-org-name" placeholder="Organization Name">
      <input type="text" id="reg-website" placeholder="Website URL">`;
  }
}

async function handleAuth() {
  const userIn = document.getElementById("username").value.trim().toLowerCase();
  const pass = document.getElementById("password").value.trim();
  const errorEl = document.getElementById("auth-error");
  if (!userIn || !pass) return alert("Fill all fields");

  errorEl.style.display = "none";
  const fakeEmail = `${userIn}@community.connect`;
  const isRegMode =
    document.getElementById("reg-fields").style.display === "block";

  try {
    if (isRegMode) {
      const userCred = await auth.createUserWithEmailAndPassword(
        fakeEmail,
        pass,
      );
      const role = document.getElementById("user-role").value;
      let profileData = { username: userIn, role: role, details: {} };

      if (role === "org") {
        profileData.orgName = document.getElementById("reg-org-name").value;
        profileData.details.website =
          document.getElementById("reg-website").value;
      } else {
        profileData.firstName = document.getElementById("reg-fname").value;
        profileData.lastName = document.getElementById("reg-lname").value;
        if (role === "volunteer")
          profileData.details.expertise =
            document.getElementById("reg-expertise").value;
        else
          profileData.details.need =
            document.getElementById("reg-care-need").value;
      }
      await db.collection("profiles").doc(userCred.user.uid).set(profileData);
    } else {
      await auth.signInWithEmailAndPassword(fakeEmail, pass);
    }
  } catch (e) {
    errorEl.innerText = e.message;
    errorEl.style.display = "block";
  }
}

// --- 5. NAVIGATION ---
function initApp() {
  document.getElementById("auth-section").style.display = "none";
  document.getElementById("main-nav").style.display = "block";
  showSection("dashboard");
}

function showSection(id) {
  const sections = document.querySelectorAll("main > section");
  sections.forEach((s) => {
    if (s) s.style.display = "none";
  });

  const target = document.getElementById(id);
  if (target) {
    target.style.display = "block";
    if (id === "dashboard") renderDashboard();
    if (id === "search") renderSearch();
    if (id === "org-management") renderOrgManagement();
    if (id === "profile") {
      if (typeof renderProfile === "function") {
        renderProfile();
      } else {
        console.error("renderProfile function is missing!");
      }
    }
  } else {
    console.warn(
      `Attempted to show section "${id}", but it's missing from HTML.`,
    );
  }
}

// --- 6. MULTI-ROLE LISTING LOGIC ---
function renderDashboard() {
  const name =
    currentUser.firstName || currentUser.orgName || currentUser.username;
  document.getElementById("dash-title").innerText = `Hello, ${name}!`;
  const btnContainer = document.getElementById("action-buttons");

  // Role-specific tips
  const tips = {
    volunteer: [
      {
        icon: "🔍",
        title: "Browse Listings",
        desc: "Find events and services posted by local organizations that need your help.",
      },
      {
        icon: "✋",
        title: "Sign Up for Roles",
        desc: "Each listing has specific volunteer positions — join ones that match your expertise.",
      },
      {
        icon: "👤",
        title: "Keep Your Profile Updated",
        desc: "Organizations can see your expertise when reviewing applicants. Keep it current.",
      },
    ],
    caregiver: [
      {
        icon: "📋",
        title: "Browse Available Resources",
        desc: "Find services, events, and community resources available to support you.",
      },
      {
        icon: "🤝",
        title: "Connect with Organizations",
        desc: "Local organizations post resources specifically to help caregivers like you.",
      },
      {
        icon: "👤",
        title: "Manage Your Profile",
        desc: "Update your care needs anytime so we can surface the most relevant resources.",
      },
    ],
    org: [
      {
        icon: "📝",
        title: "Create a Listing",
        desc: "Post events, services, or resources. Add volunteer roles with specific skill requirements.",
      },
      {
        icon: "📋",
        title: "Manage Your Listings",
        desc: "View all your posts and see which volunteers have signed up for each role.",
      },
      {
        icon: "👥",
        title: "Review Applicants",
        desc: "Check volunteer profiles and expertise to make sure you have the right people.",
      },
    ],
  };

  const roleTips = tips[currentUser.role] || tips.volunteer;

  const tipsHTML = `
    <div class="tips-grid">
      ${roleTips
        .map(
          (tip) => `
        <div class="tip-card">
          <div class="tip-icon">${tip.icon}</div>
          <div>
            <h4 class="tip-title">${tip.title}</h4>
            <p class="tip-desc">${tip.desc}</p>
          </div>
        </div>
      `,
        )
        .join("")}
    </div>
  `;

  if (currentUser.role === "org") {
    btnContainer.innerHTML = `
      <button class="primary-btn" onclick="showSection('create-listing')">+ Create New Listing</button>
      <button class="secondary-btn" style="margin-top:10px" onclick="showSection('org-management')">📋 Manage My Listings & Applicants</button>
    `;
  } else {
    btnContainer.innerHTML = "";
  }

  btnContainer.innerHTML += `<button class="primary-btn" style="margin-top:10px" onclick="showSection('search')">Browse All Listings</button>`;
  btnContainer.innerHTML += tipsHTML;
}

function renderProfile() {
  const container = document.getElementById("profile-display");
  if (!currentUser || !container) return;

  let roleSpecificHTML = "";

  if (currentUser.role === "org") {
    roleSpecificHTML = `
      <p><strong>Organization:</strong> ${currentUser.orgName || "Not Set"}</p>
      <p><strong>Website:</strong> <a href="${currentUser.details?.website || "#"}" target="_blank">${currentUser.details?.website || "No website listed"}</a></p>
    `;
  } else if (currentUser.role === "volunteer") {
    roleSpecificHTML = `
      <p><strong>Name:</strong> ${currentUser.firstName} ${currentUser.lastName}</p>
      <p><strong>Expertise:</strong> ${currentUser.details?.expertise || "None listed"}</p>
    `;
  } else if (currentUser.role === "caregiver") {
    roleSpecificHTML = `
      <div id="caregiver-view-mode">
        <p><strong>First Name:</strong> ${currentUser.firstName}</p>
        <p><strong>Last Name:</strong> ${currentUser.lastName}</p>
        <p><strong>Primary Care Need:</strong> ${currentUser.details?.need || "None listed"}</p>
        <button class="secondary-btn" onclick="toggleProfileEdit(true)" style="margin-top:10px;">Edit Profile Details</button>
      </div>
      <div id="caregiver-edit-mode" style="display:none;">
        <label>First Name:</label>
        <input type="text" id="edit-fname" value="${currentUser.firstName}">
        <label>Last Name:</label>
        <input type="text" id="edit-lname" value="${currentUser.lastName}">
        <label>Primary Care Need:</label>
        <textarea id="edit-need">${currentUser.details?.need || ""}</textarea>
        <div style="display:flex; gap:10px; margin-top:10px;">
          <button class="primary-btn" onclick="saveProfile()">Save Changes</button>
          <button class="secondary-btn" onclick="toggleProfileEdit(false)">Cancel</button>
        </div>
      </div>
    `;
  }

  container.innerHTML = `
    <div style="border-bottom: 2px solid #f1f4f9; margin-bottom: 15px; padding-bottom: 10px;">
      <p><strong>Username:</strong> ${currentUser.username}</p>
      <p><strong>Account Type:</strong> <span class="tag ${currentUser.role}">${currentUser.role.toUpperCase()}</span></p>
    </div>
    ${roleSpecificHTML}
  `;
}

function addVolunteerRoleField() {
  roleCount++;
  const container = document.getElementById("volunteer-positions-container");
  const roleDiv = document.createElement("div");
  roleDiv.className = "role-input-group";
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
  const title = document.getElementById("post-title").value.trim();
  const desc = document.getElementById("post-desc").value.trim();
  const type = document.getElementById("post-type").value;

  if (!title || !desc) return alert("Title and Description are required");

  const roleGroups = document.querySelectorAll(".role-input-group");
  const positions = [];

  roleGroups.forEach((group) => {
    const rName =
      group.querySelector(".vol-role-name")?.value || "General Volunteer";
    const rDesc = group.querySelector(".vol-role-desc")?.value || "";
    const rSkill = group.querySelector(".vol-skill")?.value || "None";
    const rSlots = parseInt(group.querySelector(".vol-slots")?.value) || 1;
    const rUrgency = group.querySelector(".vol-urgency")?.value || "low";

    positions.push({
      roleName: rName,
      roleDesc: rDesc,
      skill: rSkill,
      slots: rSlots,
      urgency: rUrgency,
      volunteers: [],
    });
  });

  try {
    await db.collection("resources").add({
      title,
      desc,
      type,
      author: currentUser.orgName || currentUser.username,
      authorId: currentUser.uid,
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      positions: positions,
    });
    alert("Published!");
    document.getElementById("post-title").value = "";
    document.getElementById("post-desc").value = "";
    document.getElementById("volunteer-positions-container").innerHTML = "";
    showSection("search");
  } catch (e) {
    alert("Error: " + e.message);
  }
}

async function renderSearch() {
  const results = document.getElementById("search-results");
  const filterValue = document.getElementById("category-filter").value;

  results.innerHTML = "Loading...";

  try {
    let query = db.collection("resources");

    if (filterValue !== "all") {
      query = query.where("type", "==", filterValue);
    }

    const snapshot = await query.orderBy("timestamp", "desc").get();
    results.innerHTML = "";

    if (snapshot.empty) {
      results.innerHTML = `<p style="text-align:center; color:#666;">No ${filterValue}s found.</p>`;
      return;
    }

    snapshot.forEach((doc) => {
      const res = doc.data();
      const isClosed = res.closed === true;
      let rolesHTML = "";

      if (res.positions && res.positions.length > 0) {
        res.positions.forEach((pos, idx) => {
          const filled = (pos.volunteers || []).length;
          const isFull = filled >= pos.slots;
          const isClosed_pos = pos.closed === true;
          const userSigned = (pos.volunteers || []).includes(currentUser.uid);

          // Determine position status
          let statusBadge = "";
          let cardClass = "position-card";
          if (isClosed_pos) {
            statusBadge = `<span class="status-badge status-closed">Closed</span>`;
            cardClass += " position-closed";
          } else if (isFull) {
            statusBadge = `<span class="status-badge status-filled">Filled</span>`;
            cardClass += " position-filled";
          } else if (pos.urgency === "high") {
            statusBadge = `<span class="status-badge status-urgent">🔴 Urgent</span>`;
            cardClass += " position-urgent";
          }

          // Join button logic
          let joinBtn = "";
          if (currentUser.role === "volunteer") {
            if (userSigned) {
              joinBtn = `<button class="join-btn joined" disabled>✓ Joined</button>`;
            } else if (isClosed_pos) {
              joinBtn = `<button class="join-btn closed-btn" disabled>Closed</button>`;
            } else if (isFull) {
              joinBtn = `<button class="join-btn full-btn" disabled>Full</button>`;
            } else {
              joinBtn = `<button class="join-btn" onclick="signUpForRole('${doc.id}', ${idx})">Join</button>`;
            }
          }

          rolesHTML += `
            <div class="${cardClass}">
              <div class="position-header">
                <div class="position-info">
                  <div class="position-title-row">
                    <h4>${pos.roleName}</h4>
                    <span class="urgency-tag urgency-${pos.urgency}">${pos.urgency}</span>
                    ${statusBadge}
                  </div>
                  <p class="position-desc">${pos.roleDesc}</p>
                  <p class="position-slots"><b>${filled} / ${pos.slots} slots filled</b>
                    ${pos.skill && pos.skill !== "None" ? `· Skill: ${pos.skill}` : ""}
                  </p>
                </div>
                ${joinBtn}
              </div>
            </div>`;
        });
      }

      // Card border color based on listing status
      const cardBorderColor = isClosed ? "#adb5bd" : "var(--primary-light)";
      const closedBanner = isClosed
        ? `<div class="listing-closed-banner">🔒 This listing is closed — no new sign-ups accepted</div>`
        : "";

      results.innerHTML += `
        <div class="resource-card" style="border-left-color: ${cardBorderColor}; ${isClosed ? "opacity:0.75;" : ""}">
          <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
            <span class="tag ${res.type}">${res.type}</span>
            ${isClosed ? `<span class="status-badge status-closed">Listing Closed</span>` : ""}
          </div>
          <h3>${res.title}</h3>
          <p>${res.desc}</p>
          ${closedBanner}
          ${rolesHTML}
          <p style="margin-top:10px;"><small>By: ${res.author}</small></p>
        </div>`;
    });
  } catch (e) {
    console.error("Error filtering:", e);
    results.innerHTML =
      "Error loading listings. Make sure your Firestore indexes are set.";
  }
}

async function signUpForRole(docId, roleIdx) {
  const docRef = db.collection("resources").doc(docId);
  try {
    const snap = await docRef.get();
    const positions = snap.data().positions;
    if (!positions[roleIdx].volunteers.includes(currentUser.uid)) {
      positions[roleIdx].volunteers.push(currentUser.uid);
      await docRef.update({ positions: positions });
      alert("Signed up!");
      renderSearch();
    }
  } catch (e) {
    alert("Error signing up.");
  }
}

function toggleMenu() {
  document.getElementById("nav-dropdown").classList.toggle("show");
}

function logout() {
  auth.signOut().then(() => {
    document
      .querySelectorAll("main > section")
      .forEach((s) => (s.style.display = "none"));
    document.getElementById("auth-section").style.display = "block";
    document.getElementById("main-nav").style.display = "none";
    document.getElementById("username").value = "";
    document.getElementById("password").value = "";
  });
}

function toggleProfileEdit(isEditing) {
  document.getElementById("caregiver-view-mode").style.display = isEditing
    ? "none"
    : "block";
  document.getElementById("caregiver-edit-mode").style.display = isEditing
    ? "block"
    : "none";
}

async function saveProfile() {
  const newFname = document.getElementById("edit-fname").value.trim();
  const newLname = document.getElementById("edit-lname").value.trim();
  const newNeed = document.getElementById("edit-need").value.trim();

  if (!newFname || !newLname) return alert("Names cannot be empty");

  try {
    const userRef = db.collection("profiles").doc(currentUser.uid);
    await userRef.update({
      firstName: newFname,
      lastName: newLname,
      "details.need": newNeed,
    });

    currentUser.firstName = newFname;
    currentUser.lastName = newLname;
    currentUser.details.need = newNeed;

    alert("Profile updated successfully!");
    renderProfile();
  } catch (e) {
    console.error("Error updating profile:", e);
    alert("Failed to update profile.");
  }
}

async function renderOrgManagement() {
  const container = document.getElementById("my-listings-container");
  container.innerHTML = "<p>Loading your listings...</p>";

  try {
    const snapshot = await db
      .collection("resources")
      .where("authorId", "==", currentUser.uid)
      .get();

    if (snapshot.empty) {
      container.innerHTML = "<p>You haven't posted any listings yet.</p>";
      return;
    }

    container.innerHTML = "";

    for (const doc of snapshot.docs) {
      const res = doc.data();
      const isListingClosed = res.closed === true;
      let rolesSectionHTML = "";

      for (let posIdx = 0; posIdx < res.positions.length; posIdx++) {
        const pos = res.positions[posIdx];
        const isFull = (pos.volunteers || []).length >= pos.slots;
        const isPosClose = pos.closed === true;
        let volunteerListHTML = "";

        if (pos.volunteers && pos.volunteers.length > 0) {
          for (const vUid of pos.volunteers) {
            const vDoc = await db.collection("profiles").doc(vUid).get();
            const vData = vDoc.data();
            volunteerListHTML += `
              <div class="volunteer-entry">
                <strong>👤 ${vData.firstName} ${vData.lastName}</strong>
                <span>Expertise: ${vData.details?.expertise || "Not specified"}</span>
              </div>`;
          }
        } else {
          volunteerListHTML = "<p class='no-applicants'>No applicants yet.</p>";
        }

        // Status label for position
        let posStatusBadge = "";
        if (isPosClose) {
          posStatusBadge = `<span class="status-badge status-closed">Closed</span>`;
        } else if (isFull) {
          posStatusBadge = `<span class="status-badge status-filled">Filled</span>`;
        } else if (pos.urgency === "high") {
          posStatusBadge = `<span class="status-badge status-urgent">Urgent</span>`;
        }

        rolesSectionHTML += `
          <div class="org-position-card ${isPosClose ? "position-closed" : ""}">
            <div class="org-position-header">
              <div>
                <span class="org-position-title">${pos.roleName}</span>
                <span class="urgency-tag urgency-${pos.urgency}">${pos.urgency}</span>
                ${posStatusBadge}
                <span class="slots-info">${(pos.volunteers || []).length}/${pos.slots} filled</span>
              </div>
              ${
                !isListingClosed
                  ? `
                <button class="toggle-pos-btn" onclick="togglePositionClosed('${doc.id}', ${posIdx}, ${isPosClose})">
                  ${isPosClose ? "↩ Reopen" : "🔒 Close Position"}
                </button>`
                  : ""
              }
            </div>
            ${volunteerListHTML}
          </div>`;
      }

      const borderColor = isListingClosed ? "#adb5bd" : "#28a745";
      container.innerHTML += `
        <div class="resource-card org-listing-card" style="border-left: 5px solid ${borderColor}; ${isListingClosed ? "opacity:0.8;" : ""}">
          <div class="org-listing-header">
            <div>
              <h3 style="margin: 0 0 4px 0;">${res.title}</h3>
              <p style="font-size: 0.85em; color: #666; margin:0;">Type: ${res.type.toUpperCase()}</p>
            </div>
            <div class="org-listing-actions">
              ${
                isListingClosed
                  ? `<span class="status-badge status-closed">Listing Closed</span>
                   <button class="reopen-btn" onclick="toggleListingClosed('${doc.id}', true)">↩ Reopen</button>`
                  : `<button class="close-listing-btn" onclick="toggleListingClosed('${doc.id}', false)">🔒 Close Listing</button>`
              }
            </div>
          </div>
          ${rolesSectionHTML}
        </div>`;
    }
  } catch (e) {
    console.error("Error loading roster:", e);
    container.innerHTML = "<p>Error loading data. Check console.</p>";
  }
}

// --- REQ 6: CLOSE / REOPEN A FULL LISTING ---
async function toggleListingClosed(docId, isCurrentlyClosed) {
  const confirmMsg = isCurrentlyClosed
    ? "Reopen this listing so volunteers can sign up again?"
    : "Close this listing? Volunteers will no longer be able to sign up.";
  if (!confirm(confirmMsg)) return;

  try {
    await db
      .collection("resources")
      .doc(docId)
      .update({ closed: !isCurrentlyClosed });
    renderOrgManagement();
  } catch (e) {
    alert("Error updating listing: " + e.message);
  }
}

// --- REQ 6: CLOSE / REOPEN A SINGLE POSITION ---
async function togglePositionClosed(docId, posIdx, isCurrentlyClosed) {
  const confirmMsg = isCurrentlyClosed
    ? "Reopen this position?"
    : "Close this position? Volunteers will no longer be able to join.";
  if (!confirm(confirmMsg)) return;

  try {
    const docRef = db.collection("resources").doc(docId);
    const snap = await docRef.get();
    const positions = snap.data().positions;
    positions[posIdx].closed = !isCurrentlyClosed;
    await docRef.update({ positions });
    renderOrgManagement();
  } catch (e) {
    alert("Error updating position: " + e.message);
  }
}
