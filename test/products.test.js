const test = require("node:test");
const assert = require("node:assert/strict");

const baseUrl = "http://localhost:3000";

test("GET /products returns the saved products", async () => {
  const response = await fetch(`${baseUrl}/products`);

  assert.equal(response.status, 200);

  const products = await response.json();

  assert.ok(Array.isArray(products));
  assert.ok(
    products.some(
      (product) => product.name === "Keyboard" && product.quantity === 10,
    ),
  );
});

test("POST /products creates a product", async () => {
  const uniqueName = `Test Product ${Date.now()}`;

  const response = await fetch(`${baseUrl}/products`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: uniqueName,
      quantity: 5,
    }),
  });

  assert.equal(response.status, 201);

  const product = await response.json();

  assert.equal(product.name, uniqueName);
  assert.equal(product.quantity, 5);
  assert.ok(Number.isInteger(product.id));

  // Verify that the product was saved in PostgreSQL.
  const listResponse = await fetch(`${baseUrl}/products`);
  const products = await listResponse.json();

  assert.ok(products.some((item) => item.id === product.id));
});

test("POST /products rejects invalid product data", async () => {
  const response = await fetch(`${baseUrl}/products`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "",
      quantity: -5,
    }),
  });

  assert.equal(response.status, 400);

  const result = await response.json();

  assert.ok(result.error);
});
