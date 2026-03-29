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

export const toggleArrayValue = (values: string[], value: string) => {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
};
