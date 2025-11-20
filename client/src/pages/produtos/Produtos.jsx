import React, { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardContent } from "../../components/Card/Card";
import { Input } from "../../components/Input/Input";
import { Button } from "../../components/Button/Button";
import { Modal } from "../../components/modal/Modal";
import { Pagination } from "../../components/Paginacao/Pagination";
import { Barcode, Printer, Edit } from "lucide-react";
import styles from "./Produtos.module.css";

import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_BASE_URL;

const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
};


const useForm = (initialState) => {
  const [values, setValues] = useState(initialState);
  const handleChange = (e) => {
    const { name, value, type } = e.target;
    if (type === 'number') {
      setValues({ ...values, [name]: parseInt(value, 10) || 0 });
    } else {
      setValues({ ...values, [name]: value });
    }
  };
  return [values, handleChange, setValues];
};


export function ProdutosPage() {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorOnLoad, setErrorOnLoad] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  // --- Estados do Formulário de Cadastro ---
  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Papelaria");
  const [description, setDescription] = useState("");
  const [minStock, setMinStock] = useState("10");
  const [fatorEmbalagem, setFatorEmbalagem] = useState("1");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- Estados do Modal de Edição ---
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentProduct, handleChange, setCurrentProduct] = useForm(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // --- Estados do Modal de Exclusão ---
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);


  // ---Função de Busca de Dados ---
  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    setErrorOnLoad(null);

    try {
      const params = new URLSearchParams({
        page: currentPage,
        limit: 10,
        search: debouncedSearchTerm,
      });

      const response = await fetch(`${API_URL}/api/almoxarifado/produtos?${params.toString()}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Falha ao buscar produtos");
      }

      const data = await response.json();

      setProducts(data.items);
      setTotalPages(data.totalPages);

    } catch (err) {
      setErrorOnLoad(err.message);
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, debouncedSearchTerm]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm]);


  // --- Função de Cadastro  ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const newProductData = {
      sku: sku.toUpperCase().replace(/\//g, '-'),
      name,
      category,
      description,
      minStock: parseInt(minStock, 10),
      fator_embalagem: parseInt(fatorEmbalagem, 10) || 1
    };

    try {
      const response = await fetch(`${API_URL}/api/almoxarifado/produtos`, {
        method: "POST",
        headers: { "Content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify(newProductData),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "falha no servidor");
      }
      toast.success(data.message);

      setSku("");
      setName("");
      setDescription("");
      setMinStock(10);
      setFatorEmbalagem("1");

      fetchProducts();

    } catch (err) {
      toast.error(`Erro: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openDeleteModal = (product) => {
    setProductToDelete(product);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!productToDelete) return;

    setIsDeleting(true);
    try {
      const response = await fetch(
        `${API_URL}/api/almoxarifado/produtos/${productToDelete.sku}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Falha no servidor");
      }

      toast.success(data.message);

      if (products.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      } else {
        fetchProducts();
      }

      setIsDeleteModalOpen(false);
      setProductToDelete(null);

    } catch (err) {
      toast.error(`Erro: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const generateSKU = () => {
    const prefix = category.substring(0, 3).toUpperCase();
    const Timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0");

    const newSku = `${prefix}-${Timestamp}-${random}`;
    setSku(newSku);
  };

  const handlePrint = (sku) => {
    window.open(`/produtos/${sku}/etiqueta`, "_blank");
  };

  const handleOpenModal = (product) => {
    setCurrentProduct(product);
    setIsEditModalOpen(true);
  };

  const handleUpdateProduct = async (e) => {
    e.preventDefault();
    if (!currentProduct) return;
    setIsUpdating(true);

    try {
      const response = await fetch(
        `${API_URL}/api/almoxarifado/produtos/${currentProduct.sku}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(currentProduct),
        }
      );

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Falha ao atualizar");

      toast.success(data.message);

      setProducts((prevProducts) =>
        prevProducts.map((p) =>
          p.sku === data.updatedProduct.sku ? data.updatedProduct : p
        )
      );

      setIsEditModalOpen(false);
    } catch (err) {
      toast.error(`Erro: ${err.message}`);
    } finally {
      setIsUpdating(false);
    }
  };


  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  if (errorOnLoad && !products) return <div className={styles.error}>Erro: {errorOnLoad}</div>;


  return (
    <div className={styles.produtosContainer}>
      {/* Coluna 1: Formulário de Cadastro */}
      <Card className={styles.formCard}>
        {/* ... (Formulário de Cadastro inalterado) ... */}
        <CardHeader>
          <h2>Cadastrar Novo Produto</h2>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <label htmlFor="sku" className={styles.labelExterno}>
              SKU (Código Único)
            </label>
            <div className={styles.skuWrapper}>
              <Input
                id="sku"
                type="text"
                placeholder="EX: PAP-001"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                required
              />
              <Button
                type="button"
                onClick={generateSKU}
                className={styles.generateButton}
                title="Gerar SKU">
                <Barcode size={18} />
              </Button>
            </div>
            <Input
              label="Nome do Produto"
              id="name"
              type="text"
              placeholder="Resma Papel A4"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <div className={styles.inputGroup}>
              <label htmlFor="category">Categoria</label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={styles.select}>
                <option value="Papelaria">Papelaria</option>
                <option value="Informatica">Informática</option>
                <option value="Limpeza">Limpeza</option>
                <option value="Escritorio">Escritório</option>
                <option value="Outros">Outros</option>
              </select>
            </div>
            <Input
              label="Descrição (Opcional)"
              id="description"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <Input
              label="Estoque Mínimo (Padrão: 10)"
              id="minStock"
              type="number"
              min="0"
              value={minStock}
              onChange={(e) => setMinStock(e.target.value)}
            />
            <Input
              label="Fator de Embalagem (Unidades)"
              id="fatorEmbalagem"
              type="number"
              min="1"
              value={fatorEmbalagem}
              onChange={(e) => setFatorEmbalagem(e.target.value)}
              required
            />

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Cadastrando..." : "Cadastrar Produto"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Coluna 2: Tabela de Produtos */}
      <Card className={styles.tableCard}>
        <CardHeader>
          {/* Mostra o total de itens (se houver) ou o total filtrado */}
          <h2>Produtos Cadastrados ({products.length})</h2>
        </CardHeader>
        <CardContent>
          <Input
            label="Buscar Produto (por Nome ou SKU)"
            id="search"
            type="text"
            placeholder="Digite para buscar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
          {isLoading && <p>Carregando lista...</p>}
          {!isLoading && errorOnLoad && <p className={styles.error}>{errorOnLoad}</p>}

          <table className={styles.productTable}>
            <thead>
              <tr>
                <th>SKU</th>
                <th>Produto</th>
                <th>Categoria</th>
                <th>Estoque Atual</th>
                <th>Fator Emb.</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {!isLoading && products.length === 0 ? (
                <tr>
                  <td colSpan="6">
                    {debouncedSearchTerm
                      ? "Nenhum produto encontrado para sua busca."
                      : "Nenhum produto cadastrado."
                    }
                  </td>
                </tr>
              ) : (
                // Mapeia 'products' diretamente
                products.map((product) => (
                  <tr key={product.sku}>
                    <td>{product.sku}</td>
                    <td>{product.name}</td>
                    <td>{product.category}</td>
                    <td>
                      {product.quantity} (Mín: {product.minStock})
                    </td>
                    <td>{product.fator_embalagem}</td>

                    <td className={styles.actionsCell}>
                      <Button
                        className={styles.editButton}
                        onClick={() => handleOpenModal(product)}
                        title="Editar Produto">
                        <Edit size={16} />
                      </Button>

                      <Button
                        className={styles.printButton}
                        onClick={() => handlePrint(product.sku)}
                        title="Imprimir Etiqueta">
                        <Printer size={16} />
                      </Button>

                      <Button
                        className={styles.deleteButton}
                        onClick={() => openDeleteModal(product)}
                        title="Excluir">
                        Excluir
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages} // <-- Vem do estado
            onPageChange={handlePageChange}
          />
        </CardContent>
      </Card>

      {/* Modal de Edição */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)}>
        {/* ... (Modal de Edição inalterado) ... */}
        {currentProduct && (
          <form onSubmit={handleUpdateProduct}>
            <h2>Editar Produto: {currentProduct.sku}</h2>
            <Input
              label="Nome do Produto"
              id="edit-name"
              type="text"
              name="name"
              value={currentProduct.name}
              onChange={handleChange}
              required
            />
            <div className={styles.inputGroup}>
              <label htmlFor="edit-category">Categoria</label>
              <select
                id="edit-category"
                name="category"
                value={currentProduct.category}
                onChange={handleChange}
                className={styles.select}>
                <option value="Papelaria">Papelaria</option>
                <option value="Informatica">Informática</option>
                <option value="Limpeza">Limpeza</option>
                <option value="Escritorio">Escritório</option>
                <option value="Outros">Outros</option>
              </select>
            </div>
            <Input
              label="Descrição (Opcional)"
              id="edit-description"
              type="text"
              name="description"
              value={currentProduct.description || ""}
              onChange={handleChange}
            />
            <Input
              label="Estoque Mínimo"
              id="edit-minStock"
              type="number"
              name="minStock"
              min="0"
              value={currentProduct.minStock}
              onChange={handleChange}
              required
            />
            <Input
              label="Fator de Embalagem (Unidades)"
              id="edit-fator_embalagem"
              type="number"
              name="fator_embalagem"
              min="1"
              value={currentProduct.fator_embalagem}
              onChange={handleChange}
              required
            />
            <Button
              type="submit"
              disabled={isUpdating}
              style={{ width: "100%", marginTop: "1rem" }}>
              {isUpdating ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </form>
        )}
      </Modal>

      {/* Modal de Exclusão */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)}>
        {/* ... (Modal de Exclusão inalterado) ... */}
        <h2>Confirmar Exclusão</h2>
        {productToDelete && (
          <p>
            Tem certeza que deseja excluir o produto:
            <br />
            <strong>{productToDelete.name} (SKU: {productToDelete.sku})</strong>?
          </p>
        )}
        <p style={{ fontWeight: 'bold' }}>Esta ação não pode ser desfeita.</p>

        <div className={styles.modalActions}>
          <Button
            className={styles.modalButtonCancel}
            onClick={() => setIsDeleteModalOpen(false)}
            disabled={isDeleting}
          >
            Cancelar
          </Button>
          <Button
            className={styles.modalButtonConfirm}
            onClick={handleConfirmDelete}
            disabled={isDeleting}
          >
            {isDeleting ? "Excluindo..." : "Confirmar Exclusão"}
          </Button>
        </div>
      </Modal>

    </div>
  );
}