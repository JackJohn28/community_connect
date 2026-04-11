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
  try {
    if (user) {
      const doc = await db.collection("profiles").doc(user.uid).get();
      if (doc.exists) {
        const data = doc.data();
        if (!data.details) data.details = {};
        currentUser = { uid: user.uid, ...data };
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
  } catch (e) {
    console.error("Auth state change error:", e);
    const errorEl = document.getElementById("auth-error");
    if (errorEl) {
      errorEl.innerText = "Error loading profile: " + e.message;
      errorEl.style.display = "block";
    }
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
          ? `<input type="text" id="reg-expertise" placeholder="Expertise (e.g. Nursing, Tech)">
             <label style="margin-top:10px;">Your general availability:</label>
             <div style="display: flex; gap: 10px; margin-top: 4px;">
               <div style="flex:1;">
                 <label style="font-size:0.75em;">Available from</label>
                 <input type="time" id="reg-avail-start">
               </div>
               <div style="flex:1;">
                 <label style="font-size:0.75em;">Available until</label>
                 <input type="time" id="reg-avail-end">
               </div>
             </div>`
          : `<input type="text" id="reg-care-need" placeholder="Primary Care Need">`
      }`;
  } else if (role === "org") {
    container.innerHTML = `
      <input type="text" id="reg-org-name" placeholder="Organization Name">
      <input type="text" id="reg-website" placeholder="Website URL">
      <textarea id="reg-org-desc" placeholder="Brief description of your organization" rows="2"></textarea>`;
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
    let uid;

    if (isRegMode) {
      const userCred = await auth.createUserWithEmailAndPassword(
        fakeEmail,
        pass,
      );
      uid = userCred.user.uid;
      const role = document.getElementById("user-role").value;
      let profileData = { username: userIn, role: role, details: {} };

      if (role === "org") {
        profileData.orgName = document.getElementById("reg-org-name").value;
        profileData.details.website =
          document.getElementById("reg-website").value;
        profileData.details.description =
          document.getElementById("reg-org-desc").value;
      } else {
        profileData.firstName = document.getElementById("reg-fname").value;
        profileData.lastName = document.getElementById("reg-lname").value;
        if (role === "volunteer") {
          profileData.details.expertise =
            document.getElementById("reg-expertise").value;
          profileData.details.availStart =
            document.getElementById("reg-avail-start").value;
          profileData.details.availEnd =
            document.getElementById("reg-avail-end").value;
        } else {
          profileData.details.need =
            document.getElementById("reg-care-need").value;
        }
      }
      await db.collection("profiles").doc(uid).set(profileData);
    } else {
      const userCred = await auth.signInWithEmailAndPassword(fakeEmail, pass);
      uid = userCred.user.uid;
    }

    const doc = await db.collection("profiles").doc(uid).get();
    if (doc.exists) {
      const data = doc.data();
      if (!data.details) data.details = {};
      currentUser = { uid, ...data };
      initApp();
    } else {
      errorEl.innerText = "Profile not found. Try registering first.";
      errorEl.style.display = "block";
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
        if (currentUser.role === "volunteer") {
          renderVolunteerHours();
        }
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

// --- 6. DASHBOARD ---
function renderDashboard() {
  const name =
    currentUser.firstName || currentUser.orgName || currentUser.username;
  document.getElementById("dash-title").innerText = `Hello, ${name}!`;
  const btnContainer = document.getElementById("action-buttons");

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

// --- 7. PROFILE ---
function renderProfile() {
  const container = document.getElementById("profile-display");
  if (!currentUser || !container) return;

  let roleSpecificHTML = "";

  if (currentUser.role === "org") {
    roleSpecificHTML = `
      <div id="org-view-mode">
        <p><strong>Organization:</strong> ${currentUser.orgName || "Not Set"}</p>
        <p><strong>Website:</strong> <a href="${currentUser.details?.website || "#"}" target="_blank">${currentUser.details?.website || "No website listed"}</a></p>
        <p><strong>Description:</strong> ${currentUser.details?.description || "No description listed"}</p>
        <button class="secondary-btn" onclick="toggleOrgEdit(true)" style="margin-top:10px;">Edit Profile Details</button>
      </div>
      <div id="org-edit-mode" style="display:none;">
        <label>Organization Name:</label>
        <input type="text" id="edit-org-name" value="${currentUser.orgName || ""}">
        <label>Website:</label>
        <input type="text" id="edit-org-website" value="${currentUser.details?.website || ""}">
        <label>Description:</label>
        <textarea id="edit-org-desc">${currentUser.details?.description || ""}</textarea>
        <div style="display:flex; gap:10px; margin-top:10px;">
          <button class="primary-btn" onclick="saveOrgProfile()">Save Changes</button>
          <button class="secondary-btn" onclick="toggleOrgEdit(false)">Cancel</button>
        </div>
      </div>
    `;
  } else if (currentUser.role === "volunteer") {
    roleSpecificHTML = `
      <div id="volunteer-view-mode">
        <p><strong>Name:</strong> ${currentUser.firstName} ${currentUser.lastName}</p>
        <p><strong>Expertise:</strong> ${currentUser.details?.expertise || "None listed"}</p>
        <p><strong>Available:</strong> ${formatTimeRange(currentUser.details?.availStart, currentUser.details?.availEnd)}</p>
        <button class="secondary-btn" onclick="toggleVolunteerEdit(true)" style="margin-top:10px;">Edit Profile Details</button>
      </div>
      <div id="volunteer-edit-mode" style="display:none;">
        <label>First Name:</label>
        <input type="text" id="edit-vol-fname" value="${currentUser.firstName}">
        <label>Last Name:</label>
        <input type="text" id="edit-vol-lname" value="${currentUser.lastName}">
        <label>Expertise:</label>
        <input type="text" id="edit-vol-expertise" value="${currentUser.details?.expertise || ""}">
        <label>Available from:</label>
        <input type="time" id="edit-vol-avail-start" value="${currentUser.details?.availStart || ""}">
        <label>Available until:</label>
        <input type="time" id="edit-vol-avail-end" value="${currentUser.details?.availEnd || ""}">
        <div style="display:flex; gap:10px; margin-top:10px;">
          <button class="primary-btn" onclick="saveVolunteerProfile()">Save Changes</button>
          <button class="secondary-btn" onclick="toggleVolunteerEdit(false)">Cancel</button>
        </div>
      </div>
      <div style="margin-top: 24px; border-top: 2px solid #f1f4f9; padding-top: 16px;">
        <h3 style="font-size:1rem; font-weight:600; color:#1a3a5c; margin-bottom:10px;">My Volunteer Hours</h3>
        <div id="volunteer-hours-container"></div>
      </div>
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

// --- 8. TIME / DATE HELPERS ---
function formatTime(t) {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
}

function formatTimeRange(start, end) {
  const s = formatTime(start);
  const e = formatTime(end);
  if (!s && !e) return "Not specified";
  if (s && e) return `${s} – ${e}`;
  return s || e;
}

function formatDate(d) {
  if (!d) return null;
  const [year, month, day] = d.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function listingMatchesTimeFilter(listing, filterDate, filterTime) {
  if (!filterDate && !filterTime) return true;
  if (filterDate) {
    if (!listing.eventDate) return false;
    if (listing.eventDate !== filterDate) return false;
  }
  if (filterTime) {
    if (!listing.eventTimeStart || !listing.eventTimeEnd) return false;
    if (
      filterTime < listing.eventTimeStart ||
      filterTime > listing.eventTimeEnd
    )
      return false;
  }
  return true;
}

function clearTimeFilters() {
  document.getElementById("date-filter").value = "";
  document.getElementById("time-filter").value = "";
  renderSearch();
}

// --- 9. PROFILE EDIT TOGGLES & SAVES ---
function toggleVolunteerEdit(isEditing) {
  document.getElementById("volunteer-view-mode").style.display = isEditing
    ? "none"
    : "block";
  document.getElementById("volunteer-edit-mode").style.display = isEditing
    ? "block"
    : "none";
}

async function saveVolunteerProfile() {
  const newFname = document.getElementById("edit-vol-fname").value.trim();
  const newLname = document.getElementById("edit-vol-lname").value.trim();
  const newExpertise = document
    .getElementById("edit-vol-expertise")
    .value.trim();
  const newAvailStart = document.getElementById("edit-vol-avail-start").value;
  const newAvailEnd = document.getElementById("edit-vol-avail-end").value;

  if (!newFname || !newLname) return alert("Names cannot be empty");

  try {
    const userRef = db.collection("profiles").doc(currentUser.uid);
    await userRef.update({
      firstName: newFname,
      lastName: newLname,
      "details.expertise": newExpertise,
      "details.availStart": newAvailStart,
      "details.availEnd": newAvailEnd,
    });
    currentUser.firstName = newFname;
    currentUser.lastName = newLname;
    currentUser.details.expertise = newExpertise;
    currentUser.details.availStart = newAvailStart;
    currentUser.details.availEnd = newAvailEnd;
    alert("Profile updated successfully!");
    renderProfile();
    renderVolunteerHours();
  } catch (e) {
    console.error("Error updating volunteer profile:", e);
    alert("Failed to update profile.");
  }
}

function toggleOrgEdit(isEditing) {
  document.getElementById("org-view-mode").style.display = isEditing
    ? "none"
    : "block";
  document.getElementById("org-edit-mode").style.display = isEditing
    ? "block"
    : "none";
}

async function saveOrgProfile() {
  const newOrgName = document.getElementById("edit-org-name").value.trim();
  const newWebsite = document.getElementById("edit-org-website").value.trim();
  const newDesc = document.getElementById("edit-org-desc").value.trim();

  if (!newOrgName) return alert("Organization name cannot be empty");

  try {
    const userRef = db.collection("profiles").doc(currentUser.uid);
    await userRef.update({
      orgName: newOrgName,
      "details.website": newWebsite,
      "details.description": newDesc,
    });
    currentUser.orgName = newOrgName;
    currentUser.details.website = newWebsite;
    currentUser.details.description = newDesc;
    alert("Profile updated successfully!");
    renderProfile();
  } catch (e) {
    console.error("Error updating org profile:", e);
    alert("Failed to update profile.");
  }
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

// --- 10. CREATE LISTING ---
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
  const eventDate = document.getElementById("post-date").value;
  const eventTimeStart = document.getElementById("post-time-start").value;
  const eventTimeEnd = document.getElementById("post-time-end").value;

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
      orgName: currentUser.orgName || currentUser.username,
      orgDescription: currentUser.details?.description || "",
      orgWebsite: currentUser.details?.website || "",
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      positions: positions,
      eventDate: eventDate || "",
      eventTimeStart: eventTimeStart || "",
      eventTimeEnd: eventTimeEnd || "",
    });
    alert("Published!");
    document.getElementById("post-title").value = "";
    document.getElementById("post-desc").value = "";
    document.getElementById("post-date").value = "";
    document.getElementById("post-time-start").value = "";
    document.getElementById("post-time-end").value = "";
    document.getElementById("volunteer-positions-container").innerHTML = "";
    showSection("search");
  } catch (e) {
    alert("Error: " + e.message);
  }
}

// --- 11. SEARCH & BROWSE (301/302: skill match badges) ---
async function renderSearch() {
  const results = document.getElementById("search-results");
  const filterValue = document.getElementById("category-filter").value;
  const filterDate = document.getElementById("date-filter").value;
  const filterTime = document.getElementById("time-filter").value;

  results.innerHTML = "Loading...";

  try {
    let query = db.collection("resources");
    if (filterValue !== "all") {
      query = query.where("type", "==", filterValue);
    }

    const snapshot = await query.orderBy("timestamp", "desc").get();
    results.innerHTML = "";

    const docs = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (listingMatchesTimeFilter(data, filterDate, filterTime)) {
        docs.push({ id: doc.id, data });
      }
    });

    if (docs.length === 0) {
      const msg =
        filterDate || filterTime
          ? `<p style="text-align:center; color:#666;">No listings found matching your date/time filter. <a href="#" onclick="clearTimeFilters(); return false;">Clear filters</a></p>`
          : `<p style="text-align:center; color:#666;">No ${filterValue === "all" ? "" : filterValue + "s"} found.</p>`;
      results.innerHTML = msg;
      return;
    }

    for (const { id: docId, data: res } of docs) {
      let rolesHTML = "";

      if (res.positions && res.positions.length > 0) {
        res.positions.forEach((pos, idx) => {
          const filled = (pos.volunteers || []).length;
          const isFull = filled >= pos.slots;
          const userSigned = (pos.volunteers || []).includes(currentUser.uid);

          const skillRequired =
            pos.skill && pos.skill !== "None" ? pos.skill : null;
          const volunteerExpertise = currentUser.details?.expertise || "";
          const isMatch =
            skillRequired &&
            volunteerExpertise
              .toLowerCase()
              .includes(skillRequired.toLowerCase());

          const matchBadge =
            currentUser.role === "volunteer" && skillRequired
              ? `<span style="
                  display:inline-block; margin-left:6px; font-size:0.65em; font-weight:700;
                  padding:2px 7px; border-radius:4px; text-transform:uppercase; letter-spacing:0.05em;
                  background:${isMatch ? "#d1fae5" : "#f1f4f9"};
                  color:${isMatch ? "#065f46" : "#4a6580"};">
                  ${isMatch ? "Matches your skills" : `Needs: ${skillRequired}`}
                </span>`
              : skillRequired
                ? `<span style="font-size:0.78em; color:#666; margin-left:6px;">Skill: ${skillRequired}</span>`
                : "";

          rolesHTML += `
            <div style="background: #f1f4f9; padding: 10px; border-radius: 8px; margin-top: 10px; border-left: 4px solid #6e84a3;">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <div>
                  <h4 style="margin:0;">${pos.roleName} <span class="urgency-tag urgency-${pos.urgency}">${pos.urgency}</span>${matchBadge}</h4>
                  <p style="font-size:0.85em; margin:2px 0;">${pos.roleDesc}</p>
                  <p style="font-size:0.8em; color:#666;"><b>${filled} / ${pos.slots} slots filled</b></p>
                </div>
                ${
                  currentUser.role === "volunteer"
                    ? `<button class="primary-btn" style="width:auto; padding:5px 10px;"
                        onclick="signUpForRole('${docId}', ${idx})" ${isFull || userSigned ? "disabled" : ""}>
                        ${userSigned ? "Joined" : isFull ? "Full" : "Join"}
                      </button>`
                    : ""
                }
              </div>
            </div>`;
        });
      }

      let timeBadgeHTML = "";
      if (res.eventDate || res.eventTimeStart) {
        const datePart = res.eventDate ? `📅 ${formatDate(res.eventDate)}` : "";
        const timePart =
          res.eventTimeStart || res.eventTimeEnd
            ? `🕐 ${formatTimeRange(res.eventTimeStart, res.eventTimeEnd)}`
            : "";
        timeBadgeHTML = `
          <div style="display:flex; gap:12px; flex-wrap:wrap; margin: 6px 0 4px; font-size:0.82em; color:#4a6580;">
            ${datePart ? `<span>${datePart}</span>` : ""}
            ${timePart ? `<span>${timePart}</span>` : ""}
          </div>`;
      }

      const orgWebsite = res.orgWebsite || "";
      const orgDesc = res.orgDescription || "";
      const orgInfoHTML = `
        <div class="org-info-block">
          <div class="org-info-header">
            <div class="org-avatar">${(res.orgName || res.author || "?")[0].toUpperCase()}</div>
            <div>
              <span class="org-info-name">${res.orgName || res.author}</span>
              ${orgWebsite ? `<a href="${orgWebsite}" target="_blank" class="org-info-link">Visit website ↗</a>` : ""}
            </div>
          </div>
          ${orgDesc ? `<p class="org-info-desc">${orgDesc}</p>` : ""}
        </div>`;

      results.innerHTML += `
        <div class="resource-card">
          <span class="tag ${res.type}">${res.type}</span>
          <h3>${res.title}</h3>
          <p>${res.desc}</p>
          ${timeBadgeHTML}
          ${rolesHTML}
          ${orgInfoHTML}
        </div>`;
    }
  } catch (e) {
    console.error("Error filtering:", e);
    results.innerHTML =
      "Error loading listings. Make sure your Firestore indexes are set.";
  }
}

// --- 12. SIGN UP FOR ROLE ---
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

// --- 13. ORG MANAGEMENT (301: skill match on applicants, 901: log hours button) ---
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
      let rolesSectionHTML = "";
      const positions = res.positions || [];

      for (const pos of positions) {
        let volunteerListHTML = "";
        const volunteers = pos.volunteers || [];

        if (volunteers.length > 0) {
          for (const vUid of volunteers) {
            try {
              const vDoc = await db.collection("profiles").doc(vUid).get();
              if (vDoc.exists) {
                const vData = vDoc.data();
                if (!vData.details) vData.details = {};

                const vExpertise = vData.details?.expertise || "";
                const reqSkill =
                  pos.skill && pos.skill !== "None" ? pos.skill : null;
                const vMatch =
                  reqSkill &&
                  vExpertise.toLowerCase().includes(reqSkill.toLowerCase());
                const vMatchBadge = reqSkill
                  ? `<span style="
                      float:right; font-size:0.7em; font-weight:700; padding:2px 7px;
                      border-radius:4px; text-transform:uppercase; letter-spacing:0.04em;
                      background:${vMatch ? "#d1fae5" : "#fff7ed"};
                      color:${vMatch ? "#065f46" : "#92400e"};">
                      ${vMatch ? "Skill match" : "Skill gap"}
                    </span>`
                  : "";

                const vFullName =
                  `${vData.firstName || ""} ${vData.lastName || ""}`.trim();
                volunteerListHTML += `
                  <div style="font-size: 0.9em; background: white; padding: 8px; border-radius: 4px; margin-top: 5px; border: 1px solid #eee;">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">
                      <div>
                        <strong>👤 ${vFullName}</strong>
                        ${vMatchBadge}
                        <br>
                        <span style="color: #666;">Expertise: ${vExpertise || "Not specified"}</span><br>
                        <span style="color: #666;">Availability: ${formatTimeRange(vData.details?.availStart, vData.details?.availEnd)}</span>
                      </div>
                      <button
                        class="primary-btn"
                        style="width:auto; padding:4px 10px; font-size:0.78em; white-space:nowrap; margin-top:0;"
                        onclick="logHours('${vUid}', '${vFullName.replace(/'/g, "\\'")}', '${res.title.replace(/'/g, "\\'")}', '${pos.roleName.replace(/'/g, "\\'")}')">
                        + Log Hours
                      </button>
                    </div>
                  </div>`;
              } else {
                volunteerListHTML += `<p style="font-size:0.8em; color:#999;">Volunteer profile not found.</p>`;
              }
            } catch (vErr) {
              console.warn(
                "Could not load volunteer profile:",
                vUid,
                vErr.message,
              );
              volunteerListHTML += `<p style="font-size:0.8em; color:#999;">Volunteer info unavailable.</p>`;
            }
          }
        } else {
          volunteerListHTML =
            "<p style='font-size: 0.8em; color: #999;'>No applicants yet.</p>";
        }

        rolesSectionHTML += `
          <div style="margin-top: 15px; padding: 10px; background: #f8f9fa; border-radius: 6px;">
            <h4 style="margin: 0 0 5px 0;">${pos.roleName} (${volunteers.length}/${pos.slots} filled)</h4>
            ${volunteerListHTML}
          </div>`;
      }

      if (positions.length === 0) {
        rolesSectionHTML =
          "<p style='font-size: 0.85em; color: #999;'>No volunteer positions added.</p>";
      }

      let timeLine = "";
      if (res.eventDate || res.eventTimeStart) {
        const datePart = res.eventDate ? formatDate(res.eventDate) : "";
        const timePart = formatTimeRange(res.eventTimeStart, res.eventTimeEnd);
        timeLine = `<p style="font-size:0.82em; color:#4a6580; margin:2px 0;">📅 ${datePart}${datePart && timePart !== "Not specified" ? " · " : ""}${timePart !== "Not specified" ? "🕐 " + timePart : ""}</p>`;
      }

      container.innerHTML += `
        <div class="resource-card" style="border-left: 5px solid #28a745; margin-bottom: 20px;">
          <h3 style="margin-top: 0;">${res.title}</h3>
          <p style="font-size: 0.85em; color: #666;">Type: ${res.type.toUpperCase()}</p>
          ${timeLine}
          ${rolesSectionHTML}
        </div>`;
    }
  } catch (e) {
    console.error("Error loading roster:", e);
    container.innerHTML = `<p style="color:#c53030;">Error: ${e.message}</p>`;
  }
}

// --- 14. HOUR LOGGING (901/902) ---
async function logHours(volunteerUid, volunteerName, listingTitle, roleName) {
  const hoursStr = prompt(
    `Log hours for ${volunteerName} on "${roleName}" (${listingTitle}):\nEnter number of hours:`,
  );
  if (hoursStr === null) return;
  const hours = parseFloat(hoursStr);
  if (isNaN(hours) || hours <= 0)
    return alert("Please enter a valid number of hours.");

  try {
    await db
      .collection("profiles")
      .doc(volunteerUid)
      .collection("hours")
      .add({
        hours: hours,
        listingTitle: listingTitle,
        roleName: roleName,
        loggedBy: currentUser.orgName || currentUser.username,
        loggedByUid: currentUser.uid,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      });
    alert(`${hours} hour(s) logged for ${volunteerName}.`);
  } catch (e) {
    console.error("Error logging hours:", e);
    alert("Failed to log hours: " + e.message);
  }
}

async function renderVolunteerHours() {
  const container = document.getElementById("volunteer-hours-container");
  if (!container) return;
  container.innerHTML = `<p style="font-size:0.85em; color:#666;">Loading hours...</p>`;

  try {
    const snapshot = await db
      .collection("profiles")
      .doc(currentUser.uid)
      .collection("hours")
      .orderBy("timestamp", "desc")
      .get();

    if (snapshot.empty) {
      container.innerHTML = `<p style="font-size:0.85em; color:#999;">No hours logged yet.</p>`;
      return;
    }

    let total = 0;
    let logHTML = "";

    snapshot.forEach((doc) => {
      const entry = doc.data();
      total += entry.hours || 0;
      const date = entry.timestamp?.toDate
        ? entry.timestamp.toDate().toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })
        : "Date pending";

      logHTML += `
        <div class="hours-log-entry">
          <div>
            <span class="hours-log-title">${entry.listingTitle}</span>
            <span class="hours-log-role">${entry.roleName}</span>
          </div>
          <div class="hours-log-meta">
            <span>Approved by ${entry.loggedBy}</span>
            <span>${date}</span>
          </div>
          <div class="hours-log-value">+${entry.hours} hr${entry.hours !== 1 ? "s" : ""}</div>
        </div>`;
    });

    container.innerHTML = `
      <div class="hours-total-card">
        <span class="hours-total-label">Total hours volunteered</span>
        <span class="hours-total-value">${total.toFixed(1)}</span>
      </div>
      <div class="hours-log-list">${logHTML}</div>`;
  } catch (e) {
    console.error("Error loading hours:", e);
    container.innerHTML = `<p style="color:#c53030; font-size:0.85em;">Error loading hours.</p>`;
  }
}

// --- 15. NAV HELPERS ---
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
