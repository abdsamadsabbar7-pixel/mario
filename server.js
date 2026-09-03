const express = require("express");
const app = express();
const port = 3000;

app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type");
    next();
});

let triggerId = 0;
let lastTriggerTime = 0;
let waitingClients = [];
const COOLDOWN_MS = 20000;

// 1. EXTENSION CALLS THIS
app.get("/trigger-from-ext", (req, res) => {
    const now = Date.now();
    if (now - lastTriggerTime < COOLDOWN_MS) {
        console.log("⏳ Cooldown active.");
        return res.status(429).json({ error: "cooldown" });
    }

    triggerId++;
    lastTriggerTime = now;
    console.log(`🚀 TRIGGER #${triggerId} - Notifying all profiles!`);

    // Send response to all waiting Tampermonkey scripts
    while (waitingClients.length > 0) {
        const client = waitingClients.shift();
        try {
            client.json({ triggerId: triggerId });
        } catch (e) {
            console.error("Failed to send to a client");
        }
    }
    res.json({ success: true, id: triggerId });
});

// 2. TAMPERMONKEY CALLS THIS
app.get("/check-trigger", (req, res) => {
    const lastId = parseInt(req.query.lastId);

    // If browser is behind, update it immediately
    if (triggerId > lastId) {
        return res.json({ triggerId: triggerId });
    }

    // Otherwise, add to waiting list
    waitingClients.push(res);

    // Timeout after 30s to prevent browser hang, client will reconnect
    req.on("close", () => {
        waitingClients = waitingClients.filter(c => c !== res);
    });
});

app.listen(port, () => console.log(`Server live on port ${port}`));
