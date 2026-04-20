import express from 'express';
import { saveCheckup, getCheckups, getStats } from '../controllers/checkupController.js';
import { chatWithAI } from '../controllers/chatController.js';

const router = express.Router();

router.post('/checkup', saveCheckup);
router.get('/checkups', getCheckups);
router.get('/stats', getStats);
router.post('/chat', chatWithAI);

export default router;
