import express, { Request, Response } from 'express';
import {
  getAllFlightSchedules,
  getFlightScheduleById,
  getFlightScheduleByPnr,
  createFlightSchedule,
  updateFlightSchedule,
  deleteFlightSchedule,
  CreateFlightScheduleRequest,
  UpdateFlightScheduleRequest,
} from '../services/flightScheduleService';

const router = express.Router();

interface FlightScheduleResponse {
  success: boolean;
  message: string;
  data?: any;
}

interface FlightScheduleListResponse extends FlightScheduleResponse {
  data?: any[];
  pagination?: { page: number; limit: number; total: number; totalPages: number };
}

/**
 * GET /api/flight-schedules
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;

    const { schedules, total } = await getAllFlightSchedules(page, limit);

    const response: FlightScheduleListResponse = {
      success: true,
      message: 'Flight schedules retrieved successfully',
      data: schedules,
    };

    if (page !== undefined && limit !== undefined) {
      response.pagination = { page, limit, total, totalPages: Math.ceil(total / limit) };
    }

    res.json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get flight schedules',
    });
  }
});

/**
 * GET /api/flight-schedules/:id
 */
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const schedule = await getFlightScheduleById(id);

    if (!schedule) {
      return res.status(404).json({ success: false, message: 'Flight schedule not found' });
    }

    res.json({ success: true, message: 'Flight schedule retrieved successfully', data: schedule });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get flight schedule',
    });
  }
});

/**
 * GET /api/flight-schedules/pnr/:pnr
 */
router.get('/pnr/:pnr', async (req: Request, res: Response): Promise<void> => {
  try {
    const pnr = Array.isArray(req.params.pnr) ? req.params.pnr[0] : req.params.pnr;
    const schedule = await getFlightScheduleByPnr(pnr);

    if (!schedule) {
      return res.status(404).json({ success: false, message: 'Flight schedule not found' });
    }

    res.json({ success: true, message: 'Flight schedule retrieved successfully', data: schedule });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get flight schedule',
    });
  }
});

/**
 * POST /api/flight-schedules
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const data: CreateFlightScheduleRequest = req.body;
    const schedule = await createFlightSchedule(data);
    res.status(201).json({ success: true, message: 'Flight schedule created successfully', data: schedule });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to create flight schedule',
    });
  }
});

/**
 * PUT /api/flight-schedules/:id
 */
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const data: UpdateFlightScheduleRequest = req.body;
    const schedule = await updateFlightSchedule(id, data);
    res.json({ success: true, message: 'Flight schedule updated successfully', data: schedule });
  } catch (error) {
    if (error instanceof Error && error.message === 'Flight schedule not found') {
      return res.status(404).json({ success: false, message: error.message });
    }
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to update flight schedule',
    });
  }
});

/**
 * DELETE /api/flight-schedules/:id
 */
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    await deleteFlightSchedule(id);
    res.json({ success: true, message: 'Flight schedule deleted successfully' });
  } catch (error) {
    if (error instanceof Error && error.message === 'Flight schedule not found') {
      return res.status(404).json({ success: false, message: error.message });
    }
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to delete flight schedule',
    });
  }
});

export default router;