// AUTH GUARD
if (localStorage.getItem("isLoggedIn") !== "true") {
    window.location.href = "login.html";
}

let teams = [];
let cropperInstance = null;
let currentBase64Logo = "";

document.addEventListener("DOMContentLoaded", () => {
    loadProfileAndHeader();
    loadTeamsData();
    renderTeamsTable();

    const logoInput = document.getElementById("teamLogoInput");
    if (logoInput) {
        logoInput.addEventListener("change", openCropModal);
    }

    const teamForm = document.getElementById("teamForm");
    if (teamForm) {
        teamForm.addEventListener("submit", saveTeamHandler);
    }

    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", (e) => {
            e.preventDefault();
            if (confirm("Kya aap Log Out karna chahte hain?")) {
                localStorage.removeItem('currentUser');
                localStorage.removeItem('isLoggedIn');
                localStorage.setItem('isLoggedIn', 'false');
                window.location.href = "login.html";
            }
        });
    }
});

function loadProfileAndHeader() {
    let profileData = {};
    let loginData = {};

    if (localStorage.getItem('user_profile')) {
        try { profileData = JSON.parse(localStorage.getItem('user_profile')); } catch(e){}
    }
    if (localStorage.getItem('currentUser')) {
        try { loginData = JSON.parse(localStorage.getItem('currentUser')); } catch(e){}
    }

    const userName = profileData.name || loginData.name || "Admin";
    const userEmail = profileData.email || loginData.email || "admin@lovers.com";
    const orgName = profileData.orgName || "LOVERS ESPORTS";
    const adminDp = profileData.adminDp || "";
    const orgLogo = profileData.orgLogo || "";

    const nameEl = document.getElementById("headerUserName");
    const emailEl = document.getElementById("headerUserEmail");
    const orgEl = document.getElementById("headerOrgName");
    const sidebarOrgEl = document.getElementById("sidebarOrgName");

    if (nameEl) nameEl.innerText = userName;
    if (emailEl) emailEl.innerText = userEmail;
    if (orgEl) orgEl.innerText = orgName;
    if (sidebarOrgEl) sidebarOrgEl.innerText = orgName;

    // Admin Avatar Profile DP
    const adminDpContainer = document.getElementById("headerAdminDp");
    if (adminDpContainer) {
        if (adminDp) {
            adminDpContainer.innerHTML = `<img src="${adminDp}" alt="DP">`;
        } else {
            adminDpContainer.innerText = userName.charAt(0).toUpperCase();
        }
    }

    // Header Organization Logo
    const headerOrgLogoContainer = document.getElementById("headerOrgLogo");
    if (headerOrgLogoContainer) {
        if (orgLogo) {
            headerOrgLogoContainer.innerHTML = `<img src="${orgLogo}" alt="Org Logo">`;
        } else {
            headerOrgLogoContainer.innerText = orgName.charAt(0).toUpperCase();
        }
    }

    // Sidebar Brand Logo
    const sidebarLogoContainer = document.getElementById("sidebarBrandLogo");
    if (sidebarLogoContainer) {
        if (orgLogo) {
            sidebarLogoContainer.innerHTML = `<img src="${orgLogo}" alt="Logo">`;
        } else {
            sidebarLogoContainer.innerText = orgName.charAt(0).toUpperCase();
        }
    }
}

function loadTeamsData() {
    const saved = localStorage.getItem("lovers_teams_data");
    if (saved) {
        try {
            teams = JSON.parse(saved);
        } catch (e) {
            teams = getInitialDefaultTeams();
        }
    } else {
        teams = getInitialDefaultTeams();
        saveTeamsToStorage();
    }
}

function getInitialDefaultTeams() {
    return [
        { id: 1, slot: 1, name: "GODLIKE ESPORTS", logo: "", playersAlive: ['alive', 'alive', 'alive', 'alive'], finishPts: 0, positionPts: 0, totalPts: 42, isDisqualified: false },
        { id: 2, slot: 2, name: "TEAM SOUL", logo: "", playersAlive: ['alive', 'alive', 'alive', 'alive'], finishPts: 0, positionPts: 0, totalPts: 38, isDisqualified: false },
        { id: 3, slot: 3, name: "ORANGUTAN", logo: "", playersAlive: ['alive', 'alive', 'alive', 'alive'], finishPts: 0, positionPts: 0, totalPts: 29, isDisqualified: false }
    ];
}

function saveTeamsToStorage() {
    localStorage.setItem("lovers_teams_data", JSON.stringify(teams));
    
    // Sync with matches state if match live state exists in localStorage
    const savedMatchState = localStorage.getItem("lovers_esports_state");
    if (savedMatchState) {
        try {
            let state = JSON.parse(savedMatchState);
            if (state && state.teams) {
                state.teams.forEach(mTeam => {
                    const matched = teams.find(t => t.id === mTeam.id || t.slot === mTeam.slot);
                    if (matched) {
                        mTeam.name = matched.name;
                        mTeam.logo = matched.logo;
                        mTeam.slot = matched.slot;
                        mTeam.isDisqualified = matched.isDisqualified;
                    }
                });
                localStorage.setItem("lovers_esports_state", JSON.stringify(state));
            }
        } catch(e) {
            console.error("Match state sync error", e);
        }
    }
}

function renderTeamsTable() {
    const tbody = document.getElementById("teamsTableBody");
    if (!tbody) return;
    tbody.innerHTML = "";

    // ALWAYS SORT BY SLOT NUMBER IN ASCENDING ORDER (1, 2, 3...)
    teams.sort((a, b) => Number(a.slot) - Number(b.slot));

    teams.forEach((team) => {
        const tr = document.createElement("tr");

        const logoHtml = (team.logo && team.logo.trim() !== "")
            ? `<img src="${team.logo}" alt="Logo">`
            : team.name.charAt(0).toUpperCase();

        const isDQ = team.isDisqualified || false;

        tr.innerHTML = `
            <td><strong>#${team.slot}</strong></td>
            <td>
                <div class="team-info">
                    <div class="team-logo-preview">${logoHtml}</div>
                    <span style="font-weight: 600;">${team.name}</span>
                </div>
            </td>
            <td><strong>${team.totalPts || 0}</strong></td>
            <td>
                <span class="status-badge ${isDQ ? 'disqualified' : 'active'}">
                    ${isDQ ? 'Disqualified' : 'Active'}
                </span>
            </td>
            <td>
                <button class="action-btn edit" onclick="editTeam(${team.id})" title="Edit Team">
                    <i class="fa-solid fa-pen-to-square"></i>
                </button>
                <button class="action-btn ${isDQ ? 'activate' : 'dq'}" onclick="toggleDisqualify(${team.id})" title="${isDQ ? 'Make Active' : 'Disqualify Team'}">
                    <i class="fa-solid ${isDQ ? 'fa-user-check' : 'fa-ban'}"></i>
                </button>
                <button class="action-btn delete" onclick="deleteTeam(${team.id})" title="Delete Team">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function openAddTeamModal() {
    document.getElementById("modalTitle").innerText = "Add New Team";
    document.getElementById("editTeamId").value = "";
    document.getElementById("teamSlot").value = teams.length ? Math.max(...teams.map(t => Number(t.slot))) + 1 : 1;
    document.getElementById("teamName").value = "";
    currentBase64Logo = "";
    updateModalLogoPreview();

    document.getElementById("teamModal").style.display = "flex";
}

function editTeam(id) {
    const team = teams.find(t => t.id === id);
    if (!team) return;

    document.getElementById("modalTitle").innerText = "Edit Team";
    document.getElementById("editTeamId").value = team.id;
    document.getElementById("teamSlot").value = team.slot;
    document.getElementById("teamName").value = team.name;
    currentBase64Logo = team.logo || "";
    updateModalLogoPreview();

    document.getElementById("teamModal").style.display = "flex";
}

function closeTeamModal() {
    document.getElementById("teamModal").style.display = "none";
}

function updateModalLogoPreview() {
    const container = document.getElementById("modalLogoPreview");
    if (currentBase64Logo && currentBase64Logo.trim() !== "") {
        container.innerHTML = `<img src="${currentBase64Logo}" alt="Preview">`;
    } else {
        const nameVal = document.getElementById("teamName").value.trim();
        container.innerText = nameVal ? nameVal.charAt(0).toUpperCase() : "TM";
    }
}

// CROPPER FUNCTIONS
function openCropModal(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (event) {
        const imageElement = document.getElementById("cropperImageSrc");
        imageElement.src = event.target.result;

        document.getElementById("cropModal").style.display = "flex";

        if (cropperInstance) cropperInstance.destroy();

        cropperInstance = new Cropper(imageElement, {
            aspectRatio: 1,
            viewMode: 1,
            autoCropArea: 0.9,
            responsive: true
        });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
}

function applyCroppedLogo() {
    if (!cropperInstance) return;

    const canvas = cropperInstance.getCroppedCanvas({
        width: 300,
        height: 300
    });

    currentBase64Logo = canvas.toDataURL("image/png");
    updateModalLogoPreview();

    closeCropModal();
}

function closeCropModal() {
    document.getElementById("cropModal").style.display = "none";
    if (cropperInstance) {
        cropperInstance.destroy();
        cropperInstance = null;
    }
}

// SAVE TEAM WITH DUPLICATE SLOT CHECK
function saveTeamHandler(e) {
    e.preventDefault();

    const editId = document.getElementById("editTeamId").value;
    const slot = parseInt(document.getElementById("teamSlot").value, 10);
    const name = document.getElementById("teamName").value.trim();

    // DUPLICATE SLOT CHECK
    const duplicate = teams.find(t => Number(t.slot) === slot && t.id != editId);
    if (duplicate) {
        alert("A team is already registered in this slot.");
        return;
    }

    if (editId) {
        const team = teams.find(t => t.id == editId);
        if (team) {
            team.slot = slot;
            team.name = name;
            team.logo = currentBase64Logo;
        }
    } else {
        const newTeam = {
            id: Date.now(),
            slot: slot,
            name: name,
            logo: currentBase64Logo,
            playersAlive: ['alive', 'alive', 'alive', 'alive'],
            finishPts: 0,
            positionPts: 0,
            totalPts: 0,
            isDisqualified: false
        };
        teams.push(newTeam);
    }

    saveTeamsToStorage();
    renderTeamsTable();
    closeTeamModal();
}

// TOGGLE DISQUALIFY / ACTIVE
function toggleDisqualify(id) {
    const team = teams.find(t => t.id === id);
    if (team) {
        team.isDisqualified = !team.isDisqualified;
        saveTeamsToStorage();
        renderTeamsTable();
    }
}

// DELETE TEAM
function deleteTeam(id) {
    if (confirm("Do you want to delete team?")) {
        teams = teams.filter(t => t.id !== id);
        saveTeamsToStorage();
        renderTeamsTable();
    }
}