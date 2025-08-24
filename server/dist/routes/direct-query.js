"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const errorHandler_1 = require("../middleware/errorHandler");
const directQueryController_1 = require("../controllers/directQueryController");
const router = (0, express_1.Router)();
const directQueryController = new directQueryController_1.DirectQueryController();
router.post('/', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    await directQueryController.executeDirectQuery(req, res);
}));
router.get('/indexes', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    await directQueryController.getAvailableIndexes(req, res);
}));
exports.default = router;
//# sourceMappingURL=direct-query.js.map