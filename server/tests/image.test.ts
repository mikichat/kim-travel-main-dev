import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import {
  clearImageStore,
  clearCategoryStore,
} from '../src/services/imageService';

describe('Image API', () => {
  beforeEach(() => {
    clearImageStore();
    clearCategoryStore();
  });

  describe('POST /api/images', () => {
    it('should create a new image', async () => {
      const imageData = {
        filename: 'test-image.jpg',
        storagePath: '/uploads/test-image.jpg',
        mimeType: 'image/jpeg',
        fileSize: 1024,
      };

      const response = await request(app)
        .post('/api/images')
        .send(imageData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.filename).toBe('test-image.jpg');
      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.createdAt).toBeDefined();
    });

    it('should validate filename is required', async () => {
      const response = await request(app)
        .post('/api/images')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Filename');
    });

    it('should create image with category', async () => {
      // Create category first
      const categoryResponse = await request(app)
        .post('/api/categories')
        .send({ name: 'Hotels' })
        .expect(201);

      const categoryId = categoryResponse.body.data.id;

      // Create image with category
      const imageData = {
        filename: 'hotel-image.jpg',
        categoryId,
        storagePath: '/uploads/hotel-image.jpg',
        mimeType: 'image/jpeg',
      };

      const response = await request(app)
        .post('/api/images')
        .send(imageData)
        .expect(201);

      expect(response.body.data.categoryId).toBe(categoryId);
    });
  });

  describe('GET /api/images', () => {
    it('should get all images', async () => {
      // Create test images
      await request(app).post('/api/images').send({
        filename: 'image1.jpg',
        storagePath: '/uploads/image1.jpg',
      });

      await request(app).post('/api/images').send({
        filename: 'image2.jpg',
        storagePath: '/uploads/image2.jpg',
      });

      const response = await request(app).get('/api/images').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.length).toBe(2);
    });

    it('should filter images by category', async () => {
      // Create category
      const categoryResponse = await request(app)
        .post('/api/categories')
        .send({ name: 'Hotels' });
      const categoryId = categoryResponse.body.data.id;

      // Create images
      await request(app).post('/api/images').send({
        filename: 'hotel.jpg',
        categoryId,
      });

      await request(app).post('/api/images').send({
        filename: 'other.jpg',
      });

      const response = await request(app)
        .get(`/api/images?categoryId=${categoryId}`)
        .expect(200);

      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].filename).toBe('hotel.jpg');
    });

    it('should support pagination', async () => {
      // Create multiple images
      for (let i = 1; i <= 5; i++) {
        await request(app)
          .post('/api/images')
          .send({
            filename: `image${i}.jpg`,
          });
      }

      const response = await request(app)
        .get('/api/images?page=1&limit=2')
        .expect(200);

      expect(response.body.data.length).toBe(2);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(2);
      expect(response.body.pagination.total).toBe(5);
      expect(response.body.pagination.totalPages).toBe(3);
    });
  });

  describe('GET /api/images/:id', () => {
    it('should get image by id', async () => {
      const createResponse = await request(app).post('/api/images').send({
        filename: 'test.jpg',
      });

      const imageId = createResponse.body.data.id;

      const response = await request(app)
        .get(`/api/images/${imageId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(imageId);
    });

    it('should return 404 for non-existent image', async () => {
      const response = await request(app)
        .get('/api/images/non-existent-id')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PATCH /api/images/:id', () => {
    it('should update image metadata', async () => {
      const createResponse = await request(app).post('/api/images').send({
        filename: 'test.jpg',
      });

      const imageId = createResponse.body.data.id;

      const response = await request(app)
        .patch(`/api/images/${imageId}`)
        .send({
          metadata: { tags: ['hotel', 'luxury'] },
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.metadata).toEqual({
        tags: ['hotel', 'luxury'],
      });
    });

    it('should update image category', async () => {
      // Create category
      const categoryResponse = await request(app)
        .post('/api/categories')
        .send({ name: 'Hotels' });
      const categoryId = categoryResponse.body.data.id;

      // Create image
      const createResponse = await request(app).post('/api/images').send({
        filename: 'test.jpg',
      });
      const imageId = createResponse.body.data.id;

      // Update category
      const response = await request(app)
        .patch(`/api/images/${imageId}`)
        .send({ categoryId })
        .expect(200);

      expect(response.body.data.categoryId).toBe(categoryId);
    });
  });

  describe('DELETE /api/images/:id', () => {
    it('should delete image', async () => {
      const createResponse = await request(app).post('/api/images').send({
        filename: 'test.jpg',
      });

      const imageId = createResponse.body.data.id;

      const response = await request(app)
        .delete(`/api/images/${imageId}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify image is deleted
      await request(app).get(`/api/images/${imageId}`).expect(404);
    });

    it('should return 404 when deleting non-existent image', async () => {
      const response = await request(app)
        .delete('/api/images/non-existent-id')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Category API', () => {
    describe('POST /api/categories', () => {
      it('should create a new category', async () => {
        const response = await request(app)
          .post('/api/categories')
          .send({ name: 'Hotels', description: 'Hotel images' })
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.name).toBe('Hotels');
        expect(response.body.data.description).toBe('Hotel images');
      });

      it('should validate name is required', async () => {
        const response = await request(app)
          .post('/api/categories')
          .send({})
          .expect(400);

        expect(response.body.success).toBe(false);
      });
    });

    describe('GET /api/categories', () => {
      it('should get all categories', async () => {
        await request(app).post('/api/categories').send({ name: 'Hotels' });
        await request(app).post('/api/categories').send({ name: 'Tours' });

        const response = await request(app).get('/api/categories').expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.length).toBe(2);
      });
    });

    describe('GET /api/categories/:id', () => {
      it('should get category by id', async () => {
        const createResponse = await request(app)
          .post('/api/categories')
          .send({ name: 'Hotels' });

        const categoryId = createResponse.body.data.id;

        const response = await request(app)
          .get(`/api/categories/${categoryId}`)
          .expect(200);

        expect(response.body.data.id).toBe(categoryId);
      });
    });

    describe('PUT /api/categories/:id', () => {
      it('should update category', async () => {
        const createResponse = await request(app)
          .post('/api/categories')
          .send({ name: 'Hotels' });

        const categoryId = createResponse.body.data.id;

        const response = await request(app)
          .put(`/api/categories/${categoryId}`)
          .send({ name: 'Luxury Hotels', description: 'Updated' })
          .expect(200);

        expect(response.body.data.name).toBe('Luxury Hotels');
        expect(response.body.data.description).toBe('Updated');
      });
    });

    describe('DELETE /api/categories/:id', () => {
      it('should delete category', async () => {
        const createResponse = await request(app)
          .post('/api/categories')
          .send({ name: 'Hotels' });

        const categoryId = createResponse.body.data.id;

        await request(app).delete(`/api/categories/${categoryId}`).expect(200);

        // Verify deletion
        await request(app).get(`/api/categories/${categoryId}`).expect(404);
      });
    });
  });
});
