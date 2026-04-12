import express, { Request, Response } from 'express';
import { prisma } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// ==========================================
// Group Routes
// ==========================================

interface GroupResponse {
  success: boolean;
  message: string;
  data?: any;
}

router.get('/groups', async (req: Request, res: Response): Promise<void> => {
  try {
    const groups = await prisma.group.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, message: 'Groups retrieved successfully', data: groups });
  } catch (error) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Failed to get groups' });
  }
});

router.get('/groups/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const group = await prisma.group.findUnique({ where: { id } });
    if (!group) return res.status(404).json({ success: false, message: 'Group not found' });
    res.json({ success: true, message: 'Group retrieved successfully', data: group });
  } catch (error) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Failed to get group' });
  }
});

router.post('/groups', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, destination, departureDate, returnDate, members } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Name is required' });

    const group = await prisma.group.create({
      data: {
        id: uuidv4(),
        name,
        destination,
        departureDate,
        returnDate,
        members: members ? JSON.stringify(members) : null,
      },
    });
    res.status(201).json({ success: true, message: 'Group created successfully', data: group });
  } catch (error) {
    res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Failed to create group' });
  }
});

router.put('/groups/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { name, destination, departureDate, returnDate, members, isArchived } = req.body;

    const group = await prisma.group.update({
      where: { id },
      data: {
        name,
        destination,
        departureDate,
        returnDate,
        members: members ? JSON.stringify(members) : undefined,
        isArchived,
      },
    });
    res.json({ success: true, message: 'Group updated successfully', data: group });
  } catch (error) {
    res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Failed to update group' });
  }
});

router.delete('/groups/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    await prisma.group.delete({ where: { id } });
    res.json({ success: true, message: 'Group deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Failed to delete group' });
  }
});

// ==========================================
// Product Routes
// ==========================================

router.get('/products', async (req: Request, res: Response): Promise<void> => {
  try {
    const products = await prisma.product.findMany({ orderBy: { createdAt: 'desc' } });
    res.json({ success: true, message: 'Products retrieved successfully', data: products });
  } catch (error) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Failed to get products' });
  }
});

router.get('/products/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, message: 'Product retrieved successfully', data: product });
  } catch (error) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Failed to get product' });
  }
});

router.post('/products', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, destination, duration, price, status, description, ...rest } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Name is required' });

    const product = await prisma.product.create({
      data: { id: uuidv4(), name, destination, duration, price: price || 0, status, description, ...rest },
    });
    res.status(201).json({ success: true, message: 'Product created successfully', data: product });
  } catch (error) {
    res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Failed to create product' });
  }
});

router.put('/products/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const product = await prisma.product.update({ where: { id }, data: req.body });
    res.json({ success: true, message: 'Product updated successfully', data: product });
  } catch (error) {
    res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Failed to update product' });
  }
});

router.delete('/products/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    await prisma.product.delete({ where: { id } });
    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Failed to delete product' });
  }
});

// ==========================================
// Customer Routes
// ==========================================

router.get('/customers', async (req: Request, res: Response): Promise<void> => {
  try {
    const customers = await prisma.customer.findMany({ orderBy: { createdAt: 'desc' } });
    res.json({ success: true, message: 'Customers retrieved successfully', data: customers });
  } catch (error) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Failed to get customers' });
  }
});

router.get('/customers/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const customer = await prisma.customer.findUnique({ where: { id } });
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });
    res.json({ success: true, message: 'Customer retrieved successfully', data: customer });
  } catch (error) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Failed to get customer' });
  }
});

router.post('/customers', async (req: Request, res: Response): Promise<void> => {
  try {
    const { passportNumber, nameKor, nameEng, ...rest } = req.body;
    if (!passportNumber) return res.status(400).json({ success: false, message: 'Passport number is required' });

    const customer = await prisma.customer.create({
      data: { id: uuidv4(), passportNumber, nameKor, nameEng, ...rest },
    });
    res.status(201).json({ success: true, message: 'Customer created successfully', data: customer });
  } catch (error) {
    res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Failed to create customer' });
  }
});

router.put('/customers/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const customer = await prisma.customer.update({ where: { id }, data: req.body });
    res.json({ success: true, message: 'Customer updated successfully', data: customer });
  } catch (error) {
    res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Failed to update customer' });
  }
});

router.delete('/customers/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    await prisma.customer.delete({ where: { id } });
    res.json({ success: true, message: 'Customer deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Failed to delete customer' });
  }
});

// ==========================================
// Schedule Routes
// ==========================================

router.get('/schedules', async (req: Request, res: Response): Promise<void> => {
  try {
    const schedules = await prisma.schedule.findMany({ orderBy: { createdAt: 'desc' } });
    res.json({ success: true, message: 'Schedules retrieved successfully', data: schedules });
  } catch (error) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Failed to get schedules' });
  }
});

router.get('/schedules/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const schedule = await prisma.schedule.findUnique({ where: { id } });
    if (!schedule) return res.status(404).json({ success: false, message: 'Schedule not found' });
    res.json({ success: true, message: 'Schedule retrieved successfully', data: schedule });
  } catch (error) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Failed to get schedule' });
  }
});

router.post('/schedules', async (req: Request, res: Response): Promise<void> => {
  try {
    const { groupName, eventDate, location, transport, time, schedule, meals, color } = req.body;
    if (!groupName || !eventDate) return res.status(400).json({ success: false, message: 'Group name and event date are required' });

    const scheduleData = await prisma.schedule.create({
      data: { id: uuidv4(), groupName, eventDate, location, transport, time, schedule, meals, color },
    });
    res.status(201).json({ success: true, message: 'Schedule created successfully', data: scheduleData });
  } catch (error) {
    res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Failed to create schedule' });
  }
});

router.put('/schedules/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const schedule = await prisma.schedule.update({ where: { id }, data: req.body });
    res.json({ success: true, message: 'Schedule updated successfully', data: schedule });
  } catch (error) {
    res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Failed to update schedule' });
  }
});

router.delete('/schedules/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    await prisma.schedule.delete({ where: { id } });
    res.json({ success: true, message: 'Schedule deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Failed to delete schedule' });
  }
});

// ==========================================
// BankAccount Routes
// ==========================================

router.get('/bank-accounts', async (req: Request, res: Response): Promise<void> => {
  try {
    const accounts = await prisma.bankAccount.findMany({ orderBy: { createdAt: 'desc' } });
    res.json({ success: true, message: 'Bank accounts retrieved successfully', data: accounts });
  } catch (error) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Failed to get bank accounts' });
  }
});

router.post('/bank-accounts', async (req: Request, res: Response): Promise<void> => {
  try {
    const { bankName, accountNumber, accountHolder, isDefault } = req.body;
    if (!bankName || !accountNumber || !accountHolder) {
      return res.status(400).json({ success: false, message: 'Bank name, account number, and holder are required' });
    }

    const account = await prisma.bankAccount.create({
      data: { id: uuidv4(), bankName, accountNumber, accountHolder, isDefault: isDefault || false },
    });
    res.status(201).json({ success: true, message: 'Bank account created successfully', data: account });
  } catch (error) {
    res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Failed to create bank account' });
  }
});

router.delete('/bank-accounts/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    await prisma.bankAccount.delete({ where: { id } });
    res.json({ success: true, message: 'Bank account deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Failed to delete bank account' });
  }
});

// ==========================================
// Todo Routes
// ==========================================

router.get('/todos', async (req: Request, res: Response): Promise<void> => {
  try {
    const todos = await prisma.todo.findMany({ orderBy: { createdAt: 'desc' } });
    res.json({ success: true, message: 'Todos retrieved successfully', data: todos });
  } catch (error) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Failed to get todos' });
  }
});

router.post('/todos', async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, dueDate, priority, description } = req.body;
    if (!title) return res.status(400).json({ success: false, message: 'Title is required' });

    const todo = await prisma.todo.create({
      data: { id: uuidv4(), title, dueDate, priority, description },
    });
    res.status(201).json({ success: true, message: 'Todo created successfully', data: todo });
  } catch (error) {
    res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Failed to create todo' });
  }
});

router.put('/todos/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const todo = await prisma.todo.update({ where: { id }, data: req.body });
    res.json({ success: true, message: 'Todo updated successfully', data: todo });
  } catch (error) {
    res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Failed to update todo' });
  }
});

router.delete('/todos/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    await prisma.todo.delete({ where: { id } });
    res.json({ success: true, message: 'Todo deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Failed to delete todo' });
  }
});

// ==========================================
// CostCalculation Routes
// ==========================================

router.get('/cost-calculations', async (req: Request, res: Response): Promise<void> => {
  try {
    const costs = await prisma.costCalculation.findMany({ orderBy: { createdAt: 'desc' } });
    res.json({ success: true, message: 'Cost calculations retrieved successfully', data: costs });
  } catch (error) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Failed to get cost calculations' });
  }
});

router.get('/cost-calculations/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const cost = await prisma.costCalculation.findUnique({ where: { id } });
    if (!cost) return res.status(404).json({ success: false, message: 'Cost calculation not found' });
    res.json({ success: true, message: 'Cost calculation retrieved successfully', data: cost });
  } catch (error) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Failed to get cost calculation' });
  }
});

router.post('/cost-calculations', async (req: Request, res: Response): Promise<void> => {
  try {
    const { code, name, destination, departureDate, arrivalDate, adults, children, infants, ...rest } = req.body;
    if (!code || !name) return res.status(400).json({ success: false, message: 'Code and name are required' });

    const cost = await prisma.costCalculation.create({
      data: { id: uuidv4(), code, name, destination, departureDate, arrivalDate, adults: adults || 0, children: children || 0, infants: infants || 0, ...rest },
    });
    res.status(201).json({ success: true, message: 'Cost calculation created successfully', data: cost });
  } catch (error) {
    res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Failed to create cost calculation' });
  }
});

router.put('/cost-calculations/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const cost = await prisma.costCalculation.update({ where: { id }, data: req.body });
    res.json({ success: true, message: 'Cost calculation updated successfully', data: cost });
  } catch (error) {
    res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Failed to update cost calculation' });
  }
});

router.delete('/cost-calculations/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    await prisma.costCalculation.delete({ where: { id } });
    res.json({ success: true, message: 'Cost calculation deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Failed to delete cost calculation' });
  }
});

export default router;