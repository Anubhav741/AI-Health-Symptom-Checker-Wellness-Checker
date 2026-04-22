import express from 'express';
import { saveCheckup, getCheckups, getStats } from '../controllers/checkupController.js';
import { chatWithAI, getOllamaStatus } from '../controllers/chatController.js';
import { initializeTracking, updateActions, confirmRecovery, getTracking, getTrackingHistory } from '../controllers/trackingController.js';

const router = express.Router();

router.post('/checkup', saveCheckup);
router.get('/checkups', getCheckups);
router.get('/stats', getStats);
router.post('/chat', chatWithAI);
router.get('/chat/status', getOllamaStatus);

// Health Tracking Routes
router.post('/tracking/init', initializeTracking);
router.post('/tracking/actions', updateActions);
router.post('/tracking/recovery', confirmRecovery);
router.get('/tracking/:checkupId', getTracking);
router.get('/tracking', getTrackingHistory);

export default router;
