import { useState, useEffect } from "react";
import { Button } from "../../components/Button/Button";
import { Card, CardContent, CardHeader } from "../../components/Card/Card";
import { Input } from "../../components/Input/Input";
import { Warehouse } from "lucide-react";
import styles from "./Login.module.css";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import toast from 'react-hot-toast'; 

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Por favor, preencha o e-mail e a senha"); 
      return;
    }
    setIsLoading(true);

    try {
      const success = await login(email, password);
      if (!success) {
        toast.error("E-mail ou senha incorreto"); 
      }
    }catch(error) {
      toast.error("Erro ao conectar com o servidor. Tente novamente."); 
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <div className={styles.loginContainer}>
      <Card className={styles.loginCard}>
        <CardHeader>
          <div className={styles.iconWrapper}>
            <Warehouse size={40} color="white" />
          </div>
          <h1 className={styles.title}>Almoxarifado</h1>
          <p className={styles.description}>Acesse sua conta para continuar</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <Input
              type="email"
              id="email"
              label="Email"
              placeholder="Seu.email@empresa.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
            />

            <Input
              type="password"
              id="password"
              label="Senha"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
            />
            <Button type="submit">
              {isLoading ? "Entrando..." : "Entrar"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default LoginPage;