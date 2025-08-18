"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const errorHandler_1 = require("../middleware/errorHandler");
const validation_1 = require("../middleware/validation");
const queryController_1 = require("../controllers/queryController");
const router = (0, express_1.Router)();
const queryController = new queryController_1.QueryController();
router.post('/execute', (0, validation_1.validateRequest)(validation_1.queryValidationSchemas.executeQuery), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    await queryController.executeQuery(req, res);
}));
router.post('/validate', (0, validation_1.validateRequest)(validation_1.queryValidationSchemas.validateQuery), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    await queryController.validateQuery(req, res);
}));
router.get('/history', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    await queryController.getQueryHistory(req, res);
}));
exports.default = router;
//# sourceMappingURL=query.js.map