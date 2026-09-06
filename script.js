if (localStorage.getItem("isLoggedIn") !== "true") {
    window.location.href = "login.html";
}

let state = {
    currentMatch: 4,
    isLive: false,
    timerSeconds: 0,
    teams: []
};

let timerInterval = null;
let currentEditingTeamId = null;

document.addEventListener("DOMContentLoaded", () => {
    loadProfileHeader();
    fetchBackendData();

    document.getElementById("matchToggleBtn").addEventListener("click", toggleMatchStatus);
    document.getElementById("resetDataBtn").addEventListener("click", handleFullReset);

    document.getElementById("logoutBtn").addEventListener("click", (e) => {
        e.preventDefault();
        if (confirm("Log Out karna chahte hain?")) {
            localStorage.clear();
            window.location.href = "login.html";
        }
    });
});

async function fetchBackendData() {
    try {
        const res = await fetch('/api/data');
        const db = await res.json();
        state.currentMatch = db.matchState.currentMatch || 4;
        state.isLive = db.matchState.isLive || false;
        state.timerSeconds = db.matchState.timerSeconds || 0;
        state.teams = db.teams || [];
        renderDashboard();
    } catch (e) {
        renderDashboard();
    }
}

function loadProfileHeader() {
    const profile = JSON.parse(localStorage.getItem("user_profile") || "{}");
    const user = JSON.parse(localStorage.getItem("currentUser") || "{}");

    const name = profile.name || user.name || "Aneimo";
    const email = profile.email || user.email || "wwwk@gmail.com";
    const org = profile.orgName || user.orgName || "LOVERS ESPORTS";

    if (document.getElementById("userName")) document.getElementById("userName").innerText = name;
    if (document.getElementById("userEmail")) document.getElementById("userEmail").innerText = email;
    if (document.getElementById("userOrg")) document.getElementById("userOrg").innerText = org;
    if (document.getElementById("sidebarOrgName")) document.getElementById("sidebarOrgName").innerText = org;

    const avatar = document.getElementById("userAvatar");
    if (avatar) {
        if (profile.adminDp) {
            avatar.innerHTML = `<img src="${profile.adminDp}">`;
        } else {
            avatar.innerText = name.charAt(0).toUpperCase();
        }
    }
}

function renderDashboard() {
    document.getElementById("liveMatchTitle").innerText = `Live Control - Match ${String(state.currentMatch).padStart(2, '0')}`;
    document.getElementById("matchRunningCount").innerText = String(state.currentMatch).padStart(2, '0');
    
    const badge = document.getElementById("matchStatusBadge");
    const toggleBtn = document.getElementById("matchToggleBtn");

    if (state.isLive) {
        badge.innerText = "• LIVE";
        badge.className = "status-pill live";
        toggleBtn.innerHTML = `<i class="fa-solid fa-stop"></i> END MATCH`;
        toggleBtn.classList.add("running");
        startTimer();
    } else {
        badge.innerText = "• OFFLINE";
        badge.className = "status-pill offline";
        toggleBtn.innerHTML = `<i class="fa-solid fa-play"></i> START MATCH`;
        toggleBtn.classList.remove("running");
        stopTimer();
    }

    renderTable();
    updateCounts();
}

function renderTable() {
    const tbody = document.getElementById("teamsTableBody");
    tbody.innerHTML = "";

    state.teams.sort((a, b) => Number(a.slot) - Number(b.slot));

    state.teams.forEach(team => {
        const tr = document.createElement("tr");

        const dotsHtml = (team.playersAlive || ['alive', 'alive', 'alive', 'alive']).map((status, index) => {
            return `<span class="player-dot ${status}" onclick="cyclePlayerDot(${team.id}, ${index})" title="${status.toUpperCase()}"></span>`;
        }).join('');

        const matchPts = (team.finishPts || 0) + (team.positionPts || 0);

        tr.innerHTML = `
            <td>#${team.slot}</td>
            <td>
                <div class="team-info-cell">
                    <div class="team-badge-icon">${team.logo ? `<img src="${team.logo}">` : team.name.charAt(0)}</div>
                    <span>${team.name}</span>
                </div>
            </td>
            <td><div class="dots-wrapper">${dotsHtml}</div></td>
            <td>
                <div class="counter-container">
                    <button class="counter-btn" onclick="adjustPts(${team.id}, 'finishPts', -1)">-</button>
                    <span class="counter-value">${team.finishPts || 0}</span>
                    <button class="counter-btn" onclick="adjustPts(${team.id}, 'finishPts', 1)">+</button>
                </div>
            </td>
            <td>
                <div class="counter-container">
                    <button class="counter-btn" onclick="adjustPts(${team.id}, 'positionPts', -1)">-</button>
                    <span class="counter-value">${team.positionPts || 0}</span>
                    <button class="counter-btn" onclick="adjustPts(${team.id}, 'positionPts', 1)">+</button>
                </div>
            </td>
            <td><strong>${matchPts}</strong></td>
            <td class="pts-purple">${team.totalPts || 0}</td>
            <td>
                <button class="btn-action-edit" onclick="openEditModal(${team.id})">
                    <i class="fa-solid fa-pencil"></i>
                </button>
            </td>
        `;

        tbody.appendChild(tr);
    });
}

function cyclePlayerDot(teamId, pIndex) {
    const team = state.teams.find(t => t.id === teamId);
    if (!team) return;

    if (!team.playersAlive) team.playersAlive = ['alive', 'alive', 'alive', 'alive'];

    const sequence = ['alive', 'knocked', 'dead'];
    let current = team.playersAlive[pIndex];
    let next = sequence[(sequence.indexOf(current) + 1) % sequence.length];
    
    team.playersAlive[pIndex] = next;
    syncBackend();
    renderDashboard();
}

function adjustPts(teamId, type, val) {
    const team = state.teams.find(t => t.id === teamId);
    if (!team) return;

    team[type] = Math.max(0, (team[type] || 0) + val);
    syncBackend();
    renderDashboard();
}

function updateCounts() {
    document.getElementById("totalTeamsCount").innerText = state.teams.length;
    let kills = state.teams.reduce((acc, t) => acc + (t.finishPts || 0), 0);
    document.getElementById("totalKillsCount").innerText = kills;
}

function toggleMatchStatus() {
    state.isLive = !state.isLive;
    if (!state.isLive) {
        state.teams.forEach(t => {
            t.totalPts = (t.totalPts || 0) + (t.finishPts || 0) + (t.positionPts || 0);
            t.finishPts = 0;
            t.positionPts = 0;
            t.playersAlive = ['alive', 'alive', 'alive', 'alive'];
        });
        state.currentMatch += 1;
        state.timerSeconds = 0;
    }
    syncBackend();
    renderDashboard();
}

async function handleFullReset() {
    if (confirm("Kya aap poore Match aur Teams points ko Reset karna chahte hain?")) {
        try {
            const res = await fetch('/api/reset', { method: 'POST' });
            const data = await res.json();
            if (data.success) {
                alert("Match aur Scores completely reset ho gaye hain!");
                fetchBackendData();
            }
        } catch (e) {
            alert("Reset Request Failed!");
        }
    }
}

function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        state.timerSeconds++;
        updateTimerDisplay();
    }, 1000);
}

function stopTimer() {
    if (timerInterval) clearInterval(timerInterval);
    updateTimerDisplay();
}

function updateTimerDisplay() {
    const hrs = String(Math.floor(state.timerSeconds / 3600)).padStart(2, '0');
    const mins = String(Math.floor((state.timerSeconds % 3600) / 60)).padStart(2, '0');
    const secs = String(state.timerSeconds % 60).padStart(2, '0');
    document.getElementById("timerDisplay").innerText = `${hrs}:${mins}:${secs}`;
}

function openEditModal(teamId) {
    currentEditingTeamId = teamId;
    const team = state.teams.find(t => t.id === teamId);
    if (team) {
        document.getElementById("editTeamName").value = team.name;
        document.getElementById("editTeamSlot").value = team.slot;
        document.getElementById("editModal").classList.add("active");
    }
}

function closeEditModal() {
    document.getElementById("editModal").classList.remove("active");
}

function saveTeamEdit() {
    const team = state.teams.find(t => t.id === currentEditingTeamId);
    if (team) {
        team.name = document.getElementById("editTeamName").value;
        team.slot = Number(document.getElementById("editTeamSlot").value);
        syncBackend();
        renderDashboard();
        closeEditModal();
    }
}

async function syncBackend() {
    try {
        await fetch('/api/match/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                isLive: state.isLive,
                currentMatch: state.currentMatch,
                timerSeconds: state.timerSeconds,
                teams: state.teams
            })
        });
    } catch (e) {}
}