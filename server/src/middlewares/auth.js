const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../config/db"); 


const logError = (msg, err) => console.error(`[AUTH ERROR] ${msg}`, err);

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const router = express.Router();


if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
  console.error("ERRO CRÍTICO: JWT_SECRET ou JWT_REFRESH_SECRET não definidas no .env");
  
}

// --- FUNÇÃO AUXILIAR DE COOKIES ---
function getCookieOptions(req) {
  const origin = req.headers.origin;
  const isHttpLocal = origin && (origin.includes("localhost") || origin.includes("127.0.0.1"));

  if (isHttpLocal) {
    return {
      httpOnly: true,
      secure: false,
    };
  } else {
    return {
      httpOnly: true,
      secure: true,
      sameSite: "none",
    };
  }
}

// --- MIDDLEWARE DE VERIFICAÇÃO ---
function verificarAutenticacao(req, res, next) {
  let token;
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }
  
  if (!token) {
    return res.status(401).json({ error: "Acesso negado. Token não enviado." });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.usuario = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Token inválido ou expirado." });
  }
}

// --- ROTAS DE AUTENTICAÇÃO ---

// LOGIN
router.post("/login", async (req, res) => {
  const { email, senha } = req.body;

  if (!email || !senha) {
    return res.status(400).json({ error: "Email e senha são obrigatórios" });
  }

  try {
    const [rows] = await db.execute(
      `SELECT u.id, u.nome, u.email, u.senha_hash, GROUP_CONCAT(up.perfil_id) as perfil_ids
       FROM usuarios u
       LEFT JOIN usuario_perfis up ON u.id = up.usuario_id
       WHERE u.email = ? AND u.status = 'ativo'
       GROUP BY u.id`,
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: "Usuário não encontrado ou inativo" });
    }

    const usuario = rows[0];
    const senhaCorreta = await bcrypt.compare(senha, usuario.senha_hash);

    if (!senhaCorreta) {
      return res.status(401).json({ error: "Senha incorreta" });
    }

    const perfil_ids = usuario.perfil_ids
      ? usuario.perfil_ids.split(",").map(Number)
      : [];

    const accessToken = jwt.sign(
      { id: usuario.id, nome: usuario.nome, email: usuario.email, perfil_ids },
      JWT_SECRET,
      { expiresIn: "1h" }
    );
    
    const refreshToken = jwt.sign(
      { id: usuario.id, email: usuario.email },
      JWT_REFRESH_SECRET,
      { expiresIn: "7d" }
    );

    const cookieOptions = getCookieOptions(req);

    res.cookie("token", accessToken, {
      ...cookieOptions,
      maxAge: 60 * 60 * 1000, // 1 hora
    });

    res.cookie("refreshToken", refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias
    });

    res.json({
      message: "Login bem-sucedido",
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        perfil_ids,
      },
    });
  } catch (err) {
    logError("Erro ao fazer login:", err);
    res.status(500).json({ error: "Erro ao fazer login" });
  }
});

// VERIFICAR
router.get("/verificar", verificarAutenticacao, (req, res) => {
  res.json({
    autenticado: true,
    usuario: req.usuario,
  });
});

// REFRESH
router.post("/refresh", (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) {
    return res.status(401).json({ error: "Refresh token não enviado" });
  }

  try {
    const decodedRefresh = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    const newAccessToken = jwt.sign(
      { id: decodedRefresh.id, email: decodedRefresh.email },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    const cookieOptions = getCookieOptions(req);
    
    res.cookie("token", newAccessToken, {
      ...cookieOptions,
      maxAge: 60 * 60 * 1000, 
    });

    res.json({ message: "Token renovado com sucesso" });
  } catch (err) {
    logError("Erro ao renovar token:", err);
    return res.status(401).json({ error: "Refresh token inválido ou expirado" });
  }
});

// LOGOUT
router.post("/logout", (req, res) => {
  const cookieOptions = getCookieOptions(req);
  res.clearCookie("token", { ...cookieOptions, path: "/" });
  res.clearCookie("refreshToken", { ...cookieOptions, path: "/" });
  res.json({ message: "Logout realizado com sucesso" });
});

module.exports = {
  authRouter: router,
  verificarAutenticacao: verificarAutenticacao,
};