import type { CSSProperties } from "react"
import { COLOR_RING, categoryColorCss, isStoredHex, readableForeground } from "./color"
import {
  Baby, Bed, Bike, BookOpen, Brain, Briefcase, Brush, Bus, Calendar, Camera, Car, Clock,
  Code, Coffee, Dog, Dumbbell, Film, Flame, Flag, Footprints, Gamepad2, Globe, GraduationCap,
  Hammer, Headphones, Heart, HeartPulse, House, Languages, Laptop, Leaf, Lightbulb, Mail,
  Mic, Moon, Mountain, Music, Palette, PawPrint, Pencil, Phone, PiggyBank, Pill, Plane,
  Rocket, ShoppingCart, Shirt, Smile, Sparkles, Star, Stethoscope, Sun, Tag, Target, Train,
  Trees, Tv, Users, Utensils, Wallet, Waves, Wrench, Zap,
  type LucideIcon,
} from "lucide-react"

export interface IconEntry {
  component: LucideIcon
  /** Extra search terms (pt-BR + en). The icon name itself is always searchable. */
  keywords: string
}

/** Curated icons a category can use. Key = the string stored in the DB `icon` column. */
export const CATEGORY_ICONS: Record<string, IconEntry> = {
  Briefcase: { component: Briefcase, keywords: "trabalho work emprego" },
  Laptop: { component: Laptop, keywords: "computador notebook trabalho" },
  Code: { component: Code, keywords: "programar código dev" },
  BookOpen: { component: BookOpen, keywords: "ler leitura livro estudo" },
  GraduationCap: { component: GraduationCap, keywords: "estudo faculdade escola aula" },
  Languages: { component: Languages, keywords: "idiomas língua inglês" },
  Brain: { component: Brain, keywords: "mente foco estudo meditar" },
  Dumbbell: { component: Dumbbell, keywords: "academia treino musculação" },
  Bike: { component: Bike, keywords: "bicicleta pedalar exercício" },
  Footprints: { component: Footprints, keywords: "caminhada corrida passos" },
  HeartPulse: { component: HeartPulse, keywords: "saúde cardio" },
  Heart: { component: Heart, keywords: "amor coração relacionamento" },
  Stethoscope: { component: Stethoscope, keywords: "médico consulta saúde" },
  Pill: { component: Pill, keywords: "remédio medicamento" },
  Utensils: { component: Utensils, keywords: "comida refeição almoço jantar" },
  Coffee: { component: Coffee, keywords: "café pausa" },
  Moon: { component: Moon, keywords: "noite dormir" },
  Bed: { component: Bed, keywords: "sono dormir descanso" },
  Sun: { component: Sun, keywords: "manhã dia" },
  House: { component: House, keywords: "casa lar home tarefas domésticas" },
  Shirt: { component: Shirt, keywords: "roupa lavar" },
  ShoppingCart: { component: ShoppingCart, keywords: "compras mercado" },
  Wallet: { component: Wallet, keywords: "finanças dinheiro contas" },
  PiggyBank: { component: PiggyBank, keywords: "economia poupança" },
  Car: { component: Car, keywords: "carro trânsito" },
  Bus: { component: Bus, keywords: "ônibus transporte" },
  Train: { component: Train, keywords: "trem metrô transporte" },
  Plane: { component: Plane, keywords: "viagem avião" },
  Music: { component: Music, keywords: "música" },
  Headphones: { component: Headphones, keywords: "podcast fone áudio" },
  Mic: { component: Mic, keywords: "voz gravar" },
  Gamepad2: { component: Gamepad2, keywords: "jogo game lazer" },
  Film: { component: Film, keywords: "filme cinema" },
  Tv: { component: Tv, keywords: "série televisão" },
  Camera: { component: Camera, keywords: "foto fotografia" },
  Palette: { component: Palette, keywords: "arte desenho pintura" },
  Brush: { component: Brush, keywords: "pincel arte" },
  Pencil: { component: Pencil, keywords: "escrever anotar" },
  Users: { component: Users, keywords: "amigos família reunião pessoas" },
  Baby: { component: Baby, keywords: "filho bebê criança" },
  Dog: { component: Dog, keywords: "cachorro pet" },
  PawPrint: { component: PawPrint, keywords: "animal pet" },
  Leaf: { component: Leaf, keywords: "natureza planta" },
  Trees: { component: Trees, keywords: "parque natureza ar livre" },
  Mountain: { component: Mountain, keywords: "trilha montanha" },
  Waves: { component: Waves, keywords: "praia natação água" },
  Wrench: { component: Wrench, keywords: "conserto manutenção" },
  Hammer: { component: Hammer, keywords: "obra reforma" },
  Lightbulb: { component: Lightbulb, keywords: "ideia projeto" },
  Rocket: { component: Rocket, keywords: "projeto meta lançamento" },
  Target: { component: Target, keywords: "meta objetivo foco" },
  Flag: { component: Flag, keywords: "marco meta" },
  Star: { component: Star, keywords: "favorito importante" },
  Sparkles: { component: Sparkles, keywords: "limpeza especial" },
  Flame: { component: Flame, keywords: "hábito sequência" },
  Zap: { component: Zap, keywords: "energia rápido" },
  Smile: { component: Smile, keywords: "bem-estar humor" },
  Calendar: { component: Calendar, keywords: "agenda compromisso data" },
  Clock: { component: Clock, keywords: "horário tempo" },
  Mail: { component: Mail, keywords: "email mensagens" },
  Phone: { component: Phone, keywords: "ligação telefone" },
  Globe: { component: Globe, keywords: "mundo internet" },
  Tag: { component: Tag, keywords: "outros etiqueta geral" },
}

export const DEFAULT_CATEGORY_ICON = "Tag"

/** Resolves a stored icon name to its component (falls back to a generic tag). */
export function getCategoryIcon(name: string | null | undefined): LucideIcon {
  return (name && CATEGORY_ICONS[name]?.component) || CATEGORY_ICONS[DEFAULT_CATEGORY_ICON].component
}

/** CSS color for a stored category color (preset -> var(--cat-*), "#rrggbb" as-is, null -> gray). */
export function categoryColorVar(color: string | null | undefined): string {
  return categoryColorCss(color)
}

/**
 * Inline style for a color tile (icon block / swatch / dot): background, readable icon color and,
 * for custom colors only, a subtle ring so #fff / #000 stay visible on both themes.
 * Presets keep the theme's text-cat-foreground.
 */
export function categoryTileStyle(color: string | null | undefined): CSSProperties {
  const style: CSSProperties = { backgroundColor: categoryColorCss(color) }
  if (isStoredHex(color)) {
    style.color = readableForeground(color)
    style.boxShadow = `inset 0 0 0 1px ${COLOR_RING}`
  }
  return style
}
