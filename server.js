// ============================================================
// BLS PROFILE TRIGGER SERVER
// ============================================================

const express = require("express");

const app = express();

app.use(express.json());


// ============================================================
// DATA
// ============================================================

const profiles = new Map();

let nextProfileOrder = 1;
let nextTriggerId = 1;


// ============================================================
// REGISTER PROFILE
// ============================================================

app.get(
    "/register-profile",
    (req, res) => {

        const profileId =
            String(req.query.profileId || "");

        const subtype =
            String(req.query.subtype || "");


        if (!profileId) {

            return res.status(400).json({
                ok: false,
                error: "profileId required"
            });

        }


        // Already registered?
        if (profiles.has(profileId)) {

            const existing =
                profiles.get(profileId);

            return res.json({
                ok: true,
                profileId,
                order: existing.order,
                alreadyRegistered: true
            });

        }


        const profile = {

            profileId,

            subtype,

            order: nextProfileOrder++,

            registeredAt: Date.now(),

            lastSeen: Date.now(),

            triggerId: 0

        };


        profiles.set(
            profileId,
            profile
        );


        console.log(
            "======================================"
        );

        console.log(
            "PROFILE REGISTERED"
        );

        console.log(
            "Profile:",
            profileId
        );

        console.log(
            "Subtype:",
            subtype
        );

        console.log(
            "Order:",
            profile.order
        );

        console.log(
            "======================================"
        );


        res.json({
            ok: true,
            profileId,
            order: profile.order,
            alreadyRegistered: false
        });

    }
);


// ============================================================
// HEARTBEAT
// ============================================================

app.get(
    "/profile-heartbeat",
    (req, res) => {

        const profileId =
            String(req.query.profileId || "");


        const profile =
            profiles.get(profileId);


        if (profile) {

            profile.lastSeen =
                Date.now();

        }


        res.json({
            ok: true
        });

    }
);


// ============================================================
// TRIGGER FROM PROFILE THAT FOUND DATE
// ============================================================

app.get(
    "/trigger-from-ext",
    (req, res) => {

        const sourceProfileId =
            String(
                req.query.profileId || ""
            );


        const subtype =
            String(
                req.query.subtype || ""
            );


        if (!sourceProfileId) {

            return res.status(400).json({
                ok: false,
                error: "profileId required"
            });

        }


        const sourceProfile =
            profiles.get(
                sourceProfileId
            );


        if (!sourceProfile) {

            return res.status(400).json({
                ok: false,
                error: "Profile is not registered"
            });

        }


        // ====================================================
        // FIND ONLY PROFILES ENTERED BEFORE SOURCE
        // ====================================================

        const recipients = [];


        for (
            const profile of profiles.values()
        ) {

            if (
                profile.profileId ===
                sourceProfileId
            ) {
                continue;
            }


            if (
                profile.order <
                sourceProfile.order
            ) {

                // Keep subtype matching
                if (
                    !subtype ||
                    profile.subtype === subtype
                ) {

                    recipients.push(
                        profile
                    );

                }

            }

        }


        // Sort oldest first
        recipients.sort(
            (a, b) =>
                a.order - b.order
        );


        const triggerId =
            nextTriggerId++;


        console.log(
            "======================================"
        );

        console.log(
            "NEW AVAILABILITY TRIGGER"
        );

        console.log(
            "Source:",
            sourceProfile.profileId
        );

        console.log(
            "Source order:",
            sourceProfile.order
        );

        console.log(
            "Subtype:",
            subtype
        );

        console.log(
            "Recipients:",
            recipients.map(
                p => p.profileId
            )
        );

        console.log(
            "======================================"
        );


        // ====================================================
        // STORE TRIGGER ONLY FOR RECIPIENTS
        // ====================================================

        for (
            const recipient of recipients
        ) {

            recipient.triggerId =
                triggerId;

        }


        res.json({

            ok: true,

            triggerId,

            sourceProfileId,

            recipients:
                recipients.map(
                    p => p.profileId
                )

        });

    }
);


// ============================================================
// CHECK TRIGGER
// ============================================================

app.get(
    "/check-trigger",
    (req, res) => {

        const profileId =
            String(
                req.query.profileId || ""
            );


        const lastId =
            Number(
                req.query.lastId || 0
            );


        const subtype =
            String(
                req.query.subtype || ""
            );


        const profile =
            profiles.get(
                profileId
            );


        if (!profile) {

            return res.json({
                action: "none",
                error: "profile_not_registered"
            });

        }


        profile.lastSeen =
            Date.now();


        const triggerId =
            Number(
                profile.triggerId || 0
            );


        if (
            triggerId > lastId
        ) {

            return res.json({

                action: "click",

                triggerId,

                sourceProfileId: null,

                subtype

            });

        }


        return res.json({
            action: "none"
        });

    }
);


// ============================================================
// DEBUG
// ============================================================

app.get(
    "/profiles",
    (req, res) => {

        const result =
            [...profiles.values()]
                .sort(
                    (a, b) =>
                        a.order - b.order
                )
                .map(
                    p => ({
                        profileId:
                            p.profileId,

                        subtype:
                            p.subtype,

                        order:
                            p.order,

                        registeredAt:
                            p.registeredAt,

                        lastSeen:
                            p.lastSeen,

                        triggerId:
                            p.triggerId
                    })
                );


        res.json(result);

    }
);


// ============================================================
// START
// ============================================================

const PORT =
    process.env.PORT || 3000;


app.listen(
    PORT,
    () => {

        console.log(
            `BLS server running on port ${PORT}`
        );

    }
);
