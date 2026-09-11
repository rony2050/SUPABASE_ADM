"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const system_service_1 = require("../services/system.service");
const router = (0, express_1.Router)();
router.get('/info', async (_req, res) => {
    try {
        const info = await (0, system_service_1.getSystemInfo)();
        res.json({ success: true, data: info });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
exports.default = router;
