import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useTheme, Theme, FontSize } from "@/contexts/ThemeContext";
import { Moon, Sun, Monitor, Type } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

const AppearanceSettings: React.FC = () => {
  const { theme, fontSize, setTheme, setFontSize } = useTheme();
  const isMobile = useIsMobile();

  const handleThemeChange = (value: string) => {
    setTheme(value as Theme);
  };

  const handleFontSizeChange = (value: string) => {
    setFontSize(value as FontSize);
  };

  return (
    <Card>
      <CardHeader className={isMobile ? "p-4" : ""}>
        <CardTitle className={`${isMobile ? "text-lg" : "text-xl"} flex items-center gap-2`}>
          <Moon className="h-5 w-5" />
          Внешний вид
        </CardTitle>
      </CardHeader>
      <CardContent className={`space-y-6 ${isMobile ? "p-4 pt-0" : ""}`}>
        {/* Настройка темы */}
        <div className="space-y-2">
          <Label className="text-base font-medium">Тема оформления</Label>
          <RadioGroup
            value={theme}
            onValueChange={handleThemeChange}
            className="grid grid-cols-3 gap-2"
          >
            <Label
              htmlFor="light"
              className={`flex flex-col items-center justify-center rounded-md border-2 p-4 ${
                theme === "light" ? "border-primary" : "border-muted"
              } hover:bg-accent cursor-pointer`}
            >
              <RadioGroupItem value="light" id="light" className="sr-only" />
              <Sun className="h-5 w-5 mb-2" />
              <span>Светлая</span>
            </Label>
            <Label
              htmlFor="dark"
              className={`flex flex-col items-center justify-center rounded-md border-2 p-4 ${
                theme === "dark" ? "border-primary" : "border-muted"
              } hover:bg-accent cursor-pointer`}
            >
              <RadioGroupItem value="dark" id="dark" className="sr-only" />
              <Moon className="h-5 w-5 mb-2" />
              <span>Тёмная</span>
            </Label>
            <Label
              htmlFor="system"
              className={`flex flex-col items-center justify-center rounded-md border-2 p-4 ${
                theme === "system" ? "border-primary" : "border-muted"
              } hover:bg-accent cursor-pointer`}
            >
              <RadioGroupItem value="system" id="system" className="sr-only" />
              <Monitor className="h-5 w-5 mb-2" />
              <span>Системная</span>
            </Label>
          </RadioGroup>
        </div>

        {/* Настройка размера шрифта */}
        <div className="space-y-2">
          <Label className="text-base font-medium flex items-center gap-2">
            <Type className="h-4 w-4" />
            Размер шрифта
          </Label>
          <RadioGroup
            value={fontSize}
            onValueChange={handleFontSizeChange}
            className="grid grid-cols-4 gap-2"
          >
            <Label
              htmlFor="small"
              className={`flex flex-col items-center justify-center rounded-md border-2 p-3 ${
                fontSize === "small" ? "border-primary" : "border-muted"
              } hover:bg-accent cursor-pointer`}
            >
              <RadioGroupItem value="small" id="small" className="sr-only" />
              <span className="text-sm">Малый</span>
            </Label>
            <Label
              htmlFor="medium"
              className={`flex flex-col items-center justify-center rounded-md border-2 p-3 ${
                fontSize === "medium" ? "border-primary" : "border-muted"
              } hover:bg-accent cursor-pointer`}
            >
              <RadioGroupItem value="medium" id="medium" className="sr-only" />
              <span className="text-base">Средний</span>
            </Label>
            <Label
              htmlFor="large"
              className={`flex flex-col items-center justify-center rounded-md border-2 p-3 ${
                fontSize === "large" ? "border-primary" : "border-muted"
              } hover:bg-accent cursor-pointer`}
            >
              <RadioGroupItem value="large" id="large" className="sr-only" />
              <span className="text-lg">Большой</span>
            </Label>
            <Label
              htmlFor="extra-large"
              className={`flex flex-col items-center justify-center rounded-md border-2 p-3 ${
                fontSize === "extra-large" ? "border-primary" : "border-muted"
              } hover:bg-accent cursor-pointer`}
            >
              <RadioGroupItem value="extra-large" id="extra-large" className="sr-only" />
              <span className="text-xl">Огромный</span>
            </Label>
          </RadioGroup>
        </div>

        {/* Демонстрация текущих настроек */}
        <div className="p-4 border rounded-md mt-4">
          <h3 className="text-base font-medium mb-2">Пример текста</h3>
          <p className="text-muted-foreground">
            Так будет выглядеть текст с текущими настройками.
            Выберите размер шрифта и тему, которые наиболее комфортны для чтения.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default AppearanceSettings; 