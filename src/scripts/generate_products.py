#!/usr/bin/env python3


import json
import random
import uuid
from datetime import datetime, timedelta

random.seed(42)



CATEGORIES = {
    "Electronics": {
        "subcategories": ["Laptops", "Smartphones", "Headphones", "Cameras", "Tablets", "Smart Watches"],
        "brands": ["Apple", "Samsung", "Sony", "Dell", "Lenovo", "LG", "Bose", "Canon", "Nikon", "Asus"],
        "adjectives": ["Pro", "Ultra", "Max", "Elite", "Advanced", "Smart", "Wireless", "Portable"],
        "price_range": (49.99, 2999.99),
        "tags": ["tech", "gadget", "wireless", "digital", "portable", "rechargeable", "HD", "4K", "bluetooth"]
    },
    "Clothing": {
        "subcategories": ["Men's Shirts", "Women's Dresses", "Jackets", "Sneakers", "Jeans", "Sportswear"],
        "brands": ["Nike", "Adidas", "Zara", "H&M", "Levi's", "Puma", "Gucci", "Ralph Lauren", "Under Armour"],
        "adjectives": ["Classic", "Slim Fit", "Casual", "Formal", "Breathable", "Waterproof", "Stretch", "Premium"],
        "price_range": (9.99, 499.99),
        "tags": ["fashion", "style", "comfortable", "casual", "formal", "outdoor", "sportswear", "everyday"]
    },
    "Home & Kitchen": {
        "subcategories": ["Cookware", "Furniture", "Bedding", "Appliances", "Decor", "Storage"],
        "brands": ["IKEA", "KitchenAid", "Instant Pot", "Dyson", "Cuisinart", "Lodge", "OXO", "Pyrex"],
        "adjectives": ["Non-stick", "Stainless", "Ergonomic", "Space-saving", "Eco-friendly", "Heavy Duty"],
        "price_range": (12.99, 899.99),
        "tags": ["home", "kitchen", "cooking", "durable", "easy-clean", "modern", "minimalist", "storage"]
    },
    "Sports & Outdoors": {
        "subcategories": ["Fitness Equipment", "Camping Gear", "Cycling", "Running", "Swimming", "Team Sports"],
        "brands": ["Coleman", "Garmin", "Osprey", "Black Diamond", "Yeti", "REI", "Patagonia", "Salomon"],
        "adjectives": ["Heavy-Duty", "Lightweight", "All-Weather", "High-Performance", "Compact", "Ergonomic"],
        "price_range": (14.99, 1499.99),
        "tags": ["outdoor", "fitness", "sport", "adventure", "durable", "lightweight", "waterproof", "hiking"]
    },
    "Books": {
        "subcategories": ["Fiction", "Non-Fiction", "Science", "History", "Technology", "Self-Help", "Biography"],
        "brands": ["Penguin", "HarperCollins", "Random House", "O'Reilly", "Oxford Press", "Simon & Schuster"],
        "adjectives": ["Bestselling", "Award-winning", "Essential", "Illustrated", "Revised", "Expanded"],
        "price_range": (4.99, 79.99),
        "tags": ["reading", "knowledge", "education", "paperback", "hardcover", "ebook", "bestseller"]
    },
    "Beauty & Health": {
        "subcategories": ["Skincare", "Hair Care", "Vitamins", "Makeup", "Fragrances", "Personal Care"],
        "brands": ["L'Oreal", "Neutrogena", "CeraVe", "The Ordinary", "Maybelline", "Clinique", "Dove"],
        "adjectives": ["Organic", "Natural", "Hydrating", "Anti-aging", "Dermatologist-tested", "Cruelty-free"],
        "price_range": (5.99, 299.99),
        "tags": ["beauty", "skincare", "wellness", "natural", "organic", "vegan", "fragrance-free", "SPF"]
    },
    "Toys & Games": {
        "subcategories": ["Board Games", "Action Figures", "LEGO", "Educational Toys", "Puzzles", "Video Games"],
        "brands": ["LEGO", "Hasbro", "Mattel", "Nintendo", "Fisher-Price", "Melissa & Doug", "Ravensburger"],
        "adjectives": ["Interactive", "Educational", "Creative", "Age-appropriate", "Award-winning", "STEM"],
        "price_range": (7.99, 349.99),
        "tags": ["kids", "play", "educational", "fun", "creative", "family", "STEM", "ages3+", "ages8+"]
    },
    "Automotive": {
        "subcategories": ["Car Accessories", "Tools", "Car Care", "Electronics", "Lighting", "Safety"],
        "brands": ["Bosch", "3M", "WeatherTech", "Meguiar's", "Pioneer", "Garmin", "Michelin", "Black & Decker"],
        "adjectives": ["Universal", "Heavy-Duty", "Precision", "All-Season", "Professional", "Quick-Install"],
        "price_range": (9.99, 799.99),
        "tags": ["car", "vehicle", "auto", "durable", "universal", "safety", "performance", "interior"]
    }
}

DESCRIPTION_TEMPLATES = [
    "Experience the difference with the {name}. Designed for {audience}, this {adjective} product delivers {benefit} you can count on every day.",
    "Introducing the {name} — built with precision and crafted for performance. Whether you're a {audience} or just getting started, {benefit}.",
    "The {name} redefines what you expect from {category} products. {adjective_cap} construction meets modern design, giving you {benefit}.",
    "Upgrade your {category} experience with the {name}. Loved by {audience}, this product stands out for its {adjective} build and {benefit}.",
    "Meet the {name}: the {adjective} choice for anyone who demands the best. {adjective_cap} design ensures {benefit} without compromise."
]

AUDIENCES = [
    "professionals", "everyday users", "outdoor enthusiasts", "fitness lovers",
    "home chefs", "tech enthusiasts", "students", "busy families", "travelers", "beginners"
]

BENEFITS = [
    "unmatched durability and reliability",
    "superior performance in any condition",
    "a seamless and enjoyable experience",
    "exceptional value for your money",
    "comfort and convenience you'll love",
    "precision-engineered results every time",
    "the perfect balance of form and function",
    "long-lasting quality that stands the test of time"
]


def generate_product(idx: int, category: str, meta: dict) -> dict:
    subcategory = random.choice(meta["subcategories"])
    brand = random.choice(meta["brands"])
    adjective = random.choice(meta["adjectives"])
    audience = random.choice(AUDIENCES)
    benefit = random.choice(BENEFITS)

    
    noun_map = {
        "Electronics": ["Device", "System", "Kit", "Module", "Hub", "Station"],
        "Clothing": ["Collection", "Set", "Series", "Edition", "Line"],
        "Home & Kitchen": ["Set", "Kit", "Collection", "Series", "Bundle"],
        "Sports & Outdoors": ["Gear", "Pack", "Kit", "System", "Set"],
        "Books": ["Guide", "Handbook", "Edition", "Collection", "Series"],
        "Beauty & Health": ["Formula", "Serum", "Kit", "Collection", "Set"],
        "Toys & Games": ["Set", "Kit", "Edition", "Collection", "Pack"],
        "Automotive": ["Kit", "System", "Pack", "Set", "Module"]
    }
    noun = random.choice(noun_map[category])
    model_num = f"{random.choice('ABCDEFGHIJKLMNOPQRSTUVWXYZ')}{random.randint(100, 999)}"
    name = f"{brand} {adjective} {subcategory} {noun} {model_num}"

    
    template = random.choice(DESCRIPTION_TEMPLATES)
    description = template.format(
        name=name,
        audience=audience,
        adjective=adjective.lower(),
        adjective_cap=adjective,
        benefit=benefit,
        category=category.lower()
    )

    
    low, high = meta["price_range"]
    price = round(random.uniform(low, high), 2)
    original_price = round(price * random.uniform(1.05, 1.4), 2) if random.random() > 0.4 else None

    
    stock_qty = random.randint(0, 500)
    in_stock = stock_qty > 0

    
    rating = round(random.uniform(2.5, 5.0), 1)
    review_count = random.randint(0, 4200)

    
    tag_pool = meta["tags"][:]
    num_tags = random.randint(3, 7)
    tags = random.sample(tag_pool, min(num_tags, len(tag_pool)))

    
    days_ago = random.randint(1, 730)
    created_at = (datetime.utcnow() - timedelta(days=days_ago)).isoformat() + "Z"
    updated_at = (datetime.utcnow() - timedelta(days=random.randint(0, days_ago))).isoformat() + "Z"

    return {
        "id": str(uuid.uuid4()),
        "sku": f"SKU-{category[:3].upper()}-{idx:04d}",
        "name": name,
        "description": description,
        "category": category,
        "subcategory": subcategory,
        "brand": brand,
        "price": price,
        "original_price": original_price,
        "currency": "USD",
        "stock_qty": stock_qty,
        "in_stock": in_stock,
        "rating": rating,
        "review_count": review_count,
        "tags": tags,
        "image_url": f"https://images.example.com/products/{idx:04d}.jpg",
        "created_at": created_at,
        "updated_at": updated_at
    }


def main():
    products = []
    idx = 1

    
    category_names = list(CATEGORIES.keys())
    counts = {}
    base = 500 // len(category_names)
    remainder = 500 % len(category_names)
    for i, cat in enumerate(category_names):
        counts[cat] = base + (1 if i < remainder else 0)

    for category, count in counts.items():
        meta = CATEGORIES[category]
        for _ in range(count):
            products.append(generate_product(idx, category, meta))
            idx += 1

    random.shuffle(products)

    output_path = "scripts/products.json"
    with open(output_path, "w") as f:
        json.dump(products, f, indent=2)

    print(f" Generated {len(products)} products → {output_path}")

    
    from collections import Counter
    cat_counts = Counter(p["category"] for p in products)
    print("\n Category breakdown:")
    for cat, count in sorted(cat_counts.items()):
        print(f"   {cat:<25} {count} products")

    prices = [p["price"] for p in products]
    print(f"\n Price range: ${min(prices):.2f} – ${max(prices):.2f}")
    print(f"   Avg price:   ${sum(prices)/len(prices):.2f}")

    in_stock = sum(1 for p in products if p["in_stock"])
    print(f"\n In stock: {in_stock}/{len(products)} ({100*in_stock//len(products)}%)")

if __name__ == "__main__":
    main()