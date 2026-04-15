'use client';

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Card } from './CardList';

interface CardEditorProps {
  card?: Card | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (card: Partial<Card>) => Promise<void>;
  mode: 'add' | 'edit';
}

export const CardEditor: React.FC<CardEditorProps> = ({ card, isOpen, onClose, onSave, mode }) => {
  const [formData, setFormData] = useState<Partial<Card>>({
    word: '',
    meaning: '',
    reading: '',
    exampleSentence: '',
    enExample: '',
    exampleReading: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (card && mode === 'edit') {
      setFormData({
        word: card.word,
        meaning: card.meaning,
        reading: card.reading || '',
        exampleSentence: card.exampleSentence || '',
        enExample: card.enExample || '',
        exampleReading: card.exampleReading || ''
      });
    } else {
      setFormData({
        word: '',
        meaning: '',
        reading: '',
        exampleSentence: '',
        enExample: '',
        exampleReading: ''
      });
    }
    setError('');
  }, [card, mode, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.word?.trim() || !formData.meaning?.trim()) {
      setError('Word and meaning are required');
      return;
    }

    setIsSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save card');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--background-color)] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-[var(--border-color)]">
          <h2 className="text-2xl font-bold text-[var(--main-color)]">
            {mode === 'add' ? 'Add New Card' : 'Edit Card'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[var(--border-color)]/20 rounded-lg transition"
          >
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-bold text-[var(--main-color)] mb-2">
              Word * <span className="text-[var(--secondary-color)] font-normal">(Japanese)</span>
            </label>
            <input
              type="text"
              value={formData.word}
              onChange={(e) => setFormData({ ...formData, word: e.target.value })}
              className="w-full px-4 py-2 border border-[var(--border-color)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--main-color)]"
              placeholder="こんにちは"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-[var(--main-color)] mb-2">
              Meaning * <span className="text-[var(--secondary-color)] font-normal">(English)</span>
            </label>
            <input
              type="text"
              value={formData.meaning}
              onChange={(e) => setFormData({ ...formData, meaning: e.target.value })}
              className="w-full px-4 py-2 border border-[var(--border-color)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--main-color)]"
              placeholder="Hello"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-[var(--main-color)] mb-2">
              Reading <span className="text-[var(--secondary-color)] font-normal">(Hiragana)</span>
            </label>
            <input
              type="text"
              value={formData.reading}
              onChange={(e) => setFormData({ ...formData, reading: e.target.value })}
              className="w-full px-4 py-2 border border-[var(--border-color)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--main-color)]"
              placeholder="こんにちは"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-[var(--main-color)] mb-2">
              Example Sentence <span className="text-[var(--secondary-color)] font-normal">(Japanese)</span>
            </label>
            <textarea
              value={formData.exampleSentence}
              onChange={(e) => setFormData({ ...formData, exampleSentence: e.target.value })}
              className="w-full px-4 py-2 border border-[var(--border-color)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--main-color)] min-h-[100px]"
              placeholder="こんにちは、元気ですか？"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-[var(--main-color)] mb-2">
              Example Reading <span className="text-[var(--secondary-color)] font-normal">(Hiragana - for TTS)</span>
            </label>
            <textarea
              value={formData.exampleReading}
              onChange={(e) => setFormData({ ...formData, exampleReading: e.target.value })}
              className="w-full px-4 py-2 border border-[var(--border-color)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--main-color)] min-h-[80px]"
              placeholder="こんにちは、げんきですか？"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-[var(--main-color)] mb-2">
              English Example <span className="text-[var(--secondary-color)] font-normal">(Translation)</span>
            </label>
            <textarea
              value={formData.enExample}
              onChange={(e) => setFormData({ ...formData, enExample: e.target.value })}
              className="w-full px-4 py-2 border border-[var(--border-color)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--main-color)] min-h-[80px]"
              placeholder="Hello, how are you?"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-[var(--border-color)] rounded-lg hover:bg-[var(--border-color)]/20 transition font-bold"
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-[var(--main-color)] text-white rounded-lg hover:opacity-90 transition font-bold disabled:opacity-50"
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : mode === 'add' ? 'Add Card' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
