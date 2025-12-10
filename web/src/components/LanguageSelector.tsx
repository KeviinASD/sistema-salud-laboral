import React from "react";
import { useTranslation } from "react-i18next";

export default function LanguageSelector() {
  const { i18n, t } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div className="relative">
      <select
        value={i18n.language}
        onChange={(e) => changeLanguage(e.target.value)}
        className="appearance-none bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 px-3 py-1.5 pr-8 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        aria-label={t("language.select")}
      >
        <option value="es">{t("language.spanish")}</option>
        <option value="en">{t("language.english")}</option>
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-gray-300">
        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
          <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
        </svg>
      </div>
    </div>
  );
}

