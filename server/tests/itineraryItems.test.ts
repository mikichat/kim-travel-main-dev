import request from 'supertest';
import app from '../src/app';
import { itineraryStore } from '../src/services/itineraryService';
import { itineraryItemStore } from '../src/services/itineraryItemService';

describe('Itinerary Items API', () => {
  let testItineraryId: string;

  beforeEach(() => {
    // Clear stores
    itineraryStore.clear();
    itineraryItemStore.clear();

    // Create a test itinerary
    const response = {
      title: 'Test Trip',
      description: 'Test Description',
      destination: 'Seoul',
      startDate: '2026-02-01',
      endDate: '2026-02-03',
    };

    // Create itinerary via API
    return request(app)
      .post('/api/itineraries')
      .send(response)
      .then((res) => {
        testItineraryId = res.body.data.id;
      });
  });

  describe('GET /api/itineraries/:itineraryId/items', () => {
    it('should return empty array for new itinerary', async () => {
      const response = await request(app)
        .get(`/api/itineraries/${testItineraryId}/items`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });

    it('should return 404 for non-existent itinerary', async () => {
      const response = await request(app)
        .get('/api/itineraries/non-existent-id/items')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Itinerary not found');
    });

    it('should return items sorted by day and sortOrder', async () => {
      // Create items
      await request(app)
        .post(`/api/itineraries/${testItineraryId}/items`)
        .send({
          day: 1,
          sortOrder: 2,
          time: '14:00',
          title: 'Lunch',
        });

      await request(app)
        .post(`/api/itineraries/${testItineraryId}/items`)
        .send({
          day: 1,
          sortOrder: 1,
          time: '09:00',
          title: 'Breakfast',
        });

      await request(app)
        .post(`/api/itineraries/${testItineraryId}/items`)
        .send({
          day: 2,
          sortOrder: 1,
          time: '10:00',
          title: 'Museum',
        });

      const response = await request(app)
        .get(`/api/itineraries/${testItineraryId}/items`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(3);
      expect(response.body.data[0].title).toBe('Breakfast');
      expect(response.body.data[1].title).toBe('Lunch');
      expect(response.body.data[2].title).toBe('Museum');
    });
  });

  describe('POST /api/itineraries/:itineraryId/items', () => {
    it('should create a new item with required fields', async () => {
      const newItem = {
        day: 1,
        sortOrder: 1,
        time: '09:00',
        title: 'Breakfast at Hotel',
      };

      const response = await request(app)
        .post(`/api/itineraries/${testItineraryId}/items`)
        .send(newItem)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        day: 1,
        sortOrder: 1,
        time: '09:00',
        title: 'Breakfast at Hotel',
        itineraryId: testItineraryId,
      });
      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.createdAt).toBeDefined();
      expect(response.body.data.updatedAt).toBeDefined();
    });

    it('should create an item with optional fields', async () => {
      const newItem = {
        day: 1,
        sortOrder: 1,
        time: '09:00',
        title: 'Visit Museum',
        description: 'National Museum of Korea',
        location: 'Yongsan, Seoul',
        duration: 120,
      };

      const response = await request(app)
        .post(`/api/itineraries/${testItineraryId}/items`)
        .send(newItem)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        day: 1,
        sortOrder: 1,
        time: '09:00',
        title: 'Visit Museum',
        description: 'National Museum of Korea',
        location: 'Yongsan, Seoul',
        duration: 120,
      });
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post(`/api/itineraries/${testItineraryId}/items`)
        .send({
          day: 1,
          // Missing: sortOrder, time, title
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Missing required fields');
    });

    it('should return 400 for invalid day number', async () => {
      const response = await request(app)
        .post(`/api/itineraries/${testItineraryId}/items`)
        .send({
          day: 0, // Invalid: should be >= 1
          sortOrder: 1,
          time: '09:00',
          title: 'Test',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Day must be a positive number');
    });

    it('should return 400 for invalid time format', async () => {
      const response = await request(app)
        .post(`/api/itineraries/${testItineraryId}/items`)
        .send({
          day: 1,
          sortOrder: 1,
          time: '25:00', // Invalid hour
          title: 'Test',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid time format');
    });

    it('should return 404 for non-existent itinerary', async () => {
      const response = await request(app)
        .post('/api/itineraries/non-existent-id/items')
        .send({
          day: 1,
          sortOrder: 1,
          time: '09:00',
          title: 'Test',
        })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Itinerary not found');
    });
  });

  describe('PUT /api/itineraries/:itineraryId/items/:id', () => {
    let testItemId: string;

    beforeEach(async () => {
      const response = await request(app)
        .post(`/api/itineraries/${testItineraryId}/items`)
        .send({
          day: 1,
          sortOrder: 1,
          time: '09:00',
          title: 'Original Title',
        });
      testItemId = response.body.data.id;
    });

    it('should update an item', async () => {
      const response = await request(app)
        .put(`/api/itineraries/${testItineraryId}/items/${testItemId}`)
        .send({
          title: 'Updated Title',
          description: 'Added description',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('Updated Title');
      expect(response.body.data.description).toBe('Added description');
      expect(response.body.data.day).toBe(1); // Unchanged
    });

    it('should return 404 for non-existent item', async () => {
      const response = await request(app)
        .put(`/api/itineraries/${testItineraryId}/items/non-existent-id`)
        .send({
          title: 'Test',
        })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Item not found');
    });

    it('should return 400 for invalid time format on update', async () => {
      const response = await request(app)
        .put(`/api/itineraries/${testItineraryId}/items/${testItemId}`)
        .send({
          time: 'invalid-time',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid time format');
    });
  });

  describe('DELETE /api/itineraries/:itineraryId/items/:id', () => {
    let testItemId: string;

    beforeEach(async () => {
      const response = await request(app)
        .post(`/api/itineraries/${testItineraryId}/items`)
        .send({
          day: 1,
          sortOrder: 1,
          time: '09:00',
          title: 'Test Item',
        });
      testItemId = response.body.data.id;
    });

    it('should delete an item', async () => {
      const response = await request(app)
        .delete(`/api/itineraries/${testItineraryId}/items/${testItemId}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify item is deleted
      const getResponse = await request(app)
        .get(`/api/itineraries/${testItineraryId}/items`)
        .expect(200);

      expect(getResponse.body.data).toHaveLength(0);
    });

    it('should return 404 for non-existent item', async () => {
      const response = await request(app)
        .delete(`/api/itineraries/${testItineraryId}/items/non-existent-id`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Item not found');
    });
  });

  describe('PATCH /api/itineraries/:itineraryId/items/reorder', () => {
    let item1Id: string;
    let item2Id: string;
    let item3Id: string;

    beforeEach(async () => {
      const res1 = await request(app)
        .post(`/api/itineraries/${testItineraryId}/items`)
        .send({
          day: 1,
          sortOrder: 1,
          time: '09:00',
          title: 'Item 1',
        });
      item1Id = res1.body.data.id;

      const res2 = await request(app)
        .post(`/api/itineraries/${testItineraryId}/items`)
        .send({
          day: 1,
          sortOrder: 2,
          time: '14:00',
          title: 'Item 2',
        });
      item2Id = res2.body.data.id;

      const res3 = await request(app)
        .post(`/api/itineraries/${testItineraryId}/items`)
        .send({
          day: 2,
          sortOrder: 1,
          time: '10:00',
          title: 'Item 3',
        });
      item3Id = res3.body.data.id;
    });

    it('should reorder items successfully', async () => {
      const response = await request(app)
        .patch(`/api/itineraries/${testItineraryId}/items/reorder`)
        .send({
          items: [
            { id: item2Id, day: 1, sortOrder: 1 }, // Swap item2 to first
            { id: item1Id, day: 1, sortOrder: 2 }, // Move item1 to second
            { id: item3Id, day: 1, sortOrder: 3 }, // Move item3 to day 1
          ],
        })
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify new order
      const getResponse = await request(app)
        .get(`/api/itineraries/${testItineraryId}/items`)
        .expect(200);

      expect(getResponse.body.data[0].id).toBe(item2Id);
      expect(getResponse.body.data[0].day).toBe(1);
      expect(getResponse.body.data[0].sortOrder).toBe(1);

      expect(getResponse.body.data[1].id).toBe(item1Id);
      expect(getResponse.body.data[1].day).toBe(1);
      expect(getResponse.body.data[1].sortOrder).toBe(2);

      expect(getResponse.body.data[2].id).toBe(item3Id);
      expect(getResponse.body.data[2].day).toBe(1);
      expect(getResponse.body.data[2].sortOrder).toBe(3);
    });

    it('should return 400 for missing items array', async () => {
      const response = await request(app)
        .patch(`/api/itineraries/${testItineraryId}/items/reorder`)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Missing items array');
    });

    it('should return 404 for non-existent item in reorder', async () => {
      const response = await request(app)
        .patch(`/api/itineraries/${testItineraryId}/items/reorder`)
        .send({
          items: [{ id: 'non-existent-id', day: 1, sortOrder: 1 }],
        })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Item not found');
    });
  });
});
