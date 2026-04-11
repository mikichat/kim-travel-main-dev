import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { hotelStore } from '../src/services/hotelService';

describe('Hotel API', () => {
  beforeEach(() => {
    // Clear hotel store before each test
    hotelStore.clear();
  });

  describe('GET /api/hotels', () => {
    it('should return empty array when no hotels exist', async () => {
      const response = await request(app).get('/api/hotels');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });

    it('should return all hotels', async () => {
      // Create test hotels first
      await request(app)
        .post('/api/hotels')
        .send({
          name: 'Grand Hotel Paris',
          address: '123 Rue de la Paix',
          country: 'France',
          city: 'Paris',
          starRating: 5,
          coordinates: { lat: 48.8566, lng: 2.3522 },
        });

      await request(app)
        .post('/api/hotels')
        .send({
          name: 'Tokyo Imperial',
          address: '456 Shibuya',
          country: 'Japan',
          city: 'Tokyo',
          starRating: 4,
          coordinates: { lat: 35.6762, lng: 139.6503 },
        });

      const response = await request(app).get('/api/hotels');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].name).toBe('Grand Hotel Paris');
      expect(response.body.data[1].name).toBe('Tokyo Imperial');
    });

    it('should support pagination', async () => {
      // Create multiple hotels
      for (let i = 1; i <= 15; i++) {
        await request(app)
          .post('/api/hotels')
          .send({
            name: `Hotel ${i}`,
            address: `Address ${i}`,
            city: 'Test City',
          });
      }

      const response = await request(app).get('/api/hotels?page=1&limit=10');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(10);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(10);
      expect(response.body.pagination.total).toBe(15);
      expect(response.body.pagination.totalPages).toBe(2);
    });
  });

  describe('GET /api/hotels/:id', () => {
    it('should return a hotel by id', async () => {
      // Create test hotel
      const createResponse = await request(app)
        .post('/api/hotels')
        .send({
          name: 'Rome Luxury Suite',
          address: 'Via del Corso 1',
          country: 'Italy',
          city: 'Rome',
          starRating: 5,
          phone: '+39 06 123456',
          url: 'https://romeluxury.com',
          locationRemarks: 'Walking distance to Colosseum',
          coordinates: { lat: 41.9028, lng: 12.4964 },
          amenities: ['wifi', 'parking', 'breakfast', 'pool'],
        });

      const hotelId = createResponse.body.data.id;

      const response = await request(app).get(`/api/hotels/${hotelId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(hotelId);
      expect(response.body.data.name).toBe('Rome Luxury Suite');
      expect(response.body.data.city).toBe('Rome');
      expect(response.body.data.coordinates).toEqual({
        lat: 41.9028,
        lng: 12.4964,
      });
      expect(response.body.data.amenities).toEqual([
        'wifi',
        'parking',
        'breakfast',
        'pool',
      ]);
    });

    it('should return 404 when hotel not found', async () => {
      const response = await request(app).get('/api/hotels/nonexistent-id');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });
  });

  describe('POST /api/hotels', () => {
    it('should create a new hotel with minimal data', async () => {
      const newHotel = {
        name: 'Barcelona Beach Hotel',
      };

      const response = await request(app).post('/api/hotels').send(newHotel);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.name).toBe(newHotel.name);
      expect(response.body.data.createdAt).toBeDefined();
      expect(response.body.data.updatedAt).toBeDefined();
    });

    it('should create a hotel with full data', async () => {
      const newHotel = {
        name: 'London Five Star',
        address: '1 Piccadilly Circus',
        country: 'United Kingdom',
        city: 'London',
        starRating: 5,
        phone: '+44 20 1234567',
        url: 'https://londonfivestar.com',
        locationRemarks: 'Near Westminster Abbey',
        coordinates: { lat: 51.5074, lng: -0.1278 },
        amenities: ['wifi', 'gym', 'spa', 'restaurant'],
      };

      const response = await request(app).post('/api/hotels').send(newHotel);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.name).toBe(newHotel.name);
      expect(response.body.data.address).toBe(newHotel.address);
      expect(response.body.data.starRating).toBe(newHotel.starRating);
      expect(response.body.data.coordinates).toEqual(newHotel.coordinates);
      expect(response.body.data.amenities).toEqual(newHotel.amenities);
    });

    it('should return 400 when name is missing', async () => {
      const invalidData = {
        address: '123 Test Street',
      };

      const response = await request(app).post('/api/hotels').send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('name');
    });

    it('should return 400 when starRating is invalid', async () => {
      const invalidData = {
        name: 'Test Hotel',
        starRating: 6, // Invalid: should be 1-5
      };

      const response = await request(app).post('/api/hotels').send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('rating');
    });

    it('should return 400 when coordinates are invalid', async () => {
      const invalidData = {
        name: 'Test Hotel',
        coordinates: { lat: 200, lng: -300 }, // Invalid coordinates
      };

      const response = await request(app).post('/api/hotels').send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('coordinates');
    });
  });

  describe('PUT /api/hotels/:id', () => {
    it('should update a hotel', async () => {
      // Create test hotel
      const createResponse = await request(app).post('/api/hotels').send({
        name: 'Amsterdam Hotel',
        address: 'Canal Street 1',
        city: 'Amsterdam',
        starRating: 3,
      });

      const hotelId = createResponse.body.data.id;

      const updateData = {
        name: 'Amsterdam Boutique Hotel',
        starRating: 4,
        amenities: ['wifi', 'breakfast'],
      };

      const response = await request(app)
        .put(`/api/hotels/${hotelId}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(hotelId);
      expect(response.body.data.name).toBe(updateData.name);
      expect(response.body.data.starRating).toBe(updateData.starRating);
      expect(response.body.data.amenities).toEqual(updateData.amenities);
      expect(response.body.data.city).toBe('Amsterdam'); // Unchanged
    });

    it('should update hotel coordinates', async () => {
      // Create test hotel
      const createResponse = await request(app)
        .post('/api/hotels')
        .send({
          name: 'Test Hotel',
          coordinates: { lat: 0, lng: 0 },
        });

      const hotelId = createResponse.body.data.id;

      const updateData = {
        coordinates: { lat: 52.3676, lng: 4.9041 }, // Amsterdam coordinates
      };

      const response = await request(app)
        .put(`/api/hotels/${hotelId}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.coordinates).toEqual(updateData.coordinates);
    });

    it('should return 404 when updating non-existent hotel', async () => {
      const response = await request(app)
        .put('/api/hotels/nonexistent-id')
        .send({ name: 'Updated Name' });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 when update data is invalid', async () => {
      // Create test hotel
      const createResponse = await request(app).post('/api/hotels').send({
        name: 'Test Hotel',
      });

      const hotelId = createResponse.body.data.id;

      const invalidUpdate = {
        starRating: 10, // Invalid rating
      };

      const response = await request(app)
        .put(`/api/hotels/${hotelId}`)
        .send(invalidUpdate);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/hotels/:id', () => {
    it('should delete a hotel', async () => {
      // Create test hotel
      const createResponse = await request(app).post('/api/hotels').send({
        name: 'Delete Test Hotel',
        address: 'Test Address',
      });

      const hotelId = createResponse.body.data.id;

      const response = await request(app).delete(`/api/hotels/${hotelId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted');

      // Verify hotel is deleted
      const getResponse = await request(app).get(`/api/hotels/${hotelId}`);
      expect(getResponse.status).toBe(404);
    });

    it('should return 404 when deleting non-existent hotel', async () => {
      const response = await request(app).delete('/api/hotels/nonexistent-id');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });
});
