// 여행 안내문 라우트 — CRUD + Gemini AI 생성

import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import {
  listTravelGuides,
  getTravelGuideById,
  createTravelGuide,
  updateTravelGuide,
  deleteTravelGuide,
  generateGuideWithGemini,
} from '../services/travel-guides.service';

export const travelGuidesRouter = Router();
travelGuidesRouter.use(requireAuth);

// POST /api/travel-guides/generate — Gemini AI로 안내문 생성
travelGuidesRouter.post('/generate', async (req: Request, res: Response) => {
  try {
    const { destination, start_date, end_date, departure_place, departure_time, expenses, flight_info } = req.body;
    if (!destination || !start_date || !end_date) {
      res.status(400).json({ success: false, error: '여행지, 시작일, 종료일은 필수입니다.' });
      return;
    }
    const guideContent = await generateGuideWithGemini({
      destination, start_date, end_date, departure_place, departure_time, expenses, flight_info,
    });
    res.json({ success: true, data: { guide: guideContent } });
  } catch (err: any) {
    const message = err?.message || 'AI 안내문 생성에 실패했습니다.';
    const status = message.includes('GEMINI_API_KEY') ? 503 : 500;
    res.status(status).json({ success: false, error: message });
  }
});

// GET /api/travel-guides — 목록 조회
travelGuidesRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const items = await listTravelGuides();
    res.json({ success: true, data: { items } });
  } catch {
    res.status(500).json({ success: false, error: '안내문 목록 조회 실패' });
  }
});

// GET /api/travel-guides/:id — 단건 조회
travelGuidesRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const item = await getTravelGuideById(req.params.id);
    if (!item) {
      res.status(404).json({ success: false, error: '안내문을 찾을 수 없습니다.' });
      return;
    }
    res.json({ success: true, data: { item } });
  } catch {
    res.status(500).json({ success: false, error: '안내문 조회 실패' });
  }
});

// POST /api/travel-guides — 생성
travelGuidesRouter.post('/', async (req: Request, res: Response) => {
  try {
    const item = await createTravelGuide(req.body);
    res.status(201).json({ success: true, data: { item } });
  } catch {
    res.status(500).json({ success: false, error: '안내문 생성 실패' });
  }
});

// PUT /api/travel-guides/:id — 수정
travelGuidesRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const item = await updateTravelGuide(req.params.id, req.body);
    if (!item) {
      res.status(404).json({ success: false, error: '안내문을 찾을 수 없습니다.' });
      return;
    }
    res.json({ success: true, data: { item } });
  } catch {
    res.status(500).json({ success: false, error: '안내문 수정 실패' });
  }
});

// DELETE /api/travel-guides/:id — 삭제
travelGuidesRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const deleted = await deleteTravelGuide(req.params.id);
    if (!deleted) {
      res.status(404).json({ success: false, error: '안내문을 찾을 수 없습니다.' });
      return;
    }
    res.json({ success: true, data: { message: '삭제되었습니다.' } });
  } catch {
    res.status(500).json({ success: false, error: '안내문 삭제 실패' });
  }
});
