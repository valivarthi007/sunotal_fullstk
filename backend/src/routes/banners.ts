import { Router } from "express";
import { Banner } from "../lib/db.js";

export const bannersRouter = Router();

function formatBanner(b: any) {
  return {
    id: b.id,
    title: b.title,
    subtitle: b.subtitle,
    imageUrl: b.imageUrl,
    linkUrl: b.linkUrl,
    active: b.active,
    createdAt: b.createdAt ? (typeof b.createdAt === "string" ? b.createdAt : b.createdAt.toISOString()) : new Date().toISOString(),
  };
}

bannersRouter.get(["/", "/banners"], async (req, res) => {
  try {
    const banners = await Banner.find({ active: true });
    return res.status(200).json(banners.map((b: any) => formatBanner(b.toObject())));
  } catch (error) {
    console.error("Failed to fetch banners:", error);
    return res.status(500).json({ error: "Failed to fetch hero banners." });
  }
});

bannersRouter.post(["/", "/banners"], async (req, res) => {
  try {
    const { title, subtitle, imageUrl, linkUrl } = req.body;
    if (!title || !imageUrl) {
      return res.status(400).json({ error: "Title and image URL are required." });
    }
    const newBanner = await Banner.create({
      title,
      subtitle: subtitle || null,
      imageUrl,
      linkUrl: linkUrl || null,
      active: true,
    });
    return res.status(201).json(formatBanner(newBanner.toObject()));
  } catch (error) {
    console.error("Failed to create banner:", error);
    return res.status(500).json({ error: "Failed to create hero banner." });
  }
});

bannersRouter.delete(["/:id", "/banners/:id"], async (req, res) => {
  try {
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = parseInt(rawId, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid banner ID." });
    }
    await Banner.findOneAndDelete({ id });
    return res.status(200).json({ success: true, message: "Banner deleted." });
  } catch (error) {
    console.error("Failed to delete banner:", error);
    return res.status(500).json({ error: "Failed to delete hero banner." });
  }
});
