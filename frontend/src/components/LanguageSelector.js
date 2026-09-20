import React from 'react';
import { useTranslation } from 'react-i18next';

const LanguageSelector = () => {
  const { i18n } = useTranslation();

  const changeLanguage = (event) => {
    i18n.changeLanguage(event.target.value);
  };

  return (
    <div className="language-selector">
      <select onChange={changeLanguage} value={i18n.language}>
        <option value="fr">🇫🇷 Français</option>
        <option value="en">🇬🇧 English</option>
        <option value="nl">🇳🇱 Nederlands</option>
        <option value="ko">🇰🇷 한국어</option>
        <option value="zh">🇨🇳 中文</option>
      </select>
    </div>
  );
};

export default LanguageSelector;