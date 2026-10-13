import React, { useState, useEffect } from 'react';
import { X, CreditCard as CardIcon } from 'lucide-react';
import { CardBrand, CreditCard } from '../types/finance';
import { CARD_BRAND_LABELS } from '../utils/formatters';

interface CreditCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (card: CreditCard) => void;
  initialCard?: CreditCard | null;
}

const CARD_COLORS = [
  '#8B5CF6', // Purple (Nubank)
  '#F97316', // Orange (Inter / Itaú)
  '#004990', // Deep Blue (Itaú / Bradesco)
  '#0F172A', // Slate Black (Black / Infinite)
  '#059669', // Emerald (Sicredi / Sicoob)
  '#DC2626', // Red (Santander / Bradesco)
  '#D97706', // Gold / Platinum
  '#0284C7', // Sky Blue (Caixa)
];

export const CreditCardModal: React.FC<CreditCardModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialCard,
}) => {
  const [name, setName] = useState('');
  const [brand, setBrand] = useState<CardBrand>('mastercard');
  const [lastFourDigits, setLastFourDigits] = useState('');
  const [limitStr, setLimitStr] = useState('');
  const [closingDay, setClosingDay] = useState<number>(25);
  const [dueDay, setDueDay] = useState<number>(5);
  const [color, setColor] = useState(CARD_COLORS[0]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialCard) {
      setName(initialCard.name);
      setBrand(initialCard.brand);
      setLastFourDigits(initialCard.lastFourDigits || '');
      setLimitStr(initialCard.limit.toString());
      setClosingDay(initialCard.closingDay);
      setDueDay(initialCard.dueDay);
      setColor(initialCard.color);
    } else {
      setName('');
      setBrand('mastercard');
      setLastFourDigits('');
      setLimitStr('');
      setClosingDay(25);
      setDueDay(5);
      setColor(CARD_COLORS[0]);
    }
    setError('');
  }, [initialCard, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Informe o nome do cartão de crédito.');
      return;
    }
    const parsedLimit = parseFloat(limitStr.replace(',', '.'));
    if (isNaN(parsedLimit) || parsedLimit <= 0) {
      setError('Informe um limite de crédito válido maior que zero.');
      return;
    }
    if (closingDay < 1 || closingDay > 31) {
      setError('O dia de fechamento deve ser entre 1 e 31.');
      return;
    }
    if (dueDay < 1 || dueDay > 31) {
      setError('O dia de vencimento deve ser entre 1 e 31.');
      return;
    }

    const cardToSave: CreditCard = {
      id: initialCard ? initialCard.id : `card-${Date.now()}`,
      name: name.trim(),
      brand,
      lastFourDigits: lastFourDigits.trim().slice(0, 4) || undefined,
      limit: parsedLimit,
      closingDay,
      dueDay,
      color,
    };

    onSave(cardToSave);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div 
        className="relative bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              {initialCard ? 'Editar Cartão de Crédito' : 'Novo Cartão de Crédito'}
            </h2>
            <p className="text-xs text-slate-500">
              Cadastre o cartão para acompanhar limites e faturas
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

          {/* Card Preview Miniature */}
          <div
            className="p-4 rounded-xl text-white shadow-sm flex flex-col justify-between h-32 transition-colors relative overflow-hidden"
            style={{ backgroundColor: color }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold tracking-wide">
                {name || 'Nome do Cartão'}
              </span>
              <span className="text-[11px] font-mono uppercase bg-white/20 px-2 py-0.5 rounded">
                {CARD_BRAND_LABELS[brand]}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs pt-2">
              <span className="font-mono tracking-widest text-[13px]">
                •••• •••• •••• {lastFourDigits || '0000'}
              </span>
            </div>

            <div className="flex items-center justify-between text-[11px] text-white/80 pt-1 border-t border-white/20">
              <span>Fecha dia: <strong>{closingDay}</strong></span>
              <span>Vence dia: <strong>{dueDay}</strong></span>
              <span>Limite: <strong>R$ {limitStr || '0,00'}</strong></span>
            </div>
          </div>

          {/* Name & Brand */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Nome do Cartão <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="ex: Nubank, Itaú Click"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Bandeira
              </label>
              <select
                value={brand}
                onChange={(e) => setBrand(e.target.value as CardBrand)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                {(Object.keys(CARD_BRAND_LABELS) as CardBrand[]).map((b) => (
                  <option key={b} value={b}>
                    {CARD_BRAND_LABELS[b]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Limit & Last 4 digits */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Limite Total (R$) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-slate-400 text-xs font-mono">
                  R$
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  placeholder="5000,00"
                  value={limitStr}
                  onChange={(e) => setLimitStr(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 tabular-nums"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Últimos 4 Dígitos (Opcional)
              </label>
              <input
                type="text"
                maxLength={4}
                placeholder="ex: 1234"
                value={lastFourDigits}
                onChange={(e) => setLastFourDigits(e.target.value.replace(/\D/g, ''))}
                className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Closing & Due Days */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Dia Fechamento Fatura
              </label>
              <input
                type="number"
                min={1}
                max={31}
                required
                value={closingDay}
                onChange={(e) => setClosingDay(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Dia Vencimento Fatura
              </label>
              <input
                type="number"
                min={1}
                max={31}
                required
                value={dueDay}
                onChange={(e) => setDueDay(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Color Picker */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Cor do Cartão
            </label>
            <div className="flex flex-wrap items-center gap-2">
              {CARD_COLORS.map((c) => (
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
          </div>

          {/* Actions */}
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
              Salvar Cartão
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
