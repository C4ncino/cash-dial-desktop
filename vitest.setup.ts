import "@testing-library/jest-dom";
import { vi } from "vitest";
import React from "react";

vi.mock("zustand", () => ({
  useStore: vi.fn(),
}));

// Mock Zustand stores
vi.mock("@/stores/currencyStore", () => ({
  currencyStore: {
    getState: () => ({
      getById: (id: number) => ({
        id,
        code: "USD",
        name: "US Dollar",
        symbol: "$",
      }),
      currencies: [],
    }),
    subscribe: vi.fn(),
  },
}));

// Mock webcoreui
vi.mock("webcoreui", () => ({
  modal: vi.fn(() => ({
    open: vi.fn(),
    close: vi.fn(),
  })),
  closeModal: vi.fn(),
  toast: vi.fn(),
}));

vi.mock("webcoreui/react", () => ({
  Modal: ({ children, id, title }: any) =>
    React.createElement("div", {
      id,
      "data-testid": "modal",
      "data-title": title,
      children,
    }),
  Progress: ({ value }: any) =>
    React.createElement("div", {
      "data-testid": "progress",
      style: { width: `${value}%` },
    }),
  Input: ({ label, name, value, ...props }: any) =>
    React.createElement(
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
          defaultValue: value,
        }),
      ].filter(Boolean),
    ),
  Radio: ({ items, name, onChange }: any) =>
    React.createElement(
      "div",
      {},
      items.map((item: any) =>
        React.createElement("div", { key: item.value }, [
          React.createElement(
            "label",
            {
              key: "label",
              htmlFor: `${name}-${item.value}`,
            },
            item.label,
          ),
          React.createElement("input", {
            key: "input",
            id: `${name}-${item.value}`,
            type: "radio",
            name,
            value: item.value,
            onChange,
          }),
        ]),
      ),
    ),
  Accordion: ({ items }: any) =>
    React.createElement(
      "div",
      {},
      items.map((item: any) =>
        React.createElement("div", { key: item.title }, [
          React.createElement("h3", { key: "title" }, item.title),
          React.createElement("p", { key: "content" }, item.content),
        ]),
      ),
    ),
}));

// Mock the SquareIcon component
vi.mock("@/components/General/SquareIcon", () => ({
  default: ({ icon, backgroundColor }: any) =>
    React.createElement("div", {
      "data-testid": "square-icon",
      "data-icon": icon,
      "data-bg": backgroundColor,
    }),
}));

vi.mock("@tauri-apps/plugin-locale", () => ({
  locale: vi.fn().mockResolvedValue("en-US"),
}));
