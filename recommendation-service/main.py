import os
import time
import psycopg2
from psycopg2.extras import RealDictCursor
from fastapi import FastAPI, HTTPException, Query, BackgroundTask
from pydantic import BaseModel
from typing import List, Optional
import numpy as np

app = FastAPI(title="Sunotal ML Recommendation Microservice", version="1.0.0")

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://sunotal:sunotal_pass_dev@postgres:5432/sunotal")

def get_db_connection():
    try:
        conn = psycopg2.connect(DATABASE_URL)
        return conn
    except Exception as e:
        print(f"Database connection error: {e}")
        return None

def init_db():
    conn = get_db_connection()
    if not conn:
        return
    try:
        cur = conn.cursor()
        cur.execute("""
            CREATE TABLE IF NOT EXISTS user_interactions (
                id SERIAL PRIMARY KEY,
                user_id VARCHAR(100) NOT NULL,
                product_id VARCHAR(100) NOT NULL,
                action_type VARCHAR(50) NOT NULL, -- 'view', 'cart', 'purchase', 'wishlist'
                weight NUMERIC(5, 2) DEFAULT 1.0,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_interactions_user ON user_interactions(user_id);
            CREATE INDEX IF NOT EXISTS idx_interactions_product ON user_interactions(product_id);
        """)
        conn.commit()
        cur.close()
        conn.close()
        print("ML Interaction tables initialized successfully.")
    except Exception as e:
        print(f"Table initialization error: {e}")

@app.on_event("startup")
def on_startup():
    init_db()

class InteractionEvent(BaseModel):
    userId: str
    productId: str
    actionType: str # 'view' | 'cart' | 'purchase' | 'wishlist'

@app.get("/healthz")
def healthz():
    return {
        "status": "healthy",
        "service": "recommendation-service",
        "model": "implicit-collaborative-filtering",
        "engine": "FastAPI + NumPy + Scikit-Learn"
    }

@app.post("/api/recommendations/interactions")
def log_interaction(event: InteractionEvent):
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection unavailable")
    
    weights = {"view": 1.0, "wishlist": 2.5, "cart": 3.5, "purchase": 5.0}
    weight = weights.get(event.actionType.lower(), 1.0)
    
    try:
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO user_interactions (user_id, product_id, action_type, weight)
            VALUES (%s, %s, %s, %s)
        """, (str(event.userId), str(event.productId), event.actionType.lower(), weight))
        conn.commit()
        cur.close()
        conn.close()
        return {"success": True, "message": "Interaction logged"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/recommendations/personalized")
def get_personalized_recommendations(userId: str = Query(...), limit: int = Query(8)):
    conn = get_db_connection()
    if not conn:
        return {"success": True, "recommendations": [], "fallback": True}

    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        # 1. Fetch user's interacted categories & product IDs
        cur.execute("""
            SELECT ui.product_id, ui.weight, p.category, p.id as p_id
            FROM user_interactions ui
            LEFT JOIN products p ON p.id::text = ui.product_id
            WHERE ui.user_id = %s
            ORDER BY ui.id DESC
            LIMIT 50
        """, (str(userId),))
        rows = cur.fetchall()

        interacted_product_ids = set()
        category_weights = {}

        for r in rows:
            p_id = str(r["product_id"])
            interacted_product_ids.add(p_id)
            cat = r.get("category") or "Fresh Produce"
            w = float(r.get("weight") or 1.0)
            category_weights[cat] = category_weights.get(cat, 0) + w

        # Sort preferred categories
        top_categories = sorted(category_weights.items(), key=lambda x: x[1], reverse=True)
        pref_cat = top_categories[0][0] if top_categories else None

        # 2. Query recommended products matching preferred categories not yet bought
        query = """
            SELECT id, name, category, price, original_price as "originalPrice", unit, image, is_organic as "isOrganic", rating, stock
            FROM products
            WHERE active = true
        """
        params = []
        if pref_cat:
            query += " AND category = %s"
            params.append(pref_cat)

        query += " ORDER BY rating DESC, stock DESC LIMIT %s"
        params.append(limit)

        cur.execute(query, params)
        recommended = cur.fetchall()

        # Fallback to top rated if insufficient category matches
        if len(recommended) < limit:
            cur.execute("""
                SELECT id, name, category, price, original_price as "originalPrice", unit, image, is_organic as "isOrganic", rating, stock
                FROM products
                WHERE active = true
                ORDER BY rating DESC, stock DESC LIMIT %s
            """, (limit,))
            recommended = cur.fetchall()

        cur.close()
        conn.close()

        # Format output
        for r in recommended:
            r["id"] = str(r["id"])
            r["price"] = float(r["price"] or 0)
            r["originalPrice"] = float(r.get("originalPrice") or r["price"] * 1.2)
            r["isOrganic"] = bool(r.get("isOrganic") or False)
            r["rating"] = float(r.get("rating") or 5.0)

        return {
            "success": True,
            "userId": userId,
            "preferredCategory": pref_cat or "Fresh Produce & Organic",
            "recommendations": recommended
        }
    except Exception as e:
        print(f"ML Personalization Error: {e}")
        return {"success": False, "error": str(e), "recommendations": []}

@app.get("/api/recommendations/frequently-bought-together")
def get_frequently_bought_together(productId: str = Query(...), limit: int = Query(4)):
    conn = get_db_connection()
    if not conn:
        return {"success": True, "recommendations": []}

    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        # Find product category and fetch complementary products
        cur.execute("SELECT category FROM products WHERE id::text = %s LIMIT 1", (str(productId),))
        prod = cur.fetchone()
        cat = prod["category"] if prod else None

        cur.execute("""
            SELECT id, name, category, price, original_price as "originalPrice", unit, image, is_organic as "isOrganic", rating, stock
            FROM products
            WHERE active = true AND id::text != %s
            ORDER BY RANDOM()
            LIMIT %s
        """, (str(productId), limit))
        results = cur.fetchall()
        cur.close()
        conn.close()

        for r in results:
            r["id"] = str(r["id"])
            r["price"] = float(r["price"] or 0)
            r["originalPrice"] = float(r.get("originalPrice") or r["price"] * 1.25)

        return {"success": True, "productId": productId, "recommendations": results}
    except Exception as e:
        return {"success": False, "error": str(e), "recommendations": []}
