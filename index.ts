import express, { Request, Response } from "express";
import path from "path";

const app = express();

app.use(express.json());
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
  subtotal: number;
  paymentFee: number;
  total: number;
};

// --------------------
// 仮データ
// --------------------
let products: Product[] = [
  { id: 1, name: "Keyboard", price: 5000, stock: 10 },
  { id: 2, name: "Mouse", price: 2000, stock: 5 },
  { id: 3, name: "Monitor", price: 30000, stock: 0 },
];

let orders: Order[] = [];

// --------------------
// 共通関数
// --------------------
function validateOrderItems(items: unknown): items is OrderItem[] {
  if (!Array.isArray(items) || items.length === 0) {
    return false;
  }

  return items.every((item) => {
    if (typeof item !== "object" || item === null) {
      return false;
    }

    const orderItem = item as OrderItem;

    return (
      typeof orderItem.productId === "number" &&
      typeof orderItem.quantity === "number" &&
      orderItem.quantity > 0
    );
  });
}

function findProductById(productId: number): Product | undefined {
  return products.find((product) => product.id === productId);
}

function filterProductsByKeyword(keyword?: string): Product[] {
  if (!keyword) {
    return products;
  }

  const normalizedKeyword = keyword.trim().toLowerCase();

  if (!normalizedKeyword) {
    return products;
  }

  return products.filter((product) =>
    product.name.toLowerCase().includes(normalizedKeyword)
  );
}

function validateProductsExist(
  items: OrderItem[]
): { ok: true } | { ok: false; productId: number } {
  for (const item of items) {
    const product = findProductById(item.productId);

    if (!product) {
      return { ok: false, productId: item.productId };
    }
  }

  return { ok: true };
}

function validateStock(
  items: OrderItem[]
):
  | { ok: true }
  | { ok: false; productId: number; stock: number; requested: number } {
  for (const item of items) {
    const product = findProductById(item.productId);

    if (!product) {
      continue;
    }

    if (product.stock < item.quantity) {
      return {
        ok: false,
        productId: item.productId,
        stock: product.stock,
        requested: item.quantity,
      };
    }
  }

  return { ok: true };
}

function calculateTotal(items: OrderItem[]): number {
  let total = 0;

  for (const item of items) {
    const product = findProductById(item.productId);

    if (!product) {
      continue;
    }

    total += product.price * item.quantity;
  }

  return total;
}

function calculatePaymentFee(subtotal: number): number {
  // 決済手数料は商品合計金額の5%
  // ただし、最低手数料は300円とする

  return Math.max(300, Math.floor(subtotal * 0.05));
}

function decreaseStock(items: OrderItem[]): void {
  for (const item of items) {
    const product = findProductById(item.productId);

    if (!product) {
      continue;
    }

    product.stock -= item.quantity;
  }
}

function createOrder(
  items: OrderItem[],
  subtotal: number,
  paymentFee: number,
  total: number
): Order {
  const order: Order = {
    id: orders.length + 1,
    items,
    subtotal,
    paymentFee,
    total,
  };

  orders.push(order);

  return order;
}

// --------------------
// API
// --------------------
app.get("/products", (req: Request, res: Response) => {
  try {
    const keyword =
      typeof req.query.keyword === "string" ? req.query.keyword : undefined;

    const filteredProducts = filterProductsByKeyword(keyword);

    res.status(200).json(filteredProducts);
  } catch (error) {
    console.error("Failed to get products:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

app.post("/orders", (req: Request, res: Response) => {
  try {
    const { items } = req.body as { items?: unknown };

    if (!validateOrderItems(items)) {
      return res.status(400).json({
        message: "Items are required and must contain valid productId and quantity.",
      });
    }

    const productCheck = validateProductsExist(items);

    if (!productCheck.ok) {
      return res.status(404).json({
        message: `Product ${productCheck.productId} not found.`,
      });
    }

    const stockCheck = validateStock(items);

    if (!stockCheck.ok) {
      return res.status(400).json({
        message: `Insufficient stock for product ${stockCheck.productId}. Requested: ${stockCheck.requested}, Available: ${stockCheck.stock}.`,
      });
    }

    const subtotal = calculateTotal(items);
    const paymentFee = calculatePaymentFee(subtotal);
    const total = subtotal + paymentFee;

    decreaseStock(items);

    const order = createOrder(items, subtotal, paymentFee, total);

    return res.status(201).json(order);
  } catch (error) {
    console.error("Failed to create order:", error);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
});

// --------------------
// 起動
// --------------------
app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});