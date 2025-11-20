import React, { useState } from 'react' 
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Button } from '../Button/Button'
import { Warehouse, LogOut, Menu, X } from 'lucide-react' 
import styles from './Navbar.module.css'

export const Navbar = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  // --- 3. ADICIONAR ESTADO PARA O MENU MÓVEL ---
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
    setIsMenuOpen(false) 
    navigate('/login')
  }

  // --- 4. FUNÇÃO PARA FECHAR O MENU AO CLICAR NUM LINK ---
  const handleLinkClick = () => {
    setIsMenuOpen(false)
  }

  return (
    <nav className={styles.navbar}>
      <div className={styles.navContainer}>
        <Link to="/" className={styles.logo} onClick={handleLinkClick}>
          <Warehouse className={styles.logoIcon} />
          <span>Almoxarifado</span>
        </Link>

        {/* --- 5. BOTÃO DO MENU HAMBÚRGUER (SÓ APARECE EM MÓVEL) --- */}
        <button
          className={styles.mobileToggle}
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Abrir menu"
        >
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        {/* --- 6. WRAPPER PARA OS ITENS DO MENU (PARA MÓVEL) --- */}
        <div className={`${styles.menuContainer} ${isMenuOpen ? styles.menuOpen : ''}`}>
          
          <div className={styles.menuLinks}>
            <Link to="/" className={styles.menuLink} onClick={handleLinkClick}>Estoque</Link>
            <Link to="/historico" className={styles.menuLink} onClick={handleLinkClick}>Histórico</Link>
            <Link to="/movimentacao" className={styles.menuLink} onClick={handleLinkClick}>Movimentação</Link>
            <Link to="/produtos" className={styles.menuLink} onClick={handleLinkClick}>Produtos</Link>
            <Link to="/notas-fiscais" className={styles.menuLink} onClick={handleLinkClick}>Notas Fiscais</Link>
            <Link to="/relatorios" className={styles.menuLink} onClick={handleLinkClick}>Relatórios</Link>
            <Link to="/provisionamento" className={styles.menuLink} onClick={handleLinkClick}>Provisionamento</Link>
          </div>

          <div className={styles.userArea}>
            {user && (
              <span className={styles.userName}>
                Olá, {user.nome.split(' ')[0]}
              </span>
            )}
            <Button
              onClick={handleLogout}
              className={styles.logoutButton}
              title="Sair"
            >
              <LogOut size={18} />
              {/* (NOVO) Texto para o menu móvel */}
              <span className={styles.logoutText}>Sair</span>
            </Button>
          </div>

        </div>
      </div>
    </nav>
  )
}