/**
 * apps/mobile/src/features/search/components/search-filters-modal.test.tsx
 *
 * Unit tests for SearchFiltersModal.
 * Verifies: render, zone add/remove, pill selection, save, cancel.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// Mock GlassPanel to avoid blur dependency
jest.mock('../../../components/ui/glass-panel', () => {
  const { View } = require('react-native');
  return {
    GlassPanel: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => (
      <View {...props}>{children}</View>
    ),
  };
});

// Mock reanimated
jest.mock('react-native-reanimated', () =>
  require('../../../../../../apps/mobile/__mocks__/react-native-reanimated'),
);

import { SearchFiltersModal } from './search-filters-modal';

describe('SearchFiltersModal', () => {
  const defaultProps = {
    visible: true,
    currentPreferences: null,
    onSave: jest.fn(),
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the modal title', () => {
    const { getByText } = render(<SearchFiltersModal {...defaultProps} />);
    expect(getByText('Editar búsqueda')).toBeTruthy();
  });

  it('renders zone input and add button', () => {
    const { getByTestId } = render(<SearchFiltersModal {...defaultProps} />);
    expect(getByTestId('zone-input-filter')).toBeTruthy();
    expect(getByTestId('add-zone-filter-btn')).toBeTruthy();
  });

  it('renders room option pills', () => {
    const { getByTestId } = render(<SearchFiltersModal {...defaultProps} />);
    expect(getByTestId('filter-rooms-1')).toBeTruthy();
    expect(getByTestId('filter-rooms-2')).toBeTruthy();
    expect(getByTestId('filter-rooms-3')).toBeTruthy();
    expect(getByTestId('filter-rooms-4')).toBeTruthy();
  });

  it('renders sqm option pills', () => {
    const { getByTestId } = render(<SearchFiltersModal {...defaultProps} />);
    expect(getByTestId('filter-sqm-40')).toBeTruthy();
    expect(getByTestId('filter-sqm-60')).toBeTruthy();
    expect(getByTestId('filter-sqm-80')).toBeTruthy();
    expect(getByTestId('filter-sqm-100')).toBeTruthy();
  });

  it('adds a zone when typing and pressing add', () => {
    const { getByTestId, getByText } = render(<SearchFiltersModal {...defaultProps} />);

    fireEvent.changeText(getByTestId('zone-input-filter'), 'Malasaña');
    fireEvent.press(getByTestId('add-zone-filter-btn'));

    expect(getByText('Malasaña ×')).toBeTruthy();
  });

  it('removes a zone chip when pressed', () => {
    const propsWithZones = {
      ...defaultProps,
      currentPreferences: { zones: ['Madrid', 'Barcelona'] },
    };
    const { getByTestId, queryByTestId } = render(<SearchFiltersModal {...propsWithZones} />);

    // Remove Madrid
    fireEvent.press(getByTestId('filter-zone-chip-Madrid'));

    // Madrid chip should be gone
    expect(queryByTestId('filter-zone-chip-Madrid')).toBeNull();
    // Barcelona should remain
    expect(getByTestId('filter-zone-chip-Barcelona')).toBeTruthy();
  });

  it('calls onSave with correct preferences', () => {
    const onSave = jest.fn();
    const { getByTestId } = render(
      <SearchFiltersModal {...defaultProps} onSave={onSave} />,
    );

    // Add a zone
    fireEvent.changeText(getByTestId('zone-input-filter'), 'Valencia');
    fireEvent.press(getByTestId('add-zone-filter-btn'));

    // Select 2+ rooms
    fireEvent.press(getByTestId('filter-rooms-2'));

    // Select 60+ sqm
    fireEvent.press(getByTestId('filter-sqm-60'));

    // Save
    fireEvent.press(getByTestId('filter-save-btn'));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        zones: ['Valencia'],
        minRooms: 2,
        minSqm: 60,
      }),
    );
  });

  it('calls onClose when cancel is pressed', () => {
    const onClose = jest.fn();
    const { getByTestId } = render(
      <SearchFiltersModal {...defaultProps} onClose={onClose} />,
    );

    fireEvent.press(getByTestId('filter-cancel-btn'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when overlay is pressed', () => {
    const onClose = jest.fn();
    const { getByTestId } = render(
      <SearchFiltersModal {...defaultProps} onClose={onClose} />,
    );

    fireEvent.press(getByTestId('overlay'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('pre-fills with current preferences', () => {
    const prefs = {
      zones: ['Madrid'],
      maxPrice: 500000,
      minRooms: 3,
      minSqm: 80,
    };
    const { getByTestId } = render(
      <SearchFiltersModal {...defaultProps} currentPreferences={prefs} />,
    );

    // Zone chip should be present
    expect(getByTestId('filter-zone-chip-Madrid')).toBeTruthy();
  });

  it('deselects a room pill when pressed again', () => {
    const onSave = jest.fn();
    const { getByTestId } = render(
      <SearchFiltersModal {...defaultProps} onSave={onSave} />,
    );

    // Select then deselect rooms 3
    fireEvent.press(getByTestId('filter-rooms-3'));
    fireEvent.press(getByTestId('filter-rooms-3'));

    // Save and check that minRooms is not included
    fireEvent.press(getByTestId('filter-save-btn'));

    const savedPrefs = onSave.mock.calls[0]![0];
    expect(savedPrefs.minRooms).toBeUndefined();
  });

  it('limits zones to maximum of 5', () => {
    const { getByTestId, queryAllByText } = render(<SearchFiltersModal {...defaultProps} />);

    // Add 6 zones — only 5 should be accepted
    for (let i = 1; i <= 6; i++) {
      fireEvent.changeText(getByTestId('zone-input-filter'), `Zone${i}`);
      fireEvent.press(getByTestId('add-zone-filter-btn'));
    }

    // Count zone chips (they end with " ×")
    const chips = queryAllByText(/×/);
    expect(chips).toHaveLength(5);
  });
});
