import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { Category, Subcategory, TransactionType } from '../types/finance';
import { CategoryIcon, AVAILABLE_ICONS } from './CategoryIcon';

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (category: Category) => void;
  initialCategory?: Category | null;
  defaultType?: TransactionType;
}

const PRESET_COLORS = [
  '#F59E0B', // Amber
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#10B981', // Emerald
  '#06B6D4', // Cyan
  '#F97316', // Orange
  '#64748B', // Slate
  '#059669', // Dark Green
  '#6366F1', // Indigo
  '#E11D48', // Rose
  '#84CC16', // Lime
];

export const CategoryModal: React.FC<CategoryModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialCategory,
  defaultType = 'expense',
}) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<TransactionType>(defaultType);
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [icon, setIcon] = useState('Tag');
  const [budgetLimit, setBudgetLimit] = useState<string>('');
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [newSubcatName, setNewSubcatName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialCategory) {
      setName(initialCategory.name);
      setType(initialCategory.type);
      setColor(initialCategory.color || PRESET_COLORS[0]);
      setIcon(initialCategory.icon || 'Tag');
      setBudgetLimit(initialCategory.budgetLimit ? initialCategory.budgetLimit.toString() : '');
      setSubcategories(initialCategory.subcategories ? [...initialCategory.subcategories] : []);
    } else {
      setName('');
      setType(defaultType);
      setColor(defaultType === 'income' ? '#059669' : '#3B82F6');
      setIcon(defaultType === 'income' ? 'Briefcase' : 'Home');
      setBudgetLimit('');
      setSubcategories([]);
    }
    setNewSubcatName('');
    setError('');
  }, [initialCategory, isOpen, defaultType]);

  const handleAddSubcat = () => {
    if (!newSubcatName.trim()) return;
    const newSub: Subcategory = {
      id: `sub-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: newSubcatName.trim(),
    };
    setSubcategories([...subcategories, newSub]);
    setNewSubcatName('');
  };

  const handleRemoveSubcat = (id: string) => {
    setSubcategories(subcategories.filter((s) => s.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Informe o nome da categoria.');
      return;
    }

    const parsedBudget = budgetLimit ? parseFloat(budgetLimit.replace(',', '.')) : undefined;

    const savedCategory: Category = {
      id: initialCategory ? initialCategory.id : `cat-${Date.now()}`,
      name: name.trim(),
      type,
      color,
      icon,
      budgetLimit: parsedBudget && !isNaN(parsedBudget) && parsedBudget > 0 ? parsedBudget : undefined,
      subcategories: subcategories.length > 0 ? subcategories : [
        { id: `sub-${Date.now()}`, name: 'Geral' }
      ],
    };

    onSave(savedCategory);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div 
        className="relative bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              {initialCategory ? 'Editar Categoria' : 'Nova Categoria'}
            </h2>
            <p className="text-xs text-slate-500">
              Personalize a categoria e suas subcategorias associadas
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
              {error}
            </div>
          )}

          {/* Type Selector */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setType('expense')}
              className={`py-2 text-xs font-semibold rounded-md transition-all ${
                type === 'expense'
                  ? 'bg-white text-rose-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Categoria de Despesa
            </button>
            <button
              type="button"
              onClick={() => setType('income')}
              className={`py-2 text-xs font-semibold rounded-md transition-all ${
                type === 'income'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Categoria de Receita
            </button>
          </div>

          {/* Category Name & Budget */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Nome da Categoria <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="ex: Alimentação, Moradia, Salário"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {type === 'expense' && (
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Orçamento Mensal (Meta R$)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 text-xs font-mono">
                    R$
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="ex: 1500,00"
                    value={budgetLimit}
                    onChange={(e) => setBudgetLimit(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 tabular-nums"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Color & Icon Pickers */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Cor e Ícone
            </label>
            <div className="flex flex-wrap items-center gap-1.5 mb-3">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-6 h-6 rounded-full transition-transform ${
                    color === c ? 'ring-2 ring-offset-2 ring-indigo-600 scale-110' : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-1.5 max-h-24 overflow-y-auto p-2 bg-slate-50 border border-slate-200 rounded-lg">
              {AVAILABLE_ICONS.map((ic) => (
                <button
                  key={ic}
                  type="button"
                  onClick={() => setIcon(ic)}
                  className={`p-1.5 rounded-md transition-colors ${
                    icon === ic ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <CategoryIcon name={ic} className="w-4 h-4" />
                </button>
              ))}
            </div>
          </div>

          {/* Subcategories Management */}
          <div className="pt-2 border-t border-slate-100">
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Subcategorias ({subcategories.length})
            </label>
            <p className="text-[11px] text-slate-500 mb-2">
              Adicione divisões para detalhar melhor suas receitas ou despesas.
            </p>

            <div className="flex gap-2 mb-3">
              <input
                type="text"
                placeholder="Nova subcategoria (ex: Supermercado, Delivery...)"
                value={newSubcatName}
                onChange={(e) => setNewSubcatName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSubcat();
                  }
                }}
                className="flex-1 px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={handleAddSubcat}
                className="px-3 py-1.5 bg-slate-800 text-white hover:bg-slate-900 rounded-lg text-xs font-medium flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Adicionar
              </button>
            </div>

            {/* Subcategories list */}
            <div className="max-h-36 overflow-y-auto space-y-1.5">
              {subcategories.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-1">
                  Nenhuma subcategoria ainda (será criada 'Geral' por padrão).
                </p>
              ) : (
                subcategories.map((sub) => (
                  <div
                    key={sub.id}
                    className="flex items-center justify-between px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-700"
                  >
                    <span>{sub.name}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSubcat(sub.id)}
                      className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Footer actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm shadow-indigo-100 transition-colors"
            >
              Salvar Categoria
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
