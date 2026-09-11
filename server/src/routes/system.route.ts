import { Router, Request, Response } from 'express';
import { getSystemInfo } from '../services/system.service';

const router = Router();

router.get('/info', async (_req: Request, res: Response) => {
  try {
    const info = await getSystemInfo();
    res.json({ success: true, data: info });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
