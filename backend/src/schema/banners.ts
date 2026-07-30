import { pgTable, serial, text, boolean, timestamp } from 'drizzle-orm/pg-core';

export const bannersTable = pgTable('banners', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  subtitle: text('subtitle'),
  imageUrl: text('image_url').notNull(),
  linkUrl: text('link_url'),
  active: boolean('active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
});
