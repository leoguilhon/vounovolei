import { useEffect, useId, useMemo, useRef, useState } from "react";
import { BRAZILIAN_MUNICIPALITIES } from "../data/brazilianMunicipalities";
import {
  formatBrazilianCity,
  normalizeBrazilianCityText,
} from "../utils/brazilianCities";
import "../styles/city-field.css";

const MAX_RESULTS = 12;

export default function BrazilCityField({
  label = "Cidade",
  city,
  state,
  onChange,
  placeholder = "Busque por município ou UF",
  required = false,
  disabled = false,
  error = "",
}) {
  const rootRef = useRef(null);
  const inputId = useId();
  const listId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);

  const selectedLabel = useMemo(
    () => formatBrazilianCity(city, state),
    [city, state]
  );
  const inputValue = isOpen ? query : city ? selectedLabel : "";

  const municipalities = useMemo(
    () =>
      BRAZILIAN_MUNICIPALITIES.map((item) => ({
        ...item,
        searchText: normalizeBrazilianCityText(
          `${item.name} ${item.state} ${item.label}`
        ),
      })),
    []
  );

  const filteredOptions = useMemo(() => {
    const normalizedQuery = normalizeBrazilianCityText(query);
    if (!normalizedQuery) return municipalities.slice(0, MAX_RESULTS);

    return municipalities
      .filter((item) => item.searchText.includes(normalizedQuery))
      .slice(0, MAX_RESULTS);
  }, [municipalities, query]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (!rootRef.current?.contains(event.target)) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function selectOption(option) {
    onChange?.(option);
    setQuery(option.label);
    setIsOpen(false);
    setActiveIndex(-1);
  }

  function handleInputChange(event) {
    const nextQuery = event.target.value;
    setQuery(nextQuery);
    setIsOpen(true);
    setActiveIndex(-1);

    if (!nextQuery.trim()) {
      onChange?.(null);
      return;
    }

    if (nextQuery !== selectedLabel) {
      onChange?.(null);
    }
  }

  function handleInputFocus() {
    if (disabled) return;
    setQuery(city ? selectedLabel : "");
    setIsOpen(true);
  }

  function handleKeyDown(event) {
    if (!isOpen && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      setIsOpen(true);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) =>
        Math.min(current + 1, filteredOptions.length - 1)
      );
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => Math.max(current - 1, 0));
      return;
    }

    if (event.key === "Enter" && isOpen && filteredOptions.length > 0) {
      event.preventDefault();
      selectOption(filteredOptions[Math.max(activeIndex, 0)]);
      return;
    }

    if (event.key === "Escape") {
      setIsOpen(false);
      setActiveIndex(-1);
    }
  }

  return (
    <div className="form-field">
      <label htmlFor={inputId}>{label}</label>
      <div
        ref={rootRef}
        className={`city-field ${error ? "city-field--error" : ""}`}
      >
        <input
          id={inputId}
          className="input city-field-input"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          disabled={disabled}
          required={required}
          aria-autocomplete="list"
          aria-controls={listId}
          aria-expanded={isOpen}
        />

        {city && state && (
          <button
            type="button"
            className="city-field-clear"
            onClick={() => {
              onChange?.(null);
              setQuery("");
              setIsOpen(true);
            }}
            disabled={disabled}
            aria-label="Limpar cidade selecionada"
          >
            ✕
          </button>
        )}

        {isOpen && (
          <div className="city-field-dropdown" role="listbox" id={listId}>
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option, index) => (
                <button
                  key={option.code}
                  type="button"
                  className={`city-field-option ${
                    index === activeIndex ? "active" : ""
                  }`}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectOption(option)}
                >
                  <span>{option.name}</span>
                  <span className="city-field-option-state">{option.state}</span>
                </button>
              ))
            ) : (
              <div className="city-field-empty">
                Nenhum município encontrado. Selecione um item da lista.
              </div>
            )}
          </div>
        )}
      </div>

      {city && state && !error ? (
        <div className="city-field-help">Selecionado: {selectedLabel}</div>
      ) : null}

      {error ? <div className="city-field-error">{error}</div> : null}
    </div>
  );
}
