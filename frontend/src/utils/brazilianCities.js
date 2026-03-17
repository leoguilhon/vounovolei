export function normalizeBrazilianCityText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function formatBrazilianCity(city, state) {
  const cityValue = String(city ?? "").trim();
  const stateValue = String(state ?? "").trim().toUpperCase();

  if (cityValue && stateValue) return `${cityValue} - ${stateValue}`;
  if (cityValue) return cityValue;
  return "Cidade não informada";
}
