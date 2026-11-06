const Batch = require("../models/Batch");

// Admin: always allowed. Trainer: only if assigned to this batch.
exports.canAccessBatch = async (user, batchId) => {
  if (user.role === "admin") return true;
  return !!(await Batch.exists({ _id: batchId, trainer: user.id }));
};

// IDs of all batches assigned to a trainer
exports.getTrainerBatchIds = async (userId) => {
  const batches = await Batch.find({ trainer: userId }).select("_id");
  return batches.map((b) => b._id);
};