const http = require("http");
const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER || "practiceuser",
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || "practicedb",
});

const server = http.createServer(async (req, res) => {
  // GET /products: retrieve all products
  if (req.url === "/products" && req.method === "GET") {
    try {
      const result = await pool.query(
        "SELECT id, name, quantity FROM products ORDER BY id",
      );

      res.writeHead(200, {
        "Content-Type": "application/json",
      });
      res.end(JSON.stringify(result.rows));
    } catch (error) {
      console.error("Database query failed:", error.message);

      res.writeHead(500, {
        "Content-Type": "application/json",
      });
      res.end(
        JSON.stringify({
          error: "Failed to retrieve products",
        }),
      );
    }
    return;
  }

  // POST /products: create a new product
  if (req.url === "/products" && req.method === "POST") {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk;

      // Prevent excessively large request bodies
      if (body.length > 10000) {
        res.writeHead(413, {
          "Content-Type": "application/json",
        });
        res.end(JSON.stringify({ error: "Request body too large" }));
        req.destroy();
      }
    });

    req.on("end", async () => {
      if (res.writableEnded) return;

      try {
        const product = JSON.parse(body);

        if (
          typeof product.name !== "string" ||
          product.name.trim() === "" ||
          !Number.isSafeInteger(product.quantity) ||
          product.quantity < 0
        ) {
          res.writeHead(400, {
            "Content-Type": "application/json",
          });
          res.end(
            JSON.stringify({
              error:
                "name must be non-empty and quantity must be a non-negative integer",
            }),
          );
          return;
        }

        const result = await pool.query(
          "INSERT INTO products (name, quantity) VALUES ($1, $2) RETURNING id, name, quantity",
          [product.name.trim(), product.quantity],
        );

        res.writeHead(201, {
          "Content-Type": "application/json",
        });
        res.end(JSON.stringify(result.rows[0]));
      } catch (error) {
        if (error instanceof SyntaxError) {
          res.writeHead(400, {
            "Content-Type": "application/json",
          });
          res.end(JSON.stringify({ error: "Invalid JSON" }));
          return;
        }

        console.error("Database insert failed:", error.message);

        if (!res.headersSent) {
          res.writeHead(500, {
            "Content-Type": "application/json",
          });
          res.end(JSON.stringify({ error: "Failed to create product" }));
        }
      }
    });
    return;
  }

  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Hello from my Docker Node.js app!");
});

server.listen(3000, () => {
  console.log("Server running on port 3000");
});

function shutdown(signal) {
  console.log(`${signal} received. Shutting down gracefully...`);

  server.close(async (error) => {
    try {
      await pool.end();
      console.log("Database connection pool closed.");
    } catch (dbError) {
      console.error("Error closing database pool:", dbError.message);
      process.exitCode = 1;
    }

    if (error) {
      console.error("Error closing HTTP server:", error.message);
      process.exitCode = 1;
    }

    process.exit();
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
