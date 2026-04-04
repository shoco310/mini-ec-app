import express from "express";
import path from "path";

const app = express();

// JSON受け取る
app.use(express.json());

// publicフォルダを配信（これでHTML表示できる）
app.use(express.static(path.join(__dirname, "public")));

// --------------------
// 型定義
// --------------------
type Product = {
  id: number;
  name: string;
  price: number;
  stock: number;
};

type OrderItem = {
  productId: number;
  quantity: number;
};

type Order = {
  id: number;
  items: OrderItem[];
  total: number;
};

// --------------------
// 仮データ
// --------------------
let products: Product[] = [
  { id: 1, name: "Keyboard", price: 5000, stock: 10 },
  { id: 2, name: "Mouse", price: 2000, stock: 5 },
  { id: 3, name: "Monitor", price: 30000, stock: 3 },
];

let orders: Order[] = [];

// --------------------
// API
// --------------------

// 商品一覧
app.get("/products", (req, res) => {
  res.json(products);
});

// 注文作成
app.post("/orders", (req, res) => {
  const { items } = req.body as { items: OrderItem[] };

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: "Items are required" });
  }

  let total = 0;

  for (const item of items) {
    const product = products.find((p) => p.id === item.productId);

    if (!product) {
      return res.status(404).json({
        message: `Product ${item.productId} not found`,
      });
    }

    // ❗あえて雑（デモ用）
    total += product.price * item.quantity;

    // ❗在庫チェックなし（デモ用バグ）
    product.stock -= item.quantity;
  }

  const order: Order = {
    id: orders.length + 1,
    items,
    total,
  };

  orders.push(order);

  res.json(order);
});

// --------------------
// 起動
// --------------------
app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});