"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const errorHandler_1 = require("../middleware/errorHandler");
const validation_1 = require("../middleware/validation");
const fieldController_1 = require("../controllers/fieldController");
const router = (0, express_1.Router)();
const fieldController = new fieldController_1.FieldController();
router.get('/', (0, validation_1.validateRequest)(validation_1.fieldValidationSchemas.getFields), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    await fieldController.getFields(req, res);
}));
router.get('/:index', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    await fieldController.getFieldsForIndex(req, res);
}));
exports.default = router;
//# sourceMappingURL=fields.js.map