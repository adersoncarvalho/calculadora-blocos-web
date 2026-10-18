export interface PresetField {
  id: string;
  label: string;
  default: string;
  helpText: string;
  type?: "text" | "select";
  options?: string[];
}

export interface PresetDef {
  key: string;
  title: string;
  desc: string;
  category: "canonical" | "examples" | "exercises";
  fields: PresetField[];
  defaultValues: Record<string, string>;
  categoryTitle: string;
  badge: string;
}

export const PRESETS_DATA: Record<string, PresetDef> = {
  mf_padrao: {
    key: "mf_padrao",
    title: "Malha Fechada Clássica [G(s) e H(s)]",
    desc: "Sistema canônico com caminho direto G(s) e ramo de retorno H(s).",
    category: "canonical",
    categoryTitle: "Topologias Canônicas Fundamentais",
    badge: "Canônica G/(1±GH)",
    fields: [
      { id: "G", label: "Caminho Direto G(s)", default: "10/(s+2)", helpText: "Função de transferência direta G(s). Ex: 10/(s+2) ou literal G." },
      { id: "H", label: "Caminho de Retorno H(s)", default: "1", helpText: "Função de realimentação H(s). Mantenha '1' para malha unitária ou insira dinâmicas como 2/(s+1)." },
      { id: "sinal", label: "Tipo de Realimentação", type: "select", options: ["Negativa (-)", "Positiva (+)"], default: "Negativa (-)", helpText: "Realimentação Negativa gera sinal de erro E(s) = R(s) - C(s)H(s) e denominador 1 + G(s)H(s)." }
    ],
    defaultValues: { G: "10/(s+2)", H: "1", sinal: "Negativa (-)" }
  },
  cascata_dupla: {
    key: "cascata_dupla",
    title: "Associação em Cascata / Série [G1(s) e G2(s)]",
    desc: "Dois blocos em série direta com produto polinomial G_eq(s) = G1(s) · G2(s).",
    category: "canonical",
    categoryTitle: "Topologias Canônicas Fundamentais",
    badge: "Série G1 · G2",
    fields: [
      { id: "G1", label: "Primeiro Estágio G1(s)", default: "4/(s+1)", helpText: "Função de transferência do primeiro bloco." },
      { id: "G2", label: "Segundo Estágio G2(s)", default: "5/(s+2)", helpText: "Função de transferência do segundo bloco." }
    ],
    defaultValues: { G1: "4/(s+1)", G2: "5/(s+2)" }
  },
  paralelo: {
    key: "paralelo",
    title: "Associação em Paralelo / Soma [G1(s) ± G2(s)]",
    desc: "Dois blocos em canais paralelos somados algebricamente via MMC.",
    category: "canonical",
    categoryTitle: "Topologias Canônicas Fundamentais",
    badge: "Paralelo G1 ± G2",
    fields: [
      { id: "G1", label: "Ramo Superior G1(s)", default: "6/(s+2)", helpText: "Função de transferência do primeiro canal." },
      { id: "G2", label: "Ramo Inferior G2(s)", default: "3/(s+4)", helpText: "Função de transferência do segundo canal." },
      { id: "op", label: "Operação do Ponto de Soma", type: "select", options: ["Adição (+)", "Subtração (-)"], default: "Adição (+)", helpText: "Soma aditiva ou canal subtrativo de perturbação." }
    ],
    defaultValues: { G1: "6/(s+2)", G2: "3/(s+4)", op: "Adição (+)" }
  },
  exemplo1: {
    key: "exemplo1",
    title: "Exemplo de Aula 1: Três Blocos em Cascata",
    desc: "Linha contendo ganho estático K=10, integrador 1/s e polo real 2/(s+5).",
    category: "examples",
    categoryTitle: "Exemplos Didáticos das Aulas de Controle",
    badge: "Aula 05 • Ex 1",
    fields: [
      { id: "G1", label: "Ganho Estático K", default: "10", helpText: "Ganho proporcional puro." },
      { id: "G2", label: "Ação Integral G2(s)", default: "1/s", helpText: "Integrador puro." },
      { id: "G3", label: "Filtro de 1ª Ordem G3(s)", default: "2/(s+5)", helpText: "Planta de primeira ordem." }
    ],
    defaultValues: { G1: "10", G2: "1/s", G3: "2/(s+5)" }
  },
  exemplo2: {
    key: "exemplo2",
    title: "Exemplo de Aula 2: Compensador Lead e Planta",
    desc: "Compensador por avanço de fase (s+3)/(s+1) em cascata com planta 2/(s+4).",
    category: "examples",
    categoryTitle: "Exemplos Didáticos das Aulas de Controle",
    badge: "Aula 05 • Ex 2",
    fields: [
      { id: "G1", label: "Compensador Lead G1(s)", default: "(s+3)/(s+1)", helpText: "Compensador com zero e polo." },
      { id: "G2", label: "Planta Dinâmica G2(s)", default: "2/(s+4)", helpText: "Planta estável." }
    ],
    defaultValues: { G1: "(s+3)/(s+1)", G2: "2/(s+4)" }
  },
  proposto1: {
    key: "proposto1",
    title: "Exercício Proposto 1: Malhas Sobrepostas e Nós de Soma",
    desc: "Sistema com duas malhas de realimentação negativas interligadas.",
    category: "exercises",
    categoryTitle: "Exercícios Propostos & Desafios",
    badge: "Desafio • Malhas Duplas",
    fields: [
      { id: "G1", label: "Bloco Direto 1 G1(s)", default: "2/(s+1)", helpText: "Primeiro bloco no caminho direto." },
      { id: "G2", label: "Bloco Direto 2 G2(s)", default: "3/(s+2)", helpText: "Segundo bloco no caminho direto." },
      { id: "H1", label: "Realimentação Interna H1(s)", default: "1", helpText: "Sensor unitário da malha interna." },
      { id: "H2", label: "Realimentação Externa H2(s)", default: "2", helpText: "Sensor da malha global externa." }
    ],
    defaultValues: { G1: "2/(s+1)", G2: "3/(s+2)", H1: "1", H2: "2" }
  }
};
