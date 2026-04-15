'use client';

import React, { useState } from 'react';
import { Edit2, Trash2, Plus, Check } from 'lucide-react';

export interface Card {
  id: number;
  word: string;
  meaning: string;
  reading?: string;
  pronunciation?: string;
  exampleSentence?: string;
  enExample?: string;
  exampleReading?: string;
  repetitions?: number;
  nextReview?: string | null;
}

const LEVEL_BADGE: Record<string, { emoji: string; label: string }> = {
  apprentice: { emoji: '🟠', label: 'Apprentice' },
  guru: { emoji: '🟣', label: 'Guru' },
  master: { emoji: '🔵', label: 'Master' },
  enlightened: { emoji: '💙', label: 'Enlightened' },
  burned: { emoji: '🔥', label: 'Burned' },
};

function getSrsLevel(repetitions?: number, nextReview?: string | null): string | null {
  // Only show badge if card has been reviewed at least once
  if (repetitions === undefined || (repetitions === 0 && nextReview === null)) return null;
  if (repetitions <= 3) return 'apprentice';
  if (repetitions <= 5) return 'guru';
  if (repetitions === 6) return 'master';
  if (repetitions === 7) return 'enlightened';
  return 'burned';
}

interface CardListProps {
  cards: Card[];
  onEdit: (card: Card) => void;
  onDelete: (cardId: number) => void;
  onAdd: () => void;
  selectionMode?: boolean;
  selectedCardIds?: number[];
  onSelectionChange?: (selectedIds: number[]) => void;
  onCreateFromSelection?: () => void;
  onDeleteSelected?: (cardIds: number[]) => void;
}

export const CardList: React.FC<CardListProps> = ({
  cards,
  onEdit,
  onDelete,
  onAdd,
  selectionMode = false,
  selectedCardIds = [],
  onSelectionChange,
  onCreateFromSelection,
  onDeleteSelected
}) => {
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [isCreatingSet, setIsCreatingSet] = useState(false);
  const [showSelectedCards, setShowSelectedCards] = useState(false);
  const selectedCards = new Set(selectedCardIds);

  const handleDelete = (cardId: number) => {
    if (deleteConfirm === cardId) {
      onDelete(cardId);
      setDeleteConfirm(null);
    } else {
      setDeleteConfirm(cardId);
      setTimeout(() => setDeleteConfirm(null), 3000);
    }
  };

  const toggleCardSelection = (cardId: number) => {
    if (!onSelectionChange) return;

    const newSelection = new Set(selectedCards);
    if (newSelection.has(cardId)) {
      newSelection.delete(cardId);
    } else {
      newSelection.add(cardId);
    }
    onSelectionChange(Array.from(newSelection));
  };

  const toggleSelectAll = () => {
    if (!onSelectionChange) return;

    if (selectedCards.size === cards.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(cards.map(c => c.id));
    }
  };

  const handleCreateFromSelection = () => {
    if (selectedCards.size > 0 && onCreateFromSelection) {
      setIsCreatingSet(true);
      onCreateFromSelection();
    }
  };

  const handleDeleteSelected = () => {
    if (selectedCards.size > 0 && onDeleteSelected) {
      onDeleteSelected(Array.from(selectedCards));
    }
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-[var(--main-color)]">
          Cards ({cards.length})
        </h2>
        <button
          onClick={onAdd}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--main-color)] text-white rounded-lg hover:opacity-90 transition font-bold"
        >
          <Plus size={20} />
          Add Card
        </button>
      </div>

      {/* Cards Table */}
      <div className="bg-[var(--card-color)] border border-[var(--border-color)] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[var(--border-color)]/20">
              <tr>
                {selectionMode && (
                  <th className="p-4 w-12">
                    <input
                      type="checkbox"
                      checked={selectedCards.size === cards.length && cards.length > 0}
                      onChange={toggleSelectAll}
                      className="w-5 h-5 rounded border-2 border-[var(--main-color)] text-[var(--main-color)] focus:ring-2 focus:ring-[var(--main-color)] cursor-pointer"
                    />
                  </th>
                )}
                <th className="text-left p-4 font-bold text-[var(--main-color)]">Word</th>
                <th className="text-left p-4 font-bold text-[var(--main-color)]">Meaning</th>
                <th className="text-left p-4 font-bold text-[var(--main-color)]">Reading</th>
                <th className="text-left p-4 font-bold text-[var(--main-color)]">Example</th>
                <th className="text-left p-4 font-bold text-[var(--main-color)]">SRS</th>
                <th className="text-right p-4 font-bold text-[var(--main-color)]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {cards.length === 0 ? (
                <tr>
                  <td colSpan={selectionMode ? 6 : 5} className="text-center py-12 text-[var(--secondary-color)]">
                    No cards yet. Click "Add Card" to create one!
                  </td>
                </tr>
              ) : (
                cards.map((card) => (
                  <tr
                    key={card.id}
                    className={`border-t border-[var(--border-color)] hover:bg-[var(--border-color)]/10 transition ${selectedCards.has(card.id) ? 'bg-blue-50' : ''
                      }`}
                  >
                    {selectionMode && (
                      <td className="p-4">
                        <input
                          type="checkbox"
                          checked={selectedCards.has(card.id)}
                          onChange={() => toggleCardSelection(card.id)}
                          className="w-5 h-5 rounded border-2 border-[var(--main-color)] text-[var(--main-color)] focus:ring-2 focus:ring-[var(--main-color)] cursor-pointer"
                        />
                      </td>
                    )}
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[var(--main-color)]">{card.word}</span>
                      </div>
                    </td>
                    <td className="p-4 text-[var(--secondary-color)]">{card.meaning}</td>
                    <td className="p-4 text-[var(--secondary-color)]">{card.reading || '-'}</td>
                    <td className="p-4 text-[var(--secondary-color)] max-w-xs truncate">
                      {card.exampleSentence || '-'}
                    </td>
                    {/* SRS Level badge */}
                    <td className="p-4">
                      {(() => {
                        const lvl = getSrsLevel(card.repetitions, card.nextReview);
                        if (!lvl) return <span className="text-xs text-[var(--secondary-color)] opacity-40">—</span>;
                        const badge = LEVEL_BADGE[lvl];
                        return (
                          <div className="group relative inline-block">
                            <span className="cursor-default text-lg" title={badge.label}>{badge.emoji}</span>
                            <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 whitespace-nowrap rounded-lg border border-[var(--border-color)] bg-[var(--card-color)] px-2.5 py-1 text-xs font-semibold text-[var(--main-color)] opacity-0 shadow-lg transition-opacity group-hover:opacity-100 z-10">
                              {badge.label}
                            </div>
                          </div>
                        );
                      })()}
                    </td>
                    <td className="p-4">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => onEdit(card)}
                          className="p-2 text-[var(--main-color)] hover:bg-[var(--main-color)]/10 rounded-lg transition"
                          title="Edit card"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(card.id)}
                          className={`p-2 rounded-lg transition ${deleteConfirm === card.id
                            ? 'bg-red-500 text-white'
                            : 'text-red-500 hover:bg-red-50'
                            }`}
                          title={deleteConfirm === card.id ? 'Click again to confirm' : 'Delete card'}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selection Footer */}
      {selectionMode && selectedCards.size > 0 && (
        <div className="mt-6 bg-blue-50 border-2 border-blue-200 rounded-xl overflow-hidden">
          {/* Selected Cards Preview */}
          {showSelectedCards && (
            <div className="p-4 border-b-2 border-[var(--border-color)] max-h-60 overflow-y-auto bg-[var(--background-color)]">
              <h4 className="font-bold text-[var(--main-color)] mb-3">Selected Cards ({selectedCards.size})</h4>
              <div className="space-y-2">
                {cards.filter(card => selectedCards.has(card.id)).map(card => (
                  <div key={card.id} className="bg-[var(--card-color)] p-3 rounded-lg border border-[var(--border-color)] hover:shadow-sm transition text-sm">
                    <div className="font-medium text-[var(--main-color)]">
                      {card.word}
                      {card.reading && <span className="ml-2 text-[var(--secondary-color)]">({card.reading})</span>}
                    </div>
                    <div className="text-[var(--secondary-color)] mt-1">{card.meaning}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold">
                {selectedCards.size}
              </div>
              <div>
                <p className="font-bold text-blue-900">
                  {selectedCards.size} card{selectedCards.size !== 1 ? 's' : ''} selected
                </p>
                <button
                  onClick={() => setShowSelectedCards(!showSelectedCards)}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium underline"
                >
                  {showSelectedCards ? 'Hide' : 'View'} Selected Cards
                </button>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleDeleteSelected}
                className="px-6 py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-colors"
              >
                Delete Selected ({selectedCards.size})
              </button>
              <button
                onClick={handleCreateFromSelection}
                disabled={isCreatingSet}
                className="px-6 py-3 bg-blue-500 text-white rounded-xl font-bold hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isCreatingSet ? 'Creating...' : 'Create Custom Set'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
