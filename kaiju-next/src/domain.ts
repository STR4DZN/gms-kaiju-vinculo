/** Original ranges preserved; visual titles/icons revised. No derived gameplay effects. */
export const MODULE_ID = "kaiju-vinculo";
export const AXIS_KEYS = ["vontade", "comunhao", "humanidade"] as const;
export type AxisKey = typeof AXIS_KEYS[number];
export type Values = Record<AxisKey, number>;
export interface Stage { label: string; icon: string }
export interface Axis { title: string; short: string; color: string; description: string; stages: readonly Stage[] }
export const ROMAN = ["I", "II", "III", "IV", "V", "VI"] as const;
export const THRESHOLDS = [0, 20, 40, 60, 80, 100] as const;
export const AXES: Record<AxisKey, Axis> = {
  vontade: {title:"Influência Kaiju",short:"Influência",color:"#e85d48",description:"A influência e a dominância do Kaiju.",stages:[
    {label:"Latente",icon:"seedling"},{label:"Despertar Instintivo",icon:"eye"},
    {label:"Influência Crescente",icon:"virus"},{label:"Predomínio Kaiju",icon:"paw"},
    {label:"Domínio Kaiju",icon:"dragon"},{label:"Domínio Absoluto da Fera",icon:"biohazard"}]},
  comunhao: {title:"Sincronia",short:"Sincronia",color:"#4ac8b7",description:"A aceitação e a conexão com a fera interior.",stages:[
    {label:"Vínculo Rompido",icon:"link-slash"},{label:"Contato Instável",icon:"wave-square"},
    {label:"Ressonância",icon:"tower-broadcast"},{label:"Sintonia",icon:"arrows-rotate"},
    {label:"União Profunda",icon:"link"},{label:"Equilíbrio Perfeito",icon:"scale-balanced"}]},
  humanidade: {title:"Identidade Humana",short:"Identidade",color:"#78abe1",description:"A resistência e a identidade humana.",stages:[
    {label:"Identidade Dissolvida",icon:"ghost"},{label:"Vestígios Humanos",icon:"person-circle-question"},
    {label:"Identidade Resistente",icon:"fingerprint"},{label:"Vontade Humana",icon:"user"},
    {label:"Resistência Profunda",icon:"user-shield"},{label:"Rejeição Absoluta",icon:"shield-halved"}]}
};
export interface Carrier {
  schemaVersion: 1;
  id: string; name: string; designation: string; values: Values; seed: number;
  notes: string; shared: boolean; updatedAt: string; portrait: string;
}
export interface CarrierPatch { name?: string; designation?: string; notes?: string; portrait?: string; shared?: boolean; values?: Partial<Values> }
export interface Repository {
  readonly isGM: boolean;
  list(): Carrier[];
  create(name: string): Promise<Carrier>;
  save(id: string, patch: CarrierPatch, baseline: Carrier): Promise<Carrier>;
  subscribe(listener: () => void): () => void;
}
export function stageIndex(value: number): number {
  percent(value);
  return value === 100 ? 5 : Math.floor(value / 20);
}
export function stageAt(key: AxisKey, value: number) {
  const index = stageIndex(value);
  return {...AXES[key].stages[index]!, index, roman: ROMAN[index]!, threshold: THRESHOLDS[index]!};
}
export function axisKey(value: string | undefined): value is AxisKey {
  return AXIS_KEYS.some(key => key === value);
}
export function percent(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value) || !Number.isInteger(value) || value < 0 || value > 100) {
    throw new Error("Os valores dos eixos devem ser inteiros entre 0 e 100.");
  }
  return value;
}
function text(value: unknown, field: string, max: number): string {
  if (typeof value !== "string" || value.length > max) throw new Error(`${field}: texto inválido ou muito longo.`);
  return value;
}
export function portraitPath(input:unknown):string {
  const value=text(input??"","Retrato",3000000).trim();
  if(!value)return "";
  if(/^data:image\/(png|jpeg|webp|gif);base64,[a-z0-9+/=]+$/i.test(value))return value;
  if(/[\u0000-\u001f<>"']/.test(value) || value.startsWith("//") || value.includes("\\") || (/^[a-z][a-z0-9+.-]*:/i.test(value) && !/^https?:\/\//i.test(value)))throw new Error("Informe um caminho de imagem ou um endereço HTTP(S).");
  return value;
}
export function validateCarrier(input: unknown): Carrier {
  if (!input || typeof input !== "object") throw new Error("Registro inválido.");
  const raw = input as Record<string, unknown>;
  if (raw.schemaVersion !== 1) throw new Error("Versão do registro não suportada.");
  if (!raw.values || typeof raw.values !== "object") throw new Error("Eixos ausentes.");
  const v = raw.values as Record<string, unknown>;
  const id = text(raw.id, "Identificador", 100);
  const name = text(raw.name,"Nome",120).trim();
  if (!id || !name) throw new Error("O registro precisa de identificador e nome.");
  if (typeof raw.seed !== "number" || !Number.isInteger(raw.seed) || raw.seed < 0 || raw.seed > 4294967295) throw new Error("Metadado do registro inválido.");
  if (typeof raw.shared !== "boolean") throw new Error("Visibilidade inválida.");
  const updatedAt = text(raw.updatedAt, "Data", 40);
  if (!Number.isFinite(Date.parse(updatedAt))) throw new Error("Data inválida.");
  return {schemaVersion:1,id,name,designation:text(raw.designation,"Designação",120),notes:text(raw.notes,"Notas",10000),seed:raw.seed,
    portrait:portraitPath(raw.portrait),shared:raw.shared,updatedAt,values:{vontade:percent(v.vontade),comunhao:percent(v.comunhao),humanidade:percent(v.humanidade)}};
}
export function createCarrier(id: string, name: string): Carrier {
  return validateCarrier({schemaVersion:1,id,name,designation:"",notes:"",values:{vontade:0,comunhao:0,humanidade:0},seed:hash(id),shared:false,updatedAt:new Date().toISOString()});
}
export function randomId():string {
  const bytes=crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes,byte=>byte.toString(16).padStart(2,"0")).join("");
}
export function hash(value: string): number {
  let h = 2166136261;
  for (const char of value) h = Math.imul(h ^ char.charCodeAt(0),16777619);
  return h >>> 0;
}
/** Compare only edited fields; unrelated concurrent edits are preserved. */
export function applyPatch(current: Carrier, patch: CarrierPatch, baseline: Carrier): Carrier {
  for (const key of ["name","designation","notes","portrait","shared"] as const) {
    if (patch[key] !== undefined && current[key] !== baseline[key]) throw new Error("Esse campo mudou em outra janela. Descarte a edição para carregar o registro atualizado.");
  }
  for (const key of AXIS_KEYS) {
    if (patch.values?.[key] !== undefined && current.values[key] !== baseline.values[key]) throw new Error(`${AXES[key].short} mudou em outra janela. Descarte a edição para atualizar.`);
  }
  return validateCarrier({...current,...patch,values:{...current.values,...patch.values},updatedAt:new Date().toISOString()});
}
export function diffCarrier(base: Carrier, draft: Carrier): CarrierPatch {
  const patch: CarrierPatch = {};
  for (const key of ["name","designation","notes","portrait","shared"] as const) if (draft[key] !== base[key]) Object.assign(patch,{[key]:draft[key]});
  for (const key of AXIS_KEYS) if (base.values[key] !== draft.values[key]) (patch.values ??= {})[key] = draft.values[key];
  return patch;
}
