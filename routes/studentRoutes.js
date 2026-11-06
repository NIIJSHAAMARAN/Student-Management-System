const express = require("express");
const router = express.Router();
const studentController = require("../controllers/studentController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware=require("../middleware/roleMiddleware");
router.use(authMiddleware);
router.get("/", studentController.getStudents);
router.get("/:id", studentController.getStudentById);
router.post("/",roleMiddleware("admin"),studentController.createStudent);
router.put("/:id",roleMiddleware("admin"), studentController.updateStudent);
router.delete("/:id",roleMiddleware("admin"),studentController.deleteStudent);


module.exports = router;