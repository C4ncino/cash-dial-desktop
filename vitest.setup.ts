import '@testing-library/jest-dom';
import { vi } from "vitest";
import React from 'react';

vi.mock("zustand", () => ({
  useStore: vi.fn(),
}));

// Mock Zustand stores
vi.mock('@/stores/currencyStore', () => ({
  currencyStore: {
    getState: () => ({
      getById: (id: number) => ({
        id,
        code: 'USD',
        name: 'US Dollar',
        symbol: '$',
      }),
      currencies: [],
    }),
    subscribe: vi.fn(),
  },
}));

// Mock webcoreui
vi.mock('webcoreui', () => ({
  modal: vi.fn(() => ({
    open: vi.fn(),
    close: vi.fn(),
  })),
  closeModal: vi.fn(),
  toast: vi.fn(),
}));

vi.mock('webcoreui/react', () => ({
  Modal: ({ children, id, title }: any) =>
    React.createElement('div', {
      id,
      'data-testid': 'modal',
      'data-title': title,
      children,
    }),
  Progress: ({ value }: any) =>
    React.createElement('div', {
      'data-testid': 'progress',
      style: { width: `${value}%` },
    }),
  Input: ({ label, name, ...props }: any) => React.createElement(
      "div",
      {},
      [
        label &&
          React.createElement(
            "label",
            {
              key: "label",
              htmlFor: name,
            },
            label,
          ),
        React.createElement("input", {
          key: "input",
          id: name,
          name,
          ...props,
        }),
      ].filter(Boolean),
    ),
}));

// Mock the SquareIcon component
vi.mock('@/components/General/SquareIcon', () => ({
  default: ({ icon, backgroundColor }: any) =>
    React.createElement('div', {
      'data-testid': 'square-icon',
      'data-icon': icon,
      'data-bg': backgroundColor,
    }),
}));

// Mock the MoneyText component
vi.mock('@/components/General/MoneyText', () => ({
  default: ({ amount, currency }: any) =>
    React.createElement(
      'span',
      { 'data-testid': 'money-text' },
      `${currency?.symbol}${amount}`
    ),
}));


vi.mock("@tauri-apps/plugin-locale", () => ({
  locale: vi.fn().mockResolvedValue("en-US"),
}));