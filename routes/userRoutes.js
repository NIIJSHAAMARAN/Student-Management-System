const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

router.use(authMiddleware,roleMiddleware("admin"));
router.get("/", userController.getUsers);
router.get("/:id", userController.getUserById);
module.exports=router;