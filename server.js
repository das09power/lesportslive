const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
// Base64 Images ke liye 50mb limit set hai
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.join(__dirname)));

const DB_FILE = path.join(__dirname, 'database.json');

const initialData = {
    users: [{ id: 1, name: "Admin", email: "admin@loversesports.com", orgName: "LOVERS ESPORTS" }],
    profile: {
        name: "Admin",
        email: "admin@loversesports.com",
        orgName: "LOVERS ESPORTS",
        adminDp: "",
        orgLogo: ""
    },
    teams: [
        { id: 1, slot: 1, name: "WILD FLASH", shortName: "WF", logo: "", playersAlive: ['alive', 'alive', 'alive', 'alive'], finishPts: 12, positionPts: 17, matchPts: 29, totalPts: 78 },
        { id: 2, slot: 2, name: "RENTEX ESPORTS", shortName: "RNTX", logo: "", playersAlive: ['alive', 'alive', 'alive', 'alive'], finishPts: 9, positionPts: 12, matchPts: 21, totalPts: 61 },
        { id: 3, slot: 3, name: "ORANGUTAN", shortName: "OG", logo: "", playersAlive: ['alive', 'alive', 'alive', 'alive'], finishPts: 7, positionPts: 10, matchPts: 17, totalPts: 54 },
        { id: 4, slot: 4, name: "TEAM SOUL", shortName: "SOUL", logo: "", playersAlive: ['alive', 'alive', 'alive', 'alive'], finishPts: 6, positionPts: 9, matchPts: 15, totalPts: 50 }
    ],
    matchState: {
        currentMatch: 3,
        isLive: true,
        timerSeconds: 9345
    }
};

function readDB() {
    if (!fs.existsSync(DB_FILE)) {
        fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
        return initialData;
    }
    try {
        return JSON.parse(fs.readFileSync(DB_FILE));
    } catch (e) {
        return initialData;
    }
}

function writeDB(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// GET ALL DATA
app.get('/api/data', (req, res) => res.json(readDB()));

// SAVE OR ADD TEAM WITH LOGO
app.post('/api/teams/save', (req, res) => {
    const db = readDB();
    const { id, slot, name, shortName, logo } = req.body;

    if (id) {
        // Existing team update
        db.teams = db.teams.map(t => t.id === id ? { ...t, slot, name, shortName, logo: logo || t.logo } : t);
    } else {
        // New team creation
        const newTeam = {
            id: Date.now(),
            slot: Number(slot) || (db.teams.length + 1),
            name: name || "NEW TEAM",
            shortName: shortName || (name ? name.substring(0, 4).toUpperCase() : "TEAM"),
            logo: logo || "",
            playersAlive: ['alive', 'alive', 'alive', 'alive'],
            finishPts: 0,
            positionPts: 0,
            matchPts: 0,
            totalPts: 0
        };
        db.teams.push(newTeam);
    }
    writeDB(db);
    res.json({ success: true, teams: db.teams });
});

// DELETE TEAM
app.post('/api/teams/delete', (req, res) => {
    const db = readDB();
    const { id } = req.body;
    db.teams = db.teams.filter(t => t.id !== id);
    writeDB(db);
    res.json({ success: true, teams: db.teams });
});

// UPDATE MATCH STATE & POINTS
app.post('/api/match/update', (req, res) => {
    const db = readDB();
    const { isLive, currentMatch, teams, timerSeconds } = req.body;
    if (isLive !== undefined) db.matchState.isLive = isLive;
    if (currentMatch !== undefined) db.matchState.currentMatch = currentMatch;
    if (timerSeconds !== undefined) db.matchState.timerSeconds = timerSeconds;
    if (teams) db.teams = teams;
    writeDB(db);
    res.json({ success: true, matchState: db.matchState, teams: db.teams });
});

// RESET MATCH DATA
app.post('/api/reset', (req, res) => {
    const db = readDB();
    db.matchState = { currentMatch: 1, isLive: false, timerSeconds: 0 };
    db.teams = db.teams.map(t => ({
        ...t,
        playersAlive: ['alive', 'alive', 'alive', 'alive'],
        finishPts: 0,
        positionPts: 0,
        matchPts: 0,
        totalPts: 0
    }));
    writeDB(db);
    res.json({ success: true, data: db });
});

app.listen(PORT, () => console.log(`Esports Portal running on port ${PORT}`));