const express = require("express");
const router = express.Router();
const courseController = require("../controllers/courseController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware=require("../middleware/roleMiddleware");
router.use(authMiddleware);
router.get("/", courseController.getCourses);
router.post("/",roleMiddleware("admin"),courseController.createCourse);

router.get("/:id", courseController.getCourseById);
router.put("/:id",roleMiddleware("admin"), courseController.updateCourse);
router.delete("/:id",roleMiddleware("admin"), courseController.deleteCourse);

module.exports = router;