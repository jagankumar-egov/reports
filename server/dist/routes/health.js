"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const router = (0, express_1.Router)();
router.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'dhr-backend',
        uptime: process.uptime()
    });
});
exports.default = router;
//# sourceMappingURL=health.js.map