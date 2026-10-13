import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Layers, DollarSign, ChevronDown, ChevronRight, AlertCircle } from 'lucide-react';
import { Category, Subcategory, Transaction, TransactionType } from '../types/finance';
import { CategoryIcon } from './CategoryIcon';
import { formatCurrency } from '../utils/formatters';

interface CategoriesViewProps {
  categories: Category[];
  transactions: Transaction[];
  onOpenNewCategory: (type?: TransactionType) => void;
  onEditCategory: (category: Category) => void;
  onDeleteCategory: (categoryId: string) => void;
  onAddSubcategory: (categoryId: string, subcategoryName: string) => void;
  onDeleteSubcategory: (categoryId: string, subcategoryId: string) => void;
  onResetDefaults: () => void;
}

export const CategoriesView: React.FC<CategoriesViewProps> = ({
  categories,
  transactions,
  onOpenNewCategory,
  onEditCategory,
  onDeleteCategory,
  onAddSubcategory,
  onDeleteSubcategory,
  onResetDefaults,
}) => {
  const [activeTab, setActiveTab] = useState<TransactionType>('expense');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [newSubcatInputs, setNewSubcatInputs] = useState<Record<string, string>>({});

  const toggleExpand = (catId: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [catId]: !prev[catId],
    }));
  };

  const handleSubcatInputChange = (catId: string, val: string) => {
    setNewSubcatInputs((prev) => ({
      ...prev,
      [catId]: val,
    }));
  };

  const handleAddSubcatSubmit = (catId: string) => {
    const text = newSubcatInputs[catId]?.trim();
    if (!text) return;
    onAddSubcategory(catId, text);
    setNewSubcatInputs((prev) => ({
      ...prev,
      [catId]: '',
    }));
  };

  const currentCategories = categories.filter((c) => c.type === activeTab);

  // Statistics
  const totalSubcategories = currentCategories.reduce(
    (acc, c) => acc + (c.subcategories?.length || 0),
    0
  );
  const totalBudget = currentCategories.reduce(
    (acc, c) => acc + (c.budgetLimit || 0),
    0
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Categorias & Subcategorias
          </h1>
          <p className="text-sm sm:text-base text-slate-500 mt-1">
            Organize a hierarquia financeira personalizada para classificar suas contas
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (confirm('Deseja restaurar as categorias padrão do sistema?')) {
                onResetDefaults();
              }
            }}
            className="px-4 py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            Restaurar Padrão
          </button>
          <button
            onClick={() => onOpenNewCategory(activeTab)}
            className="px-4.5 py-2.5 text-sm sm:text-base font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs shadow-indigo-200 transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4.5 h-4.5" />
            Nova Categoria
          </button>
        </div>
      </div>

      {/* Tabs and Meta Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Type selector tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab('expense')}
            className={`px-4.5 py-2 text-sm font-semibold rounded-lg transition-colors cursor-pointer ${
              activeTab === 'expense'
                ? 'bg-white text-rose-700 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Categorias de Despesas ({categories.filter((c) => c.type === 'expense').length})
          </button>
          <button
            onClick={() => setActiveTab('income')}
            className={`px-4.5 py-2 text-sm font-semibold rounded-lg transition-colors cursor-pointer ${
              activeTab === 'income'
                ? 'bg-white text-emerald-700 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Categorias de Receitas ({categories.filter((c) => c.type === 'income').length})
          </button>
        </div>

        {/* Quiet Meta Stats */}
        <div className="flex items-center gap-3 text-xs sm:text-sm text-slate-500 font-medium">
          <span>{currentCategories.length} categorias</span>
          <span aria-hidden="true">·</span>
          <span>{totalSubcategories} subcategorias</span>
          {activeTab === 'expense' && totalBudget > 0 && (
            <>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums font-semibold text-slate-700">
                Teto Planejado: {formatCurrency(totalBudget)}/mês
              </span>
            </>
          )}
        </div>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {currentCategories.map((category) => {
          const isExpanded = expandedCategories[category.id] ?? true;
          const txCount = transactions.filter((t) => t.categoryId === category.id).length;

          return (
            <div
              key={category.id}
              className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs hover:border-slate-300 transition-all"
            >
              {/* Category Card Header */}
              <div className="p-4 flex items-center justify-between border-b border-slate-100 bg-slate-50/40">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-white shrink-0 shadow-2xs"
                    style={{ backgroundColor: category.color }}
                  >
                    <CategoryIcon name={category.icon} className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-bold text-slate-900 truncate">
                        {category.name}
                      </h2>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                      <span>{category.subcategories?.length || 0} subcategorias</span>
                      <span aria-hidden="true">·</span>
                      <span>{txCount} lançamentos</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {category.budgetLimit && category.budgetLimit > 0 && (
                    <div className="text-right hidden sm:block mr-2">
                      <span className="text-[10px] text-slate-500 block">Orçamento</span>
                      <span className="text-xs font-mono font-bold text-slate-800 tabular-nums">
                        {formatCurrency(category.budgetLimit)}
                      </span>
                    </div>
                  )}

                  <button
                    onClick={() => onEditCategory(category)}
                    className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 transition-colors"
                    title="Editar categoria"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => {
                      if (txCount > 0) {
                        if (
                          !confirm(
                            `Atenção: Existem ${txCount} lançamentos vinculados à categoria "${category.name}". Deseja realmente excluir?`
                          )
                        ) {
                          return;
                        }
                      } else {
                        if (!confirm(`Excluir a categoria "${category.name}"?`)) return;
                      }
                      onDeleteCategory(category.id);
                    }}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition-colors"
                    title="Excluir categoria"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => toggleExpand(category.id)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition-colors"
                    title={isExpanded ? 'Recolher' : 'Expandir'}
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Expandable Subcategories List */}
              {isExpanded && (
                <div className="p-4 space-y-3">
                  {/* Subcategories tags/list */}
                  <div className="space-y-1.5">
                    {category.subcategories?.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">
                        Nenhuma subcategoria cadastrada.
                      </p>
                    ) : (
                      category.subcategories.map((sub) => {
                        const subTxCount = transactions.filter(
                          (t) => t.categoryId === category.id && t.subcategoryId === sub.id
                        ).length;

                        return (
                          <div
                            key={sub.id}
                            className="flex items-center justify-between py-1.5 px-3 bg-slate-50 rounded-lg text-xs hover:bg-slate-100/70 transition-colors group"
                          >
                            <div className="flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                              <span className="font-medium text-slate-700">{sub.name}</span>
                              <span className="text-[10px] text-slate-400">
                                ({subTxCount} {subTxCount === 1 ? 'item' : 'itens'})
                              </span>
                            </div>

                            <button
                              onClick={() => {
                                if (
                                  confirm(`Deseja remover a subcategoria "${sub.name}"?`)
                                ) {
                                  onDeleteSubcategory(category.id, sub.id);
                                }
                              }}
                              className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600 transition-opacity p-1"
                              title="Remover subcategoria"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Inline Add Subcategory input */}
                  <div className="pt-2 border-t border-slate-100 flex gap-2">
                    <input
                      type="text"
                      placeholder="Adicionar nova subcategoria..."
                      value={newSubcatInputs[category.id] || ''}
                      onChange={(e) => handleSubcatInputChange(category.id, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddSubcatSubmit(category.id);
                        }
                      }}
                      className="flex-1 px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddSubcatSubmit(category.id)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-medium rounded-lg flex items-center gap-1 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Adicionar
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
