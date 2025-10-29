import React, { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown, X, Search } from 'lucide-react';

/**
 * Interface para definir opções do Select
 */
export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  icon?: React.ReactNode;
  description?: string;
}

/**
 * Interface que define as propriedades do componente Select
 *
 * @property options - Array de opções disponíveis
 * @property value - Valor selecionado (pode ser string ou array para múltipla seleção)
 * @property onChange - Callback executado quando a seleção muda
 * @property placeholder - Texto exibido quando nenhuma opção está selecionada
 * @property label - Label do campo
 * @property error - Mensagem de erro de validação
 * @property disabled - Desabilita o select
 * @property searchable - Permite buscar opções
 * @property multiple - Permite seleção múltipla
 * @property clearable - Mostra botão para limpar seleção
 * @property size - Tamanho do select
 * @property className - Classes CSS adicionais
 */
interface SelectProps {
  options: SelectOption[];
  value?: string | string[];
  onChange: (value: string | string[]) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
  searchable?: boolean;
  multiple?: boolean;
  clearable?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  required?: boolean;
}

/**
 * Componente Select customizado
 *
 * Select avançado com suporte a busca, seleção múltipla, ícones e descrições.
 * Mais flexível que o select nativo do HTML.
 *
 * Funcionalidades:
 * - Busca de opções (searchable)
 * - Seleção múltipla (multiple)
 * - Botão de limpar (clearable)
 * - Ícones e descrições nas opções
 * - Navegação por teclado
 * - Acessibilidade completa
 */
export const Select: React.FC<SelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Selecione uma opção',
  label,
  error,
  disabled = false,
  searchable = false,
  multiple = false,
  clearable = false,
  size = 'md',
  className = '',
  required = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const selectRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Filtra opções baseado na busca
  const filteredOptions = searchable
    ? options.filter(option =>
        option.label.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : options;

  // Converte value para array para facilitar manipulação
  const selectedValues = Array.isArray(value) ? value : value ? [value] : [];

  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Foca no input de busca quando abre
  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen, searchable]);

  // Navegação por teclado
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          setHighlightedIndex(prev =>
            prev < filteredOptions.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          event.preventDefault();
          setHighlightedIndex(prev =>
            prev > 0 ? prev - 1 : filteredOptions.length - 1
          );
          break;
        case 'Enter':
          event.preventDefault();
          if (filteredOptions[highlightedIndex]) {
            handleOptionClick(filteredOptions[highlightedIndex].value);
          }
          break;
        case 'Escape':
          event.preventDefault();
          setIsOpen(false);
          setSearchQuery('');
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, highlightedIndex, filteredOptions]);

  // Handler para clique em opção
  const handleOptionClick = (optionValue: string) => {
    if (multiple) {
      const newValue = selectedValues.includes(optionValue)
        ? selectedValues.filter(v => v !== optionValue)
        : [...selectedValues, optionValue];
      onChange(newValue);
    } else {
      onChange(optionValue);
      setIsOpen(false);
      setSearchQuery('');
    }
  };

  // Handler para limpar seleção
  const handleClear = (event: React.MouseEvent) => {
    event.stopPropagation();
    onChange(multiple ? [] : '');
  };

  // Obtém labels das opções selecionadas
  const getSelectedLabels = () => {
    return selectedValues
      .map(val => options.find(opt => opt.value === val)?.label)
      .filter(Boolean)
      .join(', ');
  };

  // Classes de tamanho
  const sizeClasses = {
    sm: 'text-sm py-1.5 px-3',
    md: 'text-base py-2 px-4',
    lg: 'text-lg py-3 px-5',
  };

  const displayValue = getSelectedLabels() || placeholder;
  const hasValue = selectedValues.length > 0;

  return (
    <div ref={selectRef} className={`relative ${className}`}>
      {/* Label */}
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {/* Select Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full flex items-center justify-between
          ${sizeClasses[size]}
          bg-white border rounded-lg
          ${error ? 'border-red-500' : 'border-gray-300'}
          ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'hover:border-gray-400 cursor-pointer'}
          ${isOpen ? 'ring-2 ring-blue-500 border-blue-500' : ''}
          transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-blue-500
        `}
      >
        <span className={hasValue ? 'text-gray-900' : 'text-gray-500'}>
          {displayValue}
        </span>

        <div className="flex items-center space-x-2">
          {clearable && hasValue && !disabled && (
            <X
              className="w-4 h-4 text-gray-400 hover:text-gray-600"
              onClick={handleClear}
            />
          )}
          <ChevronDown
            className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
              isOpen ? 'transform rotate-180' : ''
            }`}
          />
        </div>
      </button>

      {/* Error Message */}
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-hidden">
          {/* Search Input */}
          {searchable && (
            <div className="p-2 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar..."
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* Options List */}
          <div className="max-h-48 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-500 text-center">
                Nenhuma opção encontrada
              </div>
            ) : (
              filteredOptions.map((option, index) => {
                const isSelected = selectedValues.includes(option.value);
                const isHighlighted = index === highlightedIndex;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => !option.disabled && handleOptionClick(option.value)}
                    disabled={option.disabled}
                    className={`
                      w-full flex items-center justify-between px-4 py-2.5 text-left
                      ${isSelected ? 'bg-blue-50 text-blue-900' : 'text-gray-900'}
                      ${isHighlighted && !option.disabled ? 'bg-gray-50' : ''}
                      ${option.disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50 cursor-pointer'}
                      transition-colors duration-150
                    `}
                  >
                    <div className="flex items-center space-x-3 flex-1">
                      {option.icon && (
                        <span className="flex-shrink-0">{option.icon}</span>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{option.label}</div>
                        {option.description && (
                          <div className="text-xs text-gray-500 truncate">
                            {option.description}
                          </div>
                        )}
                      </div>
                    </div>

                    {isSelected && (
                      <Check className="w-5 h-5 text-blue-600 flex-shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
