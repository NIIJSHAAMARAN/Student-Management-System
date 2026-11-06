const express = require("express");
const router = express.Router();
const batchController = require("../controllers/batchController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware=require("../middleware/roleMiddleware");
router.use(authMiddleware);
router.get("/", batchController.getBatches);
router.get("/:id", batchController.getBatchById);
router.post("/", roleMiddleware("admin"), batchController.createBatch);
router.put("/:id", roleMiddleware("admin"), batchController.updateBatch);
router.delete("/:id", roleMiddleware("admin"), batchController.deleteBatch);

router.post("/:id/students", roleMiddleware("admin"), batchController.addStudentToBatch);
router.delete("/:id/students/:studentId", roleMiddleware("admin"), batchController.removeStudentFromBatch);

module.exports = router;