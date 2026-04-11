import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { itineraryStore } from '../src/services/itineraryService';

describe('Itinerary API', () => {
  beforeEach(() => {
    // Clear itinerary store before each test
    itineraryStore.clear();
  });

  describe('GET /api/itineraries', () => {
    it('should return empty array when no itineraries exist', async () => {
      const response = await request(app).get('/api/itineraries');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });

    it('should return all itineraries', async () => {
      // Create test itineraries first
      await request(app).post('/api/itineraries').send({
        title: 'Paris Trip',
        description: 'Explore the city of lights',
        destination: 'Paris, France',
        startDate: '2026-06-01',
        endDate: '2026-06-07',
        status: 'published',
      });

      await request(app).post('/api/itineraries').send({
        title: 'Tokyo Adventure',
        description: 'Experience Japanese culture',
        destination: 'Tokyo, Japan',
        startDate: '2026-09-15',
        endDate: '2026-09-22',
        status: 'draft',
      });

      const response = await request(app).get('/api/itineraries');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].title).toBe('Paris Trip');
      expect(response.body.data[1].title).toBe('Tokyo Adventure');
    });
  });

  describe('GET /api/itineraries/:id', () => {
    it('should return an itinerary by id', async () => {
      // Create test itinerary
      const createResponse = await request(app).post('/api/itineraries').send({
        title: 'Rome Getaway',
        description: 'Ancient history and great food',
        destination: 'Rome, Italy',
        startDate: '2026-08-10',
        endDate: '2026-08-17',
        status: 'published',
      });

      const itineraryId = createResponse.body.data.id;

      const response = await request(app).get(`/api/itineraries/${itineraryId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(itineraryId);
      expect(response.body.data.title).toBe('Rome Getaway');
      expect(response.body.data.destination).toBe('Rome, Italy');
    });

    it('should return 404 when itinerary not found', async () => {
      const response = await request(app).get('/api/itineraries/nonexistent-id');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });
  });

  describe('POST /api/itineraries', () => {
    it('should create a new itinerary', async () => {
      const newItinerary = {
        title: 'Barcelona Tour',
        description: 'Gaudi and beaches',
        destination: 'Barcelona, Spain',
        startDate: '2026-07-01',
        endDate: '2026-07-08',
        status: 'draft' as const,
      };

      const response = await request(app)
        .post('/api/itineraries')
        .send(newItinerary);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.title).toBe(newItinerary.title);
      expect(response.body.data.destination).toBe(newItinerary.destination);
      expect(response.body.data.status).toBe(newItinerary.status);
      expect(response.body.data.createdAt).toBeDefined();
      expect(response.body.data.updatedAt).toBeDefined();
    });

    it('should create itinerary with default status "draft"', async () => {
      const newItinerary = {
        title: 'London Trip',
        destination: 'London, UK',
        startDate: '2026-05-01',
        endDate: '2026-05-05',
      };

      const response = await request(app)
        .post('/api/itineraries')
        .send(newItinerary);

      expect(response.status).toBe(201);
      expect(response.body.data.status).toBe('draft');
    });

    it('should return 400 when required fields are missing', async () => {
      const invalidData = {
        title: 'Test Trip',
        // Missing destination, startDate, endDate
      };

      const response = await request(app)
        .post('/api/itineraries')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 when dates are invalid', async () => {
      const invalidData = {
        title: 'Test Trip',
        destination: 'Test Location',
        startDate: 'invalid-date',
        endDate: '2026-05-05',
      };

      const response = await request(app)
        .post('/api/itineraries')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 when endDate is before startDate', async () => {
      const invalidData = {
        title: 'Test Trip',
        destination: 'Test Location',
        startDate: '2026-05-10',
        endDate: '2026-05-05',
      };

      const response = await request(app)
        .post('/api/itineraries')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message.toLowerCase()).toContain('end date');
    });
  });

  describe('PUT /api/itineraries/:id', () => {
    it('should update an itinerary', async () => {
      // Create test itinerary
      const createResponse = await request(app).post('/api/itineraries').send({
        title: 'Amsterdam Trip',
        description: 'Canals and museums',
        destination: 'Amsterdam, Netherlands',
        startDate: '2026-04-01',
        endDate: '2026-04-05',
        status: 'draft',
      });

      const itineraryId = createResponse.body.data.id;

      const updateData = {
        title: 'Amsterdam Adventure',
        description: 'Canals, museums, and bikes',
        status: 'published' as const,
      };

      const response = await request(app)
        .put(`/api/itineraries/${itineraryId}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(itineraryId);
      expect(response.body.data.title).toBe(updateData.title);
      expect(response.body.data.description).toBe(updateData.description);
      expect(response.body.data.status).toBe(updateData.status);
      expect(response.body.data.destination).toBe('Amsterdam, Netherlands'); // Unchanged
    });

    it('should return 404 when updating non-existent itinerary', async () => {
      const response = await request(app)
        .put('/api/itineraries/nonexistent-id')
        .send({ title: 'Updated Title' });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 when update data is invalid', async () => {
      // Create test itinerary
      const createResponse = await request(app).post('/api/itineraries').send({
        title: 'Test Trip',
        destination: 'Test Location',
        startDate: '2026-05-01',
        endDate: '2026-05-05',
      });

      const itineraryId = createResponse.body.data.id;

      const invalidUpdate = {
        startDate: '2026-05-10',
        endDate: '2026-05-05', // Before start date
      };

      const response = await request(app)
        .put(`/api/itineraries/${itineraryId}`)
        .send(invalidUpdate);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/itineraries/:id', () => {
    it('should delete an itinerary', async () => {
      // Create test itinerary
      const createResponse = await request(app).post('/api/itineraries').send({
        title: 'Delete Test Trip',
        destination: 'Test Location',
        startDate: '2026-06-01',
        endDate: '2026-06-05',
      });

      const itineraryId = createResponse.body.data.id;

      const response = await request(app).delete(
        `/api/itineraries/${itineraryId}`
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted');

      // Verify itinerary is deleted
      const getResponse = await request(app).get(
        `/api/itineraries/${itineraryId}`
      );
      expect(getResponse.status).toBe(404);
    });

    it('should return 404 when deleting non-existent itinerary', async () => {
      const response = await request(app).delete(
        '/api/itineraries/nonexistent-id'
      );

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });
});
