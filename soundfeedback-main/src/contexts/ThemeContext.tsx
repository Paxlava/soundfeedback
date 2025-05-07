import React, { createContext, useState, useContext, useEffect } from "react";

// Определяем типы тем
export type Theme = "light" | "dark" | "system";
export type FontSize = "small" | "medium" | "large" | "extra-large";

// Интерфейс для контекста темы
interface ThemeContextType {
  theme: Theme;
  fontSize: FontSize;
  setTheme: (theme: Theme) => void;
  setFontSize: (size: FontSize) => void;
}

// Создаем контекст
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Пользовательский хук для использования контекста темы
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme должен использоваться внутри ThemeProvider");
  }
  return context;
};

// Применение CSS классов для размера шрифта
const applyFontSize = (size: FontSize) => {
  document.documentElement.classList.remove("text-small", "text-medium", "text-large", "text-xl");
  document.documentElement.classList.add(`text-${size}`);
  localStorage.setItem("fontSize", size);
};

// Применение темы
const applyTheme = (theme: Theme) => {
  const root = document.documentElement;
  const isDark = 
    theme === "dark" || 
    (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  
  root.classList.remove("light", "dark");
  root.classList.add(isDark ? "dark" : "light");
  localStorage.setItem("theme", theme);
};

// Провайдер контекста
export const ThemeProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  // Получаем сохраненные настройки из localStorage или используем значения по умолчанию
  const [theme, setThemeState] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem("theme") as Theme;
    return savedTheme || "system";
  });
  
  const [fontSize, setFontSizeState] = useState<FontSize>(() => {
    const savedFontSize = localStorage.getItem("fontSize") as FontSize;
    return savedFontSize || "medium";
  });

  // Обработчик для изменения темы
  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    applyTheme(newTheme);
  };

  // Обработчик для изменения размера шрифта
  const setFontSize = (newSize: FontSize) => {
    setFontSizeState(newSize);
    applyFontSize(newSize);
  };

  // Инициализация темы при монтировании компонента
  useEffect(() => {
    // Применяем начальные настройки
    applyTheme(theme);
    applyFontSize(fontSize);

    // Слушаем изменения системной темы
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      if (theme === "system") {
        applyTheme("system");
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme, fontSize]);

  return (
    <ThemeContext.Provider value={{ theme, fontSize, setTheme, setFontSize }}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeProvider; 