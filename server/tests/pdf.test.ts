import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { itineraryStore } from '../src/services/itineraryService';
import { itineraryItemStore } from '../src/services/itineraryItemService';
import { hotelStore } from '../src/services/hotelService';

describe('PDF API', () => {
  let itineraryId: string;
  let hotelId1: string;
  let hotelId2: string;

  beforeEach(async () => {
    // Clear all stores
    itineraryStore.clear();
    itineraryItemStore.clear();
    hotelStore.clear();

    // Create test itinerary
    const itineraryResponse = await request(app).post('/api/itineraries').send({
      title: 'Paris Luxury Tour',
      description: 'A week in Paris',
      destination: 'Paris, France',
      startDate: '2026-06-01',
      endDate: '2026-06-03',
      status: 'published',
    });
    itineraryId = itineraryResponse.body.data.id;

    // Create test itinerary items
    await request(app).post(`/api/itineraries/${itineraryId}/items`).send({
      day: 1,
      sortOrder: 1,
      time: '09:00',
      title: 'Eiffel Tower Visit',
      description: 'Morning visit to the iconic tower',
      location: 'Champ de Mars',
      duration: 120,
    });

    await request(app).post(`/api/itineraries/${itineraryId}/items`).send({
      day: 1,
      sortOrder: 2,
      time: '14:00',
      title: 'Louvre Museum',
      description: 'Afternoon at the museum',
      location: 'Rue de Rivoli',
      duration: 180,
    });

    await request(app).post(`/api/itineraries/${itineraryId}/items`).send({
      day: 2,
      sortOrder: 1,
      time: '10:00',
      title: 'Versailles Palace',
      description: 'Day trip to Versailles',
      location: 'Versailles',
      duration: 240,
    });

    // Create test hotels
    const hotel1Response = await request(app).post('/api/hotels').send({
      name: 'Grand Hotel Paris',
      address: '123 Rue de Paris',
      city: 'Paris',
      country: 'France',
      starRating: 5,
      phone: '+33 1 234 5678',
      url: 'https://grandhotelparis.com',
    });
    hotelId1 = hotel1Response.body.data.id;

    const hotel2Response = await request(app).post('/api/hotels').send({
      name: 'Boutique Hotel Seine',
      address: '456 Quai de Seine',
      city: 'Paris',
      country: 'France',
      starRating: 4,
      phone: '+33 1 987 6543',
    });
    hotelId2 = hotel2Response.body.data.id;
  });

  describe('GET /api/pdf/preview/:itineraryId', () => {
    it('should return PDF preview data for an itinerary', async () => {
      const response = await request(app).get(
        `/api/pdf/preview/${itineraryId}`
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();

      const pdfData = response.body.data;
      expect(pdfData.title).toBe('Paris Luxury Tour');
      expect(pdfData.destination).toBe('Paris, France');
      expect(pdfData.dateRange).toBeDefined();
      expect(pdfData.startDate).toBe('2026-06-01');
      expect(pdfData.endDate).toBe('2026-06-03');
      expect(pdfData.days).toHaveLength(2);

      // Verify day 1 items
      expect(pdfData.days[0].dayNumber).toBe(1);
      expect(pdfData.days[0].items).toHaveLength(2);
      expect(pdfData.days[0].items[0].title).toBe('Eiffel Tower Visit');
      expect(pdfData.days[0].items[1].title).toBe('Louvre Museum');

      // Verify day 2 items
      expect(pdfData.days[1].dayNumber).toBe(2);
      expect(pdfData.days[1].items).toHaveLength(1);
      expect(pdfData.days[1].items[0].title).toBe('Versailles Palace');

      // Verify hotels (empty by default)
      expect(pdfData.hotels).toEqual([]);

      // Verify checklist (empty by default)
      expect(pdfData.checklist).toEqual([]);
    });

    it('should return 404 when itinerary not found', async () => {
      const response = await request(app).get(
        '/api/pdf/preview/nonexistent-id'
      );

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });
  });

  describe('POST /api/pdf/generate', () => {
    it('should generate PDF with itinerary data only', async () => {
      const response = await request(app).post('/api/pdf/generate').send({
        itineraryId,
      });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.url).toBeDefined();
      expect(response.body.data.createdAt).toBeDefined();
    });

    it('should generate PDF with itinerary and hotels', async () => {
      const response = await request(app)
        .post('/api/pdf/generate')
        .send({
          itineraryId,
          hotelIds: [hotelId1, hotelId2],
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.url).toContain('.pdf');
    });

    it('should generate PDF with all optional data', async () => {
      const response = await request(app)
        .post('/api/pdf/generate')
        .send({
          itineraryId,
          hotelIds: [hotelId1],
          checklist: ['Passport', 'Travel insurance', 'Camera'],
          coverImage: 'https://example.com/paris.jpg',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBeDefined();
    });

    it('should return 400 when itineraryId is missing', async () => {
      const response = await request(app).post('/api/pdf/generate').send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('itineraryId');
    });

    it('should return 404 when itinerary not found', async () => {
      const response = await request(app).post('/api/pdf/generate').send({
        itineraryId: 'nonexistent-id',
      });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/pdf/:id', () => {
    it('should retrieve generated PDF metadata', async () => {
      // Generate PDF first
      const generateResponse = await request(app)
        .post('/api/pdf/generate')
        .send({
          itineraryId,
          hotelIds: [hotelId1],
        });

      const pdfId = generateResponse.body.data.id;

      // Retrieve PDF
      const response = await request(app).get(`/api/pdf/${pdfId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBe(pdfId);
      expect(response.body.data.url).toBeDefined();
    });

    it('should return 404 when PDF not found', async () => {
      const response = await request(app).get('/api/pdf/nonexistent-id');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });
  });
});
