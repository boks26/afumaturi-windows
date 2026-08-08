import { useEffect } from "react";
import translations from "./translations.ru.json";
export type Language = "ro" | "ru";
export const LANGUAGE_STORAGE_KEY = "afumaturi-language";
export function getStoredLanguage(): Language { return localStorage.getItem(LANGUAGE_STORAGE_KEY) === "ru" ? "ru" : "ro"; }
const textOriginals = new WeakMap<Text, string>();
const attributeOriginals = new WeakMap<Element, Map<string, string>>();
const translated = translations as Record<string, string>;
const attributes = ["placeholder", "title", "aria-label"];
function translatedText(value: string) { const trimmed = value.trim(); const result = translated[trimmed] || translated[trimmed.replaceAll("&", "&amp;")]; return result ? value.replace(trimmed, result) : value; }
function localize(root: ParentNode, language: Language) {
 const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let current: Node | null;
 while ((current = walker.nextNode())) { const node = current as Text; const parent = node.parentElement; if (!parent || parent.closest("script, style, [contenteditable='true']")) continue; if (!textOriginals.has(node)) textOriginals.set(node, node.data); const original = textOriginals.get(node)!; node.data = language === "ru" ? translatedText(original) : original; }
 const elements = root instanceof Element ? [root, ...root.querySelectorAll("*")] : [...root.querySelectorAll("*")];
 for (const element of elements) { let originals = attributeOriginals.get(element); if (!originals) { originals = new Map(); attributeOriginals.set(element, originals); } for (const attribute of attributes) { const value = element.getAttribute(attribute); if (value !== null && !originals.has(attribute)) originals.set(attribute, value); const original = originals.get(attribute); if (original !== undefined) element.setAttribute(attribute, language === "ru" ? translatedText(original) : original); } }
}
export function useDocumentLanguage(language: Language) {
 useEffect(() => { localStorage.setItem(LANGUAGE_STORAGE_KEY, language); localStorage.setItem("afumaturi-help-language", language); document.documentElement.lang = language; localize(document.body, language);
 const observer = new MutationObserver((mutations) => { observer.disconnect(); for (const mutation of mutations) { if (mutation.type === "characterData" && mutation.target.parentNode) localize(mutation.target.parentNode, language); mutation.addedNodes.forEach((node) => { if (node instanceof Text && node.parentNode) localize(node.parentNode, language); else if (node instanceof Element) localize(node, language); }); } observer.observe(document.body, { childList: true, subtree: true, characterData: true }); });
 observer.observe(document.body, { childList: true, subtree: true, characterData: true }); return () => observer.disconnect(); }, [language]);
}
