export { ClassicCover } from './ClassicCover';
export { ModernCover } from './ModernCover';
export { MinimalCover } from './MinimalCover';
export { BoldCover } from './BoldCover';
export { EducativoCover } from './EducativoCover';
export { CorporateCover } from './CorporateCover';
export { RomanceCover } from './RomanceCover';

export type CoverTemplate = 'classic' | 'modern' | 'minimal' | 'bold' | 'educativo' | 'corporate' | 'romance';

export const coverTemplates: { id: CoverTemplate; name: string; description: string }[] = [
  { id: 'classic', name: 'Clássico', description: 'Design elegante e tradicional' },
  { id: 'modern', name: 'Moderno', description: 'Visual contemporâneo com gradientes' },
  { id: 'minimal', name: 'Minimalista', description: 'Limpo e sofisticado' },
  { id: 'bold', name: 'Impactante', description: 'Cores vibrantes e tipografia forte' },
  { id: 'educativo', name: 'Educativo', description: 'Ideal para material didático e cursos' },
  { id: 'corporate', name: 'Corporativo', description: 'Profissional para negócios e empresas' },
  { id: 'romance', name: 'Romance', description: 'Delicado para ficção e romance' }
];
