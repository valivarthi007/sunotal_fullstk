import { Router } from 'express';
import { db } from '../lib/db.js';
import { bannersTable } from '../schema/banners.js';
import { eq } from 'drizzle-orm';

export const bannersRouter = Router();

// GET all active banners
bannersRouter.get('/', async (req, res) => {
  try {
    const banners = await db.select().from(bannersTable).where(eq(bannersTable.active, true));
    return res.status(200).json(banners);
  } catch (error) {
    console.error('Failed to fetch banners:', error);
    return res.status(500).json({ error: 'Failed to fetch hero banners.' });
  }
});

// POST add a new banner
bannersRouter.post('/', async (req, res) => {
  try {
    const { title, subtitle, imageUrl, linkUrl } = req.body;

    if (!title || !imageUrl) {
      return res.status(400).json({ error: 'Title and image URL are required.' });
    }

    const [newBanner] = await db.insert(bannersTable).values({
      title,
      subtitle: subtitle || null,
      imageUrl,
      linkUrl: linkUrl || null,
      active: true
    }).returning();

    return res.status(201).json(newBanner);
  } catch (error) {
    console.error('Failed to create banner:', error);
    return res.status(500).json({ error: 'Failed to create hero banner.' });
  }
});

// DELETE a banner
bannersRouter.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid banner ID.' });
    }

    await db.delete(bannersTable).where(eq(bannersTable.id, id));
    return res.status(200).json({ success: true, message: 'Banner deleted.' });
  } catch (error) {
    console.error('Failed to delete banner:', error);
    return res.status(500).json({ error: 'Failed to delete hero banner.' });
  }
});
