// 원가 계산서 라우트 — CRUD

import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import {
  listCostCalculations,
  getCostCalculationById,
  createOrUpdateCostCalculation,
  deleteCostCalculation,
} from '../services/cost-calculations.service';

export const costCalculationsRouter = Router();
costCalculationsRouter.use(requireAuth);

// GET /api/cost-calculations
costCalculationsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { search, page, limit } = req.query;
    const result = await listCostCalculations({
      search: search as string | undefined,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 50,
    });
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: '원가 계산서 목록 조회 실패' });
  }
});

// GET /api/cost-calculations/:id
costCalculationsRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const item = await getCostCalculationById(Number(req.params.id));
    if (!item) {
      res.status(404).json({ success: false, error: '원가 계산서를 찾을 수 없습니다.' });
      return;
    }
    res.json({ success: true, data: { item } });
  } catch (err) {
    res.status(500).json({ success: false, error: '원가 계산서 조회 실패' });
  }
});

// POST /api/cost-calculations
costCalculationsRouter.post('/', async (req: Request, res: Response) => {
  try {
    const data = req.body;

    if (!data.name) {
      res.status(400).json({ success: false, error: '행사명은 필수입니다.' });
      return;
    }
    if (data.name.length > 200) {
      res.status(400).json({ success: false, error: '행사명은 200자를 초과할 수 없습니다.' });
      return;
    }

    const item = await createOrUpdateCostCalculation(data);
    res.status(201).json({ success: true, data: { item } });
  } catch (err) {
    res.status(500).json({ success: false, error: '원가 계산서 저장 실패' });
  }
});

// DELETE /api/cost-calculations/:id
costCalculationsRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const deleted = await deleteCostCalculation(Number(req.params.id));
    if (!deleted) {
      res.status(404).json({ success: false, error: '원가 계산서를 찾을 수 없습니다.' });
      return;
    }
    res.json({ success: true, data: { message: '삭제되었습니다.' } });
  } catch (err) {
    res.status(500).json({ success: false, error: '원가 계산서 삭제 실패' });
  }
});
