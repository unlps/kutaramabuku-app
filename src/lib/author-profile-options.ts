export const LANGUAGE_OPTIONS = ["Portugues", "Ingles", "Frances", "Espanhol", "Suaile", "Xitsonga"];

export const GENRE_OPTIONS = [
  "Romance",
  "Poesia",
  "Fantasia",
  "Misterio",
  "Thriller",
  "Biografia",
  "Autoajuda",
  "Infantil",
  "Educativo",
];

export const CONTENT_TYPE_OPTIONS = ["Livros", "Poesia", "Contos", "Ensaios", "Guias", "Cronicas"];

export const AUTHOR_STATUS_OPTIONS = ["Independente", "Publicado", "Iniciante"];

export const MOZAMBICAN_PUBLISHER_OPTIONS = [
  "Sociedade Editorial Ndjira",
  "Plural Editores Mocambique",
  "Texto Editores Mocambique",
  "Escolar Editora",
  "Alcance Editores",
  "Ethale Publishing",
  "Kulera",
  "Trinta Zero Nove",
  "Indico Editores",
  "Cavalo do Mar",
  "Kuphaya",
  "Oleba Editores",
  "Fundza",
  "TPC",
  "Selo Jovem",
];

export const WRITING_STYLE_OPTIONS = [
  "Narrativo",
  "Descritivo",
  "Dramatico",
  "Contemporaneo",
  "Classico",
  "Emocional",
  "Introspectivo",
  "Poetico",
  "Melancolico",
  "Sensivel",
  "Tecnico",
  "Academico",
  "Informativo",
  "Didatico",
  "Analitico",
  "Experimental",
  "Metaforico",
  "Simbolico",
  "Surrealista",
  "Abstrato",
  "Simples",
  "Direto",
  "Fluido",
  "Detalhado",
  "Minimalista",
  "Persuasivo",
  "Reflexivo",
  "Critico",
  "Inspirador",
  "Motivacional",
];

export const toggleArrayValue = (values: string[], value: string) => {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
};

export const toggleArrayValueWithLimit = (values: string[], value: string, limit: number) => {
  if (values.includes(value)) {
    return values.filter((item) => item !== value);
  }

  if (values.length >= limit) {
    return values;
  }

  return [...values, value];
};

export const parseDelimitedList = (value?: string | null) => {
  return (value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

export const serializeDelimitedList = (values: string[]) => values.join(", ");
