"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const errorHandler_1 = require("../middleware/errorHandler");
const validation_1 = require("../middleware/validation");
const projectController_1 = require("../controllers/projectController");
const router = (0, express_1.Router)();
const projectController = new projectController_1.ProjectController();
router.get('/', (0, validation_1.validateRequest)(validation_1.projectValidationSchemas.getProjects), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    await projectController.getProjects(req, res);
}));
router.get('/:id', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    await projectController.getProject(req, res);
}));
exports.default = router;
//# sourceMappingURL=projects.js.map