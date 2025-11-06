import express, { type Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { loginSchema, insertSettingsSchema } from "@shared/schema";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "./db";
import bcrypt from "bcrypt";
import multer from "multer";
import path from "path";
import fs from "fs";

const PgSession = connectPgSimple(session);

// Configuração do multer para upload de arquivos
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storageMulter = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storageMulter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|svg/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Apenas imagens são permitidas (jpeg, jpg, png, gif, svg)"));
    }
  },
});

declare module "express-session" {
  interface SessionData {
    userId?: string;
    userEmail?: string;
    userName?: string;
    isAdmin?: boolean;
    companyId?: string;
    companyEmail?: string;
    companyName?: string;
    isCompany?: boolean;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Servir arquivos estáticos da pasta uploads
  app.use("/uploads", (req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    next();
  });
  app.use("/uploads", express.static(uploadsDir));
  app.use(
    session({
      store: new PgSession({
        pool,
        createTableIfMissing: true,
      }),
      secret: process.env.SESSION_SECRET || "your-secret-key-change-in-production",
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
      },
    })
  );

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

      if (!user) {
        return res.status(401).json({
          message: "Email ou senha incorretos"
        });
      }

      // Verificar senha usando bcrypt
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({
          message: "Email ou senha incorretos"
        });
      }

      req.session.userId = user.id;
      req.session.userEmail = user.email;
      req.session.userName = user.nome;
      req.session.isAdmin = user.isAdmin;

      return res.json({
        id: user.id,
        email: user.email,
        nome: user.nome,
        isAdmin: user.isAdmin,
      });
    } catch (error) {
      console.error("Erro no login:", error);
      return res.status(500).json({ 
        message: "Erro interno do servidor" 
      });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Erro ao fazer logout" });
      }
      res.clearCookie("connect.sid");
      return res.json({ message: "Logout realizado com sucesso" });
    });
  });

  app.get("/api/auth/me", (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Não autenticado" });
    }

    return res.json({
      id: req.session.userId,
      email: req.session.userEmail,
      nome: req.session.userName,
      isAdmin: req.session.isAdmin,
    });
  });

  // ========================================
  // COMPANY AUTH ROUTES
  // ========================================

  app.post("/api/empresa/auth/login", async (req, res) => {
    try {
      console.log("🔐 Tentativa de login da empresa");
      console.log("   Email recebido:", req.body.email);

      const result = loginSchema.safeParse(req.body);

      if (!result.success) {
        console.log("❌ Validação falhou:", result.error.errors);
        return res.status(400).json({
          message: "Dados inválidos",
          errors: result.error.errors
        });
      }

      const { email, password } = result.data;
      console.log("✅ Dados validados");

      const company = await storage.getCompanyByEmail(email);

      if (!company) {
        console.log("❌ Empresa não encontrada com email:", email);
        return res.status(401).json({
          message: "Email ou senha incorretos"
        });
      }

      console.log("✅ Empresa encontrada:", company.name);
      console.log("   Ativa:", company.active);
      console.log("   Tem senha:", !!company.password);

      if (!company.active) {
        console.log("❌ Empresa inativa");
        return res.status(401).json({
          message: "Empresa inativa. Entre em contato com o suporte."
        });
      }

      if (!company.password) {
        console.log("❌ Empresa sem senha configurada");
        return res.status(401).json({
          message: "Senha não configurada. Entre em contato com o suporte."
        });
      }

      console.log("🔑 Comparando senhas...");
      const isValidPassword = await bcrypt.compare(password, company.password);
      console.log("   Senha válida:", isValidPassword);

      if (!isValidPassword) {
        console.log("❌ Senha incorreta");
        return res.status(401).json({
          message: "Email ou senha incorretos"
        });
      }

      req.session.companyId = company.id;
      req.session.companyEmail = company.email;
      req.session.companyName = company.name;
      req.session.isCompany = true;

      console.log("✅ Login bem sucedido para:", company.name);

      return res.json({
        message: "Login realizado com sucesso",
        company: {
          id: company.id,
          name: company.name,
          email: company.email,
        }
      });
    } catch (error) {
      console.error("❌ Erro ao fazer login:", error);
      return res.status(500).json({
        message: "Erro interno do servidor"
      });
    }
  });

  app.post("/api/empresa/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Erro ao fazer logout" });
      }
      res.clearCookie("connect.sid");
      return res.json({ message: "Logout realizado com sucesso" });
    });
  });

  app.get("/api/empresa/auth/me", async (req, res) => {
    if (!req.session.companyId) {
      return res.status(401).json({ message: "Não autenticado" });
    }

    try {
      // Buscar dados completos da empresa do banco
      const company = await storage.getCompany(req.session.companyId);

      if (!company) {
        return res.status(404).json({ message: "Empresa não encontrada" });
      }

      return res.json({
        id: company.id,
        email: company.email,
        name: company.name,
        street: company.street,
        number: company.number,
        neighborhood: company.neighborhood,
        city: company.city,
        state: company.state,
        cep: company.cep,
        reference: company.reference,
        isCompany: true,
      });
    } catch (error) {
      console.error("Erro ao buscar dados da empresa:", error);
      return res.status(500).json({ message: "Erro ao buscar dados da empresa" });
    }
  });

  // Endpoint de diagnóstico - verificar conexão do banco
  app.get("/api/debug/db-info", async (req, res) => {
    try {
      const { rows } = await pool.query(`
        SELECT
          current_database() as database,
          current_schema() as schema,
          current_user as user,
          version() as version
      `);

      const { rows: driversCount } = await pool.query(`SELECT COUNT(*) as total FROM drivers`);
      const { rows: citiesCount } = await pool.query(`SELECT COUNT(*) as total FROM service_locations`);

      return res.json({
        connection: rows[0],
        counts: {
          drivers: parseInt(driversCount[0].total),
          cities: parseInt(citiesCount[0].total)
        },
        env: {
          NODE_ENV: process.env.NODE_ENV,
          DATABASE_URL: process.env.DATABASE_URL?.replace(/@[^@]+@/, '@***@') // oculta senha
        }
      });
    } catch (error) {
      console.error("Erro no debug:", error);
      return res.status(500).json({ message: "Erro ao obter informações do banco" });
    }
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      const { nome, email, password } = req.body;

      if (!nome || !email || !password) {
        return res.status(400).json({ 
          message: "Todos os campos são obrigatórios" 
        });
      }

      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({
          message: "Este email já está em uso"
        });
      }

      // Hash da senha antes de salvar
      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await storage.createUser({
        nome,
        email,
        password: hashedPassword,
        isAdmin: false,
      });

      req.session.userId = user.id;
      req.session.userEmail = user.email;
      req.session.userName = user.nome;
      req.session.isAdmin = user.isAdmin;

      return res.json({
        id: user.id,
        email: user.email,
        nome: user.nome,
        isAdmin: user.isAdmin,
      });
    } catch (error) {
      console.error("Erro no registro:", error);
      return res.status(500).json({ 
        message: "Erro interno do servidor" 
      });
    }
  });

  app.get("/api/users", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const users = await storage.getAllUsers();
      return res.json(users);
    } catch (error) {
      console.error("Erro ao listar usuários:", error);
      return res.status(500).json({
        message: "Erro ao buscar usuários"
      });
    }
  });

  // ========================================
  // SERVICE LOCATIONS (CIDADES) ROUTES
  // ========================================

  // GET /api/service-locations - Listar cidades
  app.get("/api/service-locations", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const serviceLocations = await storage.getAllServiceLocations();
      return res.json(serviceLocations);
    } catch (error) {
      console.error("Erro ao listar cidades:", error);
      return res.status(500).json({ message: "Erro ao buscar cidades" });
    }
  });

  // ========================================
  // VEHICLE TYPES (CATEGORIAS) ROUTES
  // ========================================

  // POST /api/upload - Upload de arquivo
  app.post("/api/upload", upload.single("file"), async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "Nenhum arquivo enviado" });
      }

      const filePath = `/uploads/${req.file.filename}`;
      return res.json({ path: filePath });
    } catch (error: any) {
      console.error("Erro no upload:", error);
      return res.status(500).json({ message: error.message || "Erro ao fazer upload" });
    }
  });

  // GET /api/vehicle-types - Listar categorias
  app.get("/api/vehicle-types", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const vehicleTypes = await storage.getAllVehicleTypes();
      return res.json(vehicleTypes);
    } catch (error) {
      console.error("Erro ao listar categorias:", error);
      return res.status(500).json({ message: "Erro ao buscar categorias" });
    }
  });

  // POST /api/vehicle-types - Criar categoria
  app.post("/api/vehicle-types", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const { name, icon } = req.body;

      if (!name) {
        return res.status(400).json({ message: "Nome é obrigatório" });
      }

      const newVehicleType = await storage.createVehicleType({
        name,
        icon: icon || null,
        capacity: 4, // valor padrão
        active: true,
      });

      return res.json(newVehicleType);
    } catch (error) {
      console.error("Erro ao criar categoria:", error);
      return res.status(500).json({ message: "Erro ao criar categoria" });
    }
  });

  // PUT /api/vehicle-types/:id - Atualizar categoria
  app.put("/api/vehicle-types/:id", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const { id } = req.params;
      const { name, icon } = req.body;

      const updated = await storage.updateVehicleType(id, { name, icon });

      if (!updated) {
        return res.status(404).json({ message: "Categoria não encontrada" });
      }

      return res.json(updated);
    } catch (error) {
      console.error("Erro ao atualizar categoria:", error);
      return res.status(500).json({ message: "Erro ao atualizar categoria" });
    }
  });

  // DELETE /api/vehicle-types/:id - Excluir categoria
  app.delete("/api/vehicle-types/:id", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const { id } = req.params;

      // Verificar se existem motoristas usando esta categoria
      const drivers = await storage.getAllDrivers();
      const driversWithType = drivers.filter(d => d.vehicleTypeId === id);

      if (driversWithType.length > 0) {
        return res.status(400).json({
          message: `Não é possível excluir esta categoria pois existem ${driversWithType.length} motorista(s) usando ela. Altere os motoristas primeiro.`
        });
      }

      // Verificar se existem city_prices usando esta categoria
      const allCityPrices = await storage.getAllCityPrices();
      const cityPricesWithVehicle = allCityPrices.filter(cp => cp.vehicleTypeId === id);

      if (cityPricesWithVehicle.length > 0) {
        return res.status(400).json({
          message: `Não é possível excluir esta categoria pois existem ${cityPricesWithVehicle.length} configuração(ões) de preço usando ela. Exclua os preços primeiro.`
        });
      }

      await storage.deleteVehicleType(id);

      return res.json({ message: "Categoria excluída com sucesso" });
    } catch (error) {
      console.error("Erro ao excluir categoria:", error);
      return res.status(500).json({ message: "Erro ao excluir categoria" });
    }
  });

  // ========================================
  // BRANDS (MARCAS) ROUTES
  // ========================================

  // GET /api/brands - Listar marcas
  app.get("/api/brands", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const brands = await storage.getAllBrands();
      return res.json(brands);
    } catch (error) {
      console.error("Erro ao listar marcas:", error);
      return res.status(500).json({ message: "Erro ao buscar marcas" });
    }
  });

  // POST /api/brands - Criar nova marca
  app.post("/api/brands", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const { name } = req.body;

      if (!name) {
        return res.status(400).json({
          message: "O nome da marca é obrigatório"
        });
      }

      const newBrand = await storage.createBrand({ name, active: true });

      return res.status(201).json(newBrand);
    } catch (error) {
      console.error("Erro ao criar marca:", error);
      return res.status(500).json({ message: "Erro ao criar marca" });
    }
  });

  // PUT /api/brands/:id - Atualizar marca
  app.put("/api/brands/:id", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const { id } = req.params;
      const { name } = req.body;

      const updated = await storage.updateBrand(id, { name });

      if (!updated) {
        return res.status(404).json({ message: "Marca não encontrada" });
      }

      return res.json(updated);
    } catch (error) {
      console.error("Erro ao atualizar marca:", error);
      return res.status(500).json({ message: "Erro ao atualizar marca" });
    }
  });

  // DELETE /api/brands/:id - Excluir marca
  app.delete("/api/brands/:id", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const { id } = req.params;

      // Verificar se existem modelos usando esta marca
      const models = await storage.getVehicleModelsByBrand(id);

      if (models.length > 0) {
        return res.status(400).json({
          message: `Não é possível excluir esta marca pois existem ${models.length} modelo(s) associado(s). Exclua os modelos primeiro.`
        });
      }

      await storage.deleteBrand(id);

      return res.json({ message: "Marca excluída com sucesso" });
    } catch (error) {
      console.error("Erro ao excluir marca:", error);
      return res.status(500).json({ message: "Erro ao excluir marca" });
    }
  });

  // ========================================
  // VEHICLE MODELS (MODELOS) ROUTES
  // ========================================

  // GET /api/vehicle-models - Listar modelos
  app.get("/api/vehicle-models", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const models = await storage.getAllVehicleModels();
      return res.json(models);
    } catch (error) {
      console.error("Erro ao listar modelos:", error);
      return res.status(500).json({ message: "Erro ao buscar modelos" });
    }
  });

  // GET /api/vehicle-models/by-brand/:brandId - Listar modelos por marca
  app.get("/api/vehicle-models/by-brand/:brandId", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const { brandId } = req.params;
      const models = await storage.getVehicleModelsByBrand(brandId);
      return res.json(models);
    } catch (error) {
      console.error("Erro ao listar modelos por marca:", error);
      return res.status(500).json({ message: "Erro ao buscar modelos" });
    }
  });

  // POST /api/vehicle-models - Criar novo modelo
  app.post("/api/vehicle-models", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const { brandId, name } = req.body;

      if (!brandId || !name) {
        return res.status(400).json({
          message: "Marca e nome do modelo são obrigatórios"
        });
      }

      const newModel = await storage.createVehicleModel({ brandId, name, active: true });

      return res.status(201).json(newModel);
    } catch (error) {
      console.error("Erro ao criar modelo:", error);
      return res.status(500).json({ message: "Erro ao criar modelo" });
    }
  });

  // PUT /api/vehicle-models/:id - Atualizar modelo
  app.put("/api/vehicle-models/:id", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const { id } = req.params;
      const { brandId, name } = req.body;

      const updated = await storage.updateVehicleModel(id, { brandId, name });

      if (!updated) {
        return res.status(404).json({ message: "Modelo não encontrado" });
      }

      return res.json(updated);
    } catch (error) {
      console.error("Erro ao atualizar modelo:", error);
      return res.status(500).json({ message: "Erro ao atualizar modelo" });
    }
  });

  // DELETE /api/vehicle-models/:id - Excluir modelo
  app.delete("/api/vehicle-models/:id", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const { id } = req.params;

      await storage.deleteVehicleModel(id);

      return res.json({ message: "Modelo excluído com sucesso" });
    } catch (error) {
      console.error("Erro ao excluir modelo:", error);
      return res.status(500).json({ message: "Erro ao excluir modelo" });
    }
  });

  // ========================================
  // DRIVER DOCUMENT TYPES (TIPOS DE DOCUMENTOS) ROUTES
  // ========================================

  // GET /api/driver-document-types - Listar tipos de documentos
  app.get("/api/driver-document-types", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const documentTypes = await storage.getAllDriverDocumentTypes();
      return res.json(documentTypes);
    } catch (error) {
      console.error("Erro ao listar tipos de documentos:", error);
      return res.status(500).json({ message: "Erro ao buscar tipos de documentos" });
    }
  });

  // POST /api/driver-document-types - Criar novo tipo de documento
  app.post("/api/driver-document-types", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const { name, description, required } = req.body;

      if (!name) {
        return res.status(400).json({
          message: "O nome do tipo de documento é obrigatório"
        });
      }

      const newDocType = await storage.createDriverDocumentType({
        name,
        description: description || null,
        required: required !== undefined ? required : true,
        active: true,
      });

      return res.status(201).json(newDocType);
    } catch (error) {
      console.error("Erro ao criar tipo de documento:", error);
      return res.status(500).json({ message: "Erro ao criar tipo de documento" });
    }
  });

  // PUT /api/driver-document-types/:id - Atualizar tipo de documento
  app.put("/api/driver-document-types/:id", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const { id } = req.params;
      const { name, description, required, active } = req.body;

      const updated = await storage.updateDriverDocumentType(id, {
        name,
        description,
        required,
        active,
      });

      if (!updated) {
        return res.status(404).json({ message: "Tipo de documento não encontrado" });
      }

      return res.json(updated);
    } catch (error) {
      console.error("Erro ao atualizar tipo de documento:", error);
      return res.status(500).json({ message: "Erro ao atualizar tipo de documento" });
    }
  });

  // DELETE /api/driver-document-types/:id - Excluir tipo de documento
  app.delete("/api/driver-document-types/:id", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const { id } = req.params;

      await storage.deleteDriverDocumentType(id);

      return res.json({ message: "Tipo de documento excluído com sucesso" });
    } catch (error) {
      console.error("Erro ao excluir tipo de documento:", error);
      return res.status(500).json({ message: "Erro ao excluir tipo de documento" });
    }
  });

  // ========================================
  // COMPANIES (EMPRESAS) ROUTES
  // ========================================

  // GET /api/companies - Listar empresas
  app.get("/api/companies", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const companies = await storage.getAllCompanies();
      return res.json(companies);
    } catch (error) {
      console.error("Erro ao listar empresas:", error);
      return res.status(500).json({ message: "Erro ao buscar empresas" });
    }
  });

  // POST /api/companies - Criar nova empresa
  app.post("/api/companies", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const { name, cnpj, password } = req.body;

      if (!name) {
        return res.status(400).json({
          message: "O nome da empresa é obrigatório"
        });
      }

      // Verificar se já existe uma empresa com o mesmo CNPJ
      if (cnpj) {
        const existing = await storage.getCompanyByCnpj(cnpj);
        if (existing) {
          return res.status(400).json({
            message: "Já existe uma empresa cadastrada com este CNPJ"
          });
        }
      }

      // Fazer hash da senha se foi fornecida
      const companyData = { ...req.body };
      if (password) {
        companyData.password = await bcrypt.hash(password, 10);
      }

      const newCompany = await storage.createCompany(companyData);

      return res.status(201).json(newCompany);
    } catch (error) {
      console.error("Erro ao criar empresa:", error);
      return res.status(500).json({ message: "Erro ao criar empresa" });
    }
  });

  // PUT /api/companies/:id - Atualizar empresa
  app.put("/api/companies/:id", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const { id } = req.params;
      const { cnpj, password } = req.body;

      // Se o CNPJ foi alterado, verificar se já existe outra empresa com esse CNPJ
      if (cnpj) {
        const existing = await storage.getCompanyByCnpj(cnpj);
        if (existing && existing.id !== id) {
          return res.status(400).json({
            message: "Já existe uma empresa cadastrada com este CNPJ"
          });
        }
      }

      // Fazer hash da senha se foi fornecida (ao editar, só atualiza se veio no request)
      const companyData = { ...req.body };
      if (password) {
        companyData.password = await bcrypt.hash(password, 10);
      } else {
        // Se não forneceu senha, remove do objeto para não sobrescrever
        delete companyData.password;
      }

      const updated = await storage.updateCompany(id, companyData);

      if (!updated) {
        return res.status(404).json({ message: "Empresa não encontrada" });
      }

      return res.json(updated);
    } catch (error) {
      console.error("Erro ao atualizar empresa:", error);
      return res.status(500).json({ message: "Erro ao atualizar empresa" });
    }
  });

  // DELETE /api/companies/:id - Excluir empresa
  app.delete("/api/companies/:id", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const { id } = req.params;

      await storage.deleteCompany(id);

      return res.json({ message: "Empresa excluída com sucesso" });
    } catch (error) {
      console.error("Erro ao excluir empresa:", error);
      return res.status(500).json({ message: "Erro ao excluir empresa" });
    }
  });

  // GET /api/companies/:id/trips - Buscar corridas de uma empresa
  app.get("/api/companies/:id/trips", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const { id } = req.params;
      const trips = await storage.getCompanyTrips(id);

      return res.json(trips);
    } catch (error) {
      console.error("Erro ao buscar corridas da empresa:", error);
      return res.status(500).json({ message: "Erro ao buscar corridas" });
    }
  });

  // ========================================
  // CITY PRICES (PREÇOS) ROUTES
  // ========================================

  // GET /api/city-prices - Listar preços
  app.get("/api/city-prices", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const cityPrices = await storage.getAllCityPrices();
      return res.json(cityPrices);
    } catch (error) {
      console.error("Erro ao listar preços:", error);
      return res.status(500).json({ message: "Erro ao buscar preços" });
    }
  });

  // POST /api/city-prices - Criar novo preço
  app.post("/api/city-prices", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      console.log("📝 Dados recebidos para criar preço:", req.body);

      // Verificar se já existe um preço para essa combinação cidade + categoria
      const existing = await storage.getCityPriceByLocationAndVehicle(
        req.body.serviceLocationId,
        req.body.vehicleTypeId
      );

      if (existing) {
        console.log("⚠️ Preço já existe para esta combinação");
        return res.status(400).json({
          message: "Já existe uma configuração de preço para esta cidade e categoria"
        });
      }

      console.log("✅ Criando novo preço...");
      const cityPrice = await storage.createCityPrice(req.body);
      console.log("✅ Preço criado com sucesso:", cityPrice);
      return res.status(201).json(cityPrice);
    } catch (error: any) {
      console.error("❌ Erro ao criar preço:", error);
      console.error("❌ Detalhes do erro:", error.message);
      console.error("❌ Stack trace:", error.stack);
      return res.status(500).json({ message: "Erro ao criar preço: " + error.message });
    }
  });

  // PUT /api/city-prices/:id - Atualizar preço
  app.put("/api/city-prices/:id", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const { id } = req.params;
      const cityPrice = await storage.updateCityPrice(id, req.body);

      if (!cityPrice) {
        return res.status(404).json({ message: "Preço não encontrado" });
      }

      return res.json(cityPrice);
    } catch (error) {
      console.error("Erro ao atualizar preço:", error);
      return res.status(500).json({ message: "Erro ao atualizar preço" });
    }
  });

  // DELETE /api/city-prices/:id - Excluir preço
  app.delete("/api/city-prices/:id", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const { id } = req.params;

      await storage.deleteCityPrice(id);

      return res.json({ message: "Configuração de preço excluída com sucesso" });
    } catch (error) {
      console.error("Erro ao excluir preço:", error);
      return res.status(500).json({ message: "Erro ao excluir preço" });
    }
  });

  // ========================================
  // SETTINGS ROUTES
  // ========================================

  // GET /api/settings - Buscar configurações
  app.get("/api/settings", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const settings = await storage.getSettings();

      if (!settings) {
        return res.status(404).json({ message: "Configurações não encontradas" });
      }

      res.json(settings);
    } catch (error: any) {
      console.error("Erro ao buscar configurações:", error);
      res.status(500).json({ message: "Erro ao buscar configurações" });
    }
  });

  // PUT /api/settings - Atualizar configurações
  app.put("/api/settings", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      // Validar dados
      const validatedData = insertSettingsSchema.parse(req.body);

      // Atualizar ou criar configurações
      const settings = await storage.updateSettings(validatedData);

      if (!settings) {
        return res.status(500).json({ message: "Erro ao salvar configurações" });
      }

      res.json(settings);
    } catch (error: any) {
      console.error("Erro ao salvar configurações:", error);

      if (error.name === "ZodError") {
        return res.status(400).json({
          message: "Dados inválidos",
          errors: error.errors
        });
      }

      res.status(500).json({ message: "Erro ao salvar configurações" });
    }
  });

  // ========================================
  // SERVICE LOCATIONS (CIDADES) ROUTES
  // ========================================

  // GET /api/cities - Listar cidades
  app.get("/api/cities", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const cities = await storage.getAllServiceLocations();
      return res.json(cities);
    } catch (error) {
      console.error("Erro ao listar cidades:", error);
      return res.status(500).json({ message: "Erro ao buscar cidades" });
    }
  });

  // POST /api/cities - Criar cidade
  app.post("/api/cities", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const { name, state } = req.body;

      if (!name || !state) {
        return res.status(400).json({ message: "Nome e estado são obrigatórios" });
      }

      const city = await storage.createServiceLocation({
        name,
        state,
        active: true,
      });

      return res.json(city);
    } catch (error) {
      console.error("Erro ao criar cidade:", error);
      return res.status(500).json({ message: "Erro ao criar cidade" });
    }
  });

  // PUT /api/cities/:id - Atualizar cidade
  app.put("/api/cities/:id", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const { id } = req.params;
      const { name, state, active } = req.body;

      const city = await storage.updateServiceLocation(id, {
        name,
        state,
        active,
      });

      if (!city) {
        return res.status(404).json({ message: "Cidade não encontrada" });
      }

      return res.json(city);
    } catch (error) {
      console.error("Erro ao atualizar cidade:", error);
      return res.status(500).json({ message: "Erro ao atualizar cidade" });
    }
  });

  // DELETE /api/cities/:id - Excluir cidade
  app.delete("/api/cities/:id", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const { id } = req.params;

      // Verificar se existem preços associados
      const cityPrices = await storage.getCityPricesByLocation(id);

      if (cityPrices.length > 0) {
        return res.status(400).json({
          message: `Não é possível excluir esta cidade pois existem ${cityPrices.length} configuração(ões) de preço associada(s). Exclua os preços primeiro.`
        });
      }

      // Verificar se existem motoristas associados
      const drivers = await storage.getDriversByLocation(id);

      if (drivers.length > 0) {
        return res.status(400).json({
          message: `Não é possível excluir esta cidade pois existem ${drivers.length} motorista(s) associado(s). Exclua os motoristas primeiro.`
        });
      }

      await storage.deleteServiceLocation(id);

      return res.json({ message: "Cidade excluída com sucesso" });
    } catch (error) {
      console.error("Erro ao excluir cidade:", error);
      return res.status(500).json({ message: "Erro ao excluir cidade" });
    }
  });

  // ========================================
  // DRIVERS (MOTORISTAS) ROUTES
  // ========================================

  // GET /api/drivers - Listar motoristas
  app.get("/api/drivers", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const drivers = await storage.getAllDrivers();
      return res.json(drivers);
    } catch (error) {
      console.error("Erro ao listar motoristas:", error);
      return res.status(500).json({ message: "Erro ao buscar motoristas" });
    }
  });

  // POST /api/drivers - Criar novo motorista
  app.post("/api/drivers", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const { name, email, password, cpf, mobile } = req.body;

      if (!name || !mobile) {
        return res.status(400).json({
          message: "Nome e WhatsApp são obrigatórios"
        });
      }

      // Hash da senha se foi fornecida
      let hashedPassword = null;
      if (password) {
        hashedPassword = await bcrypt.hash(password, 10);
      }

      // Criar motorista diretamente (sem criar usuário)
      const newDriver = await storage.createDriver({
        ...req.body,
        password: hashedPassword,
        active: true,
        approve: false,
        available: false,
      });

      return res.status(201).json(newDriver);
    } catch (error) {
      console.error("Erro ao criar motorista:", error);
      return res.status(500).json({ message: "Erro ao criar motorista" });
    }
  });

  // PUT /api/drivers/:id - Atualizar motorista
  app.put("/api/drivers/:id", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const { id } = req.params;
      const { password, ...otherData } = req.body;

      let updateData = { ...otherData };

      // Se a senha foi fornecida, fazer o hash
      if (password) {
        updateData.password = await bcrypt.hash(password, 10);
      }

      const updated = await storage.updateDriver(id, updateData);

      if (!updated) {
        return res.status(404).json({ message: "Motorista não encontrado" });
      }

      return res.json(updated);
    } catch (error) {
      console.error("Erro ao atualizar motorista:", error);
      return res.status(500).json({ message: "Erro ao atualizar motorista" });
    }
  });

  // DELETE /api/drivers/:id - Excluir motorista
  app.delete("/api/drivers/:id", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const { id } = req.params;

      await storage.deleteDriver(id);

      return res.json({ message: "Motorista excluído com sucesso" });
    } catch (error) {
      console.error("Erro ao excluir motorista:", error);
      return res.status(500).json({ message: "Erro ao excluir motorista" });
    }
  });

  // GET /api/drivers/:id/documents - Buscar documentos de um motorista
  app.get("/api/drivers/:id/documents", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const { id } = req.params;
      const documents = await storage.getDriverDocuments(id);

      return res.json(documents);
    } catch (error) {
      console.error("Erro ao buscar documentos do motorista:", error);
      return res.status(500).json({ message: "Erro ao buscar documentos" });
    }
  });

  // GET /api/drivers/:id/notes - Buscar notas de um motorista
  app.get("/api/drivers/:id/notes", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const { id } = req.params;
      const notes = await storage.getDriverNotes(id);

      return res.json(notes);
    } catch (error) {
      console.error("Erro ao buscar notas do motorista:", error);
      return res.status(500).json({ message: "Erro ao buscar notas" });
    }
  });

  // GET /api/drivers/:id/trips - Buscar corridas de um motorista
  app.get("/api/drivers/:id/trips", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const { id } = req.params;
      const trips = await storage.getDriverTrips(id);

      return res.json(trips);
    } catch (error) {
      console.error("Erro ao buscar corridas do motorista:", error);
      return res.status(500).json({ message: "Erro ao buscar corridas" });
    }
  });

  // POST /api/drivers/:id/notes - Adicionar nota a um motorista
  app.post("/api/drivers/:id/notes", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const { id } = req.params;
      const { note, noteType } = req.body;

      if (!note) {
        return res.status(400).json({ message: "Comentário é obrigatório" });
      }

      const newNote = await storage.createDriverNote({
        driverId: id,
        userId: req.session.userId,
        note,
        noteType: noteType || "general",
      });

      return res.status(201).json(newNote);
    } catch (error) {
      console.error("Erro ao adicionar nota:", error);
      return res.status(500).json({ message: "Erro ao adicionar nota" });
    }
  });

  // POST /api/drivers/:id/block - Bloquear motorista
  app.post("/api/drivers/:id/block", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const { id } = req.params;
      const { reason } = req.body;

      // Atualizar motorista para bloqueado
      await storage.updateDriver(id, { active: false });

      // Adicionar nota de bloqueio
      if (reason) {
        await storage.createDriverNote({
          driverId: id,
          userId: req.session.userId,
          note: reason,
          noteType: "block",
        });
      }

      return res.json({ message: "Motorista bloqueado com sucesso" });
    } catch (error) {
      console.error("Erro ao bloquear motorista:", error);
      return res.status(500).json({ message: "Erro ao bloquear motorista" });
    }
  });

  // POST /api/drivers/:id/unblock - Desbloquear motorista
  app.post("/api/drivers/:id/unblock", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const { id } = req.params;
      const { reason } = req.body;

      // Atualizar motorista para ativo
      await storage.updateDriver(id, { active: true });

      // Adicionar nota de desbloqueio
      if (reason) {
        await storage.createDriverNote({
          driverId: id,
          userId: req.session.userId,
          note: reason,
          noteType: "unblock",
        });
      }

      return res.json({ message: "Motorista desbloqueado com sucesso" });
    } catch (error) {
      console.error("Erro ao desbloquear motorista:", error);
      return res.status(500).json({ message: "Erro ao desbloquear motorista" });
    }
  });

  // ========================================
  // EMPRESA DELIVERIES ROUTES
  // ========================================

  // GET /api/empresa/deliveries - Listar entregas da empresa
  app.get("/api/empresa/deliveries", async (req, res) => {
    try {
      if (!req.session.companyId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const deliveries = await storage.getCompanyTrips(req.session.companyId);
      return res.json(deliveries);
    } catch (error) {
      console.error("Erro ao listar entregas:", error);
      return res.status(500).json({ message: "Erro ao buscar entregas" });
    }
  });

  // POST /api/empresa/deliveries - Criar nova entrega
  app.post("/api/empresa/deliveries", async (req, res) => {
    try {
      if (!req.session.companyId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const {
        pickupAddress,
        dropoffAddress,
        vehicleTypeId,
        serviceLocationId,
        estimatedAmount,
        distance,
        estimatedTime,
      } = req.body;

      if (!pickupAddress || !dropoffAddress || !vehicleTypeId) {
        return res.status(400).json({
          message: "Endereços de retirada, entrega e categoria são obrigatórios"
        });
      }

      // Generate unique request number
      const timestamp = Date.now();
      const random = Math.floor(Math.random() * 1000);
      const requestNumber = `REQ-${timestamp}-${random}`;

      // Create request
      const request = await storage.createRequest({
        requestNumber,
        companyId: req.session.companyId,
        userId: null, // Company requests don't have userId
        serviceLocationId: serviceLocationId || null,
        zoneTypeId: vehicleTypeId,
        totalDistance: distance || null,
        totalTime: estimatedTime || null,
        requestEtaAmount: estimatedAmount || null,
        isLater: false,
        isDriverStarted: false,
        isDriverArrived: false,
        isTripStart: false,
        isCompleted: false,
        isCancelled: false,
      });

      // Create request places
      await pool.query(
        `INSERT INTO request_places (id, request_id, pick_address, drop_address, pick_lat, pick_lng, drop_lat, drop_lng, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
        [
          request.id,
          pickupAddress.address,
          dropoffAddress.address,
          pickupAddress.lat || null,
          pickupAddress.lng || null,
          dropoffAddress.lat || null,
          dropoffAddress.lng || null,
        ]
      );

      // Create request bill if amount is provided
      if (estimatedAmount) {
        await pool.query(
          `INSERT INTO request_bills (request_id, total_amount)
           VALUES ($1, $2)`,
          [request.id, estimatedAmount]
        );
      }

      return res.status(201).json({
        message: "Entrega criada com sucesso",
        delivery: request
      });
    } catch (error) {
      console.error("Erro ao criar entrega:", error);
      return res.status(500).json({ message: "Erro ao criar entrega" });
    }
  });

  // GET /api/empresa/deliveries/:id - Obter detalhes de uma entrega
  app.get("/api/empresa/deliveries/:id", async (req, res) => {
    try {
      if (!req.session.companyId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const { id } = req.params;
      const request = await storage.getRequest(id);

      if (!request) {
        return res.status(404).json({ message: "Entrega não encontrada" });
      }

      // Verify request belongs to company
      if (request.companyId !== req.session.companyId) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      // Get additional details from request_places
      const { rows: places } = await pool.query(
        `SELECT * FROM request_places WHERE request_id = $1`,
        [id]
      );

      // Get driver details if assigned
      let driverInfo = null;
      if (request.driverId) {
        const driver = await storage.getDriver(request.driverId);
        if (driver) {
          driverInfo = {
            id: driver.id,
            name: driver.name,
            mobile: driver.mobile,
            carModel: driver.carModel,
            carNumber: driver.carNumber,
            rating: driver.rating,
          };
        }
      }

      return res.json({
        ...request,
        places: places[0] || null,
        driver: driverInfo,
      });
    } catch (error) {
      console.error("Erro ao buscar detalhes da entrega:", error);
      return res.status(500).json({ message: "Erro ao buscar detalhes da entrega" });
    }
  });

  // ========================================
  // SETTINGS ROUTES
  // ========================================

  // GET /api/settings/google-maps-key - Obter chave da API do Google Maps
  app.get("/api/settings/google-maps-key", async (req, res) => {
    try {
      if (!req.session.companyId && !req.session.userId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const settings = await storage.getSettings();

      if (!settings || !settings.googleMapsApiKey) {
        return res.status(404).json({
          message: "Chave da API do Google Maps não configurada"
        });
      }

      return res.json({
        apiKey: settings.googleMapsApiKey
      });
    } catch (error) {
      console.error("Erro ao buscar chave da API:", error);
      return res.status(500).json({ message: "Erro ao buscar chave da API" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
