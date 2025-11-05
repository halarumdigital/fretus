import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { loginSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/auth/login", async (req, res) => {
    try {
      const result = loginSchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ 
          message: "Dados inválidos",
          errors: result.error.errors 
        });
      }

      const { email, password } = result.data;
      
      const user = await storage.getUserByEmail(email);
      
      if (!user || user.password !== password) {
        return res.status(401).json({ 
          message: "Email ou senha incorretos" 
        });
      }

      return res.json({
        id: user.id,
        email: user.email,
      });
    } catch (error) {
      console.error("Erro no login:", error);
      return res.status(500).json({ 
        message: "Erro interno do servidor" 
      });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
