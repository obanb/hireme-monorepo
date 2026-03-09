import {
  OpenAPIRegistry,
  OpenApiGeneratorV3,
} from "@asteasolutions/zod-to-openapi";
import { Express } from "express";
import swaggerUi from "swagger-ui-express";

export const registry = new OpenAPIRegistry();

export function mountSwagger(app: Express): void {
  const generator = new OpenApiGeneratorV3(registry.definitions);

  const document = generator.generateDocument({
    openapi: "3.0.0",
    info: {
      title: "Reception API",
      version: "1.0.0",
      description: "Hotel reception REST API with OpenAPI docs",
    },
    servers: [{ url: "/api" }],
  });

  app.use("/docs", swaggerUi.serve, swaggerUi.setup(document));
  app.get("/openapi.json", (_req, res) => res.json(document));
}
